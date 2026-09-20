import {
    BadGatewayException,
    BadRequestException,
    HttpException,
    Inject,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { MpnClient, MpnNotFoundError, MpnRateLimitError, MpnUpstreamError } from './mpn.client';
import { MpnCandidateDto, MpnPartDto } from './dtos/mpn.part.dto';
import { UpstreamPart, UpstreamPartBrief, UpstreamResolve } from './dtos/mpn.upstream';
import { MIN_MPN_ALNUM } from './dtos/mpn.part.query.dto';

const SITE_URL = 'https://mpn.cc';
const BLOCKED_KEY = 'error : mpn';
const CACHE_PREFIX = 'mpn : ';
const DAY_MS = 24 * 60 * 60 * 1000;
// Бюджет одного клика на все походы наружу: прокси перед Trade режет по 60 с.
const BUDGET_MS = 20_000;
// 'checking' у acquisitions ждём один раз и недолго — это клик, не очередь.
const ACQUIRE_POLLS = 1;
const ACQUIRE_WAIT_MAX_MS = 3_000;
const MAX_CANDIDATES = 8;

interface Blocked {
    blockedUntil: string;
    error: string;
}

/** Результат похода наружу: что отдать и можно ли это класть в кэш. */
interface Lookup {
    dto: MpnPartDto;
    cacheable: boolean;
    // Карточка выбрана среди кандидатов по подсказке производителя — кэшировать под ключом с подсказкой.
    viaHint: boolean;
}

class BudgetExceeded extends Error {}

/**
 * Справочная карточка детали с mpn.cc по MPN: resolve → карточка, при промахе —
 * on-demand «acquisition» и повторный resolve. Всё кэшируется в общем Redis:
 * найденное на 30 дней под общим ключом (карточка от подсказки производителя не
 * зависит), промах на день под ключом с производителем, 429 — на Retry-After
 * (ключ 'error : mpn', тот же формат, что у блокировок парсеров).
 *
 * Только по клику пользователя, параллельные клики по одному MPN схлопываются
 * в один поход. Массовые прогоны запрещены условиями mpn.cc и лимитом (~10 запросов подряд).
 */
@Injectable()
export class MpnService {
    private readonly logger = new Logger(MpnService.name);
    private readonly foundTtlMs: number;
    private readonly missTtlMs: number;
    // Походы в полёте по ключу промаха — двойной клик не должен удваивать запросы наружу.
    private readonly pending = new Map<string, Promise<MpnPartDto>>();

    constructor(
        private readonly client: MpnClient,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        config: ConfigService,
    ) {
        this.foundTtlMs = Number(config.get('MPN_CC_CACHE_FOUND_MS')) || 30 * DAY_MS;
        this.missTtlMs = Number(config.get('MPN_CC_CACHE_MISS_MS')) || DAY_MS;
    }

    /** Ключ кэша и их normalized_mpn: верхний регистр, только буквы и цифры. */
    static normalize(q: string): string {
        return (q ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    async part(query: string, manufacturer?: string): Promise<MpnPartDto> {
        const normalized = MpnService.normalize(query);
        if (normalized.length < MIN_MPN_ALNUM) {
            throw new BadRequestException('MPN is too short');
        }
        const manufacturerSlug = manufacturer?.trim().toLowerCase() || undefined;
        const foundKey = CACHE_PREFIX + normalized;
        const missKey = foundKey + (manufacturerSlug ? ' : ' + manufacturerSlug : '');

        // Найденная карточка годится при любой подсказке производителя; промах без подсказки
        // (например, 1N4148 у восьми производителей) не должен глушить запрос с подсказкой.
        const plain = await this.cache.get<MpnPartDto>(foundKey);
        const cached = plain?.found || (plain && !manufacturerSlug) ? plain : await this.cache.get<MpnPartDto>(missKey);
        if (cached) {
            return { ...cached, source: 'cache' };
        }
        await this.assertNotBlocked();

        const inFlight = this.pending.get(missKey);
        if (inFlight) {
            return inFlight;
        }
        const run = this.fetchAndStore(query.trim(), normalized, manufacturerSlug, foundKey, missKey).finally(() =>
            this.pending.delete(missKey),
        );
        this.pending.set(missKey, run);
        return run;
    }

    private async fetchAndStore(
        query: string,
        normalized: string,
        manufacturerSlug: string | undefined,
        foundKey: string,
        missKey: string,
    ): Promise<MpnPartDto> {
        let result: Lookup;
        try {
            result = await this.lookup(query, normalized, manufacturerSlug, Date.now() + BUDGET_MS);
        } catch (error) {
            throw await this.translate(error);
        }
        if (result.cacheable) {
            const { dto, viaHint } = result;
            // Карточка, выбранная по подсказке производителя, — ответ только на запрос с подсказкой:
            // без неё тот же MPN остаётся неоднозначным (1N4148 у восьми производителей).
            const key = dto.found && !viaHint ? foundKey : missKey;
            await this.cache.set(key, dto, dto.found ? this.foundTtlMs : this.missTtlMs);
        }
        return result.dto;
    }

    private async lookup(
        query: string,
        normalized: string,
        manufacturerSlug: string | undefined,
        deadline: number,
    ): Promise<Lookup> {
        let resolved = await this.client.resolve(query);
        let source: MpnPartDto['source'] = 'live';
        let cacheable = true;

        // Промах без кандидатов — детали ещё нет в каталоге, пробуем подтянуть.
        if (!resolved.part && this.candidatesOf(resolved).length === 0) {
            const acquired = await this.acquire(query, manufacturerSlug, deadline);
            if (acquired === 'published') {
                this.assertBudget(deadline);
                resolved = await this.client.resolve(query);
                source = 'acquired';
            } else if (acquired === 'checking') {
                // Источник ещё думает — ответ «нет» временный, в кэш не кладём.
                cacheable = false;
            }
        }

        const { brief, viaHint } = this.pickExact(resolved, manufacturerSlug);
        if (brief) {
            this.assertBudget(deadline);
            try {
                const { part } = await this.client.part(brief.url_path);
                return { dto: this.toDto(part, query, normalized, source), cacheable, viaHint };
            } catch (error) {
                // Сняли между resolve и карточкой — промах, не сбой.
                if (!(error instanceof MpnNotFoundError)) throw error;
            }
        }

        // Похожее (similar) или неоднозначное (несколько exact у разных производителей):
        // канонической записи нет, отдаём варианты на выбор.
        return { dto: this.toMissDto(resolved, query, normalized, source), cacheable, viaHint: false };
    }

    /**
     * Точная запись: сам part при exact (viaHint=false), иначе exact-кандидат с указанным
     * производителем (1N4148 есть у восьми производителей — подсказка выбирает нужного, viaHint=true).
     */
    private pickExact(
        resolved: UpstreamResolve,
        manufacturerSlug?: string,
    ): { brief?: UpstreamPartBrief; viaHint: boolean } {
        const exact = (brief?: UpstreamPartBrief | null, type?: string) =>
            brief && type === 'exact' && typeof brief.url_path === 'string' ? brief : undefined;
        const own = exact(resolved.part, resolved.match?.type);
        if (own && (!manufacturerSlug || own.manufacturer?.slug === manufacturerSlug)) {
            return { brief: own, viaHint: false };
        }
        if (manufacturerSlug) {
            for (const candidate of this.candidatesOf(resolved)) {
                const brief = exact(candidate?.part, candidate?.match?.type);
                if (brief && brief.manufacturer?.slug === manufacturerSlug) {
                    return { brief, viaHint: true };
                }
            }
        }
        return { brief: own, viaHint: false };
    }

    private candidatesOf(resolved: UpstreamResolve) {
        return Array.isArray(resolved?.candidates) ? resolved.candidates : [];
    }

    /** published — деталь есть в каталоге; checking — источник не успел; none — не нашлось. */
    private async acquire(
        query: string,
        manufacturerSlug: string | undefined,
        deadline: number,
    ): Promise<'published' | 'checking' | 'none'> {
        this.assertBudget(deadline);
        let result = await this.client.acquire(query, manufacturerSlug);
        for (let poll = 0; result?.status === 'checking' && poll < ACQUIRE_POLLS; poll++) {
            const wait = Math.min(Math.max(Number(result.retry_after_ms) || 1000, 250), ACQUIRE_WAIT_MAX_MS);
            if (Date.now() + wait > deadline) break;
            await new Promise((resolve) => setTimeout(resolve, wait));
            result = await this.client.acquire(query, manufacturerSlug);
        }
        this.logger.log(`acquire ${query}: ${result?.status} (published ${result?.published ?? 0})`);
        if (result?.status === 'acquired' || result?.status === 'already_available') return 'published';
        return result?.status === 'checking' ? 'checking' : 'none';
    }

    private assertBudget(deadline: number): void {
        if (Date.now() > deadline) {
            throw new BudgetExceeded(`mpn.cc did not answer within ${BUDGET_MS} ms`);
        }
    }

    private async assertNotBlocked(): Promise<void> {
        const blocked = await this.cache.get<Blocked>(BLOCKED_KEY);
        if (blocked) {
            throw new ServiceUnavailableException({
                error: 'mpn_blocked',
                blockedUntil: blocked.blockedUntil,
                message: blocked.error,
            });
        }
    }

    private async translate(error: unknown): Promise<Error> {
        if (error instanceof HttpException) {
            return error;
        }
        if (error instanceof MpnRateLimitError) {
            const blocked: Blocked = {
                blockedUntil: DateTime.now().plus({ milliseconds: error.retryAfterMs }).toISO(),
                error: error.message,
            };
            await this.cache.set(BLOCKED_KEY, blocked, error.retryAfterMs);
            return new ServiceUnavailableException({ error: 'mpn_blocked', ...blocked, message: error.message });
        }
        if (error instanceof MpnUpstreamError || error instanceof BudgetExceeded || error instanceof MpnNotFoundError) {
            return new BadGatewayException({ error: 'mpn_upstream', message: error.message });
        }
        // Ответ не по нашему представлению о контракте (ручки вне их OpenAPI) — тоже upstream, не 500.
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`mpn.cc response could not be mapped: ${message}`);
        return new BadGatewayException({ error: 'mpn_upstream', message: 'mpn.cc returned an unexpected response' });
    }

    private toDto(part: UpstreamPart, query: string, normalized: string, source: MpnPartDto['source']): MpnPartDto {
        const labels = new Map(
            (Array.isArray(part.specification_definitions) ? part.specification_definitions : [])
                .filter((d) => d && typeof d.key === 'string')
                .map((d) => [d.key, d.label ?? d.key]),
        );
        const compliance: Record<string, unknown> =
            part.compliance && typeof part.compliance === 'object' ? part.compliance : {};
        const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
        const hts = str(compliance.htsus) ?? str(compliance.ushts);
        const taric = str(compliance.taric);
        const manufacturer = part.manufacturer ?? ({} as UpstreamPart['manufacturer']);
        return {
            found: true,
            query,
            normalizedQuery: normalized,
            mpn: part.mpn,
            manufacturer: {
                name: manufacturer.name ?? '',
                slug: manufacturer.slug ?? '',
                websiteUrl: str(manufacturer.website_url),
            },
            category: str(part.category),
            lifecycle: str(part.lifecycle_status),
            package: str(part.package),
            description: str(part.description),
            parameters: Object.entries(
                part.parameters && typeof part.parameters === 'object' ? part.parameters : {},
            ).map(([key, value]) => ({
                key,
                label: labels.get(key) ?? key,
                value: MpnService.scalar(value),
            })),
            datasheets: (Array.isArray(part.datasheets) ? part.datasheets : [])
                .filter((d) => d && typeof d.url === 'string')
                .map((d) => ({
                    url: d.url,
                    role: str(d.role),
                    isPrimary: !!d.is_primary,
                })),
            compliance: {
                rohs: str(compliance.rohs),
                reach: str(compliance.reach),
                eccn: str(compliance.eccn),
                hts,
                taric,
                countryOfOrigin: str(compliance.country_of_origin),
            },
            tnvedHint: MpnService.tnvedHint(taric ?? hts),
            alternatives: (Array.isArray(part.alternatives) ? part.alternatives : [])
                .filter((a) => a?.part?.mpn)
                .map((a) => ({
                    mpn: a.part.mpn,
                    manufacturer: a.part.manufacturer?.name ?? '',
                    relationship: str(a.relationship),
                    confidence: typeof a.confidence === 'number' ? a.confidence : undefined,
                    url: str(a.part.url_path) ? SITE_URL + a.part.url_path : undefined,
                })),
            url: str(part.url_path) ? SITE_URL + part.url_path : undefined,
            source,
            fetchedAt: new Date().toISOString(),
        };
    }

    private toMissDto(
        resolved: UpstreamResolve,
        query: string,
        normalized: string,
        source: MpnPartDto['source'],
    ): MpnPartDto {
        const briefs: UpstreamPartBrief[] = [
            ...(resolved?.part ? [resolved.part] : []),
            ...this.candidatesOf(resolved).map((c) => c?.part),
        ].filter((b): b is UpstreamPartBrief => !!b && typeof b.mpn === 'string');
        const seen = new Set<string>();
        const candidates: MpnCandidateDto[] = [];
        for (const brief of briefs) {
            const id = brief.url_path ?? `${brief.manufacturer?.slug}/${brief.mpn}`;
            if (seen.has(id) || candidates.length >= MAX_CANDIDATES) continue;
            seen.add(id);
            candidates.push({
                mpn: brief.mpn,
                manufacturer: brief.manufacturer?.name ?? '',
                manufacturerSlug: brief.manufacturer?.slug,
                category: brief.category ?? undefined,
                url: typeof brief.url_path === 'string' ? SITE_URL + brief.url_path : undefined,
            });
        }
        return {
            found: false,
            query,
            normalizedQuery: normalized,
            candidates,
            source,
            fetchedAt: new Date().toISOString(),
        };
    }

    /** Значение параметра в строку: примитив как есть, вложенное — JSON, не '[object Object]'. */
    static scalar(value: unknown): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    /** Первые 6 цифр TARIC/HTS = ГС = префикс ТНВЭД; нет кода — нет подсказки. */
    static tnvedHint(code?: string): string | undefined {
        const digits = (code ?? '').replace(/\D/g, '');
        return digits.length >= 6 ? digits.slice(0, 6) : undefined;
    }
}

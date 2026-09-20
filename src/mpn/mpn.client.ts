import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { UpstreamAcquisition, UpstreamPartResponse, UpstreamResolve } from './dtos/mpn.upstream';

/** 429 от mpn.cc: сколько молчать (мс) и что они сказали. */
export class MpnRateLimitError extends Error {
    constructor(
        public readonly retryAfterMs: number,
        message: string,
    ) {
        super(message);
        this.name = 'MpnRateLimitError';
    }
}

/** 404: детали (уже) нет — это промах, а не сбой mpn.cc. */
export class MpnNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MpnNotFoundError';
    }
}

export class MpnUpstreamError extends Error {
    constructor(
        public readonly status: number | undefined,
        message: string,
    ) {
        super(message);
        this.name = 'MpnUpstreamError';
    }
}

// Минимум молчания после 429: их retry_after_ms бывает меньше реального окна.
const MIN_RETRY_AFTER_MS = 60_000;
// Один запрос наружу; общий бюджет клика держит MpnService.
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * HTTP к api.mpn.cc. Только сетевой слой: заголовки, таймаут, разбор 429/404.
 * Ключ не нужен. User-Agent обязателен и явный — python-urllib у них забанен
 * по сигнатуре (Cloudflare 1010), curl-подобный проходит.
 */
@Injectable()
export class MpnClient {
    private readonly logger = new Logger(MpnClient.name);
    private readonly baseUrl: string;
    private readonly userAgent: string;

    constructor(
        private readonly http: HttpService,
        config: ConfigService,
    ) {
        this.baseUrl = (config.get<string>('MPN_CC_URL') ?? 'https://api.mpn.cc').replace(/\/+$/, '');
        this.userAgent = config.get<string>('MPN_CC_USER_AGENT') ?? 'elcopro-trade/1.0 (+https://trade.elcopro.ru)';
    }

    /** GET /v1/resolve?q= — одна каноническая запись либо кандидаты. */
    resolve(q: string): Promise<UpstreamResolve> {
        return this.request<UpstreamResolve>({ method: 'GET', url: '/v1/resolve', params: { q } });
    }

    /**
     * GET /v1/catalog/parts/{manufacturerSlug}/{mpnSlug} — полная карточка.
     * urlPath берём из ответа resolve ('/parts/{slug}/{mpnSlug}'), сами не строим:
     * у Infineon slug детали оказался 'bcv-49-e6327', не угадать.
     */
    part(urlPath: string): Promise<UpstreamPartResponse> {
        const path = (urlPath ?? '').split(/[?#]/)[0].replace(/\/+$/, '');
        if (!/^\/parts\/[^/]+\/[^/]+$/.test(path)) {
            throw new MpnUpstreamError(undefined, `Unexpected part url_path: ${urlPath}`);
        }
        return this.request<UpstreamPartResponse>({ method: 'GET', url: '/v1/catalog' + path });
    }

    /** POST /v1/catalog/acquisitions — подтянуть недостающий MPN из внешнего источника. */
    acquire(query: string, manufacturerSlug?: string): Promise<UpstreamAcquisition> {
        return this.request<UpstreamAcquisition>({
            method: 'POST',
            url: '/v1/catalog/acquisitions',
            data: { query, ...(manufacturerSlug ? { manufacturer_slug: manufacturerSlug } : {}) },
        });
    }

    private async request<T>(config: AxiosRequestConfig): Promise<T> {
        try {
            const response = await firstValueFrom(
                this.http.request<T>({
                    baseURL: this.baseUrl,
                    timeout: REQUEST_TIMEOUT_MS,
                    headers: {
                        accept: 'application/json',
                        'user-agent': this.userAgent,
                        ...(config.data ? { 'content-type': 'application/json' } : {}),
                    },
                    ...config,
                }),
            );
            return response.data;
        } catch (error) {
            throw this.translate(error as AxiosError<any>, config);
        }
    }

    private translate(error: AxiosError<any>, config: AxiosRequestConfig): Error {
        const status = error.response?.status;
        const body = error.response?.data;
        if (status === 429) {
            const header = Number(error.response?.headers?.['retry-after']);
            const fromBody = Number(body?.retry_after_ms);
            const retryAfterMs = Math.max(
                MIN_RETRY_AFTER_MS,
                Number.isFinite(header) && header > 0 ? header * 1000 : 0,
                Number.isFinite(fromBody) && fromBody > 0 ? fromBody : 0,
            );
            const message = body?.message ?? 'mpn.cc rate limit exceeded';
            this.logger.warn(`429 ${config.method} ${config.url}: ${message}, retry in ${retryAfterMs} ms`);
            return new MpnRateLimitError(retryAfterMs, message);
        }
        if (status === 404) {
            return new MpnNotFoundError(`${config.method} ${config.url}: not found`);
        }
        const message =
            (typeof body === 'object' && body ? (body.message ?? body.error) : undefined) ??
            error.message ??
            'mpn.cc error';
        this.logger.error(`${config.method} ${config.url} failed${status ? ` [${status}]` : ''}: ${message}`);
        return new MpnUpstreamError(status, String(message));
    }
}

import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { MpnService } from './mpn.service';
import { MpnClient, MpnNotFoundError, MpnRateLimitError } from './mpn.client';
import { UpstreamPartResponse, UpstreamResolve } from './dtos/mpn.upstream';

const DAY_MS = 24 * 3600 * 1000;

const yageoBrief = {
    mpn: 'RC0402FR-0710KL',
    description: '10kΩ 0402',
    package: '0402',
    category: 'Passive Components/Resistors/Chip Resistors',
    url_path: '/parts/yageo/rc0402fr-0710kl',
    manufacturer: { name: 'Yageo', slug: 'yageo' },
};

const exactResolve: UpstreamResolve = {
    query: 'RC0402FR-0710KL',
    query_type: 'mpn',
    match: { type: 'exact', score: 1 },
    part: yageoBrief,
    candidates: [],
};

const noneResolve: UpstreamResolve = {
    query: 'X',
    query_type: 'mpn',
    match: { type: 'none', score: 0 },
    part: null,
    candidates: [],
};

const ambiguousResolve: UpstreamResolve = {
    ...noneResolve,
    candidates: [
        {
            part: {
                ...yageoBrief,
                mpn: '1N4148',
                url_path: '/parts/on-semiconductor/1n4148',
                manufacturer: { name: 'Onsemi', slug: 'on-semiconductor' },
            },
            match: { type: 'exact', score: 1 },
        },
        {
            part: {
                ...yageoBrief,
                mpn: '1N4148',
                url_path: '/parts/semtech/1n4148',
                manufacturer: { name: 'Semtech', slug: 'semtech' },
            },
            match: { type: 'exact', score: 1 },
        },
    ],
};

const partResponse: UpstreamPartResponse = {
    part: {
        ...yageoBrief,
        lifecycle_status: 'active',
        datasheets: [{ url: 'https://pdf.mpn.cc/a.pdf', role: 'primary', is_primary: true }],
        specification_definitions: [{ key: 'resistance', label: 'Resistance' }],
        parameters: { resistance: '10 kΩ', tolerance: '±1%' },
        compliance: { rohs: 'compliant', htsus: '8533.21.0030', taric: '8533210000', country_of_origin: 'Taiwan' },
        alternatives: [],
    },
};

describe('MpnService', () => {
    let service: MpnService;
    let store: Map<string, unknown>;
    const cache = {
        get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
        set: jest.fn((key: string, value: unknown) => {
            store.set(key, value);
            return Promise.resolve();
        }),
    };
    const client = {
        resolve: jest.fn(),
        part: jest.fn(),
        acquire: jest.fn(),
    };

    beforeEach(async () => {
        store = new Map();
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MpnService,
                { provide: MpnClient, useValue: client },
                { provide: CACHE_MANAGER, useValue: cache },
                { provide: ConfigService, useValue: { get: () => undefined } },
            ],
        }).compile();
        service = module.get(MpnService);
    });

    it('normalizes like mpn.cc normalized_mpn; helpers', () => {
        expect(MpnService.normalize(' rc0402fr-0710kl ')).toBe('RC0402FR0710KL');
        expect(MpnService.tnvedHint('8533.21.0030')).toBe('853321');
        expect(MpnService.tnvedHint(undefined)).toBeUndefined();
        expect(MpnService.scalar({ value: 10, unit: 'kΩ' })).toBe('{"value":10,"unit":"kΩ"}');
        expect(MpnService.scalar(null)).toBe('');
    });

    it('rejects too short query without touching upstream', async () => {
        await expect(service.part('R-1')).rejects.toBeInstanceOf(BadRequestException);
        expect(client.resolve).not.toHaveBeenCalled();
    });

    it('exact → card → cached under plain key for 30 days', async () => {
        client.resolve.mockResolvedValue(exactResolve);
        client.part.mockResolvedValue(partResponse);

        const dto = await service.part('rc0402fr-0710kl');

        expect(client.part).toHaveBeenCalledWith('/parts/yageo/rc0402fr-0710kl');
        expect(dto).toMatchObject({
            found: true,
            source: 'live',
            mpn: 'RC0402FR-0710KL',
            manufacturer: { name: 'Yageo', slug: 'yageo' },
            lifecycle: 'active',
            tnvedHint: '853321',
            compliance: { hts: '8533.21.0030', taric: '8533210000', countryOfOrigin: 'Taiwan' },
            url: 'https://mpn.cc/parts/yageo/rc0402fr-0710kl',
        });
        expect(dto.parameters).toEqual([
            { key: 'resistance', label: 'Resistance', value: '10 kΩ' },
            { key: 'tolerance', label: 'tolerance', value: '±1%' },
        ]);
        expect(cache.set).toHaveBeenCalledWith(
            'mpn : RC0402FR0710KL',
            expect.objectContaining({ found: true }),
            30 * DAY_MS,
        );
    });

    it('found card under plain key is reused for a manufacturer-hinted request', async () => {
        store.set('mpn : RC0402FR0710KL', { found: true, source: 'live', mpn: 'RC0402FR-0710KL' });

        const dto = await service.part('RC0402FR-0710KL', 'yageo');

        expect(dto.source).toBe('cache');
        expect(client.resolve).not.toHaveBeenCalled();
    });

    it('refresh=true ignores cache and rewrites it', async () => {
        store.set('mpn : RC0402FR0710KL', { found: true, source: 'live', mpn: 'STALE' });
        client.resolve.mockResolvedValue(exactResolve);
        client.part.mockResolvedValue(partResponse);

        const dto = await service.part('RC0402FR-0710KL', undefined, true);

        expect(client.resolve).toHaveBeenCalledTimes(1);
        expect(dto).toMatchObject({ found: true, source: 'live', mpn: 'RC0402FR-0710KL' });
        expect(cache.set).toHaveBeenCalledWith(
            'mpn : RC0402FR0710KL',
            expect.objectContaining({ mpn: 'RC0402FR-0710KL' }),
            30 * DAY_MS,
        );
    });
    it('cached miss under plain key does not shadow a manufacturer-hinted request', async () => {
        store.set('mpn : 1N4148', { found: false, source: 'live', candidates: [] });
        client.resolve.mockResolvedValue(ambiguousResolve);
        client.part.mockResolvedValue({
            part: { ...partResponse.part, mpn: '1N4148', url_path: '/parts/semtech/1n4148' },
        });

        const dto = await service.part('1N4148', 'semtech');

        expect(client.resolve).toHaveBeenCalledTimes(1);
        expect(dto.found).toBe(true);
    });

    it('none → acquired → resolve again → card, source acquired, stored under plain key', async () => {
        client.resolve.mockResolvedValueOnce(noneResolve).mockResolvedValueOnce(exactResolve);
        client.acquire.mockResolvedValue({ status: 'acquired', published: 1, candidates: 0 });
        client.part.mockResolvedValue(partResponse);

        const dto = await service.part('RC0402FR-0710KL', 'Yageo');

        expect(client.acquire).toHaveBeenCalledWith('RC0402FR-0710KL', 'yageo');
        expect(client.resolve).toHaveBeenCalledTimes(2);
        expect(dto).toMatchObject({ found: true, source: 'acquired' });
        expect(cache.set).toHaveBeenCalledWith('mpn : RC0402FR0710KL', expect.anything(), 30 * DAY_MS);
    });

    it('none → unavailable → miss cached under manufacturer key for a day, no card request', async () => {
        client.resolve.mockResolvedValue(noneResolve);
        client.acquire.mockResolvedValue({ status: 'unavailable', published: 0, candidates: 0 });

        const dto = await service.part('TS02002E474KSB0E0R', 'suntan');

        expect(dto).toMatchObject({ found: false, candidates: [] });
        expect(client.part).not.toHaveBeenCalled();
        expect(cache.set).toHaveBeenCalledWith(
            'mpn : TS02002E474KSB0E0R : suntan',
            expect.objectContaining({ found: false }),
            DAY_MS,
        );
    });

    it('acquisition still checking → miss returned but NOT cached; polls at most once', async () => {
        client.resolve.mockResolvedValue(noneResolve);
        client.acquire.mockResolvedValue({ status: 'checking', published: 0, candidates: 0, retry_after_ms: 250 });

        const dto = await service.part('SLOWPART1');

        expect(dto.found).toBe(false);
        expect(client.acquire).toHaveBeenCalledTimes(2);
        expect(client.resolve).toHaveBeenCalledTimes(1);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('ambiguous exact candidates without hint → found=false with candidates, no acquisition, cached a day', async () => {
        client.resolve.mockResolvedValue(ambiguousResolve);

        const dto = await service.part('1N4148');

        expect(client.acquire).not.toHaveBeenCalled();
        expect(dto.found).toBe(false);
        expect(dto.candidates.map((c) => c.manufacturer)).toEqual(['Onsemi', 'Semtech']);
        expect(cache.set).toHaveBeenCalledWith('mpn : 1N4148', expect.objectContaining({ found: false }), DAY_MS);
    });

    it('ambiguous candidates + manufacturer hint → picks that candidate card', async () => {
        client.resolve.mockResolvedValue(ambiguousResolve);
        client.part.mockResolvedValue({
            part: {
                ...partResponse.part,
                mpn: '1N4148',
                url_path: '/parts/semtech/1n4148',
                manufacturer: { name: 'Semtech', slug: 'semtech' },
            },
        });

        const dto = await service.part('1N4148', 'Semtech');

        // под общим ключом MPN остаётся неоднозначным — карточка Semtech только для запроса с подсказкой
        expect(cache.set).toHaveBeenCalledWith(
            'mpn : 1N4148 : semtech',
            expect.objectContaining({ found: true }),
            30 * DAY_MS,
        );
        expect(store.has('mpn : 1N4148')).toBe(false);

        expect(client.part).toHaveBeenCalledWith('/parts/semtech/1n4148');
        expect(dto).toMatchObject({ found: true, manufacturer: { slug: 'semtech' } });
    });

    it('card 404 between resolve and part → miss, not 502', async () => {
        client.resolve.mockResolvedValue(exactResolve);
        client.part.mockRejectedValue(new MpnNotFoundError('gone'));

        const dto = await service.part('RC0402FR-0710KL');

        expect(dto.found).toBe(false);
        expect(dto.candidates.map((c) => c.mpn)).toEqual(['RC0402FR-0710KL']);
    });

    it('concurrent calls for the same MPN share one upstream flow', async () => {
        let release: (value: UpstreamResolve) => void;
        client.resolve.mockReturnValue(new Promise<UpstreamResolve>((resolve) => (release = resolve)));
        client.part.mockResolvedValue(partResponse);

        const a = service.part('RC0402FR-0710KL');
        const b = service.part('RC0402FR-0710KL');
        release(exactResolve);
        const [da, db] = await Promise.all([a, b]);

        expect(client.resolve).toHaveBeenCalledTimes(1);
        expect(client.part).toHaveBeenCalledTimes(1);
        expect(da.mpn).toBe('RC0402FR-0710KL');
        expect(db).toBe(da);
    });

    it('malformed upstream response → 502 mpn_upstream, nothing cached', async () => {
        client.resolve.mockResolvedValue({
            query: 'x',
            query_type: 'mpn',
            match: null,
            part: null,
            candidates: null,
        } as any);
        client.acquire.mockResolvedValue({ status: 'acquired', published: 1, candidates: 0 });
        client.resolve.mockResolvedValueOnce({
            query: 'x',
            query_type: 'mpn',
            match: null,
            part: null,
            candidates: null,
        } as any);
        client.resolve.mockResolvedValueOnce({
            match: { type: 'exact', score: 1 },
            part: { url_path: '/parts/a/b' },
        } as any);
        client.part.mockResolvedValue({ part: null } as any);

        await expect(service.part('BROKEN1')).rejects.toBeInstanceOf(BadGatewayException);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('429 → blocked key set, 503; next call short-circuits on blocked key', async () => {
        client.resolve.mockRejectedValue(new MpnRateLimitError(90_000, 'Too many searches'));

        await expect(service.part('RC0402FR-0710KL')).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(cache.set).toHaveBeenCalledWith(
            'error : mpn',
            expect.objectContaining({ error: 'Too many searches' }),
            90_000,
        );

        client.resolve.mockClear();
        await expect(service.part('RC0603FR-072K4L')).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(client.resolve).not.toHaveBeenCalled();
    });
});

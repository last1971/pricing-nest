import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { MpnClient } from './mpn.client';

describe('MpnClient: ограничитель запросов наружу', () => {
    function client(intervalMs: number, starts: number[]) {
        const http = {
            request: jest.fn(() => {
                starts.push(Date.now());
                return of({ data: { ok: true } });
            }),
        } as unknown as HttpService;
        const config = {
            get: (k: string) => (k === 'MPN_CC_MIN_INTERVAL_MS' ? String(intervalMs) : undefined),
        } as unknown as ConfigService;
        return new MpnClient(http, config);
    }

    it('параллельные вызовы уходят по очереди не чаще интервала', async () => {
        const starts: number[] = [];
        const c = client(120, starts);
        const anyClient = c as unknown as { request<T>(cfg: unknown): Promise<T> };
        await Promise.all([1, 2, 3].map(() => anyClient.request({ method: 'GET', url: '/x' })));
        expect(starts).toHaveLength(3);
        expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(110);
        expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(110);
    });

    it('интервал 0 — без ожидания', async () => {
        const starts: number[] = [];
        const c = client(0, starts);
        const anyClient = c as unknown as { request<T>(cfg: unknown): Promise<T> };
        const t0 = Date.now();
        await Promise.all([1, 2].map(() => anyClient.request({ method: 'GET', url: '/x' })));
        expect(Date.now() - t0).toBeLessThan(100);
    });
});

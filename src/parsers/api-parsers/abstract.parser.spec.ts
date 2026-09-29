import { NEVER, Observable, of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { AbstractParser, API_TIMEOUT_DEFAULT } from './abstract.parser';
import { GoodDto } from '../../good/dtos/good.dto';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { IApiParsers } from '../../interfaces/IApiParsers';

const dbGood = { code: 'from-db' } as GoodDto;
const httpGood = { code: 'from-http' } as GoodDto;

class TestParser extends AbstractParser {
    public response: Observable<AxiosResponse<any, any>> = of({ data: [] } as AxiosResponse);
    public parseDelay = 0;
    getAlias(): string {
        return 'test';
    }
    getCurrencyAlfa(): string {
        return 'RUB';
    }
    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.response;
    }
    async parseResponse(): Promise<GoodDto[]> {
        // так зависает второй запрос внутри разбора (как у platan)
        if (this.parseDelay) await new Promise((resolve) => setTimeout(resolve, this.parseDelay));
        return [httpGood];
    }
}

describe('AbstractParser timeout', () => {
    let cache: { get: jest.Mock; set: jest.Mock };
    let queue: { add: jest.Mock };
    let config: Record<string, any>;
    let parser: TestParser;

    beforeEach(() => {
        cache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() };
        queue = { add: jest.fn() };
        config = { API_TIMEOUT: '50', CACHE_ERROR_EXP: 600000 };
        const parsers = {
            getSuppliers: () => new Map([['test', { id: 'supplier-id', alias: 'test' }]]),
            getCurrencies: () => new Map([['RUB', { id: 'rub' }]]),
            getConfigService: () => ({ get: (key: string) => config[key] }),
            getStatService: () => ({ todayErrorCount: jest.fn().mockResolvedValue(1) }),
            getGoodService: () => ({ find: jest.fn().mockResolvedValue([dbGood]) }),
            getCache: () => cache,
            getQueue: () => queue,
            getLogger: () => ({ error: jest.fn() }),
        } as unknown as IApiParsers;
        const request = new PriceRequestDto();
        request.search = 'max232';
        request.withCache = false;
        parser = new TestParser(request, parsers);
    });

    it('ответил вовремя — данные поставщика, без блокировки', async () => {
        expect(await parser.parse()).toEqual([httpGood]);
        expect(cache.set).not.toHaveBeenCalledWith('error : test', expect.anything(), expect.anything());
    });

    it('не ответил — данные из базы и блокировка поставщика', async () => {
        parser.response = NEVER;
        expect(await parser.parse()).toEqual([dbGood]);
        expect(cache.set).toHaveBeenCalledWith(
            'error : test',
            expect.objectContaining({ error: 'Timeout: no answer in 0.05 s' }),
            600000,
        );
        expect(queue.add).toHaveBeenCalledWith(
            'apiRequestStats',
            expect.objectContaining({ isSuccess: false, errorMessage: 'Timeout: no answer in 0.05 s' }),
        );
    });

    it('завис разбор ответа (второй запрос) — тоже таймаут', async () => {
        parser.parseDelay = 200;
        expect(await parser.parse()).toEqual([dbGood]);
        expect(cache.set).toHaveBeenCalledWith('error : test', expect.anything(), 600000);
    });

    it('поздний ответ после таймаута не пишет вторую ошибку', async () => {
        jest.spyOn(parser, 'parseResponse').mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            throw new Error('late');
        });
        await parser.parse();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const errors = cache.set.mock.calls.filter(([key]) => key === 'error : test');
        expect(errors).toHaveLength(1);
    });

    it('заблокированный поставщик не запрашивается вовсе', async () => {
        cache.get.mockImplementation(async (key: string) => (key === 'error : test' ? { error: 'x' } : undefined));
        parser.response = NEVER;
        expect(await parser.parse()).toEqual([dbGood]);
        expect(cache.set).not.toHaveBeenCalled();
    });

    it('по умолчанию ждём 60 секунд', () => {
        delete config.API_TIMEOUT;
        expect(API_TIMEOUT_DEFAULT).toEqual(60000);
        expect(parser['getTimeout']()).toEqual(60000);
    });
});

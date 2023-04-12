import { Test, TestingModule } from '@nestjs/testing';
import { ParsersService } from './parsers.service';
import { SupplierService } from '../supplier/supplier.service';
import { CurrencyService } from '../currency/currency.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Observable, of } from 'rxjs';
import { CurrencyMock } from '../currency/currency.mock';
import { CacheMock, CacheSet } from '../mocks/cache.mock';
import { QueueAdd, QueueMock } from '../mocks/queue.mock';
import { MockParser1, MockParser3, parseResponse, SupplierMock } from '../supplier/supplier.mock';
import { SupplierDto } from '../supplier/supplier.dto';
import { CurrencyDto } from '../currency/dto/currency.dto';
import { UnitService } from '../unit/unit.service';
import { ApiResponseDto } from './api-parsers/api.response.dto';
import { AxiosError } from 'axios';
import { GoodService } from '../good/good.service';
import { GoodDto } from '../good/dtos/good.dto';

describe('ParsersService', () => {
    let service: ParsersService;

    const find = jest.fn().mockReturnValue([new GoodDto()]);

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ParsersService,
                {
                    provide: SupplierService,
                    useValue: SupplierMock,
                },
                {
                    provide: CurrencyService,
                    useValue: CurrencyMock,
                },
                {
                    provide: GoodService,
                    useValue: { find },
                },
                {
                    provide: ConfigService,
                    useValue: {},
                },
                {
                    provide: UnitService,
                    useValue: {
                        name: jest.fn(),
                    },
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: CacheMock,
                },
                {
                    provide: HttpService,
                    useValue: {
                        post: jest.fn(() =>
                            of({
                                data: [{}, {}],
                            }),
                        ),
                        get: () =>
                            new Observable((s) => s.error({ response: 'resp', status: '4xx', message: 'test error' })),
                    },
                },
                {
                    provide: 'BullQueue_api',
                    useValue: QueueMock,
                },
            ],
        }).compile();

        service = module.get<ParsersService>(ParsersService);
        await service.onModuleInit();
        CacheSet.mockClear();
        QueueAdd.mockClear();
        parseResponse.mockClear();
        find.mockClear();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('Test Get Suppliers', async () => {
        const suppliers = service.getSuppliers();
        const suppliersMap = new Map<string, SupplierDto>();
        (await SupplierMock.apiOnly()).forEach((supplier: SupplierDto) => suppliersMap.set(supplier.alias, supplier));
        expect(suppliers).toEqual(suppliersMap);
    });

    it('Test Get Currencies', async () => {
        const currencies = service.getCurrencies();
        const currenciesMap = new Map<string, CurrencyDto>();
        (await CurrencyMock.all()).forEach((currency: CurrencyDto) => currenciesMap.set(currency.alfa3, currency));
        expect(currencies).toEqual(currenciesMap);
    });

    it('Test abstract parser getFromDb', async () => {
        const parser = new MockParser1({ search: '123', withCache: true, dbOnly: false }, service);
        await parser.getFromDb();
        expect(find.mock.calls[0]).toEqual([{ alias: '123', supplier: 'first' }]);
    });

    it('Test abstract parser getFromCache', async () => {
        const response = new ApiResponseDto();
        const parser = new MockParser1({ search: '123', withCache: true, dbOnly: false }, service);
        await parser.getFromCache(response);
        expect(response.data).toHaveLength(1);
    });

    it('Test abstract parser not getFromCache', async () => {
        const response = new ApiResponseDto();
        const parser = new MockParser1({ search: '123', withCache: false, dbOnly: false }, service);
        await parser.getFromCache(response);
        expect(response.data).toHaveLength(0);
    });

    it('Test abstract parser checkError not', async () => {
        const response = new ApiResponseDto();
        const parser1 = new MockParser1({ search: '123', withCache: false, dbOnly: false }, service);
        await parser1.checkError(response);
        expect(response.data).toEqual([]);
    });

    it('Test abstract parser checkError', async () => {
        const response = new ApiResponseDto();
        const parser3 = new MockParser3({ search: '123', withCache: false, dbOnly: false }, service);
        await parser3.checkError(response);
        expect(response.data).toEqual([new GoodDto()]);
    });

    it('Test abstract parser obtain error', async () => {
        const response = new ApiResponseDto();
        const parser = new MockParser1({ search: '123', withCache: false, dbOnly: false }, service);
        await parser.obtainError(new AxiosError<unknown, any>('test error'), response);
        expect(response.isSuccess).toEqual(false);
        expect(response.errorMessage).toEqual('test error');
        expect(CacheSet.mock.calls).toHaveLength(1);
        expect(CacheSet.mock.calls[0]).toEqual(['error : first', true, null]);
    });

    it('Test abstract parser save stat', async () => {
        const response = new ApiResponseDto();
        const parser = new MockParser1({ search: '123', withCache: false, dbOnly: false }, service);
        await parser.saveStat(response);
        expect(QueueAdd.mock.calls).toHaveLength(1);
        expect(QueueAdd.mock.calls[0][1]).toHaveProperty('isSuccess', true);
    });

    it('Test abstract parser save cache', async () => {
        const response = new ApiResponseDto();
        const parser = new MockParser1({ search: '123', withCache: false, dbOnly: false }, service);
        await parser.saveToCache(response);
        expect(CacheSet.mock.calls[0]).toEqual(['first : 123', response]);
        expect(QueueAdd.mock.calls).toHaveLength(1);
        expect(QueueAdd.mock.calls[0]).toEqual(['keys', 'first : 123']);
    });

    it('Test cache search', async () => {
        const response = await service.search({ search: '123', withCache: true, dbOnly: false });
        expect(response).toHaveLength(3);
        expect(response).toEqual([{ source: 'Cache' }, { source: 'Db' }, { source: 'Db' }]);
        expect(CacheSet.mock.calls).toHaveLength(1);
        expect(QueueAdd.mock.calls).toHaveLength(1);
        expect(QueueAdd.mock.calls[0][1]).toHaveProperty('isSuccess', false);
    });

    it('Test no cache search', async () => {
        const response = await service.search({ search: '123', withCache: false, dbOnly: false });
        expect(response).toHaveLength(4);
        expect(response).toEqual([{ source: 'Api' }, { source: 'Api' }, { source: 'Db' }, { source: 'Db' }]);
        expect(CacheSet.mock.calls).toHaveLength(2);
        expect(CacheSet.mock.calls[0]).toEqual(['error : second', true, null]);
        expect(CacheSet.mock.calls[1][1]).toHaveProperty('isSuccess', true);
        expect(QueueAdd.mock.calls).toHaveLength(3);
        expect(QueueAdd.mock.calls[0][1]).toHaveProperty('isSuccess', true);
        expect(QueueAdd.mock.calls[2][1]).toHaveProperty('isSuccess', false);
        expect(QueueAdd.mock.calls[1]).toEqual(['keys', 'first : 123']);
    });

    it('Test http search', async () => {
        const response = await service.search({ search: '1234', withCache: true, dbOnly: false });
        expect(response).toHaveLength(4);
        expect(response[0]).toEqual({ source: 'Api' });
        expect(parseResponse.mock.results).toHaveLength(1);
        expect(CacheSet.mock.calls).toHaveLength(2);
        expect(QueueAdd.mock.calls).toHaveLength(3);
    });

    it('Test http search first supplier', async () => {
        const response = await service.search({
            search: '1234',
            withCache: false,
            dbOnly: false,
            suppliers: ['first'],
        });
        expect(response).toHaveLength(2);
        expect(response[0]).toEqual({ source: 'Api' });
        expect(CacheSet.mock.calls).toHaveLength(1);
        expect(QueueAdd.mock.calls).toHaveLength(2);
        expect(QueueAdd.mock.calls[0][1]).toHaveProperty('isSuccess', true);
        expect(QueueAdd.mock.calls[1]).toEqual(['keys', 'first : 1234']);
    });
});

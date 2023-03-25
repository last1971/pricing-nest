import { Test, TestingModule } from '@nestjs/testing';
import { ParsersService } from './parsers.service';
import { SupplierService } from '../supplier/supplier.service';
import { GoodService } from '../good/good.service';
import { CurrencyService } from '../currency/currency.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { CurrencyMock } from '../currency/currency.mock';
import { CacheMock, CacheSet } from '../mocks/cache.mock';
import { QueueAdd, QueueMock } from '../mocks/queue.mock';
import { parseResponse, SupplierMock } from '../supplier/supplier.mock';
import { SupplierDto } from '../supplier/supplier.dto';
import { CurrencyDto } from '../currency/dto/currency.dto';

describe('ParsersService', () => {
    let service: ParsersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ParsersService,
                {
                    provide: SupplierService,
                    useValue: SupplierMock,
                },
                // for delete
                {
                    provide: GoodService,
                    useValue: {},
                },
                {
                    provide: CurrencyService,
                    useValue: CurrencyMock,
                },
                {
                    provide: ConfigService,
                    useValue: {},
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

    it('Test cache search', async () => {
        const response = await service.search({ search: '123', withCache: true, dbOnly: false });
        expect(response).toHaveLength(2);
        expect(response[0]).toEqual({ source: 'Cache' });
        expect(CacheSet.mock.calls).toHaveLength(0);
        expect(QueueAdd.mock.calls).toHaveLength(0);
    });

    it('Test no cache search', async () => {
        const response = await service.search({ search: '123', withCache: false, dbOnly: false });
        expect(response).toHaveLength(4);
        expect(response[0]).toEqual({ source: 'Api' });
        expect(CacheSet.mock.calls).toHaveLength(2);
        expect(QueueAdd.mock.calls).toHaveLength(2);
    });

    it('Test http search', async () => {
        const response = await service.search({ search: '1234', withCache: true, dbOnly: false });
        expect(response).toHaveLength(4);
        expect(response[0]).toEqual({ source: 'Api' });
        expect(parseResponse.mock.results).toHaveLength(2);
        expect(CacheSet.mock.calls).toHaveLength(2);
        expect(QueueAdd.mock.calls).toHaveLength(2);
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
        expect(QueueAdd.mock.calls).toHaveLength(1);
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from './supplier.service';
import { getModelToken } from '@nestjs/mongoose';
import { Supplier } from './supplier.schema';
import { ApiRequestStatService } from '../api-request-stat/api-request-stat.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheDel, CacheMock } from '../mocks/cache.mock';
import { VaultService } from 'vault-module/lib/vault.service';

const find = jest.fn().mockResolvedValue([{ toObject: () => ({ id: '1' }) }, { toObject: () => ({ id: '3' }) }]);
const findOne = jest.fn().mockResolvedValue({ toObject: () => ({ supplierCodes: { '1': 'A', '3': 'B' } }) });
const findById = jest.fn().mockResolvedValue({ toObject: () => ({}) });

describe('SupplierService', () => {
    let service: SupplierService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SupplierService,
                {
                    provide: CACHE_MANAGER,
                    useValue: CacheMock,
                },
                {
                    provide: getModelToken(Supplier.name),
                    useValue: { find, findOne, findById },
                },
                {
                    provide: ApiRequestStatService,
                    useValue: { duration: () => new Map(Object.entries({ '1': 1, '2': 2 })) },
                },
                {
                    provide: VaultService,
                    useValue: {},
                }
            ],
        }).compile();

        service = module.get<SupplierService>(SupplierService);

        find.mockClear();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('test alias', async () => {
        await service.alias('test');
        expect(findOne.mock.calls[0]).toMatchObject([{ alias: 'test' }]);
    });

    it('test id', async () => {
        await service.id('test');
        expect(findById.mock.calls[0]).toMatchObject(['test']);
    });

    it('test all', async () => {
        await service.all();
        expect(find.mock.calls).toHaveLength(1);
        expect(find.mock.calls[0]).toMatchObject([]);
    });

    it('test apiParsers', () => {
        const parsers = service.apiParsers();
        expect(parsers).toBeDefined();
    });

    it('test apiOnly', async () => {
        const $in = Object.keys(service.apiParsers());
        await service.apiOnly();
        expect(find.mock.calls).toHaveLength(1);
        expect(find.mock.calls[0]).toMatchObject([{ alias: { $in } }]);
    });

    it('test dbOnly', async () => {
        const $nin = Object.keys(service.apiParsers());
        await service.dbOnly();
        expect(find.mock.calls).toHaveLength(1);
        expect(find.mock.calls[0]).toMatchObject([{ alias: { $nin } }]);
    });

    it('test rate without alias', async () => {
        const res = await service.rate();
        expect(res).toEqual([
            { id: '1', rate: 1 },
            { id: '3', rate: 0 },
        ]);
    });

    it('test rate with alias', async () => {
        const res = await service.rate('test');
        expect(res).toEqual([
            { id: 'A', rate: 1 },
            { id: 'B', rate: 0 },
        ]);
    });

    it('test del error in cache', async () => {
        await service.errorClear('test');
        expect(CacheDel.mock.calls[0]).toEqual(['error : test']);
    });
});

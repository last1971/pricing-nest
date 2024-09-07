import { Test, TestingModule } from '@nestjs/testing';
import { GoodService } from './good.service';
import { getModelToken } from '@nestjs/mongoose';
import { Good, GoodDocument } from './schemas/good.schema';
import { SupplierService } from '../supplier/supplier.service';
import { SupplierDto } from '../supplier/supplier.dto';
import { GoodDto } from './dtos/good.dto';
import { ParameterDocument } from './schemas/parameter.schema';
import { ConfigService } from '@nestjs/config';

describe('GoodService', () => {
    let service: GoodService;

    const dbSupplier = {
        id: 'first',
        alias: 'dbSupplier',
        deliveryTime: 1,
        supplierCodes: {
            first: '1',
            '1': 'first',
        },
    };

    const apiSupplier = {
        id: 'second',
        alias: 'apiSupplier',
        deliveryTime: 2,
    };

    const findOneAndUpdate = jest.fn();
    const find = jest.fn().mockReturnValue({ toObject: () => ({}) });
    const save = jest.fn();
    const updateMany = jest.fn().mockReturnValue({ toObject: () => ({ matchedCount: 1 }) });
    const findOne = jest.fn((params: any) => {
        return params.id === '1' ? { save } : null;
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoodService,
                {
                    provide: getModelToken(Good.name),
                    useValue: { findOneAndUpdate, find, findOne, updateMany },
                },
                {
                    provide: SupplierService,
                    useValue: {
                        dbOnly: async (): Promise<SupplierDto[]> => [dbSupplier],
                        all: async (): Promise<SupplierDto[]> => [dbSupplier, apiSupplier],
                        alias: async (alias: string) => (alias === 'first' ? dbSupplier : null),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: { get: () => 7 },
                },
            ],
        }).compile();

        service = module.get<GoodService>(GoodService);

        find.mockClear();
        findOneAndUpdate.mockClear();
    });

    afterAll(() => {
        // Восстанавливаем оригинальную реализацию Date после всех тестов
        jest.restoreAllMocks();
    });

    it('should be defined', async () => {
        expect(service).toBeDefined();
    });

    it('test find', async () => {
        for (const filter of [
            { supplier: '1' },
            { alias: '123' },
            { alias: '123_' },
            { alias: { $in: ['1', '2', '3'] } },
        ]) {
            await service.find(filter);
        }
        [
            { supplier: '1' },
            { alias: { $regex: /123/i } },
            { alias: { $regex: /123/i } },
            { alias: { $in: ['1', '2', '3'] } },
        ].forEach((value, index) => {
            expect(find.mock.calls[index][0]).toEqual(value);
        });
    });

    it('test createOrUpdate', async () => {
        await service.createOrUpdate(
            new GoodDto({
                alias: 'max232',
                code: 'code',
                warehouses: [],
                supplier: 'compel',
                updatedAt: new Date(),
            }),
        );
        expect(findOneAndUpdate.mock.calls.length).toEqual(1);
        const args = findOneAndUpdate.mock.calls[0];
        expect(args.length).toEqual(3);
        expect(args[0]).toHaveProperty('code');
        expect(args[0]).toHaveProperty('supplier');
        expect(args[1]).not.toHaveProperty('code');
        expect(args[1]).not.toHaveProperty('supplier');
        expect(args[2]).toEqual(expect.objectContaining({ upsert: true }));
    });

    it('test search', async () => {
        await service.onModuleInit();
        for (const item of [
            { search: '123', dbOnly: true, withCache: true },
            { search: '123', dbOnly: false, withCache: false },
            { search: '123_!zя', dbOnly: false, withCache: false },
        ]) {
            await service.search(item);
        }
        const alias = { $regex: /123/i };
        [
            { supplier: ['first', 'second'], alias },
            { supplier: ['first'], alias },
            { supplier: ['first'], alias: { $regex: /123zя/i } },
        ].forEach((item, index) => {
            expect(find.mock.calls[index][0].supplier.$in).toEqual(item.supplier);
            expect(find.mock.calls[index][0].alias).toEqual(item.alias);
        });
    });

    it('test setGood', async () => {
        const responses: boolean[] = [];
        for (const item of [
            { supplierAlias: 'hz', supplierGoodId: '1', goodId: '1' },
            { supplierAlias: 'first', supplierGoodId: '2', goodId: '1' },
            { supplierAlias: 'first', supplierGoodId: '1', goodId: '1' },
        ]) {
            responses.push(await service.setGood(item));
        }
        [
            { response: false, save: 1 },
            { response: false, save: 1 },
            { response: true, save: 1 },
        ].forEach((item, index) => {
            expect(responses[index]).toEqual(item.response);
            expect(save.mock.calls).toHaveLength(item.save);
        });
    });
    it('test setParameters [], [1]', async () => {
        const good = { toObject: () => ({ code: '1', supplier: '1' }) } as GoodDocument;
        await service.setParameters(good, [{ name: 'test', stringValue: 'test' }]);
        expect(findOneAndUpdate.mock.calls).toEqual([
            [{ code: '1', supplier: '1' }, { $set: { parameters: [{ name: 'test', stringValue: 'test' }] } }],
        ]);
    });
    it('test setParameters [1], [2]', async () => {
        const parameter = { toObject: () => ({ name: 'test1', stringValue: 'test1' }) } as ParameterDocument;
        const good = {
            toObject: () => ({ code: '1', supplier: '1' }),
        } as GoodDocument;
        good.parameters = [parameter];
        await service.setParameters(good, [{ name: 'test', stringValue: 'test' }]);
        expect(findOneAndUpdate.mock.calls).toEqual([
            [
                { code: '1', supplier: '1' },
                {
                    $set: {
                        parameters: [
                            { name: 'test1', stringValue: 'test1' },
                            { name: 'test', stringValue: 'test' },
                        ],
                    },
                },
            ],
        ]);
    });
    it('test setParameters [1], [1_]', async () => {
        const parameter = { toObject: () => ({ name: 'test', stringValue: 'test1' }) } as ParameterDocument;
        const good = {
            toObject: () => ({ code: '1', supplier: '1' }),
        } as GoodDocument;
        good.parameters = [parameter];
        await service.setParameters(good, [{ name: 'test', stringValue: 'test' }]);
        expect(findOneAndUpdate.mock.calls).toEqual([
            [
                { code: '1', supplier: '1' },
                {
                    $set: {
                        parameters: [{ name: 'test', stringValue: 'test' }],
                    },
                },
            ],
        ]);
    });
    it('test setParameters [1], [1]', async () => {
        const parameter = { toObject: () => ({ name: 'test', stringValue: 'test' }) } as ParameterDocument;
        const good = {
            toObject: () => ({ code: '1', supplier: '1' }),
        } as GoodDocument;
        good.parameters = [parameter];
        await service.setParameters(good, [{ name: 'test', stringValue: 'test' }]);
        expect(findOneAndUpdate.mock.calls).toHaveLength(0);
    });
    it('test clearWarehousesForOldGoods', async () => {
        const mockDate = new Date('2023-09-01T00:00:00Z'); // Установите желаемую дату
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
        await service.clearWarehousesForOldGoods();
        expect(updateMany.mock.calls[0]).toEqual([
            {
                updatedAt: { $lt: new Date('2023-08-25T00:00:00.000Z') },
            },
            {
                $set: { warehouses: [] },
            },
        ]);
    });
});

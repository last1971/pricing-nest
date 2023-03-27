import { Test, TestingModule } from '@nestjs/testing';
import { GoodService } from './good.service';
import { getModelToken } from '@nestjs/mongoose';
import { Good } from './schemas/good.schema';
import { SupplierService } from '../supplier/supplier.service';
import { SupplierDto } from '../supplier/supplier.dto';

describe('GoodService', () => {
    let service: GoodService;

    const dbSupplier = {
        id: 'first',
        alias: 'dbSupplier',
        deliveryTime: 1,
    };

    const apiSupplier = {
        id: 'second',
        alias: 'apiSupplier',
        deliveryTime: 2,
    };

    const findOneAndUpdate = jest.fn();
    const find = jest.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GoodService,
                {
                    provide: getModelToken(Good.name),
                    useValue: { findOneAndUpdate, find },
                },
                {
                    provide: SupplierService,
                    useValue: {
                        dbOnly: async (): Promise<SupplierDto[]> => [dbSupplier],
                        all: async (): Promise<SupplierDto[]> => [dbSupplier, apiSupplier],
                    },
                },
            ],
        }).compile();

        service = module.get<GoodService>(GoodService);
    });

    it('should be defined', async () => {
        expect(service).toBeDefined();
    });

    it('test createOrUpdate', async () => {
        await service.createOrUpdate({ alias: 'max232', code: 'code', warehouses: [], supplier: 'compel' });
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
});

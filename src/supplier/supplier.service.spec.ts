import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from './supplier.service';
import { getModelToken } from '@nestjs/mongoose';
import { Supplier } from './supplier.schema';

const find = jest.fn().mockResolvedValue({ toObject: () => ({}) });
const findOne = jest.fn().mockResolvedValue({ toObject: () => ({}) });
const findById = jest.fn().mockResolvedValue({ toObject: () => ({}) });

describe('SupplierService', () => {
    let service: SupplierService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SupplierService,
                {
                    provide: getModelToken(Supplier.name),
                    useValue: { find, findOne, findById },
                },
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
});

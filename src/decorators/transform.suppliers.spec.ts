import { TransformSuppliers } from './transform.suppliers';
import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from '../supplier/supplier.service';
import { SupplierDto } from '../supplier/supplier.dto';
import { PriceRequestDto } from '../price/dtos/price.request.dto';

describe('GoodService', () => {
    let supplierService: SupplierService;
    let decorator: TransformSuppliers;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: SupplierService,
                    useValue: {
                        alias: async () => ({
                            id: '1',
                            alias: 'first',
                            deliveryTime: 1,
                        }),
                        id: async (id: string): Promise<SupplierDto | null> => {
                            switch (id) {
                                case '0':
                                    return {
                                        id: '0',
                                        alias: 'zero',
                                        deliveryTime: 0,
                                        supplierCodes: {
                                            '0': 'O',
                                            '1': 'I',
                                            I: '1',
                                            O: '0',
                                        },
                                    };
                                case '1':
                                    return {
                                        id: '1',
                                        alias: 'first',
                                        deliveryTime: 1,
                                    };
                                default:
                                    return null;
                            }
                        },
                    },
                },
            ],
        }).compile();
        supplierService = module.get<SupplierService>(SupplierService);
        decorator = new TransformSuppliers(supplierService);
    });
    it('should be defined', async () => {
        expect(decorator).toBeDefined();
    });
    it('without supplier & suppliers', async () => {
        const request: PriceRequestDto = {
            search: '123',
            withCache: false,
            dbOnly: false,
        };
        const response = await decorator.transform(request);
        expect(response).toEqual({
            search: '123',
            withCache: false,
            dbOnly: false,
        });
    });
    it('with alias', async () => {
        const request: PriceRequestDto = {
            search: '123',
            withCache: false,
            dbOnly: false,
            supplierAlias: '1',
        };
        const response = await decorator.transform(request);
        expect(response).toEqual({
            search: '123',
            withCache: false,
            dbOnly: false,
            supplierAlias: '1',
            supplier: {
                id: '1',
                alias: 'first',
                deliveryTime: 1,
            },
        });
    });
    it('with supplier', async () => {
        const request: PriceRequestDto = {
            search: '123',
            withCache: false,
            dbOnly: false,
            supplier: '1',
        };
        const response = await decorator.transform(request);
        expect(response).toEqual({
            search: '123',
            withCache: false,
            dbOnly: false,
            supplier: {
                id: '1',
                alias: 'first',
                deliveryTime: 1,
            },
        });
    });
    it('with suppliers', async () => {
        const request: PriceRequestDto = {
            search: '123',
            withCache: false,
            dbOnly: false,
            suppliers: ['1', '2', '3'],
        };
        const response = await decorator.transform(request);
        expect(response).toEqual({
            search: '123',
            withCache: false,
            dbOnly: false,
            suppliers: ['1', '2', '3'],
        });
    });
    it('with supplier & suppliers not convert', async () => {
        const request: PriceRequestDto = {
            search: '123',
            withCache: false,
            dbOnly: false,
            supplier: '1',
            suppliers: ['1', '2', '3'],
        };
        const response = await decorator.transform(request);
        expect(response).toEqual({
            search: '123',
            withCache: false,
            dbOnly: false,
            supplier: {
                id: '1',
                alias: 'first',
                deliveryTime: 1,
            },
            suppliers: ['1', '2', '3'],
        });
    });
    it('with supplier & suppliers and convert', async () => {
        const request: PriceRequestDto = {
            search: '123',
            withCache: false,
            dbOnly: false,
            supplier: '0',
            suppliers: ['0', '1'],
        };
        const response = await decorator.transform(request);
        expect(response).toEqual({
            search: '123',
            withCache: false,
            dbOnly: false,
            supplier: {
                id: '0',
                alias: 'zero',
                deliveryTime: 0,
                supplierCodes: {
                    '0': 'O',
                    '1': 'I',
                    I: '1',
                    O: '0',
                },
            },
            suppliers: ['O', 'I'],
        });
    });
});

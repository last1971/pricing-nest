import { PriceSupplierInterceptor } from './price.supplier.interceptor';
import { firstValueFrom, Observable, of } from 'rxjs';
import { GoodDto } from '../good/dtos/good.dto';
import { cloneDeep } from 'lodash';
import { Test, TestingModule } from '@nestjs/testing';
import { SupplierService } from '../supplier/supplier.service';
import { SupplierDto } from '../supplier/supplier.dto';

describe('Test PriceInterceptor', () => {
    let priceInterceptor: PriceSupplierInterceptor;
    const context = {
        switchToHttp: jest.fn().mockReturnThis(),
        getRequest: jest.fn().mockReturnThis(),
        getArgByIndex: jest.fn(),
        getArgs: jest.fn(),
        getClass: jest.fn(),
        getHandler: jest.fn(),
        getType: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
    };
    const updatedAt = new Date();
    const data: GoodDto[] = [
        {
            supplier: '1',
            code: '111',
            goodId: {
                '1': 'AAA',
                '2': 'BBB',
            },
            alias: '111',
            warehouses: [],
            updatedAt,
        },
        {
            supplier: '2',
            code: '222',
            alias: '222',
            warehouses: [],
            updatedAt,
        },
    ].map((data) => new GoodDto(data));
    let expectedData: GoodDto[];
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
                            supplierCodes: {
                                '1': 'A',
                                '2': 'B',
                            },
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
        const supplierService = module.get<SupplierService>(SupplierService);
        priceInterceptor = new PriceSupplierInterceptor(supplierService);
        expectedData = cloneDeep(data);
    });
    it('Without supplier', async () => {
        const testContext: any = cloneDeep(context);
        testContext.switchToHttp = () => ({
            getRequest: () => ({ query: { search: '123', dbOnly: false, withCache: false } }),
        });
        const handler = {
            handle: jest.fn(() => of(cloneDeep(data))),
        };
        const response = await firstValueFrom(
            (await priceInterceptor.intercept(testContext, handler)) as Observable<any>,
        );
        expectedData[0].goodId = null;
        expectedData[1].goodId = null;
        expect(response).toEqual(expectedData);
    });
    it('With supplier', async () => {
        const testContext: any = cloneDeep(context);
        testContext.switchToHttp = () => ({
            getRequest: () => ({
                query: {
                    search: '123',
                    dbOnly: false,
                    withCache: false,
                    supplierAlias: 'first',
                },
            }),
        });
        const handler = {
            handle: jest.fn(() => of(cloneDeep(data))),
        };
        const response = await firstValueFrom(
            (await priceInterceptor.intercept(testContext, handler)) as Observable<any>,
        );
        expectedData[0].supplier = 'A';
        expectedData[0].goodId = 'AAA';
        expectedData[1].supplier = 'B';
        expect(response).toEqual(expectedData);
    });
});

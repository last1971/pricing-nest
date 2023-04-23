import { PriceSupplierInterceptor } from './price.supplier.interceptor';
import { firstValueFrom, Observable, of } from 'rxjs';
import { GoodDto } from '../good/dtos/good.dto';
import { cloneDeep } from 'lodash';

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
    beforeEach(() => {
        priceInterceptor = new PriceSupplierInterceptor();
        expectedData = cloneDeep(data);
    });
    it('Without supplier', async () => {
        const handler = {
            handle: jest.fn(() =>
                of({
                    data: cloneDeep(data),
                    request: { search: '123', dbOnly: false, withCache: false },
                }),
            ),
        };
        const response = await firstValueFrom(priceInterceptor.intercept(context, handler) as Observable<any>);
        expectedData[0].goodId = null;
        expectedData[1].goodId = null;
        expect(response).toEqual(expectedData);
    });
    it('With supplier', async () => {
        const handler = {
            handle: jest.fn(() =>
                of({
                    data: cloneDeep(data),
                    request: {
                        search: '123',
                        dbOnly: false,
                        withCache: false,
                        supplier: {
                            deliveryTime: 0,
                            id: '1',
                            alias: 'first',
                            supplierCodes: {
                                '1': 'A',
                                '2': 'B',
                            },
                        },
                    },
                }),
            ),
        };
        const response = await firstValueFrom(priceInterceptor.intercept(context, handler) as Observable<any>);
        expectedData[0].supplier = 'A';
        expectedData[0].goodId = 'AAA';
        expectedData[1].supplier = 'B';
        expect(response).toEqual(expectedData);
    });
});

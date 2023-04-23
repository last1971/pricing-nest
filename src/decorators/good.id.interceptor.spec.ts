import { GoodIdInterceptor } from './good.id.interceptor';
import { GoodDto } from '../good/dtos/good.dto';
import { cloneDeep } from 'lodash';
import { GoodService } from '../good/good.service';
import { firstValueFrom, Observable, of } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';
import crypto from 'crypto';

describe('Test GoodId Interceptor', () => {
    let goodIdInterceptor: GoodIdInterceptor;
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
    const find = jest.fn().mockReturnValue([
        {
            id: crypto.createHash('md5').update('1111').digest('hex'),
            goodId: {
                '1': 'AAA',
                '2': 'BBB',
            },
        },
    ]);
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: GoodService,
                    useValue: { find },
                },
            ],
        }).compile();
        const goodService = module.get<GoodService>(GoodService);
        goodIdInterceptor = new GoodIdInterceptor(goodService);
    });
    it('test intercept', async () => {
        const handler = {
            handle: jest.fn(() => of(cloneDeep(data))),
        };
        const response = await firstValueFrom(goodIdInterceptor.intercept(context, handler) as Observable<any>);
        expect(response[0].goodId).toEqual({
            '1': 'AAA',
            '2': 'BBB',
        });
        expect(response[1].goodId).toBeNull();
    });
});

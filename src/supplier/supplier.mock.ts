import { AbstractParser } from '../parsers/api-parsers/abstract.parser';
import { GoodDto } from '../good/dtos/good.dto';
import { isArray } from 'lodash';
import { Source } from '../good/dtos/source.enum';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';

export class MockParser1 extends AbstractParser {
    getAlias(): string {
        return 'first';
    }
    getCurrencyAlfa(): string {
        return 'V01';
    }
    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().post('url');
    }
    async parseResponse(response: any): Promise<GoodDto[]> {
        if (isArray(response)) {
            response.forEach((item) => (item.source = Source.Api));
        }
        return response;
    }
}
class MockParser2 extends AbstractParser {
    getAlias(): string {
        return 'second';
    }
    getCurrencyAlfa(): string {
        return 'V02';
    }
    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().get('url');
    }
    async parseResponse(response: any): Promise<GoodDto[]> {
        if (isArray(response)) {
            response.forEach((item) => (item.source = Source.Api));
        }
        return response;
    }
}
export class MockParser3 extends AbstractParser {
    getAlias(): string {
        return 'third';
    }
    getCurrencyAlfa(): string {
        return 'V03';
    }
    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().get('url');
    }
    async parseResponse(response: any): Promise<GoodDto[]> {
        if (isArray(response)) {
            response.forEach((item) => (item.source = Source.Api));
        }
        return response;
    }
}
export const parseResponse = jest
    .spyOn(MockParser1.prototype, 'parseResponse')
    .mockImplementation(async (response: any): Promise<GoodDto[]> => {
        if (isArray(response)) {
            response.forEach((item) => (item.source = Source.Api));
        }
        return response;
    });

export const SupplierMock = {
    apiOnly: async () => [
        { alias: 'first', id: 'first', deliveryTime: 1 },
        { alias: 'second', id: 'second', deliveryTime: 2 },
        { alias: 'third', id: 'third', deliveryTime: 3 },
    ],
    apiParsers: () => ({
        first: MockParser1,
        second: MockParser2,
        third: MockParser3,
    }),
};

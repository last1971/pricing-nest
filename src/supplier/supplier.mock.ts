import { AbstractParser } from '../parsers/api-parsers/abstract.parser';
import { GoodDto } from '../good/dtos/good.dto';
import { isArray } from 'lodash';
import { Source } from '../good/dtos/source.enum';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';

export class MockParser extends AbstractParser {
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
export const parseResponse = jest
    .spyOn(MockParser.prototype, 'parseResponse')
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
    ],
    apiParsers: () => ({
        first: MockParser,
        second: MockParser,
    }),
};

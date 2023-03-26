import { AbstractParser } from '../parsers/api-parsers/AbstractParser';
import { GoodDto } from '../good/dtos/good.dto';
import { isArray } from 'lodash';
import { Source } from '../good/dtos/source.enum';

export class MockParser extends AbstractParser {
    getAlias(): string {
        return 'first';
    }

    getCurrencyAlfa(): string {
        return 'V01';
    }

    getParams(): any {
        return [];
    }

    getUrl(): string {
        return 'url';
    }

    parseResponse(response: any): GoodDto[] {
        if (isArray(response)) {
            response.forEach((item) => (item.source = Source.Api));
        }
        return response;
    }
}
export const parseResponse = jest
    .spyOn(MockParser.prototype, 'parseResponse')
    .mockImplementation((response: any): GoodDto[] => {
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

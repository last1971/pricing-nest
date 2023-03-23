import { AbstractParser } from '../parsers/AbstractParser';
import { GoodDto } from '../good/dtos/good.dto';
import { isArray } from 'lodash';
import { Source } from '../good/dtos/source.enum';

class MockParserClass extends AbstractParser {
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
export const MockParser = MockParserClass as jest.Mock<MockParserClass>;
export const SupplierMock = {
    apiOnly: async () => [
        { alias: 'first', id: 'first' },
        { alias: 'second', id: 'second' },
    ],
    apiParsers: () => ({
        first: MockParser,
        second: MockParser,
    }),
};

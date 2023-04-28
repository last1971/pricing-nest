import { AbstractParser } from './abstract.parser';
import { AxiosResponse } from 'axios';
import { GoodDto } from '../../good/dtos/good.dto';
// import * as htmlparser2 from 'htmlparser2';
import { Observable } from 'rxjs';

export class ChipDipParser extends AbstractParser {
    getAlias(): string {
        return 'chipdip';
    }

    getCurrencyAlfa(): string {
        return 'RUB';
    }

    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().get('https://chipdip.ru/search', {
            params: {
                searchtext: this.search,
            },
        });
    }

    parseResponse(response: any): Promise<GoodDto[]> {
        // const dom = htmlparser2.parseDocument(response);
        return Promise.resolve([]);
    }
}

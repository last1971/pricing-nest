import { CompelParser } from './compel.parser';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { v4 } from 'uuid';

export class CompelDmsParser extends CompelParser {
    getAlias(): string {
        return 'compeldms';
    }
    async getResponse(): Promise<Observable<AxiosResponse<any, any>>> {
        const compel = await this.parsers.getVault().get('compel');
        return this.parsers.getHttp().post(compel.API_URL as string, {
            id: v4(),
            method: 'search_item_ext',
            params: {
                user_hash: compel.HASH,
                query_string: this.search + '*',
            },
        });
    }
}

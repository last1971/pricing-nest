import { CompelParser } from './compel.parser';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { v4 } from 'uuid';

export class CompelDmsParser extends CompelParser {
    getAlias(): string {
        return 'compeldms';
    }
    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().post(this.parsers.getConfigService().get<string>('API_COMPEL_URL'), {
            id: v4(),
            method: 'search_item_ext',
            params: {
                user_hash: this.parsers.getConfigService().get<string>('API_COMPEL_HASH'),
                query_string: this.search + '*',
            },
        });
    }
}

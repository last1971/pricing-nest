import { CompelParser } from './compel.parser';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { v4 } from 'uuid';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';

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

    async parseResponse(response: any): Promise<GoodDto[]> {
        // Вызываем родительский метод для получения базовых данных
        const goods = await super.parseResponse(response);
        
        // Добавляем rawResponse для каждого товара
        if (response.result?.items) {
            goods.forEach((good, index) => {
                const item = response.result.items[index];
                if (item) {
                    good.rawResponse = item;
                }
            });
        }
        
        return goods;
    }
}

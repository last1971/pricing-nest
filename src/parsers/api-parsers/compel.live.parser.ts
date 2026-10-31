import { CompelParser } from './compel.parser';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { v4 } from 'uuid';
import { SupplierDto } from '../../supplier/supplier.dto';

export const LIVE_API_TIMEOUT_DEFAULT = 5000;

// Живой остаток одной детали Компэла для корзины магазина: точное имя (без «*»), без расчёта цен — 0,3–4 с против 8–20 с
// у поиска со звёздочкой. Свой ключ ошибок ('error : compel-live'): таймаут здесь не блокирует обычный поиск цен.
export class CompelLiveParser extends CompelParser {
    getAlias(): string {
        return 'compel-live';
    }
    getSupplier(): SupplierDto {
        return this.parsers.getSuppliers().get('compel');
    }
    protected getTimeout(): number {
        return parseInt(this.parsers.getConfigService().get('LIVE_API_TIMEOUT')) || LIVE_API_TIMEOUT_DEFAULT;
    }
    protected calculatePrice(): boolean {
        return false;
    }
    async getResponse(): Promise<Observable<AxiosResponse<any, any>>> {
        const compel = await this.parsers.getVault().get('compel');
        return this.parsers.getHttp().post(compel.API_URL as string, {
            id: v4(),
            method: 'search_item_name_h',
            params: {
                user_hash: compel.HASH,
                query_string: this.search,
                calc_price: this.calculatePrice(),
                calc_qty: true,
            },
        });
    }
}

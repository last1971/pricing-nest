import { PromelecParser } from './promelec.parser';
import { SupplierDto } from '../../supplier/supplier.dto';
import { LIVE_API_TIMEOUT_DEFAULT } from './compel.live.parser';
import { ApiResponseDto } from './api.response.dto';
import { markOfferFailure } from './offer.request.policy';

/** Отдельный ключ ошибок: оформление не блокирует обычный поиск поставщика. */
export class PromelecOfferParser extends PromelecParser {
    public supplierCode = '';
    public lookupByCode = false;
    getAlias(): string { return 'promelec-offer'; }
    getSupplier(): SupplierDto { return this.parsers.getSuppliers().get('promelec'); }
    protected getMinSearchLength(): number { return 1; }
    protected lookupParameters(): { method: string; name?: string; item_id?: number } {
        const code = Number(this.supplierCode);
        // items_data_find отклоняет имена короче 5 символов. Курсор возвращает item_id > заданного;
        // запрашиваем страницу с code-1, а PriceService затем принимает только точное совпадение кода.
        if ((this.lookupByCode || this.search.length < 5) && Number.isSafeInteger(code) && code > 0) {
            return { method: 'items_data_get', item_id: code - 1 };
        }
        return super.lookupParameters();
    }
    async checkError(response: ApiResponseDto): Promise<ApiResponseDto> { return response; }
    async obtainError(_error: Error, response: ApiResponseDto): Promise<void> { await markOfferFailure(response); }
    protected getTimeout(): number {
        return parseInt(this.parsers.getConfigService().get('LIVE_API_TIMEOUT')) || LIVE_API_TIMEOUT_DEFAULT;
    }
}

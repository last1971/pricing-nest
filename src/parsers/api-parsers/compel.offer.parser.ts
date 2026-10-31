import { CompelLiveParser } from './compel.live.parser';
import { ApiResponseDto } from './api.response.dto';
import { markOfferFailure } from './offer.request.policy';

/** Тот же точный поиск Компэла, но с ценовыми ступенями для окончательного подтверждения заказа. */
export class CompelOfferParser extends CompelLiveParser {
    getAlias(): string { return 'compel-offer'; }
    protected calculatePrice(): boolean { return true; }
    async checkError(response: ApiResponseDto): Promise<ApiResponseDto> { return response; }
    async obtainError(_error: Error, response: ApiResponseDto): Promise<void> { await markOfferFailure(response); }
}

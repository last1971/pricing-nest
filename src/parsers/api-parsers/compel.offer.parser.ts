import { CompelLiveParser } from './compel.live.parser';

/** Тот же точный поиск Компэла, но с ценовыми ступенями для окончательного подтверждения заказа. */
export class CompelOfferParser extends CompelLiveParser {
    getAlias(): string { return 'compel-offer'; }
    protected calculatePrice(): boolean { return true; }
}

import { Injectable } from '@nestjs/common';
import { PriceRequestDto } from './dtos/price.request.dto';
import { GoodDto } from '../good/dtos/good.dto';
import { ParsersService } from '../parsers/parsers.service';
import { GoodService } from '../good/good.service';
import { CompelLiveParser } from '../parsers/api-parsers/compel.live.parser';
import { LiveStockDto } from './dtos/live.stock.dto';
import { Source } from '../good/dtos/source.enum';
import { WarehouseDto } from '../good/dtos/warehouse.dto';
import { chunk } from 'lodash';
import { CompelOfferParser } from '../parsers/api-parsers/compel.offer.parser';
import { PromelecOfferParser } from '../parsers/api-parsers/promelec.offer.parser';

const LIVE_PARSERS = { compel: CompelLiveParser };
const OFFER_PARSERS = { compel: CompelOfferParser, promelec: PromelecOfferParser };
const LIVE_PARALLEL = 5;
export const LIVE_MAX_CODES = 50;

@Injectable()
export class PriceService {
    constructor(
        private parsers: ParsersService,
        private goodService: GoodService,
    ) {}
    async getPrices(request: PriceRequestDto): Promise<GoodDto[]> {
        const searchers: Promise<GoodDto[]>[] = [this.goodService.search(request)];
        if (!request.dbOnly) {
            searchers.push(this.parsers.search(request));
        }
        return (await Promise.all(searchers)).flat();
    }

    // Живой остаток по кодам поставщика: спрашиваем API точным именем, не ответил — остаток из базы (суточный файл).
    // Нет такого кода у поставщика — null. Параллельно не больше LIVE_PARALLEL запросов.
    async live(alias: string, codes: string[]): Promise<Record<string, LiveStockDto | null>> {
        const goods = await this.fetchLive(alias, codes, LIVE_PARSERS);
        return Object.fromEntries(Object.entries(goods).map(([code, good]) => [code, good ? this.stock(good.warehouses ?? [], good.source === Source.Api ? 'api' : 'db') : null]));
    }

    /** Полный ответ для Sylius: выбор разрешённых складов и наценка остаются общими с импортом. */
    async offers(alias: string, codes: string[]): Promise<Record<string, GoodDto | null>> {
        return this.fetchLive(alias, codes, OFFER_PARSERS);
    }

    private async fetchLive(alias: string, codes: string[], parsers: Record<string, typeof CompelLiveParser | typeof PromelecOfferParser>): Promise<Record<string, GoodDto | null>> {
        const parserClass = parsers[alias];
        const result: Record<string, GoodDto | null> = {};
        codes.forEach((code) => (result[code] = null));
        const goods = await this.goodService.findBySupplierCodes(alias, codes);
        const inDb = new Set(goods.map(g => g.code));
        if (alias === 'promelec' && parsers === OFFER_PARSERS) {
            // Код уже есть в заказе, даже если позиция ещё не попала в накопленную базу поиска.
            for (const code of codes) {
                if (!inDb.has(code) && /^[1-9]\d*$/.test(code)) goods.push(new GoodDto({ code, alias: code, warehouses: [] }));
            }
        }
        for (const part of chunk(goods, LIVE_PARALLEL)) {
            await Promise.all(
                part.map(async (good) => {
                    const name = good.parameters?.find((p) => p.name === 'name')?.stringValue ?? good.alias;
                    const fromDb = new GoodDto({ ...good, source: Source.Db });
                    if (!parserClass) {
                        result[good.code] = fromDb;
                        return;
                    }
                    const parser = new parserClass({ search: name, withCache: false, dbOnly: false }, this.parsers);
                    if (parser instanceof PromelecOfferParser) {
                        parser.supplierCode = good.code;
                        parser.lookupByCode = !inDb.has(good.code);
                    }
                    try {
                        const found = (await parser.parse()).find((g) => g.code === good.code && g.source === Source.Api);
                        result[good.code] = found ?? fromDb;
                    } catch {
                        result[good.code] = fromDb;
                    }
                }),
            );
        }
        return result;
    }
    // Первый склад с остатком, иначе первый склад; нет складов — null
    private stock(warehouses: WarehouseDto[], source: 'api' | 'db'): LiveStockDto | null {
        const warehouse = warehouses.find((w) => w.quantity > 0) ?? warehouses[0];
        if (!warehouse) return null;
        return {
            warehouse: warehouse.name,
            quantity: Math.max(0, warehouse.quantity ?? 0),
            multiple: Math.max(1, warehouse.multiple ?? 1),
            deliveryTime: warehouse.deliveryTime ?? 0,
            source,
        };
    }
}

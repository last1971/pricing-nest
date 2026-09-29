import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { PriceDto } from '../../good/dtos/price.dto';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { find, max } from 'lodash';
import { DateTime } from 'luxon';

// xml2js с explicitArray: false отдаёт одиночный тег объектом, повторяющийся — массивом
export const toArray = <T>(value: T | T[] | undefined): T[] => (value ? (Array.isArray(value) ? value : [value]) : []);

const toInt = (value: unknown): number => parseInt(String(value ?? '')) || 0;

export interface RuelPack {
    norma: number;
    quantity: number;
}

// packets — остаток по упаковкам: norma штук в упаковке, quant — число упаковок (не штук!).
// Одинаковые нормы (разные года выпуска) складываем. Сортировка по норме.
export function ruelPacks(good: any): RuelPack[] {
    const byNorma = new Map<number, number>();
    toArray(good.packets).forEach((packet: any) => {
        const norma = toInt(packet.norma);
        const packs = toInt(packet.quant);
        if (norma > 0 && packs > 0) {
            byNorma.set(norma, (byNorma.get(norma) ?? 0) + norma * packs);
        }
    });
    return Array.from(byNorma, ([norma, quantity]) => ({ norma, quantity })).sort((a, b) => a.norma - b.norma);
}

// Розница до 3 упаковок, опт от 3 упаковок, vip — закупочная цена
export function ruelPrices(good: any, multiple: number, currency: string): PriceDto[] {
    return [
        { value: parseFloat(good.price), min: multiple, max: multiple * 3 - 1, currency, isOrdinary: true },
        { value: parseFloat(good.optprice), min: multiple * 3, max: 0, currency, isOrdinary: true },
        { value: parseFloat(good.vipprice), min: multiple, max: 0, currency, isOrdinary: false },
    ].filter((price) => price.value > 0);
}

// Честный знак и ТН ВЭД — в options склада, как у promelec и radiodetali
export function ruelOptions(good: any): { marking?: boolean; tnved?: string } {
    const truesign = good.truesign === undefined || good.truesign === null ? '' : String(good.truesign).trim();
    const tnved = good.tnved ? String(good.tnved).trim() : '';
    return {
        ...(truesign !== '' ? { marking: !!+truesign } : {}),
        ...(tnved ? { tnved } : {}),
    };
}

// Норма упаковки: из параметра «Упаковка», если там штуки («REEL, 3000 шт.», «3000»),
// иначе самая крупная упаковка на складе
export function ruelPackageQuantity(good: any, packs: RuelPack[]): number {
    const value = String(find(toArray(good.techinfo?.parameter), { name: 'Упаковка' })?.value ?? '').trim();
    const match = value.match(/^(\d+)$/) ?? value.match(/(\d+)\s*шт/);
    if (match) return parseInt(match[1]);
    const largest = max(packs.map((pack) => pack.norma)) ?? 0;
    return largest > 1 ? largest : 0;
}

function arrivesDays(date: string, now: DateTime): number {
    const days = Math.round(DateTime.fromFormat(String(date ?? ''), 'yyyyLLdd').diff(now, 'days').days);
    return isNaN(days) ? 0 : Math.max(days, 0);
}

// На каждую норму упаковки — свой склад со своей кратностью и минимальным количеством.
// Самая мелкая упаковка — CENTER, остальные CENTER-<норма>.
export function ruelWarehouses(
    good: any,
    deliveryTime: number,
    currency: string,
    now: DateTime = DateTime.now(),
): WarehouseDto[] {
    const options = ruelOptions(good);
    const warehouse = (name: string, days: number, quantity: number, multiple: number, locationId: string) => ({
        name,
        deliveryTime: deliveryTime + days,
        quantity,
        multiple,
        prices: ruelPrices(good, multiple, currency),
        options: { location_id: locationId, ...options },
    });
    const normaArrives = toInt(good.norma_arrives) || 1;
    // Остаток есть, а упаковок в файле нет — один склад с кратностью 1
    const packs = ruelPacks(good);
    const stock = packs.length || !toInt(good.quant) ? packs : [{ norma: 1, quantity: toInt(good.quant) }];
    return [
        ...stock.map((pack, index) =>
            warehouse(index === 0 ? 'CENTER' : `CENTER-${pack.norma}`, 0, pack.quantity, pack.norma, 'ОДИНЦОВО'),
        ),
        ...(toInt(good.quant_arrived)
            ? [warehouse('ARRIVED', 2, toInt(good.quant_arrived), normaArrives, 'НА ПРИЕМКЕ')]
            : []),
        ...(toInt(good.quant_arrives)
            ? [
                  warehouse(
                      'TRANSIT',
                      arrivesDays(good.date_arrives, now),
                      toInt(good.quant_arrives),
                      normaArrives,
                      'ЕДЕТЪ',
                  ),
              ]
            : []),
        ...(toInt(good.quant_industry)
            ? [warehouse('PRODUCED', 100, toInt(good.quant_industry), 1, 'В ПРОИЗВОДСТВЕ')]
            : []),
    ].filter((w) => w.prices.length > 0);
}

export class RuElectronicsParser extends ScheduleParser {
    protected supplierAlias = 'ruelectronics';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const ruel = await this.schedule.getVault().get('ruelectronics');
        const res = await this.schedule.getHttp().get(ruel.URL_XML as string);
        const { data } = await firstValueFrom(res);
        const { product } = await parseStringPromise(data, {
            explicitRoot: false,
            explicitArray: false,
            mergeAttrs: true,
        });
        const promises = toArray(product).map((good: any) => {
            const body = find(toArray(good.techinfo?.parameter), { name: 'Корпус' });
            const packageQuantity = ruelPackageQuantity(good, ruelPacks(good));
            return this.schedule.getGoods().createOrUpdate(
                new GoodDto({
                    alias: good.product_name,
                    code: good.article,
                    supplier: this.supplier.id,
                    source: Source.Db,
                    updatedAt: new Date(),
                    parameters: [
                        { name: 'name', stringValue: good.product_name },
                        ...(good.brand ? [{ name: 'producer', stringValue: good.brand }] : []),
                        ...(packageQuantity ? [{ name: 'packageQuantity', numericValue: packageQuantity }] : []),
                        ...(body ? [{ name: 'case', stringValue: body.value }] : []),
                    ],
                    warehouses: ruelWarehouses(good, this.supplier.deliveryTime, this.currency.id),
                }),
            );
        });
        await Promise.all(promises);
    }
}

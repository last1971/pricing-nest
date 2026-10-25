import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { Open } from 'unzipper';
import { GoodDto } from '../../good/dtos/good.dto';
import { PriceDto } from '../../good/dtos/price.dto';
import { ParameterDto } from '../../good/dtos/parameter.dto';
import { times } from 'lodash';

// Строка COMPELDISTI2.dbf: CODE, NAME, PRODUCER (код производителя Компэла: YAG, MUR…), CORPUS, QNT_PACK, MOQ, QTY,
// PRICE_1..8/QTY_1..8 (ступени в USD), CLASS/CLASS_NAME (категория Компэла, дерево по коду), WEIGHT (граммы), CHZ (Yes/No —
// Честный знак), TNVED. Сайт Компэла (infosheet) не источник: значения характеристик там картинками.

const str = (value: unknown): string => (value === undefined || value === null ? '' : String(value).trim());

// Ступени цены: первая всегда, дальше пока есть количество или цена растёт (конец списка в DBF — нули)
export function compelPrices(good: any, currency: string): PriceDto[] {
    const multiple = good.MOQ;
    return times(7)
        .slice(1)
        .filter((i) => i === 1 || good['QTY_' + i] !== 0 || good['PRICE_' + i] > good['PRICE_' + (i - 1)])
        .map(
            (i, j, ij): PriceDto => ({
                value: good['PRICE_' + i],
                min: good['QTY_' + i],
                max: i === ij.length ? 0 : good['QTY_' + (i + 1)] - multiple || multiple,
                currency,
                isOrdinary: false,
            }),
        );
}

// Параметры товара: имя, производитель, корпус, упаковка — как раньше; категория (код и имя) и вес (г) — для карточек магазина
export function compelParameters(good: any, pieceUnit: string, gramUnit: string): ParameterDto[] {
    const weight = parseFloat(str(good.WEIGHT));
    return [
        { name: 'name', stringValue: good.NAME },
        ...(good.PRODUCER ? [{ name: 'producer', stringValue: good.PRODUCER }] : []),
        ...(good.CORPUS ? [{ name: 'case', stringValue: good.CORPUS }] : []),
        { name: 'packageQuantity', numericValue: good.QNT_PACK, unit: pieceUnit },
        ...(str(good.CLASS) ? [{ name: 'categoryCode', stringValue: str(good.CLASS) }] : []),
        ...(str(good.CLASS_NAME) ? [{ name: 'category', stringValue: str(good.CLASS_NAME) }] : []),
        ...(weight > 0 ? [{ name: 'weight', numericValue: weight, unit: gramUnit }] : []),
    ];
}

// Честный знак и ТН ВЭД — в options склада, как у promelec, radiodetali и ruelectronics
export function compelOptions(good: any): { marking?: boolean; tnved?: string } {
    const chz = str(good.CHZ).toLowerCase();
    const tnved = str(good.TNVED);
    return {
        ...(chz !== '' ? { marking: chz === 'yes' } : {}),
        ...(tnved ? { tnved } : {}),
    };
}

export class CompelDbfParser extends ScheduleParser {
    protected supplierAlias = 'compel';
    protected currencyAlfa3 = 'USD';

    async parse(): Promise<void> {
        const gram = await this.schedule.getUnitService().name('грамм');
        const compel = await this.schedule.getVault().get('compel');
        const res = await this.schedule.getHttp().get(compel.DBF_URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const directory = await Open.buffer(response.data);
        const file = await directory.files[0].buffer();
        const workbook = XLSX.read(file, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const promises = XLSX.utils.sheet_to_json(worksheet).map((good: any) =>
            this.schedule.getGoods().createOrUpdate(
                new GoodDto({
                    alias: good.NAME,
                    code: good.CODE.toString(),
                    supplier: this.supplier.id,
                    updatedAt: new Date(),
                    parameters: compelParameters(good, this.piece.id, gram.id),
                    warehouses: [
                        {
                            name: 'CENTER',
                            deliveryTime: this.supplier.deliveryTime,
                            quantity: good.QTY,
                            multiple: good.MOQ,
                            options: { pos: !!good.POS, location_id: 'CENTER', ...compelOptions(good) },
                            prices: compelPrices(good, this.currency.id),
                        },
                    ],
                }),
            ),
        );
        await Promise.all(promises);
    }
}

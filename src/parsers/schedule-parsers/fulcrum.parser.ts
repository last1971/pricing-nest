import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import { PriceDto } from '../../good/dtos/price.dto';
import { GoodDto } from '../../good/dtos/good.dto';
import * as iconv from 'iconv-lite';

export interface FulcrumRow {
    code: string;
    product: string;
    manufacturer: string;
    quantity: number;
    price: number;
    priceOpt: number;
}

export function parseFulcrumPrice(value: string): number {
    return parseFloat(value.replace(',', '.'));
}

// Опт действует от 10 шт или от суммы 1000 руб (что раньше), но не раньше 2 шт
export function fulcrumOptMin(price: number): number {
    return Math.max(2, Math.min(10, Math.ceil(1000 / price)));
}

export function buildFulcrumPrices(row: FulcrumRow, currencyId: string): PriceDto[] {
    if (!row.priceOpt || isNaN(row.priceOpt)) {
        return [{ value: row.price, min: 1, max: 0, currency: currencyId, isOrdinary: false }];
    }
    const optMin = fulcrumOptMin(row.price);
    return [
        { value: row.price, min: 1, max: optMin - 1, currency: currencyId, isOrdinary: false },
        { value: row.priceOpt, min: optMin, max: 0, currency: currencyId, isOrdinary: false },
    ];
}

// Product не уникален (один код у разных производителей), поэтому ключ Product|Manufacturer;
// полные дубли (разные партии) схлопываем, оставляя строку с бо́льшим количеством
export function parseFulcrumCsv(csv: string): FulcrumRow[] {
    const lines = csv.split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(';').map((col) => col.trim());
    const iProduct = headers.indexOf('Product');
    const iManufacturer = headers.indexOf('Manufacturer');
    const iQuantity = headers.indexOf('Quantity');
    const iPrice = headers.indexOf('Price');
    const iPriceOpt = headers.indexOf('Price_Opt');

    const byCode = new Map<string, FulcrumRow>();
    for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(';').map((col) => col.trim());
        if (columns.length < 5) continue;

        const product = columns[iProduct];
        const manufacturer = columns[iManufacturer];
        if (!product) continue;

        const quantity = parseFloat(columns[iQuantity]);
        if (isNaN(quantity) || quantity <= 0) continue;

        const price = parseFulcrumPrice(columns[iPrice]);
        if (isNaN(price) || price <= 0) continue;

        const row: FulcrumRow = {
            code: product + '|' + manufacturer,
            product,
            manufacturer,
            quantity,
            price,
            priceOpt: parseFulcrumPrice(columns[iPriceOpt]),
        };
        const existing = byCode.get(row.code);
        if (!existing || row.quantity > existing.quantity) {
            byCode.set(row.code, row);
        }
    }
    return Array.from(byCode.values());
}

export class FulcrumParser extends ScheduleParser {
    protected supplierAlias = 'fulcrum';
    protected currencyAlfa3 = 'RUB';

    async parse(): Promise<void> {
        const fulcrum = await this.schedule.getVault().get('fulcrum');
        const res = await this.schedule.getHttp().get(fulcrum.URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const csv = iconv.decode(response.data, 'win1251');
        const rows = parseFulcrumCsv(csv);
        const promises: Promise<any>[] = rows.map((row) => {
            const good: GoodDto = new GoodDto({
                alias: row.product,
                code: row.code,
                supplier: this.supplier.id,
                updatedAt: new Date(),
                parameters: [
                    { name: 'name', stringValue: row.product },
                    ...(row.manufacturer && row.manufacturer !== '<N/D>'
                        ? [{ name: 'producer', stringValue: row.manufacturer }]
                        : []),
                ],
                warehouses: [
                    {
                        name: 'CENTER',
                        deliveryTime: this.supplier.deliveryTime,
                        quantity: row.quantity,
                        multiple: 1,
                        prices: buildFulcrumPrices(row, this.currency.id),
                    },
                ],
            });
            return this.schedule.getGoods().createOrUpdate(good);
        });
        await Promise.all(promises);
    }
}

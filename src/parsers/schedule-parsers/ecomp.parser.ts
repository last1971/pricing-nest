import { ScheduleParser } from './schedule.parser';
import * as XLSX from 'xlsx';
import { GoodDto } from '../../good/dtos/good.dto';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { CurrencyDto } from '../../currency/dto/currency.dto';
import { ftpDownload } from '../../helpers/ftp';

export const ECOMP_GOLD_FILE = 'Gold.xlsx';
export const ECOMP_ORDER_FILE = 'GoldOrder.xlsx';
export const ECOMP_GOLD_SHEETS = ['Франчайз', 'Свободный рынок'];

// Партия товара: остаток, цена и срок в неделях (0 — лежит на складе)
export interface EcompLot {
    quantity: number;
    price: number;
    weeks: number;
}

export interface EcompItem {
    code: string; // код номенклатуры Элтеха, уникален и стабилен
    product: string; // артикул
    producer: string;
    remark: string;
    multiple: number;
    stock?: EcompLot; // остаток ЦС, USD
    transit?: EcompLot; // склад в пути, USD
    order?: EcompLot; // под заказ, CNY
}

const toNumber = (value: unknown): number => Number(value) || 0;

// Один код в файле идёт несколькими строками (партии). Партии суммируем,
// цену берём минимальную, срок — ближайший.
export function mergeLot(existing: EcompLot | undefined, lot: EcompLot): EcompLot {
    if (!existing) return lot;
    return {
        quantity: existing.quantity + lot.quantity,
        price: Math.min(existing.price, lot.price),
        weeks: Math.min(existing.weeks, lot.weeks),
    };
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string, skip: number): any[][] {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return [];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, range: skip, blankrows: false });
}

function getItem(items: Map<string, EcompItem>, row: Partial<EcompItem> & { code: string }): EcompItem {
    let item = items.get(row.code);
    if (!item) {
        item = { code: row.code, product: '', producer: '', remark: '', multiple: 1, ...row };
        items.set(row.code, item);
    }
    return item;
}

// Gold.xlsx: производитель, артикул, описание, data code, норма упаковки, остаток ЦС,
// цена USD, цена распродажи USD, склад в пути, срок недель, код номенклатуры.
// Первые две строки листа — заголовки.
export function parseEcompGold(
    workbook: XLSX.WorkBook,
    items: Map<string, EcompItem> = new Map<string, EcompItem>(),
): Map<string, EcompItem> {
    ECOMP_GOLD_SHEETS.forEach((sheetName) => {
        sheetRows(workbook, sheetName, 2).forEach((columns) => {
            const [producer, product, remark, , pack, stock, regularPrice, salePrice, inWay, weeks, code] = columns;
            const price = toNumber(salePrice) || toNumber(regularPrice);
            if (!code || !product || price <= 0) return;
            const item = getItem(items, {
                code: String(code),
                product: String(product),
                producer: producer ? String(producer) : '',
                remark: remark ? String(remark) : '',
                multiple: toNumber(pack) || 1,
            });
            if (toNumber(stock) > 0) {
                item.stock = mergeLot(item.stock, { quantity: toNumber(stock), price, weeks: 0 });
            }
            if (toNumber(inWay) > 0) {
                item.transit = mergeLot(item.transit, { quantity: toNumber(inWay), price, weeks: toNumber(weeks) });
            }
        });
    });
    return items;
}

// GoldOrder.xlsx: производитель, артикул, описание, количество, цена CNY, срок недель, код номенклатуры.
// Первая строка — заголовок. Позиция может уже быть в items из Gold.xlsx — тогда добавляем ей склад под заказ.
export function parseEcompOrder(
    workbook: XLSX.WorkBook,
    items: Map<string, EcompItem> = new Map<string, EcompItem>(),
): Map<string, EcompItem> {
    sheetRows(workbook, workbook.SheetNames[0], 1).forEach((columns) => {
        const [producer, product, remark, quantity, price, weeks, code] = columns;
        if (!code || !product || toNumber(price) <= 0 || toNumber(quantity) <= 0) return;
        const item = getItem(items, {
            code: String(code),
            product: String(product),
            producer: producer ? String(producer) : '',
            remark: remark ? String(remark) : '',
        });
        item.order = mergeLot(item.order, {
            quantity: toNumber(quantity),
            price: toNumber(price),
            weeks: toNumber(weeks),
        });
    });
    return items;
}

function lotWarehouse(
    name: string,
    lot: EcompLot,
    deliveryTime: number,
    multiple: number,
    currency: CurrencyDto,
): WarehouseDto {
    return {
        name,
        deliveryTime: deliveryTime + lot.weeks * 7,
        quantity: lot.quantity,
        multiple,
        prices: [{ value: lot.price, min: 1, max: 0, currency: currency.id, isOrdinary: false }],
    };
}

export function buildEcompWarehouses(
    item: EcompItem,
    deliveryTime: number,
    usd: CurrencyDto,
    cny: CurrencyDto,
): WarehouseDto[] {
    return [
        ...(item.stock ? [lotWarehouse('CENTER', item.stock, deliveryTime, item.multiple, usd)] : []),
        ...(item.transit ? [lotWarehouse('TRANSIT', item.transit, deliveryTime, item.multiple, usd)] : []),
        ...(item.order ? [lotWarehouse('PRODUCED', item.order, deliveryTime, item.multiple, cny)] : []),
    ];
}

export class EcompParser extends ScheduleParser {
    protected supplierAlias = 'ecomp';
    protected currencyAlfa3 = 'USD';

    private async download(fileName: string): Promise<XLSX.WorkBook> {
        const ecomp = await this.schedule.getVault().get('ecomp');
        const buffer = await ftpDownload(
            ecomp.URL as string,
            ecomp.LOGIN as string,
            ecomp.PASSWORD as string,
            fileName,
        );
        return XLSX.read(buffer, { type: 'buffer' });
    }

    async parse(): Promise<void> {
        const cny = await this.schedule.getCurrencies().alfa3('CNY');
        const items = parseEcompGold(await this.download(ECOMP_GOLD_FILE));
        parseEcompOrder(await this.download(ECOMP_ORDER_FILE), items);
        const promises: Promise<any>[] = Array.from(items.values()).map((item) => {
            const good: GoodDto = new GoodDto({
                alias: item.product,
                code: item.code,
                supplier: this.supplier.id,
                updatedAt: new Date(),
                parameters: [
                    { name: 'name', stringValue: item.product },
                    { name: 'packageQuantity', numericValue: item.multiple, unit: this.piece.id },
                    ...(item.producer ? [{ name: 'producer', stringValue: item.producer }] : []),
                    ...(item.remark ? [{ name: 'remark', stringValue: item.remark }] : []),
                ],
                warehouses: buildEcompWarehouses(item, this.supplier.deliveryTime, this.currency, cny),
            });
            return this.schedule.getGoods().createOrUpdate(good);
        });
        await Promise.all(promises);
    }
}

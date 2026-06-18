import { ScheduleUploadParser } from './schedule.upload.parser';
import * as XLSX from 'xlsx';
import { GoodDto } from '../../good/dtos/good.dto';

// Поставщик иногда присылает один и тот же code несколькими строками (разные партии/остатки).
// Одинаковый code => одинаковый id (md5(supplier+code)) => гонка конкурентных upsert и E11000.
// Схлопываем дубли по коду, оставляя строку с бо́льшим количеством. Первая строка (index 0)
// и строки с нечисловым quantity отбрасываются — как и раньше.
export function dedupeRowsByMaxQuantity(rows: any[]): any[] {
    const byCode = new Map<string, any>();
    rows.forEach((row, index) => {
        const { code, quantity } = row;
        if (index > 0 && !isNaN(quantity)) {
            const key = String(code);
            const existing = byCode.get(key);
            if (!existing || Number(quantity) > Number(existing.quantity)) {
                byCode.set(key, row);
            }
        }
    });
    return Array.from(byCode.values());
}

export class MicroemParser extends ScheduleUploadParser {
    protected supplierAlias = 'microem';
    protected currencyAlfa3 = 'USD';
    async parse(): Promise<void> {
        const workbook = XLSX.readFile(this.file);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        worksheet['A1'] = { v: 'none', t: 's' };
        worksheet['B1'] = { v: 'name', t: 's', w: 'code' };
        worksheet['C1'] = { v: 'name', t: 's', w: 'remark' };
        worksheet['D1'] = { v: 'name', t: 's', w: 'name' };
        worksheet['E1'] = { v: 'name', t: 's', w: 'producer' };
        worksheet['F1'] = { v: 'name', t: 's', w: 'quantity' };
        worksheet['G1'] = { v: 'name', t: 's', w: 'price' };
        worksheet['H1'] = { v: 'name', t: 's', w: 'currency' };
        const rows = dedupeRowsByMaxQuantity(XLSX.utils.sheet_to_json(worksheet));
        const promises: Promise<any>[] = rows.map((row: any) => {
            const { name, code, producer, quantity, price } = row;
            return this.schedule.getGoods().createOrUpdate(
                new GoodDto({
                    alias: name.toString(),
                    code,
                    supplier: this.supplier.id,
                    updatedAt: new Date(),
                    parameters: [
                        { name: 'name', stringValue: name.toString() },
                        ...(producer ? [{ name: 'producer', stringValue: producer }] : []),
                    ],
                    warehouses: [
                        {
                            name: 'CENTER',
                            quantity,
                            deliveryTime: this.supplier.deliveryTime,
                            multiple: 1,
                            prices: [
                                {
                                    value: price / 10000,
                                    min: 1,
                                    max: 0,
                                    currency: this.currency.id,
                                    isOrdinary: false,
                                },
                            ],
                        },
                    ],
                }),
            );
        });
        await Promise.all(promises);
    }
}

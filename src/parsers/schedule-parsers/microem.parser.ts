import { ScheduleUploadParser } from './schedule.upload.parser';
import * as XLSX from 'xlsx';
import { GoodDto } from '../../good/dtos/good.dto';

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
        const promises: Promise<any>[] = XLSX.utils.sheet_to_json(worksheet).map((row: any, index) => {
            const { name, code, producer, quantity, price } = row;
            if (index > 0 && !isNaN(quantity)) {
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
            }
            return Promise.resolve();
        });
        await Promise.all(promises);
    }
}

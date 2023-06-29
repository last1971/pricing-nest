import { ScheduleUploadParser } from './schedule.upload.parser';
import * as XLSX from 'xlsx';
import { Open } from 'unzipper';
import { GoodDto } from '../../good/dtos/good.dto';

export class UnisvsParser extends ScheduleUploadParser {
    protected supplierAlias = 'unisvs';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const directory = await Open.file(this.file);
        const file = directory.files[0].stream();
        const chunks = [];
        for await (const chunk of file) {
            chunks.push(chunk);
        }
        const data = Buffer.concat(chunks);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        XLSX.utils.sheet_add_aoa(worksheet, [['code']], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['name']], { origin: 'B1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['producer']], { origin: 'C1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['case']], { origin: 'D1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['mark']], { origin: 'E1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['unused']], { origin: 'F1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['price']], { origin: 'G1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['nextCount']], { origin: 'H1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['nextPrice']], { origin: 'I1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['quantity']], { origin: 'J1' });
        const promises: Promise<any>[] = [];
        XLSX.utils.sheet_to_json(worksheet).forEach((row: any) => {
            if (row.code && row.quantity) {
                const good: GoodDto = new GoodDto({
                    alias: row.name,
                    code: row.code,
                    supplier: this.supplier.id,
                    updatedAt: new Date(),
                    parameters: [
                        { name: 'name', stringValue: row.name },
                        ...(row.producer ? [{ name: 'producer', stringValue: row.producer }] : []),
                        ...(row.case ? [{ name: 'case', stringValue: row.case }] : []),
                    ],
                    warehouses: [
                        {
                            name: 'CENTER',
                            quantity: row.quantity,
                            deliveryTime: this.supplier.deliveryTime,
                            multiple: 1,
                            prices: [
                                {
                                    value: row.price,
                                    currency: this.currency.id,
                                    min: 1,
                                    max: row.nextCount ? row.nextCount - 1 : 0,
                                    isOrdinary: false,
                                },
                                ...(row.nextCount
                                    ? [
                                          {
                                              value: row.nextPrice,
                                              currency: this.currency.id,
                                              min: row.nextCount,
                                              max: 0,
                                              isOrdinary: false,
                                          },
                                      ]
                                    : []),
                            ],
                        },
                    ],
                });
                promises.push(this.schedule.getGoods().createOrUpdate(good));
            }
        });
        await Promise.all(promises);
    }
}

import { ScheduleParser } from './schedule.parser';
import { Open } from 'unzipper';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { PriceDto } from '../../good/dtos/price.dto';
import { GoodDto } from '../../good/dtos/good.dto';

export class DanParser extends ScheduleParser {
    protected supplierAlias = 'dan';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const res = await this.schedule
            .getHttp()
            .get(this.schedule.getConfigService().get<string>('API_DAN_URL'), { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const directory = await Open.buffer(response.data);
        const file = await directory.files[0].buffer(this.schedule.getConfigService().get<string>('API_DAN_PASS'));
        const workbook = XLSX.read(file, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const promises: Promise<any>[] = [];
        XLSX.utils.sheet_add_aoa(worksheet, [['group']], { origin: 'A1' });
        worksheet['B1'] = { v: 'name', t: 's', w: 'code' };
        XLSX.utils.sheet_add_aoa(worksheet, [['name']], { origin: 'C1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['remark1']], { origin: 'D1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['case']], { origin: 'E1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['producer']], { origin: 'F1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['piece']], { origin: 'G1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['price']], { origin: 'H1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['quantity']], { origin: 'I1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['remark2']], { origin: 'J1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['ordinaryPrice']], { origin: 'K1' });
        XLSX.utils.sheet_to_json(worksheet).forEach((row: any) => {
            if (isNaN(row.code)) return;
            const prices: PriceDto[] = [
                {
                    value: row.price,
                    min: 1,
                    max: 0,
                    currency: this.currency.id,
                    isOrdinary: false,
                },
                {
                    value: row.ordinaryPrice,
                    min: 1,
                    max: 0,
                    currency: this.currency.id,
                    isOrdinary: true,
                },
            ];
            let remark = row.remark1 ? row.remark1.toString().trim() : '';
            if (remark && row.remark2) {
                remark += ' ' + row.remark2.toString();
            } else if (row.remark2) {
                remark = row.remark2.toString();
            }
            const good: GoodDto = new GoodDto({
                alias: row.name.toString(),
                code: row.code,
                supplier: this.supplier.id,
                updatedAt: new Date(),
                parameters: [
                    { name: 'name', stringValue: row.name.toString() },
                    { name: 'producer', stringValue: row.producer },
                    ...(row.case ? [{ name: 'case', stringValue: row.case }] : []),
                    ...(remark ? [{ name: 'remark', stringValue: remark }] : []),
                ],
                warehouses: [
                    {
                        name: 'CENTER',
                        deliveryTime: this.supplier.deliveryTime,
                        quantity: row.quantity,
                        multiple: 1,
                        prices,
                    },
                ],
            });
            promises.push(this.schedule.getGoods().createOrUpdate(good));
        });
        await Promise.all(promises);
    }
}

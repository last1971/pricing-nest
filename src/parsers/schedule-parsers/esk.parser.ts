import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { GoodDto } from '../../good/dtos/good.dto';
import { times } from 'lodash';

export class EskParser extends ScheduleParser {
    protected supplierAlias = 'esk';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const esk = await this.schedule.getVault().get('esk');
        const res = await this.schedule.getHttp().get(esk.URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const workbook = XLSX.read(response.data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[1]];
        worksheet['A1'] = { v: 'name', t: 's', w: 'group' };
        worksheet['B1'] = { v: 'name', t: 's', w: 'prefix' };
        worksheet['C1'] = { v: 'name', t: 's', w: 'name' };
        worksheet['D1'] = { v: 'name', t: 's', w: 'code' };
        worksheet['E1'] = { v: 'name', t: 's', w: 'quantity' };
        worksheet['F1'] = { v: 'name', t: 's', w: 'min1' };
        worksheet['G1'] = { v: 'name', t: 's', w: 'price1' };
        worksheet['H1'] = { v: 'name', t: 's', w: 'min2' };
        worksheet['I1'] = { v: 'name', t: 's', w: 'price2' };
        worksheet['J1'] = { v: 'name', t: 's', w: 'min3' };
        worksheet['K1'] = { v: 'name', t: 's', w: 'price3' };
        worksheet['L1'] = { v: 'name', t: 's', w: 'min4' };
        worksheet['M1'] = { v: 'name', t: 's', w: 'price4' };
        worksheet['N1'] = { v: 'name', t: 's', w: 'min5' };
        worksheet['O1'] = { v: 'name', t: 's', w: 'price5' };
        const promises: Promise<any>[] = XLSX.utils.sheet_to_json(worksheet).map((row: any) =>
            this.schedule.getGoods().createOrUpdate(
                new GoodDto({
                    alias: (row.prefix || '') + row.name,
                    code: row.code,
                    supplier: this.supplier.id,
                    updatedAt: new Date(),
                    parameters: [{ name: 'name', stringValue: (row.prefix || '') + row.name }],
                    warehouses: [
                        {
                            name: 'CENTER',
                            quantity: row.quantity,
                            deliveryTime: this.supplier.deliveryTime,
                            multiple: 1,
                            prices: times(6)
                                .slice(1)
                                .map((i) => ({
                                    value: row['price' + i],
                                    min: row['min' + i],
                                    max: i === 5 ? 0 : row['min' + (i + 1)] - 1,
                                    currency: this.currency.id,
                                    isOrdinary: false,
                                })),
                        },
                    ],
                }),
            ),
        );
        await Promise.all(promises);
    }
}

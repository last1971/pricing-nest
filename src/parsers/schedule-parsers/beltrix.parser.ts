import { ScheduleParser } from './schedule.parser';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { PriceDto } from '../../good/dtos/price.dto';
import { GoodDto } from '../../good/dtos/good.dto';
import * as iconv from 'iconv-lite';

export class BeltrixParser extends ScheduleParser {
    protected supplierAlias = 'beltrix';
    protected currencyAlfa3 = 'RUB';

    async parse(): Promise<void> {
        const beltrix = await this.schedule.getVault().get('beltrix');
        const res = await this.schedule.getHttp().get(beltrix.URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const workbook = XLSX.read(response.data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const promises: Promise<any>[] = [];

        rows.forEach((row: any, index: number) => {
            // Пропускаем первую строку (заголовки)
            if (index === 0) return;

            const code = row[0];
            const name = iconv.decode(Buffer.from(row[1], 'binary'), 'windows-1251');
            const quantity = row[2];
            const price = row[3];

            if (!code || !name) return;

            const cleanQuantity = parseFloat(quantity);
            if (isNaN(cleanQuantity) || cleanQuantity <= 0) return;

            const cleanPrice = parseFloat(
                typeof price === 'string' ? price.replace(',', '.') : price
            );
            if (isNaN(cleanPrice) || cleanPrice <= 0) return;

            const prices: PriceDto[] = [
                {
                    value: cleanPrice,
                    min: 1,
                    max: 0,
                    currency: this.currency.id,
                    isOrdinary: false,
                },
            ];

            const good: GoodDto = new GoodDto({
                alias: name.toString(),
                code: code.toString(),
                supplier: this.supplier.id,
                updatedAt: new Date(),
                parameters: [
                    { name: 'name', stringValue: name.toString() },
                ],
                warehouses: [
                    {
                        name: 'CENTER',
                        deliveryTime: this.supplier.deliveryTime,
                        quantity: cleanQuantity,
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
import { ScheduleParser } from './schedule.parser';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { PriceDto } from '../../good/dtos/price.dto';
import { GoodDto } from '../../good/dtos/good.dto';

export class DiamantParser extends ScheduleParser {
    protected supplierAlias = 'diamant';
    protected currencyAlfa3 = 'RUB';

    async parse(): Promise<void> {
        const diamant = await this.schedule.getVault().get('diamant');
        const res = await this.schedule.getHttp().get(diamant.URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const workbook = XLSX.read(response.data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const promises: Promise<any>[] = [];

        XLSX.utils.sheet_to_json(worksheet, { header: 1 }).forEach((row: any, index: number) => {
            // Пропускаем первую строку (заголовки)
            if (index === 0) return;
            
            const code = row[0];
            const producer = row[1];
            const name = row[2];
            const quantity = row[6];
            const price = row[15];
            
            if (!code || (!isNaN(parseFloat(code)) && !isFinite(code)) ) return;
            
            const cleanQuantity = parseFloat(quantity);
            if (isNaN(cleanQuantity)) return;
            
            const cleanPrice = parseFloat(price);
            if (isNaN(cleanPrice) || cleanPrice === 0) return;

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
                    ...(producer ? [{ name: 'producer', stringValue: producer.toString() }] : []),
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
import { ScheduleParser } from './schedule.parser';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { PriceDto } from '../../good/dtos/price.dto';
import { GoodDto } from '../../good/dtos/good.dto';

export class TriggerParser extends ScheduleParser {
    protected supplierAlias = 'trigger';
    protected currencyAlfa3 = 'RUB';

    async parse(): Promise<void> {
        const trigger = await this.schedule.getVault().get('trigger');
        const res = await this.schedule.getHttp().get(trigger.URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const workbook = XLSX.read(response.data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const promises: Promise<any>[] = [];

        XLSX.utils.sheet_to_json(worksheet, { header: 1 }).forEach((row: any, index: number) => {
            // Пропускаем первую строку (заголовки)
            if (index === 0) return;
            
            const name = row[1];        // Название
            const quantity = row[2];    // Количество
            const code = row[5];        // Код
            const price = row[6];       // Цена
            
            if (!code || !name) return;
            
            const cleanQuantity = parseFloat(quantity);
            if (isNaN(cleanQuantity) || cleanQuantity < 0) return;
            
            const cleanPrice = parseFloat(price);
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
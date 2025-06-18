import { ScheduleParser } from './schedule.parser';
import * as XLSX from 'xlsx';
import { firstValueFrom } from 'rxjs';
import { PriceDto } from '../../good/dtos/price.dto';
import { GoodDto } from '../../good/dtos/good.dto';

export class KulibinParser extends ScheduleParser {
    protected supplierAlias = 'kulibin';
    protected currencyAlfa3 = 'RUB';

    async parse(): Promise<void> {
        const kulibin = await this.schedule.getVault().get('kulibin');
        const res = await this.schedule.getHttp().get(kulibin.URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const workbook = XLSX.read(response.data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const promises: Promise<any>[] = [];

        XLSX.utils.sheet_to_json(worksheet, { header: 1 }).forEach((row: any, index: number) => {
            // Пропускаем первую строку (заголовки)
            if (index === 0) return;
            
            const [name, code, quantity, price] = row;
            
            // Проверяем, что код является числом
            if (isNaN(code)) return;
            
            // Очищаем количество от единиц измерения
            const cleanQuantity = this.cleanQuantity(quantity);
            if (cleanQuantity === null) return;
            
            // Приводим цену к числу
            const cleanPrice = parseFloat(price);
            if (isNaN(cleanPrice)) return;

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
                code: code,
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

    private cleanQuantity(quantity: any): number | null {
        if (!quantity) return null;
        
        const quantityStr = quantity.toString().toLowerCase().trim();
        
        // Убираем единицы измерения
        const cleanStr = quantityStr
            .replace(/шт\.?/g, '')
            .replace(/м\.?/g, '')
            .replace(/шт/g, '')
            .replace(/м/g, '')
            .trim();
        
        const result = parseFloat(cleanStr);
        return isNaN(result) ? null : result;
    }
} 
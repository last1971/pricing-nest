import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import { PriceDto } from '../../good/dtos/price.dto';
import { GoodDto } from '../../good/dtos/good.dto';
import * as iconv from 'iconv-lite';

export class ElsinParser extends ScheduleParser {
    protected supplierAlias = 'elsin';
    protected currencyAlfa3 = 'RUB';

    async parse(): Promise<void> {
        const elsin = await this.schedule.getVault().get('elsin');
        const res = await this.schedule.getHttp().get(elsin.URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        
        // Декодируем из кодировки 1251 в UTF-8
        const decodedData = iconv.decode(response.data, 'win1251');
        const csvLines = decodedData.split('\n');
        const promises: Promise<any>[] = [];

        csvLines.forEach((line: string, index: number) => {
            // Пропускаем первую строку (заголовки)
            if (index === 0) return;
            
            // Парсим CSV строку с разделителем точка с запятой
            const columns = line.split(';').map(col => col.trim().replace(/^"|"$/g, ''));
            if (columns.length < 10) return; // Минимальное количество колонок (учитываем пустой первый столбец)
            
            const code = columns[1];           // Код (второй столбец, так как первый пустой)
            const name = columns[2];           // Наименование
            const caseType = columns[3];       // Корпус
            const producer = columns[4];       // Производитель
            const quantity = columns[5];       // На складе
            const minQty = columns[6];         // Мин.кол-во
            const maxQty = columns[7];         // Макс.кол-во
            // const quantity = columns[8];       // Количество
            const price = columns[9];          // Цена
            
            if (!code || code === '') return;
            
            const cleanQuantity = parseFloat(quantity.toString());
            if (isNaN(cleanQuantity)) return;
            
            const cleanPrice = parseFloat(price.toString());
            if (isNaN(cleanPrice) || cleanPrice === 0) return;

            const prices: PriceDto[] = [
                {
                    value: cleanPrice,
                    min: parseFloat(minQty.toString()) || 1,
                    max: parseFloat(maxQty.toString()) || 0,
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
                    ...(producer && producer !== '' ? [{ name: 'producer', stringValue: producer.toString() }] : []),
                    ...(caseType && caseType !== '' ? [{ name: 'case', stringValue: caseType.toString() }] : []),
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

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }
} 
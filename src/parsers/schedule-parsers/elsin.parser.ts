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

        // Парсим заголовки для определения индексов колонок
        const headers = csvLines[0].split(';').map(col => col.trim().replace(/^"|"$/g, '').replace(/\r/g, ''));
        const colIndex = (name: string) => headers.indexOf(name);

        const iCode = colIndex('Код');
        const iName = colIndex('Наименование');
        const iCase = colIndex('Корпус');
        const iProducer = colIndex('Производитель');
        const iQuantity = colIndex('На складе');
        const iMinQty = colIndex('Мин.кол-во');
        const iMaxQty = colIndex('Макс.кол-во');
        const iPrice = colIndex('Цена');

        csvLines.forEach((line: string, index: number) => {
            if (index === 0) return;

            const columns = line.split(';').map(col => col.trim().replace(/^"|"$/g, ''));

            const code = iCode >= 0 ? columns[iCode] : '';
            const name = iName >= 0 ? columns[iName] : '';
            const caseType = iCase >= 0 ? columns[iCase] : '';
            const producer = iProducer >= 0 ? columns[iProducer] : '';
            const quantity = iQuantity >= 0 ? columns[iQuantity] : '';
            const minQty = iMinQty >= 0 ? columns[iMinQty] : '';
            const maxQty = iMaxQty >= 0 ? columns[iMaxQty] : '';
            const price = iPrice >= 0 ? columns[iPrice] : '';
            
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

} 
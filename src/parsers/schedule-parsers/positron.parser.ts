import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import { PriceDto } from '../../good/dtos/price.dto';
import { GoodDto } from '../../good/dtos/good.dto';

export class PositronParser extends ScheduleParser {
    protected supplierAlias = 'positron';
    protected currencyAlfa3 = 'RUB';

    async parse(): Promise<void> {
        const positron = await this.schedule.getVault().get('positron');
        const res = await this.schedule.getHttp().get(positron.URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const csv = response.data.toString('utf8');
        const lines = csv.split('\n');
        if (lines.length < 2) return;
        const headers = lines[0].split('\t');

        // Индексы нужных столбцов
        const codeIdx = headers.findIndex(h => h.trim().toLowerCase() === 'id');
        const nameIdx = headers.findIndex(h => h.trim().toLowerCase() === 'наименование');
        const quantityIdx = headers.findIndex(h => h.trim().toLowerCase().includes('количество на складе'));
        const price1Idx = headers.findIndex(h => h.trim().toLowerCase() === 'розничная цена, руб');
        const price2Idx = headers.findIndex(h => h.trim().toLowerCase() === 'мелкий опт, руб');
        const price3Idx = headers.findIndex(h => h.trim().toLowerCase() === 'опт, руб');
        const min2Idx = headers.findIndex(h => h.trim().toLowerCase().includes('количество для мелкого опта'));
        const min3Idx = headers.findIndex(h => h.trim().toLowerCase().includes('количество для опта'));
        const producerIdx = headers.findIndex(h => h.trim().toLowerCase().includes('производитель'));
        const caseIdx = headers.findIndex(h => h.trim().toLowerCase().includes('корпус'));

        const promises: Promise<any>[] = [];

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split('\t');
            if (row.length < 4) continue;
            const code = row[codeIdx];
            const name = row[nameIdx];
            const quantity = row[quantityIdx];
            const price1 = row[price1Idx];
            const price2 = row[price2Idx];
            const price3 = row[price3Idx];
            const min2 = row[min2Idx];
            const min3 = row[min3Idx];
            const producer = producerIdx !== -1 ? row[producerIdx] : undefined;
            const caseVal = caseIdx !== -1 ? row[caseIdx] : undefined;

            if (!code || !name) continue;

            const cleanQuantity = parseFloat(quantity);
            if (isNaN(cleanQuantity) || cleanQuantity <= 0) continue;

            // min/max для каждой цены
            const min1 = 1;
            const min2val = parseInt(min2);
            const min3val = parseInt(min3);

            const cleanPrice1 = parseFloat(typeof price1 === 'string' ? price1.replace(',', '.') : price1);
            const cleanPrice2 = parseFloat(typeof price2 === 'string' ? price2.replace(',', '.') : price2);
            const cleanPrice3 = parseFloat(typeof price3 === 'string' ? price3.replace(',', '.') : price3);

            const prices: PriceDto[] = [];
            if (!isNaN(cleanPrice1) && cleanPrice1 > 0) {
                prices.push({
                    value: cleanPrice1,
                    min: min1,
                    max: !isNaN(min2val) && min2val > 1 ? min2val - 1 : 0,
                    currency: this.currency.id,
                    isOrdinary: false,
                });
            }
            if (!isNaN(cleanPrice2) && cleanPrice2 > 0 && !isNaN(min2val) && min2val > 0) {
                prices.push({
                    value: cleanPrice2,
                    min: min2val,
                    max: !isNaN(min3val) && min3val > min2val ? min3val - 1 : 0,
                    currency: this.currency.id,
                    isOrdinary: false,
                });
            }
            if (!isNaN(cleanPrice3) && cleanPrice3 > 0 && !isNaN(min3val) && min3val > 0) {
                prices.push({
                    value: cleanPrice3,
                    min: min3val,
                    max: 0,
                    currency: this.currency.id,
                    isOrdinary: false,
                });
            }
            if (!prices.length) continue;

            const parameters = [
                { name: 'name', stringValue: name.toString() },
                ...(producer ? [{ name: 'producer', stringValue: producer.toString() }] : []),
                ...(caseVal ? [{ name: 'case', stringValue: caseVal.toString() }] : []),
            ];

            const good: GoodDto = new GoodDto({
                alias: name.toString(),
                code: code.toString(),
                supplier: this.supplier.id,
                updatedAt: new Date(),
                parameters,
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
        }

        await Promise.all(promises);
    }
} 
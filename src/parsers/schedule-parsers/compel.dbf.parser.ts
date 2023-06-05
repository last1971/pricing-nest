import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { Open } from 'unzipper';
import { GoodDto } from '../../good/dtos/good.dto';
import { PriceDto } from '../../good/dtos/price.dto';
import { times } from 'lodash';

export class CompelDbfParser extends ScheduleParser {
    protected supplierAlias = 'compel';
    protected currencyAlfa3 = 'USD';
    async parse(): Promise<void> {
        const compel = await this.schedule.getVault().get('compel');
        const res = await this.schedule.getHttp().get(compel.DBF_URL as string, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const directory = await Open.buffer(response.data);
        const file = await directory.files[0].buffer();
        const workbook = XLSX.read(file, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const promises = XLSX.utils.sheet_to_json(worksheet).map((good: any) => {
            const multiple = good.MOQ;
            const prices: PriceDto[] = times(7)
                .slice(1)
                .filter((i) => i === 1 || good['QTY_' + i] !== 0 || good['PRICE_' + i] > good['PRICE_' + (i - 1)])
                .map(
                    (i, j, ij): PriceDto => ({
                        value: good['PRICE_' + i] * (compel.COEFF as number),
                        min: good['QTY_' + i],
                        max: i === ij.length ? 0 : good['QTY_' + (i + 1)] - multiple || multiple,
                        currency: this.currency.id,
                        isOrdinary: false,
                    }),
                );
            return this.schedule.getGoods().createOrUpdate(
                new GoodDto({
                    alias: good.NAME,
                    code: good.CODE.toString(),
                    supplier: this.supplier.id,
                    updatedAt: new Date(),
                    parameters: [
                        { name: 'name', stringValue: good.NAME },
                        ...(good.PRODUCER ? [{ name: 'producer', stringValue: good.PRODUCER }] : []),
                        ...(good.CORPUS ? [{ name: 'case', stringValue: good.CORPUS }] : []),
                        { name: 'packageQuantity', numericValue: good.QNT_PACK, unit: this.piece.id },
                    ],
                    warehouses: [
                        {
                            name: 'CENTER',
                            deliveryTime: this.supplier.deliveryTime,
                            quantity: good.QTY,
                            multiple,
                            options: { pos: !!good.POS, location_id: 'CENTER' },
                            prices,
                        },
                    ],
                }),
            );
        });
        await Promise.all(promises);
    }
}

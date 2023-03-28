import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';
import Excel from 'exceljs';
import { PriceDto } from '../../good/dtos/price.dto';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { ScheduleParser } from './schedule.parser';

export class RctParser extends ScheduleParser {
    async execute(): Promise<void> {
        this.schedule.getLog().debug('Start rct import');
        const start = DateTime.now().toISO();
        const res = await this.schedule.getHttp().get('https://www.rct.ru/price/all', { responseType: 'stream' });
        const response = await firstValueFrom(res);
        const workbook = new Excel.Workbook();
        await workbook.xlsx.read(response.data);
        const worksheet = workbook.getWorksheet(1);
        const promises: Promise<any>[] = [];
        const supplier = await this.schedule.getSuppliers().alias('rct');
        const currency = await this.schedule.getCurrencies().alfa3('USD');
        worksheet.eachRow((row, rowNumber) => {
            const code = <string>row.getCell(5).value;
            if (code && rowNumber > 8) {
                const multiple: number = <number>row.getCell(10).value ?? 1;
                const nextQuantity1 = multiple * 2;
                let nextQuantity2: number;
                const prices: PriceDto[] = [];
                const price1 = !isNaN(<number>row.getCell(11).value) ? <number>row.getCell(11).value * 1.02 : 0;
                const price2 = !isNaN(<number>row.getCell(12).value) ? <number>row.getCell(12).value * 1.02 : 0;
                const price3 = !isNaN(<number>row.getCell(13).value) ? <number>row.getCell(13).value * 1.02 : 0;
                if (price1 !== 0) {
                    prices.push({
                        value: price1,
                        min: multiple,
                        max: price2 === 0 ? 0 : nextQuantity1,
                        currency: currency.id,
                    });
                }
                if (price2 !== 0) {
                    nextQuantity2 = Math.round(204 / price2);
                    nextQuantity2 =
                        nextQuantity2 < nextQuantity1 + multiple * 3 ? nextQuantity1 + multiple * 3 : nextQuantity2;
                    nextQuantity2 =
                        price3 === 0
                            ? 0
                            : nextQuantity2 % multiple !== 0
                            ? nextQuantity2 + multiple - (nextQuantity2 % multiple)
                            : nextQuantity2;
                    prices.push({
                        value: price2,
                        min: nextQuantity1 + multiple,
                        max: nextQuantity2 !== 0 ? nextQuantity2 - multiple : 0,
                        currency: currency.id,
                    });
                }
                if (price3 !== 0) {
                    prices.push({
                        value: price3,
                        min: nextQuantity2,
                        max: 0,
                        currency: currency.id,
                    });
                }
                const warehouses: WarehouseDto[] = [];
                const quantity = <number>row.getCell(14).value;
                const transit = <number>row.getCell(15).value;
                if (quantity) {
                    warehouses.push({
                        name: 'CENTER',
                        deliveryTime: supplier.deliveryTime,
                        quantity,
                        multiple,
                        prices,
                    });
                }
                const transitDate = <string>row.getCell(16).value;
                if (transit && transitDate) {
                    const days = Math.round(
                        DateTime.fromFormat(transitDate, 'dd.LL.yyyy').diff(DateTime.now(), 'days').days,
                    );
                    warehouses.push({
                        name: 'TRANSIT',
                        deliveryTime: supplier.deliveryTime + days,
                        quantity: transit,
                        multiple,
                        prices,
                    });
                }
                const good: GoodDto = {
                    code,
                    source: Source.Db,
                    supplier: supplier.id,
                    warehouses,
                    alias: <string>row.getCell(3).value.toString(),
                };
                promises.push(this.schedule.getGoods().createOrUpdate(good));
            }
        });
        await Promise.all(promises);
        const rancidGoods = await this.schedule.getGoods().find({ updatedAt: { $lt: start }, supplier: supplier.id });
        await Promise.all(
            rancidGoods.map((rancidGood) => {
                rancidGood.warehouses = [];
                return this.schedule.getGoods().createOrUpdate(rancidGood);
            }),
        );
        this.schedule.getLog().debug('Finish rct import');
    }
}

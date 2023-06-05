import { DateTime } from 'luxon';
import { firstValueFrom } from 'rxjs';
import Excel from 'exceljs';
import { PriceDto } from '../../good/dtos/price.dto';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { ScheduleParser } from './schedule.parser';

export class RctParser extends ScheduleParser {
    protected supplierAlias = 'rct';
    protected currencyAlfa3 = 'USD';
    async parse(): Promise<void> {
        const rct = await this.schedule.getVault().get('rct');
        const res = await this.schedule.getHttp().get(rct.URL as string, { responseType: 'stream' });
        const response = await firstValueFrom(res);
        const workbook = new Excel.Workbook();
        await workbook.xlsx.read(response.data);
        const worksheet = workbook.getWorksheet(1);
        const promises: Promise<any>[] = [];
        worksheet.eachRow((row, rowNumber) => {
            const code = <string>row.getCell(5).value?.toString();
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
                        currency: this.currency.id,
                        isOrdinary: false,
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
                        currency: this.currency.id,
                        isOrdinary: false,
                    });
                }
                if (price3 !== 0) {
                    prices.push({
                        value: price3,
                        min: nextQuantity2,
                        max: 0,
                        currency: this.currency.id,
                        isOrdinary: false,
                    });
                }
                const warehouses: WarehouseDto[] = [];
                const quantity = <number>row.getCell(14).value;
                const transit = <number>row.getCell(15).value;
                if (quantity) {
                    warehouses.push({
                        name: 'CENTER',
                        deliveryTime: this.supplier.deliveryTime,
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
                        deliveryTime: this.supplier.deliveryTime + days,
                        quantity: transit,
                        multiple,
                        prices,
                    });
                }
                const alias = <string>row.getCell(3).value.toString();
                const remark = <string>row.getCell(4).value?.toString();
                const producer = <string>row.getCell(8).value?.toString();
                const body = <string>row.getCell(7).value?.toString();
                const good: GoodDto = new GoodDto({
                    updatedAt: new Date(),
                    code,
                    source: Source.Db,
                    supplier: this.supplier.id,
                    warehouses,
                    alias,
                    parameters: [
                        { name: 'name', stringValue: alias },
                        { name: 'packageQuantity', numericValue: multiple, unit: this.piece.id },
                        ...(remark ? [{ name: 'remark', stringValue: remark }] : []),
                        ...(producer ? [{ name: 'producer', stringValue: producer }] : []),
                        ...(body ? [{ name: 'case', stringValue: body }] : []),
                    ],
                });
                promises.push(this.schedule.getGoods().createOrUpdate(good));
            }
        });
        await Promise.all(promises);
    }
}

import { ScheduleUploadParser } from './schedule.upload.parser';
import { Open } from 'unzipper';
import Excel from 'exceljs';
import { DateTime } from 'luxon';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';

export class TriatronParser extends ScheduleUploadParser {
    protected supplierAlias = 'triatron';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const directory = await Open.file(this.file);
        const file = directory.files[0].stream();
        const workbook = new Excel.Workbook();
        await workbook.xlsx.read(file);
        const worksheet = workbook.getWorksheet(1);
        const rowDate = worksheet.getRow(3);
        const date = DateTime.fromFormat(<string>rowDate.getCell(3).value?.toString(), 'dd MMMM yyyy г.', {
            locale: 'ru',
        }).toJSDate();
        const promises: Promise<any>[] = [];
        worksheet.eachRow((row, rowNumber) => {
            const code = <string>row.getCell(5).value?.toString();
            if (code && rowNumber > 10) {
                const remark = <string>row.getCell(2).value?.toString();
                const multiple: number = <number>row.getCell(7).value ?? 1;
                const quantity: number = <number>row.getCell(10).value ?? 0;
                const minus: number = <number>row.getCell(11).value ?? 0;
                const wayQuantity = <number>row.getCell(12).value ?? 0;
                const wayMinus: number = <number>row.getCell(13).value ?? 0;
                const producer = <string>row.getCell(14).value?.toString();
                const alias = <string>row.getCell(15).value?.toString() || remark;
                const price: number = <number>row.getCell(9).value ?? 0;
                const prices = [
                    {
                        value: price,
                        min: multiple,
                        max: 0,
                        currency: this.currency.id,
                        isOrdinary: false,
                    },
                ];
                const warehouses = [];
                if (quantity - minus > 0) {
                    warehouses.push({
                        name: 'CENTER',
                        deliveryTime: this.supplier.deliveryTime,
                        quantity: quantity - minus,
                        multiple,
                        prices,
                    });
                }
                if (wayQuantity - wayMinus > 0) {
                    warehouses.push({
                        name: 'TRANSIT',
                        deliveryTime: this.supplier.deliveryTime + 120,
                        quantity: wayQuantity - wayMinus,
                        multiple,
                        prices,
                    });
                }
                const good = new GoodDto({
                    updatedAt: date,
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
                    ],
                });
                promises.push(this.schedule.getGoods().createOrUpdate(good));
            }
        });
        await Promise.all(promises);
    }
}

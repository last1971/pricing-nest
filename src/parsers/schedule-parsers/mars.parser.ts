import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { GoodDto } from '../../good/dtos/good.dto';
import { PriceDto } from '../../good/dtos/price.dto';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
XLSX.stream.set_readable(Readable);

export class MarsParser extends ScheduleParser {
    protected supplierAlias = 'mars';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const url = this.schedule.getConfigService().get<string>('API_MARS_URL');
        const res = await this.schedule.getHttp().get(url, { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const workbook = XLSX.read(response.data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const promises: Promise<any>[] = [];
        XLSX.utils.sheet_add_aoa(worksheet, [['code']], { origin: 'A1' });
        worksheet['B1'] = { v: 'name', t: 's', w: 'name' };
        XLSX.utils.sheet_add_aoa(worksheet, [['piece']], { origin: 'C1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['packageQuantity']], { origin: 'D1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['quantity']], { origin: 'E1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['transit']], { origin: 'F1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['ordinaryPrice']], { origin: 'G1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['price']], { origin: 'H1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['producerName']], { origin: 'I1' });
        XLSX.utils.sheet_add_aoa(worksheet, [['producer']], { origin: 'J1' });
        XLSX.utils.sheet_to_json(worksheet).forEach((row: any) => {
            if (row.code && row.price) {
                const piece = row.piece === 'шт' ? 1 : 1000;
                const divider = row.packageQuantity.indexOf('/');
                const otherDivider = row.packageQuantity.indexOf('/', divider + 1);
                let multiple, packageQuantity: number;
                if (divider >= 0) {
                    multiple = parseFloat(row.packageQuantity.substring(0, divider + 1).replace(',', '.')) * piece;
                    packageQuantity =
                        otherDivider > 0
                            ? parseFloat(row.packageQuantity.substring(divider + 1, otherDivider).replace(',', '.')) *
                              piece
                            : parseFloat(row.packageQuantity.substring(divider + 1).replace(',', '.')) * piece;
                } else {
                    multiple = packageQuantity = parseFloat(row.packageQuantity.replace(',', '.')) * piece || 1;
                }
                if (isNaN(packageQuantity)) {
                    if (otherDivider) {
                        packageQuantity =
                            parseFloat(row.packageQuantity.substring(otherDivider + 1).replace(',', '.')) * piece ||
                            multiple;
                    } else {
                        packageQuantity = 1;
                    }
                }
                const prices: PriceDto[] = [
                    {
                        value: row.price / piece,
                        currency: this.currency.id,
                        min: multiple,
                        max: 0,
                        isOrdinary: false,
                    },
                    {
                        value: row.ordinaryPrice / piece,
                        currency: this.currency.id,
                        min: multiple,
                        max: 0,
                        isOrdinary: true,
                    },
                ];
                const warehouses: WarehouseDto[] = [];
                if (row.quantity > 0) {
                    warehouses.push({
                        name: 'CENTER',
                        quantity: row.quantity * piece,
                        deliveryTime: this.supplier.deliveryTime,
                        multiple,
                        prices,
                    });
                }
                if (row.transit > 0) {
                    warehouses.push({
                        name: 'TRANSIT',
                        quantity: row.transit * piece,
                        deliveryTime: this.supplier.deliveryTime + 60,
                        multiple,
                        prices,
                    });
                }
                const alias = row.name.replace(row.producer, '');
                const good: GoodDto = {
                    alias,
                    code: row.code,
                    supplier: this.supplier.id,
                    updatedAt: new Date(),
                    parameters: [
                        { name: 'name', stringValue: alias },
                        { name: 'producer', stringValue: row.producer },
                        { name: 'packageQuantity', numericValue: packageQuantity, unit: this.piece.id },
                    ],
                    warehouses,
                };
                promises.push(this.schedule.getGoods().createOrUpdate(good));
            }
        });
        await Promise.all(promises);
    }
}

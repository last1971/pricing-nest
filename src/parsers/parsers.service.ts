import { CACHE_MANAGER, forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { IParsers } from '../interfaces/IParsers';
import { ConfigService } from '@nestjs/config';
import { SupplierService } from '../supplier/supplier.service';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { SupplierDto } from '../supplier/supplier.dto';
import { PriceRequestDto } from '../price/dtos/price.request.dto';
import { GoodDto } from '../good/dtos/good.dto';
import { AbstractParser } from './AbstractParser';
import { at } from 'lodash';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import Excel from 'exceljs';
import { PriceDto } from '../good/dtos/price.dto';
import { WarehouseDto } from '../good/dtos/warehouse.dto';
import { Source } from '../good/dtos/source.enum';
import { GoodService } from '../good/good.service';
import { CurrencyService } from '../currency/currency.service';
import { CurrencyDto } from '../currency/dto/currency.dto';
import { DateTime } from 'luxon';

@Injectable()
export class ParsersService implements IParsers {
    private suppliers: Map<string, SupplierDto>;
    private currencies: Map<string, CurrencyDto>;
    private readonly logger = new Logger(ParsersService.name);
    constructor(
        protected configService: ConfigService,
        private supplierService: SupplierService,
        @Inject(forwardRef(() => GoodService)) private goodService: GoodService,
        private currencyService: CurrencyService,
        @Inject(CACHE_MANAGER) private cache: Cache,
        private http: HttpService,
        @InjectQueue('api') private readonly apiQueue: Queue,
    ) {}
    async onModuleInit() {
        this.suppliers = new Map<string, SupplierDto>();
        const suppliers = await this.supplierService.apiOnly();
        suppliers.forEach((supplier) => this.suppliers.set(supplier.alias, supplier));

        this.currencies = new Map<string, CurrencyDto>();
        const currencies = await this.currencyService.all();
        currencies.forEach((currency) => this.currencies.set(currency.alfa3, currency));

        this.logger.debug('init');
    }
    getSuppliers(): Map<string, SupplierDto> {
        return this.suppliers;
    }
    getCurrencies(): Map<string, CurrencyDto> {
        return this.currencies;
    }
    getConfigService(): ConfigService {
        return this.configService;
    }
    getCache(): Cache {
        return this.cache;
    }
    getHttp(): HttpService {
        return this.http;
    }
    async search(priceRequest: PriceRequestDto): Promise<GoodDto[]> {
        const suppliers = Array.from(this.suppliers, ([, value]) => value);
        const parsers: AbstractParser[] = priceRequest.suppliers
            ? at(
                  this.supplierService.apiParsers(),
                  suppliers
                      .filter((supplier) => priceRequest.suppliers.find((supplierId) => supplierId === supplier.id))
                      .map((supplier) => supplier.alias),
              )
            : Object.values(this.supplierService.apiParsers());
        return (
            await Promise.all(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                parsers.map((parser): AbstractParser => new parser(priceRequest, this)).map((parser) => parser.parse()),
            )
        ).flat();
    }
    getQueue(): Queue {
        return this.apiQueue;
    }
    @Cron('0 0 21 * * *')
    async handelRct() {
        await this.testDownload();
    }

    async testDownload() {
        this.logger.debug('Start rct import');
        const start = DateTime.now().toISO();
        const res = await this.http.get('https://www.rct.ru/price/all', { responseType: 'stream' });
        const response = await firstValueFrom(res);
        const workbook = new Excel.Workbook();
        await workbook.xlsx.read(response.data);
        const worksheet = workbook.getWorksheet(1);
        const promises: Promise<any>[] = [];
        const supplier = this.suppliers.get('rct');
        const currency = this.currencies.get('USD').id;
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
                        currency,
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
                        currency,
                    });
                }
                if (price3 !== 0) {
                    prices.push({
                        value: price3,
                        min: nextQuantity2,
                        max: 0,
                        currency,
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
                    alias: <string>row.getCell(3).value,
                };
                promises.push(this.goodService.createOrUpdate(good));
            }
        });
        await Promise.all(promises);
        const rancidGoods = await this.goodService.find({ updatedAt: { $lt: start }, supplier: supplier.id });
        await Promise.all(
            rancidGoods.map((rancidGood) => {
                rancidGood.warehouses = [];
                return this.goodService.createOrUpdate(rancidGood);
            }),
        );
        this.logger.debug('Finish rct import');
    }
}

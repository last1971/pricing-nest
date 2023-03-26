import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common';
import { IApiParsers } from '../interfaces/IApiParsers';
import { ConfigService } from '@nestjs/config';
import { SupplierService } from '../supplier/supplier.service';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { SupplierDto } from '../supplier/supplier.dto';
import { PriceRequestDto } from '../price/dtos/price.request.dto';
import { GoodDto } from '../good/dtos/good.dto';
import { AbstractParser } from './api-parsers/AbstractParser';
import { at } from 'lodash';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { CurrencyService } from '../currency/currency.service';
import { CurrencyDto } from '../currency/dto/currency.dto';

@Injectable()
export class ParsersService implements IApiParsers {
    private suppliers: Map<string, SupplierDto>;
    private currencies: Map<string, CurrencyDto>;
    private readonly logger = new Logger(ParsersService.name);
    constructor(
        protected configService: ConfigService,
        private supplierService: SupplierService,
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
}

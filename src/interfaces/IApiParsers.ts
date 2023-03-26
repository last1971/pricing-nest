import { SupplierDto } from '../supplier/supplier.dto';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { Queue } from 'bull';
import { CurrencyDto } from '../currency/dto/currency.dto';
export interface IApiParsers {
    getSuppliers(): Map<string, SupplierDto>;
    getCurrencies(): Map<string, CurrencyDto>;
    getConfigService(): ConfigService;
    getCache(): Cache;
    getHttp(): HttpService;
    getQueue(): Queue;
}

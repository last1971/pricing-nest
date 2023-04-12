import { SupplierDto } from '../supplier/supplier.dto';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { HttpService } from '@nestjs/axios';
import { Queue } from 'bull';
import { CurrencyDto } from '../currency/dto/currency.dto';
import { UnitDto } from '../unit/dtos/unit.dto';
import { GoodService } from '../good/good.service';
export interface IApiParsers {
    getSuppliers(): Map<string, SupplierDto>;
    getCurrencies(): Map<string, CurrencyDto>;
    getGoodService(): GoodService;
    getPiece(): UnitDto;
    getConfigService(): ConfigService;
    getCache(): Cache;
    getHttp(): HttpService;
    getQueue(): Queue;
}

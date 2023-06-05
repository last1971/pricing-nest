import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { SupplierService } from '../supplier/supplier.service';
import { CurrencyService } from '../currency/currency.service';
import { GoodService } from '../good/good.service';
import { UnitService } from '../unit/unit.service';
import { Queue } from 'bull';
import { VaultService } from 'vault-module/lib/vault.service';

export interface IScheduleParsers {
    getConfigService(): ConfigService;
    getHttp(): HttpService;
    getLog(): Logger;
    getSuppliers(): SupplierService;
    getCurrencies(): CurrencyService;
    getGoods(): GoodService;
    getUnitService(): UnitService;
    getQueue(): Queue;
    getVault(): VaultService;
}

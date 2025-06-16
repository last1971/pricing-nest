import { Test, TestingModule } from '@nestjs/testing';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { GoodDto } from '../good/dtos/good.dto';
import { SupplierService } from '../supplier/supplier.service';
import { CurrencyService } from '../currency/currency.service';
import { GoodService } from '../good/good.service';
import { ParserSchedule } from '../parsers/parser.schedule';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { Queue } from 'bull';
import { VaultService } from 'vault-module/lib/vault.service';

describe('PriceController', () => {
    let controller: PriceController;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PriceController],
            providers: [
                {
                    provide: PriceService,
                    useValue: {
                        getPrices: async () => [new GoodDto()],
                    },
                },
                {
                    provide: SupplierService,
                    useValue: {},
                },
                {
                    provide: CurrencyService,
                    useValue: {},
                },
                {
                    provide: GoodService,
                    useValue: {},
                },
                {
                    provide: ParserSchedule,
                    useValue: {
                        getHttp: () => ({} as HttpService),
                        getLog: () => new Logger(ParserSchedule.name),
                        getSuppliers: () => ({} as SupplierService),
                        getCurrencies: () => ({} as CurrencyService),
                        getGoods: () => ({} as GoodService),
                        getQueue: () => ({} as Queue),
                        getVault: () => ({} as VaultService),
                        updateParse: async () => {},
                    },
                },
            ],
        }).compile();

        controller = module.get<PriceController>(PriceController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('get prices', async () => {
        const response = await controller.findAll({ search: '123', dbOnly: false, withCache: true });
        expect(response).toHaveLength(1);
        expect(response[0]).toBeInstanceOf(GoodDto);
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ElsinParser } from './elsin.parser';
import { ParserSchedule } from '../parser.schedule';
import { VaultService } from 'vault-module/lib/vault.service';
import { HttpService } from '@nestjs/axios';
import { SupplierService } from '../../supplier/supplier.service';
import { GoodService } from '../../good/good.service';
import { CurrencyService } from '../../currency/currency.service';
import { UnitService } from '../../unit/unit.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheMock } from '../../mocks/cache.mock';
import { Queue } from 'bull';

describe('ElsinParser', () => {
    let parser: ElsinParser;
    let mockSchedule: ParserSchedule;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ElsinParser,
                {
                    provide: ParserSchedule,
                    useValue: {
                        getVault: jest.fn(),
                        getHttp: jest.fn(),
                        getSuppliers: jest.fn(),
                        getCurrencies: jest.fn(),
                        getGoods: jest.fn(),
                        getUnitService: jest.fn(),
                        getQueue: jest.fn(),
                    },
                },
            ],
        }).compile();

        parser = module.get<ElsinParser>(ElsinParser);
        mockSchedule = module.get<ParserSchedule>(ParserSchedule);
    });

    it('should be defined', () => {
        expect(parser).toBeDefined();
    });

    it('should have correct supplier alias', () => {
        expect(parser.getSupplierAlias()).toBe('elsin');
    });
}); 
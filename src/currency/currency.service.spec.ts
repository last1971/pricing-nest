import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { getModelToken } from '@nestjs/mongoose';
import { Currency } from './currency.schema';

describe('CurrencyService', () => {
    let service: CurrencyService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CurrencyService,
                {
                    provide: getModelToken(Currency.name),
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<CurrencyService>(CurrencyService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

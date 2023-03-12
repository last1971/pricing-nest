import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { getModelToken } from '@nestjs/mongoose';
import { Currency } from './currency.schema';
import { CurrencyDto } from './dto/currency.dto';

class MockData {
    constructor(public data?: any) {}
    toObject(): any {
        return this.data;
    }
}
class MockCurrencyModel {
    constructor(public data?: any) {}
    static async find() {
        return [new MockData({}), new MockData({})];
    }
}
describe('CurrencyService', () => {
    let service: CurrencyService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CurrencyService,
                {
                    provide: getModelToken(Currency.name),
                    useValue: MockCurrencyModel,
                },
            ],
        }).compile();

        service = module.get<CurrencyService>(CurrencyService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('all return array of CurencyDto', async () => {
        const all = await service.all();
        all.forEach((item) => expect(item).toBeInstanceOf(CurrencyDto));
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { getModelToken } from '@nestjs/mongoose';
import { Currency } from './currency.schema';
import { CurrencyDto } from './dto/currency.dto';
class MockData {
    public alfa3;
    public id;
    constructor(public data?: any) {
        this.alfa3 = data.alfa3;
        this.id = data.id;
    }
    toObject(): any {
        return this.data;
    }
}
class MockCurrencyModel {
    constructor(public data?: any) {}
    static async find() {
        return [new MockData({ alfa3: 'V01', id: '1' }), new MockData({ alfa3: 'V02', id: '2' })];
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
        await service.onModuleInit();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('all return array of CurencyDto', async () => {
        const all = await service.all();
        all.forEach((item) => expect(item).toBeInstanceOf(CurrencyDto));
    });

    it('test alfa3', async () => {
        const response = await service.alfa3('V01');
        expect(response).toHaveProperty('alfa3', 'V01');
    });

    it('test id', () => {
        const response = service.id('2');
        expect(response).toHaveProperty('alfa3', 'V02');
    });
});

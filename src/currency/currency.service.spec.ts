import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { getModelToken } from '@nestjs/mongoose';
import { Currency } from './currency.schema';
import { CurrencyDto } from './dto/currency.dto';
import { CbrClient } from './cbr.client';
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
// Курсы «в базе»: updateRates пишет сюда, find отдаёт
const stored: Record<string, { rate?: number; rateDate?: Date }> = { V01: {}, V02: {}, RUB: {} };

class MockCurrencyModel {
    constructor(public data?: any) {}
    static async find() {
        return [
            new MockData({ alfa3: 'V01', id: '1', ...stored.V01 }),
            new MockData({ alfa3: 'V02', id: '2', ...stored.V02 }),
            new MockData({ alfa3: 'RUB', id: '3', ...stored.RUB }),
        ];
    }
    static async updateOne(filter: { alfa3: string }, update: { rate: number; rateDate: Date }) {
        stored[filter.alfa3] = update;
    }
}

const cbr = { rates: jest.fn() };
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
                { provide: CbrClient, useValue: cbr },
            ],
        }).compile();

        service = module.get<CurrencyService>(CurrencyService);
        cbr.rates.mockReset();
        cbr.rates.mockResolvedValue({ date: new Date('2026-10-24T00:00:00Z'), rates: new Map([['V01', 80.5]]) });
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
    it('курсы ЦБ: известной валюте — курс и дата, RUB — 1, неизвестной — прежнее', async () => {
        expect(cbr.rates).toHaveBeenCalled(); // при старте курса не было — загрузился сразу
        const v01 = await service.alfa3('V01');
        expect(v01.rate).toBeCloseTo(80.5);
        expect(v01.rateDate).toEqual(new Date('2026-10-24T00:00:00Z'));
        expect((await service.alfa3('RUB')).rate).toBe(1);
        expect((await service.alfa3('V02')).rate).toBeUndefined();
    });
});

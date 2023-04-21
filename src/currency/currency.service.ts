import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Currency, CurrencyDocument } from './currency.schema';
import { Model } from 'mongoose';
import { CurrencyDto } from './dto/currency.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CurrencyService {
    private mapIdCurrencies: Map<string, CurrencyDto>;
    private mapAlfa3Currencies: Map<string, CurrencyDto>;
    constructor(@InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>) {}
    async onModuleInit(): Promise<void> {
        const currencies = await this.currencyModel.find();
        this.mapIdCurrencies = currencies.reduce(
            (map: Map<string, CurrencyDto>, currency) =>
                map.set(currency.id, plainToInstance(CurrencyDto, currency.toObject({ virtuals: true }))),
            new Map<string, CurrencyDto>(),
        );
        this.mapAlfa3Currencies = currencies.reduce(
            (map: Map<string, CurrencyDto>, currency) =>
                map.set(currency.alfa3, plainToInstance(CurrencyDto, currency.toObject({ virtuals: true }))),
            new Map<string, CurrencyDto>(),
        );
    }
    async all(): Promise<CurrencyDto[]> {
        return Array.from(this.mapAlfa3Currencies, ([, value]) => value); // this.currencyModel.find();
    }
    async alfa3(alfa3: string): Promise<CurrencyDto> {
        return this.mapAlfa3Currencies.get(alfa3); // this.currencyModel.findOne({ alfa3 });
    }
    id(id: string): CurrencyDto {
        return this.mapIdCurrencies.get(id);
    }
}

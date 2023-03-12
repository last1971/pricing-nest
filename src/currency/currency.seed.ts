import { InjectModel } from '@nestjs/mongoose';
import { Currency, CurrencyDocument } from './currency.schema';
import { Model } from 'mongoose';
import { CurrencyCreateDto } from './dto/currency.create.dto';
import currency from './currency.json';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CurrencySeed implements ICommand {
    private currency: CurrencyCreateDto[];
    constructor(@InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>) {
        this.currency = currency;
    }

    async seed(dtos: CurrencyCreateDto[]): Promise<void> {
        await Promise.all(
            dtos.map((dto: CurrencyCreateDto) => this.currencyModel.findOneAndUpdate(dto, {}, { upsert: true })),
        );
    }
    async execute(): Promise<void> {
        await this.seed(this.currency);
    }
}

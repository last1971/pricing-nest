import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Currency, CurrencyDocument } from './currency.schema';
import { Model } from 'mongoose';
import { CurrencyDto } from './currency.dto';

@Injectable()
export class CurrencyService {
    constructor(@InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>) {}
    async all(): Promise<CurrencyDto[]> {
        return this.currencyModel.find();
    }
}

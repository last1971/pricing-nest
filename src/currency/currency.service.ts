import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Currency, CurrencyDocument } from './currency.schema';
import { Model } from 'mongoose';

@Injectable()
export class CurrencyService {
    constructor(@InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>) {}
}

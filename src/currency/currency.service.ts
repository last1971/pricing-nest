import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Currency, CurrencyDocument } from './currency.schema';
import { Model } from 'mongoose';
import { CurrencyDto } from './dto/currency.dto';
import { ModelToDto } from '../decorators/model.to.dto';

@Injectable()
export class CurrencyService {
    constructor(@InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>) {}
    @ModelToDto(CurrencyDto)
    async all(): Promise<CurrencyDto[]> {
        return this.currencyModel.find();
    }
    @ModelToDto(CurrencyDto)
    async alfa3(alfa3: string): Promise<CurrencyDto> {
        return this.currencyModel.findOne({ alfa3 });
    }
}

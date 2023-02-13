import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Currency, CurrencySchema } from './currency.schema';
import { CurrencySeed } from './currency.seed';

@Module({
    imports: [MongooseModule.forFeature([{ name: Currency.name, schema: CurrencySchema }])],
    providers: [CurrencyService, CurrencySeed],
    exports: [CurrencyService, CurrencySeed],
})
export class CurrencyModule {}

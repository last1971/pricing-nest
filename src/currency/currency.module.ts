import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CurrencyService } from './currency.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Currency, CurrencySchema } from './currency.schema';
import { CurrencySeed } from './currency.seed';
import { CbrClient } from './cbr.client';
import { CurrencyController } from './currency.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: Currency.name, schema: CurrencySchema }]), HttpModule],
    providers: [CurrencyService, CurrencySeed, CbrClient],
    controllers: [CurrencyController],
    exports: [CurrencyService, CurrencySeed],
})
export class CurrencyModule {}

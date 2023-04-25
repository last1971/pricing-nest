import { Module } from '@nestjs/common';
import { ParsersService } from './parsers.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SupplierModule } from '../supplier/supplier.module';
import { BullModule } from '@nestjs/bull';
import { ParserProcessor } from './parser.processor';
import { GoodModule } from '../good/good.module';
import { CurrencyModule } from '../currency/currency.module';
import { ParserSchedule } from './parser.schedule';
import { UnitModule } from '../unit/unit.module';
import { ApiRequestStatModule } from '../api-request-stat/api-request-stat.module';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        SupplierModule,
        CurrencyModule,
        GoodModule,
        UnitModule,
        ApiRequestStatModule,
        MailModule,
        BullModule.registerQueue({
            name: 'api',
        }),
    ],
    providers: [ParsersService, ParserProcessor, ParserSchedule],
    exports: [ParsersService],
})
export class ParsersModule {}

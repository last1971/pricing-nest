import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SandboxModule } from './sandbox/sandbox.module';
import { CompelModule } from './parsers/compel/compel.module';
import { PriceModule } from './price/price.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SupplierModule } from './supplier/supplier.module';
import { UnitModule } from './unit/unit.module';
import { CurrencyModule } from './currency/currency.module';
import { SeedModule } from './seed/seed.module';

const configService = new ConfigService();
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(
            'mongodb://' +
                configService.get<string>('MONGODB_USER') +
                ':' +
                configService.get<string>('MONGODB_PASS') +
                '@' +
                configService.get<string>('MONGODB_URI') +
                '/' +
                configService.get<string>('MONGODB_DATABASE'),
        ),
        SandboxModule,
        CompelModule,
        PriceModule,
        SupplierModule,
        UnitModule,
        CurrencyModule,
        SeedModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}

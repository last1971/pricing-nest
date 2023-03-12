import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SandboxModule } from './sandbox/sandbox.module';
import { PriceModule } from './price/price.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SupplierModule } from './supplier/supplier.module';
import { UnitModule } from './unit/unit.module';
import { CurrencyModule } from './currency/currency.module';
import { SeedModule } from './seed/seed.module';
import { redisStore } from 'cache-manager-redis-yet';
import { ParsersModule } from './parsers/parsers.module';
import { BullModule } from '@nestjs/bull';
import { GoodModule } from './good/good.module';
import { ScheduleModule } from '@nestjs/schedule';

const configService = new ConfigService();
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CacheModule.registerAsync({
            isGlobal: true,
            useFactory: async () => ({
                store: await redisStore({ ttl: 600000 }),
            }),
        }),
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
        BullModule.forRoot({
            redis: {
                host: 'localhost',
                port: 6379,
            },
        }),
        ScheduleModule.forRoot(),
        SandboxModule,
        PriceModule,
        SupplierModule,
        UnitModule,
        CurrencyModule,
        SeedModule,
        ParsersModule,
        GoodModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}

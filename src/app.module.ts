import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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
import { ApiRequestStatModule } from './api-request-stat/api-request-stat.module';

//const configService = new ConfigService();
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        CacheModule.registerAsync({
            imports: [ConfigModule],
            isGlobal: true,
            useFactory: async (configService: ConfigService) => ({
                store: await redisStore({
                    ttl: configService.get<number>('CACHE_DEFAULT_EXP'),
                    socket: {
                        host: configService.get('REDIS_HOST'),
                        port: configService.get<number>('REDIS_PORT'),
                    },
                }),
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const user = configService.get<string>('MONGODB_USER');
                const pass = configService.get<string>('MONGODB_PASS');
                const uri = configService.get<string>('MONGODB_URI');
                const base = configService.get<string>('MONGODB_DATABASE');
                return {
                    uri: `mongodb://${user}:${pass}@${uri}/${base}`,
                };
            },
            inject: [ConfigService],
        }),
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                redis: {
                    host: configService.get('REDIS_HOST'),
                    port: configService.get('REDIS_PORT'),
                },
            }),
            inject: [ConfigService],
        }),
        ScheduleModule.forRoot(),
        PriceModule,
        SupplierModule,
        UnitModule,
        CurrencyModule,
        SeedModule,
        ParsersModule,
        GoodModule,
        ApiRequestStatModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}

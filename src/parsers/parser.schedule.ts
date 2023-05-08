import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
// import { TestParser } from './schedule-parsers/test.parser';
import { CronJob } from 'cron';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { IScheduleParsers } from '../interfaces/IScheduleParsers';
import { ScheduleParser } from './schedule-parsers/schedule.parser';
import { SupplierService } from '../supplier/supplier.service';
import { GoodService } from '../good/good.service';
import { CurrencyService } from '../currency/currency.service';
import { RctParser } from './schedule-parsers/rct.parser';
import { UnitService } from '../unit/unit.service';
import { MarsParser } from './schedule-parsers/mars.parser';
import { DanParser } from './schedule-parsers/dan.parser';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { RuElectronicsParser } from './schedule-parsers/ru.electronics.parser';
import { CompelDbfParser } from './schedule-parsers/compel.dbf.parser';

@Injectable()
export class ParserSchedule implements IScheduleParsers {
    private readonly logger = new Logger(ParserSchedule.name);
    private parsers = {
        //'0 * * * * *': [TestParser],
        '0 30 13 * * *': [RctParser],
        '0 32 13 * * *': [MarsParser],
        '0 34 13 * * *': [DanParser],
        '0 36 13 * * *': [RuElectronicsParser],
        '0 50 13 * * *': [CompelDbfParser],
    };
    constructor(
        private schedulerRegistry: SchedulerRegistry,
        protected configService: ConfigService,
        private http: HttpService,
        private supplierService: SupplierService,
        @Inject(forwardRef(() => GoodService)) private goodService: GoodService,
        private currencyService: CurrencyService,
        private unitService: UnitService,
        @InjectQueue('api') private readonly apiQueue: Queue,
    ) {
        Object.keys(this.parsers).forEach((key) => {
            this.parsers[key].forEach((parserClass) => {
                const parser: ScheduleParser = new parserClass(this);
                const job = new CronJob(key, async () => {
                    await parser.execute();
                });
                this.schedulerRegistry.addCronJob(key + ' : ' + parser.constructor.name, job);
                job.start();
            });
        });
        this.logger.log('Start');
    }

    getConfigService(): ConfigService {
        return this.configService;
    }

    getHttp(): HttpService {
        return this.http;
    }

    getLog(): Logger {
        return this.logger;
    }

    getSuppliers(): SupplierService {
        return this.supplierService;
    }
    getCurrencies(): CurrencyService {
        return this.currencyService;
    }
    getGoods(): GoodService {
        return this.goodService;
    }
    getUnitService(): UnitService {
        return this.unitService;
    }
    getQueue(): Queue {
        return this.apiQueue;
    }
}

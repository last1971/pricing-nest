import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
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
import { IstochnikParser } from './schedule-parsers/istochnik.parser';
import { VaultService } from 'vault-module/lib/vault.service';
import { EskParser } from './schedule-parsers/esk.parser';
import fs from 'fs/promises';
import { ConfigService } from '@nestjs/config';
import { MAIL_ERROR_MESSAGE } from '../mail/mail.constants';
import { DateTime, Duration } from 'luxon';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TriatronParser } from './schedule-parsers/triatron.parser';
import { MicroemParser } from './schedule-parsers/microem.parser';
import { UnisvsParser } from './schedule-parsers/unisvs.parser';
import { KulibinParser } from './schedule-parsers/kulibin.parser';
import { DiamantParser } from './schedule-parsers/diamant.parser';

@Injectable()
export class ParserSchedule implements IScheduleParsers {
    private readonly logger = new Logger(ParserSchedule.name);
    private parsers = {
        '0 32 23 * * *': [RctParser],
        '0 34 23 * * *': [MarsParser],
        '0 36 23 * * *': [DanParser],
        '0 38 23 * * *': [RuElectronicsParser],
        '0 40 23 * * *': [CompelDbfParser],
        '0 42 23 * * *': [IstochnikParser],
        '0 44 23 * * *': [EskParser],
        '0 46 23 * * *': [KulibinParser],
        '0 48 23 * * *': [DiamantParser],
    };
    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private vaultService: VaultService,
        private http: HttpService,
        private supplierService: SupplierService,
        @Inject(forwardRef(() => GoodService)) private goodService: GoodService,
        private currencyService: CurrencyService,
        private unitService: UnitService,
        @InjectQueue('api') private readonly apiQueue: Queue,
        private configService: ConfigService,
        @Inject(CACHE_MANAGER) private cache: Cache,
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
    getVault(): VaultService {
        return this.vaultService;
    }
    @Cron('0 */2 * * * *')
    async checkUpload(): Promise<void> {
        const upload = this.configService.get('UPLOAD', 'price');
        const uploadError = await this.cache.get(ParserSchedule.name + ':check-upload');
        if (uploadError) return;
        try {
            await fs.access(upload);
        } catch (e) {
            this.cache.set(ParserSchedule.name + ':check-upload', true, 3600000);
            this.apiQueue.add(MAIL_ERROR_MESSAGE, {
                error: e.message,
                time: DateTime.now().toLocaleString(DateTime.DATETIME_FULL),
                duration: DateTime.now()
                    .plus(Duration.fromObject({ hours: 1 }))
                    .toLocaleString(DateTime.DATETIME_FULL),
                module: ParserSchedule.name,
            });
            this.logger.error(e.message);
        }
        const files = await fs.readdir(upload);
        for (const file of files) {
            const ruleObject = [
                { reg: /.*xlsx.zip/gm, parserClass: TriatronParser },
                { reg: /ExpEmail.csv/gm, parserClass: MicroemParser },
                { reg: /Unisvs R.zip/gm, parserClass: UnisvsParser },
            ].find((rule) => {
                const res = file.match(rule.reg);
                return !!res;
            });
            if (ruleObject) {
                const { parserClass } = ruleObject;
                const parser = new parserClass(this, upload + '/' + file);
                await parser.execute();
            } else {
                this.logger.warn(file + ' was removed');
            }
            await fs.rm(upload + '/' + file);
        }
    }
    async updateParse(alias: string): Promise<void> {
        let parser: ScheduleParser = null;
        for (const parserClass of Object.values(this.parsers).flat()) {
            const parserInstance = new parserClass(this);
            if (parserInstance.getSupplierAlias() === alias) {
                parser = parserInstance;
                break;
            }
        }
        if (parser) {
            await parser.execute();
        } else {
            this.logger.error(alias + ' is not Supplier');
        }
    }
}

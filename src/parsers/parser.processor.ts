import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { GoodDto } from '../good/dtos/good.dto';
import { GoodService } from '../good/good.service';
import { ApiRequestStatService } from '../api-request-stat/api-request-stat.service';
import { ApiRequestStatDto } from '../api-request-stat/api.request.stat.dto';
import { MAIL_ERROR_MESSAGE } from '../mail/mail.constants';
import { MailErrorDto } from '../mail/mail.error.dto';
import { MailService } from '../mail/mail.service';
import { ParserSchedule } from './parser.schedule';

@Processor('api')
export class ParserProcessor {
    constructor(
        private goodService: GoodService,
        private apiRequestStatService: ApiRequestStatService,
        private mailService: MailService,
        private parseSchedule: ParserSchedule,
        @Inject(CACHE_MANAGER) private cache: Cache,
    ) {}
    @Process('keys')
    async keys(job: Job): Promise<void> {
        const goods: GoodDto[] = await this.cache.get<GoodDto[]>(job.data);
        await Promise.all(goods.map((good) => this.goodService.createOrUpdate(good)));
    }

    @Process('apiRequestStats')
    async apiRequestStats(job: Job): Promise<void> {
        await this.apiRequestStatService.create(job.data as ApiRequestStatDto);
    }

    @Process(MAIL_ERROR_MESSAGE)
    async processErrorMessage(job: Job<MailErrorDto>): Promise<void> {
        await this.mailService.sendErrorMessage(job.data);
    }

    @Process('parseForDb')
    async processParseForDb(job: Job<string>): Promise<void> {
        await this.parseSchedule.updateParse(job.data);
    }
}

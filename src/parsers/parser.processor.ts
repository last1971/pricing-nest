import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { GoodDto } from '../good/dtos/good.dto';
import { GoodService } from '../good/good.service';

@Processor('api')
export class ParserProcessor {
    constructor(private goodService: GoodService, @Inject(CACHE_MANAGER) private cache: Cache) {}
    @Process('keys')
    async handle(job: Job): Promise<void> {
        const goods: GoodDto[] = await this.cache.get<GoodDto[]>(job.data);
        await Promise.all(goods.map((good) => this.goodService.createOrUpdate(good)));
    }
}

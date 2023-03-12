import { Injectable } from '@nestjs/common';
import { PriceRequestDto } from './price.request.dto';
import { GoodDto } from '../good/dtos/good.dto';
import { ParsersService } from '../parsers/parsers.service';
import { GoodService } from '../good/good.service';

@Injectable()
export class PriceService {
    constructor(private parses: ParsersService, private goodService: GoodService) {}
    async getPrices(request: PriceRequestDto): Promise<GoodDto[]> {
        return (await Promise.all([this.parses.search(request), this.goodService.search(request)])).flat();
        //const strategiesService = new PriceStrategiesService(request);
        //const strategies = strategiesService.execute();
        //return { data: flatten(strategies.map((strategy) => strategy.execute())) };
    }
}

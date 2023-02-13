import { Injectable } from '@nestjs/common';
import { PriceRequestDto } from './price.request.dto';
import { PriceResponseDto } from './price.response.dto';
import { PriceStrategiesService } from './price.strategies.service';
import { flatten } from 'lodash';

@Injectable()
export class PriceService {
    async getPrices(request: PriceRequestDto): Promise<PriceResponseDto> {
        const strategiesService = new PriceStrategiesService(request);
        const strategies = strategiesService.execute();
        return { data: flatten(strategies.map((strategy) => strategy.execute())) };
    }
}

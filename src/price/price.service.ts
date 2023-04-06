import { Injectable } from '@nestjs/common';
import { PriceRequestDto } from './dtos/price.request.dto';
import { GoodDto } from '../good/dtos/good.dto';
import { ParsersService } from '../parsers/parsers.service';
import { GoodService } from '../good/good.service';

@Injectable()
export class PriceService {
    constructor(private parsers: ParsersService, private goodService: GoodService) {}
    async getPrices(request: PriceRequestDto): Promise<GoodDto[]> {
        const searchers: Promise<GoodDto[]>[] = [this.goodService.search(request)];
        if (!request.dbOnly) {
            searchers.push(this.parsers.search(request));
        }
        return (await Promise.all(searchers)).flat();
    }
}

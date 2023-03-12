import { Controller, Get, Query } from '@nestjs/common';
import { PriceRequestDto } from './dtos/price.request.dto';
import { PriceService } from './price.service';
import { GoodDto } from '../good/dtos/good.dto';

@Controller('price')
export class PriceController {
    constructor(private service: PriceService) {}
    @Get()
    async findAll(@Query() request: PriceRequestDto): Promise<GoodDto[]> {
        return this.service.getPrices(request);
    }
}

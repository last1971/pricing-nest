import { Controller, Get, Query } from '@nestjs/common';
import { PriceRequestDto } from './price.request.dto';

@Controller('price')
export class PriceController {
    @Get()
    findAll(@Query() request: PriceRequestDto): string {
        console.log(request);
        return 'This action returns all cats';
    }
}

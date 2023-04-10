import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { PriceRequestDto } from './dtos/price.request.dto';
import { PriceService } from './price.service';
import { TransformSuppliers } from '../decorators/transform.suppliers';
import { PriceResponseDto } from './dtos/price.response.dto';
import { PriceInterceptor } from '../decorators/prices.interceptor';

@Controller('price')
export class PriceController {
    constructor(private service: PriceService) {}
    @Get()
    @UseInterceptors(PriceInterceptor)
    async findAll(@Query(TransformSuppliers) request: PriceRequestDto): Promise<any> {
        return new PriceResponseDto({
            data: await this.service.getPrices(request),
            request,
        });
    }
}

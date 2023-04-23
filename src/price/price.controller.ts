import { Controller, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { PriceRequestDto } from './dtos/price.request.dto';
import { PriceService } from './price.service';
import { TransformSuppliers } from '../decorators/transform.suppliers';
import { PriceResponseDto } from './dtos/price.response.dto';
import { PriceSupplierInterceptor } from '../decorators/price.supplier.interceptor';
import { TradeInterceptor } from '../decorators/trade.interceptor';
import { GoodService } from '../good/good.service';
import { PriceSetGoodIdDto } from './dtos/price.set.good.id.dto';
import { GoodIdInterceptor } from '../decorators/good.id.interceptor';

@Controller('price')
export class PriceController {
    constructor(private service: PriceService, private goodService: GoodService) {}
    @Get()
    @UseInterceptors(PriceSupplierInterceptor)
    async findAll(@Query(TransformSuppliers) request: PriceRequestDto): Promise<any> {
        return new PriceResponseDto({
            data: await this.service.getPrices(request),
            request,
        });
    }

    @Get('trade')
    @UseInterceptors(TradeInterceptor, GoodIdInterceptor, PriceSupplierInterceptor)
    async findForTrade(@Query(TransformSuppliers) request: PriceRequestDto): Promise<any> {
        return new PriceResponseDto({
            data: await this.service.getPrices(request),
            request,
        });
    }

    @Post('good-id')
    async setGoodId(@Query() setGoodDto: PriceSetGoodIdDto): Promise<any> {
        const result = await this.goodService.setGood(setGoodDto);
        return { result };
    }
}

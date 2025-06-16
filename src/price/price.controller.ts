import { Controller, Get, Query, UseInterceptors, Post, Param } from '@nestjs/common';
import { PriceRequestDto } from './dtos/price.request.dto';
import { PriceService } from './price.service';
import { PriceSupplierInterceptor } from '../decorators/price.supplier.interceptor';
import { TradeInterceptor } from '../decorators/trade.interceptor';
import { GoodIdInterceptor } from '../decorators/good.id.interceptor';
import { GoodDto } from '../good/dtos/good.dto';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { TradePriceDto } from './dtos/trade.price.dto';
import { SupplierService } from '../supplier/supplier.service';
import { ParserSchedule } from '../parsers/parser.schedule';

@ApiTags('price')
@Controller('price')
export class PriceController {
    constructor(
        private service: PriceService,
        private supplierService: SupplierService,
        private parserSchedule: ParserSchedule
    ) {}

    @ApiOkResponse({
        isArray: true,
        type: GoodDto,
        description: 'Search goods in api and db by substring and response goods json',
    })
    @Get()
    @UseInterceptors(PriceSupplierInterceptor)
    async findAll(@Query() request: PriceRequestDto): Promise<GoodDto[]> {
        return this.service.getPrices(request);
    }

    @ApiOkResponse({
        isArray: true,
        type: TradePriceDto,
        description: 'Search goods in api and db by substring and response in elcopro trade format',
    })
    @Get('trade')
    @UseInterceptors(TradeInterceptor, PriceSupplierInterceptor, GoodIdInterceptor)
    async findForTrade(@Query() request: PriceRequestDto): Promise<any> {
        return this.service.getPrices(request);
    }

    @ApiOkResponse({
        isArray: true,
        type: GoodDto,
        description: 'Search goods for dealers in db by substring and response goods json',
    })
    @Get('dealers')
    @UseInterceptors(PriceSupplierInterceptor)
    async findForDealers(@Query('search') search: string): Promise<GoodDto[]> {
        const request = await this.supplierService.createDealerPriceRequest(search);
        return this.service.getPrices(request);
    }

    @ApiOkResponse({
        description: 'Update prices from supplier',
    })
    @Post('update/:alias')
    async updatePrices(@Param('alias') alias: string): Promise<void> {
        await this.parserSchedule.updateParse(alias);
    }
}

import { Controller, Get, Query, UseInterceptors, Post, Param } from '@nestjs/common';
import { PriceRequestDto } from './dtos/price.request.dto';
import { PriceService } from './price.service';
import { PriceSupplierInterceptor } from '../decorators/price.supplier.interceptor';
import { TradeInterceptor } from '../decorators/trade.interceptor';
import { GoodIdInterceptor } from '../decorators/good.id.interceptor';
import { GoodDto } from '../good/dtos/good.dto';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LiveStockDto } from './dtos/live.stock.dto';
import { LIVE_MAX_CODES } from './price.service';
import { TradePriceDto } from './dtos/trade.price.dto';
import { SupplierService } from '../supplier/supplier.service';
import { ParserSchedule } from '../parsers/parser.schedule';
import { SupplierCodesPipe } from '../pipes/supplier.codes.pipe';

@ApiTags('price')
@Controller('price')
export class PriceController {
    constructor(
        private service: PriceService,
        private supplierService: SupplierService,
        private parserSchedule: ParserSchedule,
    ) {}

    @ApiOkResponse({
        isArray: true,
        type: GoodDto,
        description: 'Search goods in api and db by substring and response goods json',
    })
    @Get()
    @UseInterceptors(PriceSupplierInterceptor)
    async findAll(@Query(SupplierCodesPipe) request: PriceRequestDto): Promise<GoodDto[]> {
        return this.service.getPrices(request);
    }

    @ApiOkResponse({
        isArray: true,
        type: TradePriceDto,
        description: 'Search goods in api and db by substring and response in elcopro trade format',
    })
    @Get('trade')
    @UseInterceptors(TradeInterceptor, PriceSupplierInterceptor, GoodIdInterceptor)
    async findForTrade(@Query(SupplierCodesPipe) request: PriceRequestDto): Promise<any> {
        return this.service.getPrices(request);
    }

    @ApiOkResponse({
        isArray: true,
        type: GoodDto,
        description: 'Search goods for dealers in db by substring and response goods json',
    })
    @Get('dealers')
    async findForDealers(@Query('search') search: string): Promise<GoodDto[]> {
        const request = await this.supplierService.createDealerPriceRequest(search);
        return this.service.getPrices(request);
    }

    @ApiOperation({
        summary: 'Живой остаток поставщика по его кодам (для корзины магазина)',
        description:
            'codes — коды товаров у поставщика через запятую (не больше 50). Ответ: код → {warehouse, quantity, multiple, ' +
            'deliveryTime, source}; source=api — ответ поставщика сейчас, db — суточный файл (API не ответил); null — кода нет.',
    })
    @ApiParam({ name: 'alias', example: 'compel' })
    @ApiQuery({ name: 'codes', example: '1185005,269447' })
    @ApiOkResponse({ type: LiveStockDto, isArray: false })
    @Get('live/:alias')
    async live(
        @Param('alias') alias: string,
        @Query('codes') codes: string,
    ): Promise<Record<string, LiveStockDto | null>> {
        const list = Array.from(
            new Set(
                (codes ?? '')
                    .split(',')
                    .map((c) => c.trim())
                    .filter((c) => c !== ''),
            ),
        );
        return this.service.live(alias, list.slice(0, LIVE_MAX_CODES));
    }

    @ApiOkResponse({
        description: 'Update prices from supplier',
    })
    @Post('update/:alias')
    async updatePrices(@Param('alias') alias: string): Promise<void> {
        await this.parserSchedule.updateParse(alias);
    }
}

import * as fs from 'fs/promises';
import * as path from 'path';
import {
    Controller,
    Post,
    Query,
    Body,
    Get,
    Param,
    ParseBoolPipe,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { SetGoodIdDto } from './dtos/set.good.id.dto';
import { GetRawResponseDto } from './dtos/get-raw-response.dto';
import { GoodService } from './good.service';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GoodDto } from './dtos/good.dto';
@ApiTags('good')
@Controller('good')
export class GoodController {
    constructor(private goodService: GoodService) {}
    @ApiCreatedResponse({
        schema: {
            type: 'object',
            properties: {
                result: {
                    type: 'boolean',
                    example: false,
                },
            },
        },
        description:
            'Bind the id of the supplier of the goods to the good of the database. ' +
            'True - success, False - problem with supplierAlias or goodId',
    })
    @Post('good-id')
    async setGoodId(@Query() setGoodDto: SetGoodIdDto): Promise<any> {
        const result = await this.goodService.setGood(setGoodDto);
        return { result };
    }

    @ApiOkResponse({
        isArray: true,
        type: GoodDto,
        description: 'Get raw response data for goods by IDs',
    })
    @ApiOperation({
        summary: 'Товары поставщика постранично',
        description:
            'Все товары поставщика по alias (sort по коду), skip/limit для пачек; inStock=true — только с остатком.',
    })
    @ApiParam({ name: 'alias', example: 'compel' })
    @ApiQuery({ name: 'skip', required: false, example: 0 })
    @ApiQuery({ name: 'limit', required: false, example: 500 })
    @ApiQuery({ name: 'inStock', required: false, example: true })
    @ApiOkResponse({ isArray: true, type: GoodDto })
    @Get('supplier/:alias')
    async bySupplier(
        @Param('alias') alias: string,
        @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
        @Query('limit', new DefaultValuePipe(500), ParseIntPipe) limit: number,
        @Query('inStock', new DefaultValuePipe(true), ParseBoolPipe) inStock: boolean,
    ): Promise<GoodDto[]> {
        return this.goodService.findBySupplierAlias(
            alias,
            Math.max(0, skip),
            Math.min(Math.max(1, limit), 2000),
            inStock,
        );
    }

    @Get('supplier/:alias/catalog-status')
    async catalogStatus(@Param('alias') alias: string): Promise<Record<string, unknown>> {
        if (alias !== 'promelec') return { completed: false };
        try {
            const status = JSON.parse(await fs.readFile(path.resolve('var/catalog/promelec-status.json'), 'utf8'));
            return { completed: status.completed === true, phase: status.phase, total: status.total, imported: status.imported, updatedAt: status.updatedAt };
        } catch { return { completed: false }; }
    }

    @Post('raw-response')
    async getRawResponse(@Body() dto: GetRawResponseDto): Promise<GoodDto[]> {
        return this.goodService.findByIds(dto.ids);
    }
}

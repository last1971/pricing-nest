import { Controller, Post, Query, Body } from '@nestjs/common';
import { SetGoodIdDto } from './dtos/set.good.id.dto';
import { GetRawResponseDto } from './dtos/get-raw-response.dto';
import { GoodService } from './good.service';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
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
    @Post('raw-response')
    async getRawResponse(@Body() dto: GetRawResponseDto): Promise<GoodDto[]> {
        return this.goodService.findByIds(dto.ids);
    }
}

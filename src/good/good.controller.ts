import { Controller, Post, Query } from '@nestjs/common';
import { SetGoodIdDto } from './dtos/set.good.id.dto';
import { GoodService } from './good.service';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
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
}

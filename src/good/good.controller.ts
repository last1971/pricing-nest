import { Controller, Post, Query } from '@nestjs/common';
import { SetGoodIdDto } from './dtos/set.good.id.dto';
import { GoodService } from './good.service';

@Controller('good')
export class GoodController {
    constructor(private goodService: GoodService) {}
    @Post('good-id')
    async setGoodId(@Query() setGoodDto: SetGoodIdDto): Promise<any> {
        const result = await this.goodService.setGood(setGoodDto);
        return { result };
    }
}

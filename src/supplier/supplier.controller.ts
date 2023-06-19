import { Controller, Get, Param, Post } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { SupplierRateDto } from './supplier.rate.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
@ApiTags('supplier')
@Controller('supplier')
export class SupplierController {
    constructor(private service: SupplierService, @InjectQueue('api') private readonly apiQueue: Queue) {}

    @ApiParam({ name: 'alias', required: false, description: 'Supplier Alias', example: 'elcopro' })
    @ApiOkResponse({
        description: 'Average response time per supplier',
        isArray: true,
        type: SupplierRateDto,
    })
    @Get('rate/:alias?')
    async rate(@Param('alias') alias: string): Promise<SupplierRateDto[]> {
        return this.service.rate(alias);
    }
    @ApiParam({ name: 'alias', required: false, description: 'Supplier Alias', example: 'elcopro' })
    @Post('error/clear/:alias?')
    @ApiOkResponse({
        description: 'Clear supplier api error',
        type: 'object',
    })
    async errorClear(@Param('alias') alias: string): Promise<any> {
        await this.service.errorClear(alias);
        return { message: 'Error was cleared in cache' };
    }
    @ApiParam({ name: 'alias', required: false, description: 'Supplier Alias', example: 'elcopro' })
    @Post('update/:alias?')
    @ApiOkResponse({
        description: 'Update supplier price from file or url',
        type: 'object',
    })
    async update(@Param('alias') alias: string): Promise<any> {
        await this.apiQueue.add('parseForDb', alias);
        return { message: 'Try to parse' };
    }
}

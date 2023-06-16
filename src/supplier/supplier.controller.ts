import { Controller, Get, Param, Post } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { SupplierRateDto } from './supplier.rate.dto';
@ApiTags('supplier')
@Controller('supplier')
export class SupplierController {
    constructor(private service: SupplierService) {}

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
    async errorClear(@Param('alias') alias: string): Promise<any> {
        await this.service.errorClear(alias);
        return { message: 'Error was cleared in cache' };
    }
}

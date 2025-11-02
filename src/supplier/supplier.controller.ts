import { Controller, Get, Param, Post } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { SupplierRateDto } from './supplier.rate.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SupplierDto } from './supplier.dto';
@ApiTags('supplier')
@Controller('supplier')
export class SupplierController {
    constructor(private service: SupplierService, @InjectQueue('api') private readonly apiQueue: Queue) {}

    @ApiOkResponse({
        description: 'Average response time per supplier',
        isArray: true,
        type: SupplierRateDto,
    })
    @Get('rate')
    async rateAll(): Promise<SupplierRateDto[]> {
        return this.service.rate(undefined);
    }

    @ApiParam({ name: 'alias', required: true, description: 'Supplier Alias', example: 'elcopro' })
    @ApiOkResponse({
        description: 'Average response time per supplier',
        isArray: true,
        type: SupplierRateDto,
    })
    @Get('rate/:alias')
    async rate(@Param('alias') alias: string): Promise<SupplierRateDto[]> {
        return this.service.rate(alias);
    }
    @Post('error/clear')
    @ApiOkResponse({
        description: 'Clear supplier api error',
        type: 'object',
    })
    async errorClearAll(): Promise<any> {
        await this.service.errorClear(undefined);
        return { message: 'Error was cleared in cache' };
    }

    @ApiParam({ name: 'alias', required: true, description: 'Supplier Alias', example: 'elcopro' })
    @Post('error/clear/:alias')
    @ApiOkResponse({
        description: 'Clear supplier api error',
        type: 'object',
    })
    async errorClear(@Param('alias') alias: string): Promise<any> {
        await this.service.errorClear(alias);
        return { message: 'Error was cleared in cache' };
    }
    @Post('vault/clear')
    @ApiOkResponse({
        description: 'Clear vault cache',
        type: 'object',
    })
    async clearVaultCache(): Promise<any> {
        await this.service.vaultClear();
        return { message: 'Vault cache was cleared' };
    }
    @ApiParam({ name: 'alias', required: true, description: 'Supplier Alias', example: 'elcopro' })
    @Post('update/:alias')
    @ApiOkResponse({
        description: 'Update supplier price from file or url',
        type: 'object',
    })
    async update(@Param('alias') alias: string): Promise<any> {
        await this.apiQueue.add('parseForDb', alias);
        return { message: 'Try to parse' };
    }
    @Get('dealers')
    @ApiOkResponse({
        description: 'Get list of dealer suppliers with their details (delivery time, codes, etc)',
        isArray: true,
        type: SupplierDto
    })
    async dealers(): Promise<SupplierDto[]> {
        const aliases = await this.service.dealerList();
        return this.service.getSuppliersByAliases(aliases);
    }
}

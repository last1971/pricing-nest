import { Controller, Get, Param } from '@nestjs/common';
import { SupplierService } from './supplier.service';

@Controller('supplier')
export class SupplierController {
    constructor(private service: SupplierService) {}

    @Get('rate/:alias?')
    async rate(@Param('alias') alias: string) {
        return this.service.rate(alias);
    }
}

import { Module } from '@nestjs/common';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { ParsersModule } from '../parsers/parsers.module';
import { GoodModule } from '../good/good.module';
import { SupplierModule } from '../supplier/supplier.module';

@Module({
    imports: [ParsersModule, GoodModule, SupplierModule],
    providers: [PriceService],
    controllers: [PriceController],
    exports: [PriceService],
})
export class PriceModule {}

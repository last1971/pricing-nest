import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { CurrencyModule } from '../currency/currency.module';
import { SupplierModule } from '../supplier/supplier.module';
import { UnitModule } from '../unit/unit.module';
@Module({
    imports: [CurrencyModule, SupplierModule, UnitModule],
    providers: [SeedService],
    exports: [SeedService],
})
export class SeedModule {}

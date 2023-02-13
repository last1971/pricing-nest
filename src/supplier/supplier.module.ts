import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supplier, SupplierSchema } from './supplier.schema';
import { SupplierService } from './supplier.service';
import { SupplierSeed } from './supplier.seed';

@Module({
    imports: [MongooseModule.forFeature([{ name: Supplier.name, schema: SupplierSchema }])],
    providers: [SupplierService, SupplierSeed],
    exports: [SupplierService, SupplierSeed],
})
export class SupplierModule {}

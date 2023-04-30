import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supplier, SupplierSchema } from './supplier.schema';
import { SupplierService } from './supplier.service';
import { SupplierSeed } from './supplier.seed';
import { SupplierController } from './supplier.controller';
import { ApiRequestStatModule } from '../api-request-stat/api-request-stat.module';

@Module({
    imports: [MongooseModule.forFeature([{ name: Supplier.name, schema: SupplierSchema }]), ApiRequestStatModule],
    providers: [SupplierService, SupplierSeed],
    exports: [SupplierService, SupplierSeed],
    controllers: [SupplierController],
})
export class SupplierModule {}

import { Module } from '@nestjs/common';
import { GoodService } from './good.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Good, GoodSchema } from './schemas/good.schema';
import { SupplierModule } from '../supplier/supplier.module';

@Module({
    imports: [MongooseModule.forFeature([{ name: Good.name, schema: GoodSchema }]), SupplierModule],
    providers: [GoodService],
    exports: [GoodService],
})
export class GoodModule {}

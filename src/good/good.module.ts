import { Module } from '@nestjs/common';
import { GoodService } from './good.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Good, GoodSchema } from './schemas/good.schema';
import { SupplierModule } from '../supplier/supplier.module';
import { GoodController } from './good.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: Good.name, schema: GoodSchema }]), SupplierModule],
    providers: [GoodService],
    exports: [GoodService],
    controllers: [GoodController],
})
export class GoodModule {}

import { Module } from '@nestjs/common';
import { GoodService } from './good.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Good, GoodSchema } from './schemas/good.schema';
import { SupplierModule } from '../supplier/supplier.module';
import { GoodController } from './good.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [MongooseModule.forFeature([{ name: Good.name, schema: GoodSchema }]), SupplierModule, ConfigModule],
    providers: [GoodService],
    exports: [GoodService],
    controllers: [GoodController],
})
export class GoodModule {}

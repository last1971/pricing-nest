import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Good, GoodDocument } from './schemas/good.schema';
import { Model } from 'mongoose';
import { GoodDto } from './dtos/good.dto';
import { omit, pick } from 'lodash';
import { Source } from './dtos/source.enum';
import { PriceRequestDto } from '../price/price.request.dto';
import { SupplierDto } from '../supplier/supplier.dto';
import { SupplierService } from '../supplier/supplier.service';

@Injectable()
export class GoodService {
    private suppliers: SupplierDto[];
    constructor(
        @InjectModel(Good.name) private goodModel: Model<GoodDocument>,
        private supplierService: SupplierService,
    ) {}
    async onModuleInit() {
        this.suppliers = await this.supplierService.dbOnly();
    }
    async createOrUpdate(good: GoodDto): Promise<void> {
        good.source = Source.Db;
        await this.goodModel.findOneAndUpdate(pick(good, ['code', 'supplier']), omit(good, ['code', 'supplier']), {
            upsert: true,
        });
    }
    async find(filter: any): Promise<GoodDto[]> {
        return this.goodModel.find(filter);
    }
    async search(priceRequestDto: PriceRequestDto): Promise<GoodDto[]> {
        const suppliers = priceRequestDto.suppliers
            ? this.suppliers.filter((supplier) => priceRequestDto.suppliers.includes(supplier.id))
            : this.suppliers;
        return this.goodModel.find({
            supplier: { $in: suppliers.map((supplier) => supplier.id) },
            alias: { $regex: new RegExp(priceRequestDto.search, 'i') },
        });
    }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Good, GoodDocument } from './schemas/good.schema';
import { Model } from 'mongoose';
import { GoodDto } from './dtos/good.dto';
import { omit, pick } from 'lodash';
import { Source } from './dtos/source.enum';
import { PriceRequestDto } from '../price/dtos/price.request.dto';
import { SupplierDto } from '../supplier/supplier.dto';
import { SupplierService } from '../supplier/supplier.service';
import { alias } from '../helpers';
import { ModelToDto } from '../decorators/model.to.dto';
import { isString } from 'lodash';

@Injectable()
export class GoodService {
    private dbSuppliers: SupplierDto[];
    private allSuppliers: SupplierDto[];
    constructor(
        @InjectModel(Good.name) private goodModel: Model<GoodDocument>,
        private supplierService: SupplierService,
    ) {}
    async onModuleInit() {
        this.dbSuppliers = await this.supplierService.dbOnly();
        this.allSuppliers = await this.supplierService.all();
    }
    async createOrUpdate(good: GoodDto): Promise<void> {
        good.source = Source.Db;
        good.alias = alias(good.alias);
        await this.goodModel.findOneAndUpdate(pick(good, ['code', 'supplier']), omit(good, ['code', 'supplier']), {
            upsert: true,
        });
    }
    @ModelToDto(GoodDto)
    async find(filter: any): Promise<GoodDto[]> {
        if (filter.alias && isString(filter.alias)) {
            filter.alias = { $regex: new RegExp(alias(filter.alias), 'i') };
        }
        return this.goodModel.find(filter);
    }
    @ModelToDto(GoodDto)
    async search(priceRequestDto: PriceRequestDto): Promise<GoodDto[]> {
        const searchSuppliers = priceRequestDto.dbOnly ? this.allSuppliers : this.dbSuppliers;
        const suppliers = priceRequestDto.suppliers
            ? searchSuppliers.filter((supplier) => priceRequestDto.suppliers.includes(supplier.id))
            : searchSuppliers;
        return this.goodModel.find({
            supplier: { $in: suppliers.map((supplier) => supplier.id) },
            alias: { $regex: new RegExp(alias(priceRequestDto.search), 'i') },
        });
    }
}

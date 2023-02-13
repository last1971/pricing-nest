import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier, SupplierDocument } from './supplier.schema';
import { Model } from 'mongoose';
import { SupplierCreateDto } from './supplier.create.dto';

@Injectable()
export class SupplierService {
    constructor(@InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>) {}

    async create(dto: SupplierCreateDto): Promise<any> {
        return this.supplierModel.create(dto);
    }
}

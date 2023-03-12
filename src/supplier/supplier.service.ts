import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier, SupplierDocument } from './supplier.schema';
import { Model } from 'mongoose';
import { SupplierCreateDto } from './supplier.create.dto';
import { SupplierDto } from './supplier.dto';
import { CompelParser } from '../parsers/CompelParser';
import { PromelecParser } from '../parsers/PromelecParser';

@Injectable()
export class SupplierService {
    private parsers: any;
    constructor(@InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>) {
        this.parsers = {
            compel: CompelParser,
            promelec: PromelecParser,
        };
    }
    async create(dto: SupplierCreateDto): Promise<Supplier> {
        return this.supplierModel.create(dto);
    }
    async alias(alias: string): Promise<SupplierDto> {
        return this.supplierModel.findOne({ alias });
    }
    async all(): Promise<SupplierDto[]> {
        return this.supplierModel.find();
    }
    apiParsers(): any {
        return this.parsers;
    }
    async apiOnly(): Promise<SupplierDto[]> {
        return this.supplierModel.find({ alias: { $in: Object.keys(this.parsers) } });
    }
    async dbOnly(): Promise<SupplierDto[]> {
        return this.supplierModel.find({ alias: { $nin: Object.keys(this.parsers) } });
    }
}

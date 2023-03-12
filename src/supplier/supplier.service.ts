import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier, SupplierDocument } from './supplier.schema';
import { Model } from 'mongoose';
import { SupplierDto } from './supplier.dto';
import { CompelParser } from '../parsers/CompelParser';
import { PromelecParser } from '../parsers/PromelecParser';
import { ModelToDto } from '../decorators/modelToDto';

@Injectable()
export class SupplierService {
    private parsers: any;
    constructor(@InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>) {
        this.parsers = {
            compel: CompelParser,
            promelec: PromelecParser,
        };
    }
    //@ModelToDto(SupplierDto)
    //async create(dto: SupplierCreateDto): Promise<SupplierDto> {
    //    return this.supplierModel.create(dto);
    //}
    @ModelToDto(SupplierDto)
    async alias(alias: string): Promise<SupplierDto> {
        return this.supplierModel.findOne({ alias });
    }
    @ModelToDto(SupplierDto)
    async all(): Promise<SupplierDto[]> {
        return this.supplierModel.find();
    }
    apiParsers(): any {
        return this.parsers;
    }
    @ModelToDto(SupplierDto)
    async apiOnly(): Promise<SupplierDto[]> {
        return this.supplierModel.find({ alias: { $in: Object.keys(this.parsers) } });
    }
    @ModelToDto(SupplierDto)
    async dbOnly(): Promise<SupplierDto[]> {
        return this.supplierModel.find({ alias: { $nin: Object.keys(this.parsers) } });
    }
}

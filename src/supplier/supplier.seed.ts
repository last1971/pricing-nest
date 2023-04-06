import { Injectable } from '@nestjs/common';
import { SupplierCreateDto } from './supplier.create.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier, SupplierDocument } from './supplier.schema';
import { Model } from 'mongoose';
import supplier from './supplier.json';
import supplierCodes from './supplier.codes.json';
import { omit, pick } from 'lodash';

@Injectable()
export class SupplierSeed implements ICommand {
    private supplier: SupplierCreateDto[];
    private supplierCodes: any[];
    constructor(@InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>) {
        this.supplier = supplier;
        this.supplierCodes = supplierCodes;
    }
    async seed(dtos: SupplierCreateDto[]): Promise<void> {
        await Promise.all(
            dtos.map((dto: SupplierCreateDto) =>
                this.supplierModel.findOneAndUpdate(pick(dto, ['alias']), omit(dto, ['alias']), { upsert: true }),
            ),
        );
    }
    async seedCodes(supplier: any): Promise<void> {
        const { alias, codes } = supplier;
        const baseSupplier = await this.supplierModel.findOne({ alias });
        baseSupplier.supplierCodes = {};
        const suppliers = await this.supplierModel.find({ alias: { $in: Object.keys(codes) } });
        suppliers.forEach((supplier) => {
            baseSupplier.supplierCodes[supplier.id] = codes[supplier.alias];
            baseSupplier.supplierCodes[codes[supplier.alias]] = supplier.id;
        });
        await baseSupplier.save();
    }
    async execute(): Promise<void> {
        await this.seed(this.supplier);
        await Promise.all(this.supplierCodes.map((supplier: any) => this.seedCodes(supplier)));
    }
}

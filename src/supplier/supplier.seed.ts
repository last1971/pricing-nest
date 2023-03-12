import { Injectable } from '@nestjs/common';
import { SupplierCreateDto } from './supplier.create.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier, SupplierDocument } from './supplier.schema';
import { Model } from 'mongoose';
import supplier from './supplier.json';
import { omit, pick } from 'lodash';

@Injectable()
export class SupplierSeed implements ICommand {
    private supplier: SupplierCreateDto[];

    constructor(@InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>) {
        this.supplier = supplier;
    }

    async seed(dtos: SupplierCreateDto[]): Promise<void> {
        await Promise.all(
            dtos.map((dto: SupplierCreateDto) =>
                this.supplierModel.findOneAndUpdate(pick(dto, ['alias']), omit(dto, ['alias']), { upsert: true }),
            ),
        );
    }
    async execute(): Promise<void> {
        await this.seed(this.supplier);
    }
}

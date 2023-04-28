import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Supplier, SupplierDocument } from './supplier.schema';
import { Model } from 'mongoose';
import { SupplierDto } from './supplier.dto';
import { CompelParser } from '../parsers/api-parsers/compel.parser';
import { PromelecParser } from '../parsers/api-parsers/promelec.parser';
import { ModelToDto } from '../decorators/model.to.dto';
import { PlatanParser } from '../parsers/api-parsers/platan.parser';
import { ElcoParser } from '../parsers/api-parsers/elco.parser';
import { ElectronicaParser } from '../parsers/api-parsers/electronica.parser';
import { GetchipsParser } from '../parsers/api-parsers/getchips.parser';
import { CompelDmsParser } from '../parsers/api-parsers/compel.dms.parser';
import { ChipDipParser } from '../parsers/api-parsers/chip.dip.parser';

@Injectable()
export class SupplierService {
    private parsers: any;
    constructor(@InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>) {
        this.parsers = {
            compel: CompelParser,
            compeldms: CompelDmsParser,
            promelec: PromelecParser,
            platan: PlatanParser,
            elcopro: ElcoParser,
            electronica: ElectronicaParser,
            getchips: GetchipsParser,
            chipdip: ChipDipParser,
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
    @ModelToDto(SupplierDto)
    async id(id: string): Promise<SupplierDto> {
        return this.supplierModel.findById(id);
    }
}

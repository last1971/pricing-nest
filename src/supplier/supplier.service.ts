import { Inject, Injectable } from '@nestjs/common';
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
import { RadiodetaliComParser } from '../parsers/api-parsers/radiodetali.com.parser';
import { SupplierRateDto } from './supplier.rate.dto';
import { ApiRequestStatService } from '../api-request-stat/api-request-stat.service';
import { ElitanParser } from '../parsers/api-parsers/elitan.parser';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class SupplierService {
    private parsers: any;
    constructor(
        @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
        private agrServise: ApiRequestStatService,
        @Inject(CACHE_MANAGER) private cache: Cache,
    ) {
        this.parsers = {
            compel: CompelParser,
            compeldms: CompelDmsParser,
            promelec: PromelecParser,
            platan: PlatanParser,
            elcopro: ElcoParser,
            electronica: ElectronicaParser,
            getchips: GetchipsParser,
            radiodetalicom: RadiodetaliComParser,
            elitan: ElitanParser,
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
    async rate(alias?: string): Promise<SupplierRateDto[]> {
        const supplierAlias: SupplierDto = !!alias ? await this.alias(alias) : null;
        const suppliers = await this.all();
        const rates = await this.agrServise.duration();
        return suppliers.map((supplier) => {
            const id = supplierAlias ? supplierAlias.supplierCodes[supplier.id] : supplier.id;
            const rate = rates.get(supplier.id) ?? 0;
            return { id, rate };
        });
    }
    async errorClear(alias: string): Promise<void> {
        await this.cache.del('error : ' + alias);
    }
}

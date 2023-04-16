import { Injectable, PipeTransform } from '@nestjs/common';
import { SupplierService } from '../supplier/supplier.service';
import { PriceRequestDto } from '../price/dtos/price.request.dto';
import { SupplierDto } from '../supplier/supplier.dto';

@Injectable()
export class TransformSuppliers implements PipeTransform {
    constructor(private supplierService: SupplierService) {}
    async transform(value: PriceRequestDto) {
        if (value.supplier) {
            value.supplier = await this.supplierService.id(value.supplier as string);
        } else if (value.supplierAlias) {
            value.supplier = await this.supplierService.alias(value.supplierAlias);
        }
        if (value.suppliers && (value.supplier as SupplierDto)?.supplierCodes) {
            value.suppliers = value.suppliers.map(
                (code: string) => (value.supplier as SupplierDto).supplierCodes[code],
            );
        }
        return value;
    }
}

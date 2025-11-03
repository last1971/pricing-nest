import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { PriceRequestDto } from '../price/dtos/price.request.dto';
import { SupplierService } from '../supplier/supplier.service';
import { isArray } from 'lodash';

@Injectable()
export class SupplierCodesPipe implements PipeTransform {
    constructor(private supplierService: SupplierService) {}

    async transform(value: PriceRequestDto, metadata: ArgumentMetadata): Promise<PriceRequestDto> {
        // Если есть supplierAlias и suppliers, мапим коды в внутренние ID
        if (value.supplierAlias && value.suppliers && isArray(value.suppliers)) {
            const supplier = await this.supplierService.alias(value.supplierAlias);
            if (supplier && supplier.supplierCodes) {
                value.suppliers = value.suppliers.map((code: string) => supplier.supplierCodes[code] || code);
            }
        }

        return value;
    }
}


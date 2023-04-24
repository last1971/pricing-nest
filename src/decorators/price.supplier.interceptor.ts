import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ISupplierable } from '../interfaces/i.supplierable';
import { ApplySupplier } from '../helpers';
import { SupplierService } from '../supplier/supplier.service';
import { isArray } from 'lodash';
import { GoodDto } from '../good/dtos/good.dto';

@Injectable()
export class PriceSupplierInterceptor implements NestInterceptor {
    constructor(private service: SupplierService) {}
    async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest<any>();
        const { supplierAlias, suppliers } = request.query;
        const supplier = supplierAlias ? await this.service.alias(supplierAlias) : null;
        if (supplier) {
            request.query.supplier = supplier;
        }
        if (supplier && supplier.supplierCodes && isArray(suppliers)) {
            request.query.suppliers = suppliers.map((code: string) => supplier.supplierCodes[code]);
        }
        return next.handle().pipe(
            map(async (data: GoodDto[] | Promise<GoodDto[]>) => {
                return (await data).map((supplierable: ISupplierable) => {
                    const command = new ApplySupplier(supplierable, supplier);
                    command.execute();
                    return supplierable;
                });
            }),
        );
    }
}

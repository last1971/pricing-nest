import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { PriceResponseDto } from '../price/dtos/price.response.dto';
import { SupplierDto } from '../supplier/supplier.dto';
import { ISupplierable } from '../interfaces/i.supplierable';
import { ApplySupplier } from '../helpers';
@Injectable()
export class PriceSupplierInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(
            map(async (data: PriceResponseDto) => {
                const supplier = data.request.supplier as SupplierDto;
                return data.data.map((supplierable: ISupplierable) => {
                    const command = new ApplySupplier(supplierable, supplier);
                    command.execute();
                    return supplierable;
                });
            }),
        );
    }
}

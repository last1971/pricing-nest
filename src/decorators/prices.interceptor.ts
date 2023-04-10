import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { PriceResponseDto } from '../price/dtos/price.response.dto';
import { SupplierDto } from '../supplier/supplier.dto';
import { GoodDto } from '../good/dtos/good.dto';
@Injectable()
export class PriceInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(
            map((data: PriceResponseDto) => {
                const supplier = data.request.supplier as SupplierDto;
                return data.data.map((good: GoodDto) => {
                    if (!supplier) {
                        delete good.goodId;
                    }
                    if (supplier && supplier.supplierCodes) {
                        good.supplier = supplier.supplierCodes[good.supplier];
                    }
                    if (supplier && good.goodId) {
                        good.goodId = good.goodId[supplier.id];
                    }
                    return good;
                });
            }),
        );
    }
}

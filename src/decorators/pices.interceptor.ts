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
                if ((data.request.supplier as SupplierDto).supplierCodes) {
                    const { supplierCodes } = data.request.supplier as SupplierDto;
                    data.data.forEach((good: GoodDto) => {
                        good.supplier = supplierCodes[good.supplier];
                    });
                }
                return data;
            }),
        );
    }
}

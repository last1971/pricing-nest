import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { GoodDto } from '../good/dtos/good.dto';
import { TradePriceDto } from '../price/dtos/trade.price.dto';
import { find } from 'lodash';
import { ParameterDto } from '../good/dtos/parameter.dto';
import { Source } from '../good/dtos/source.enum';

@Injectable()
export class TradeInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(
            map((data: GoodDto[]): TradePriceDto[] => {
                return data
                    .map((good) => {
                        return good.warehouses.map((warehouse) => {
                            return warehouse.prices.map((price) => {
                                return {
                                    name: (find(good.parameters, ['name', 'name']) as ParameterDto).stringValue,
                                    producer: (find(good.parameters, ['name', 'producer']) as ParameterDto)
                                        ?.stringValue,
                                    case: (find(good.parameters, ['name', 'case']) as ParameterDto)?.stringValue,
                                    remark: (find(good.parameters, ['name', 'remark']) as ParameterDto)?.stringValue,
                                    id: '',
                                    sellerGoodId: '',
                                    code: good.code,
                                    warehouseCode: warehouse.name,
                                    goodId: good.goodId,
                                    sellerId: good.supplier,
                                    packageQuantity:
                                        (find(good.parameters, ['name', 'packageQuantity']) as ParameterDto)
                                            ?.numericValue ?? 1,
                                    multiplicity: warehouse.multiple,
                                    quantity: warehouse.quantity,
                                    minQuantity: price.min,
                                    maxQuantity: price.max,
                                    pos: false,
                                    price: price.value,
                                    CharCode: 'USD',
                                    isInput: !price.isOrdinary,
                                    deliveryTime: warehouse.deliveryTime,
                                    isSomeoneElsesWarehouse: false,
                                    isApi: good.source === Source.Api,
                                    options: {},
                                    updatedAt: good.updatedAt,
                                };
                            });
                        });
                    })
                    .flat(3);
            }),
        );
    }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { find } from 'lodash';
import { ParameterDto } from '../good/dtos/parameter.dto';
import { Source } from '../good/dtos/source.enum';
import { v4 as uuidv4 } from 'uuid';
import { CurrencyService } from '../currency/currency.service';
import { GoodDto } from '../good/dtos/good.dto';

@Injectable()
export class TradeInterceptor implements NestInterceptor {
    constructor(private currencyService: CurrencyService) {}
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(
            map(async (data: GoodDto[] | Promise<GoodDto[]>): Promise<any> => {
                const getData = await data;
                return {
                    isApiError: false,
                    cache: !!getData.find((good) => good.source === Source.Cache),
                    data: getData
                        .map((good) => {
                            return good.warehouses.map((warehouse) => {
                                const goodId =
                                    good.supplier === '0'
                                        ? parseInt(good.code)
                                        : good.goodId
                                        ? parseInt(good.goodId)
                                        : null;
                                return warehouse.prices.map((price) => {
                                    return {
                                        name: (find(good.parameters, ['name', 'name']) as ParameterDto).stringValue,
                                        producer: (find(good.parameters, ['name', 'producer']) as ParameterDto)
                                            ?.stringValue,
                                        case: (find(good.parameters, ['name', 'case']) as ParameterDto)?.stringValue,
                                        remark: (find(good.parameters, ['name', 'remark']) as ParameterDto)
                                            ?.stringValue,
                                        id: uuidv4(),
                                        sellerGoodId: good.id,
                                        code: good.code,
                                        warehouseCode: warehouse.name,
                                        goodId,
                                        sellerId: parseInt(good.supplier),
                                        packageQuantity:
                                            (find(good.parameters, ['name', 'packageQuantity']) as ParameterDto)
                                                ?.numericValue ?? 1,
                                        multiplicity: warehouse.multiple,
                                        quantity: warehouse.quantity,
                                        minQuantity: price.min,
                                        maxQuantity: price.max,
                                        pos: false,
                                        price: price.value,
                                        CharCode: this.currencyService.id(price.currency).alfa3,
                                        isInput: !price.isOrdinary,
                                        deliveryTime: warehouse.deliveryTime,
                                        isSomeoneElsesWarehouse: false,
                                        isApi: good.source === Source.Api,
                                        options: warehouse.options ?? null,
                                        updatedAt: good.updatedAt,
                                    };
                                });
                            });
                        })
                        .flat(3),
                };
            }),
        );
    }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { GoodService } from '../good/good.service';
import { map, Observable } from 'rxjs';
import { uniq } from 'lodash';
import { GoodDto } from '../good/dtos/good.dto';

@Injectable()
export class GoodIdInterceptor implements NestInterceptor {
    constructor(private service: GoodService) {}
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(
            map(async (data: Promise<GoodDto[]>) => {
                const getData = await data;
                const ids = uniq(getData.map((good) => good.id));
                const goods = (await this.service.find({ id: { $in: ids } })).reduce(
                    (map, good) => map.set(good.id, good.goodId),
                    new Map<string, any>(),
                );
                getData.forEach((good) => {
                    const goodId = goods.get(good.id);
                    if (goodId) {
                        good.goodId = goodId;
                    }
                });
                return getData;
            }),
        );
    }
}

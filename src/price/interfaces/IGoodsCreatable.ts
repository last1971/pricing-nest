import { GoodCreateDto } from '../../good/dtos/good.create.dto';

export interface IGoodsCreatable {
    getGoods(): GoodCreateDto[];
}

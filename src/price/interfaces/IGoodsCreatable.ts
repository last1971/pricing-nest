import { GoodCreateDto } from '../dtos/good.create.dto';

export interface IGoodsCreatable {
    getGoods(): GoodCreateDto[];
}

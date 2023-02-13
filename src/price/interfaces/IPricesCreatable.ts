import { PriceCreateDto } from '../dtos/price.create.dto';

export interface IPricesCreatable {
    getPrices(): PriceCreateDto[];
}

import { PriceCreateDto } from './price.create.dto';

export class WarehouseCreateDto {
    name: string;
    deliveryTime: number;
    quantity: number;
    multiple: number;
    prices: PriceCreateDto[];
}

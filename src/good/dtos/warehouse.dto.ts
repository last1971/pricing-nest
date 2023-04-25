import { PriceDto } from './price.dto';

export class WarehouseDto {
    name: string;
    deliveryTime: number;
    quantity: number;
    multiple: number;
    prices?: PriceDto[];
    options?: any;
}

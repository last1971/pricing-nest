import { IsNotEmpty } from 'class-validator';

export class SupplierCreateDto {
    @IsNotEmpty()
    alias: string;
    deliveryTime: number;
    telegram?: string;
    www?: string;
}

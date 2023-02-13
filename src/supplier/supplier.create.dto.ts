import { IsNotEmpty } from 'class-validator';

export class SupplierCreateDto {
    @IsNotEmpty()
    alias: string;
}

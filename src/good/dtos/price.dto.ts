import { IsInt, IsNotEmpty } from 'class-validator';

export class PriceDto {
    @IsNotEmpty()
    @IsInt()
    value: number;

    @IsNotEmpty()
    @IsInt()
    min: number;

    @IsNotEmpty()
    @IsInt()
    max: number;

    @IsNotEmpty()
    currency: string;
}

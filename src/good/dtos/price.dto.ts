import { IsBoolean, IsInt, IsNotEmpty, IsNumber } from 'class-validator';

export class PriceDto {
    @IsNotEmpty()
    @IsNumber()
    value: number;

    @IsNotEmpty()
    @IsInt()
    min: number;

    @IsNotEmpty()
    @IsInt()
    max: number;

    @IsNotEmpty()
    currency: string;

    @IsNotEmpty()
    @IsBoolean()
    isOrdinary: boolean;
}

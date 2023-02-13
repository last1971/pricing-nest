import { IsInt, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class PriceCreateDto {
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
    currency: Types.ObjectId;
}

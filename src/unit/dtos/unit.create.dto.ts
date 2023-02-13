import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UnitCreateDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsInt()
    coefficient?: number;

    @IsBoolean()
    isMultiply?: boolean;

    @IsOptional()
    baseUnit?: Types.ObjectId;
}

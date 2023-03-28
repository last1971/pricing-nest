import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
export class UnitDto {
    @IsNotEmpty()
    id: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsInt()
    @IsOptional()
    coefficient?: number;

    @IsBoolean()
    @IsOptional()
    isMultiply?: boolean;

    @IsOptional()
    baseUnit?: string;
}

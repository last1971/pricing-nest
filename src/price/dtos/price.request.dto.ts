import { IsBoolean, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { SupplierDto } from '../../supplier/supplier.dto';

export class PriceRequestDto {
    @MinLength(3)
    @IsNotEmpty()
    search: string;

    @IsOptional()
    suppliers?: string[];

    @IsOptional()
    supplier?: string | SupplierDto;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    withCache = true;

    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    dbOnly = true;
}

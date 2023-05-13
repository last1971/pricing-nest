import { IsArray, IsBoolean, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { SupplierDto } from '../../supplier/supplier.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PriceRequestDto {
    @ApiProperty({ required: true, description: 'Search string', minimum: 3, example: 'max232cpe' })
    @MinLength(3)
    @IsNotEmpty()
    search: string;

    @ApiProperty({ required: false, description: 'Suppliers ids', isArray: true, example: ['857', '860'] })
    @IsOptional()
    @IsArray()
    suppliers?: string[];

    @IsOptional()
    supplier?: SupplierDto;

    @ApiProperty({
        required: false,
        description: 'Supplier alias (request from supplier with alias)',
        example: 'elcopro',
    })
    @IsOptional()
    supplierAlias?: string;

    @ApiProperty({ required: false, type: 'boolean', description: 'Use cache data', default: true })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    withCache = true;

    @ApiProperty({
        required: false,
        type: 'boolean',
        description: 'Use only db search without api requests',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === 'true')
    dbOnly = true;
}

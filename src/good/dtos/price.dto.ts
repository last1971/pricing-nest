import { IsBoolean, IsInt, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PriceDto {
    @ApiProperty({
        type: 'number',
        description: 'Price value',
        example: 3.33,
    })
    @IsNotEmpty()
    @IsNumber()
    value: number;
    @ApiProperty({
        type: 'integer',
        description: 'Min quantity for this price',
        example: 1,
    })
    @IsNotEmpty()
    @IsInt()
    min: number;
    @ApiProperty({
        type: 'integer',
        description: 'Max quantity for this price or zero if its last',
        example: 99,
    })
    @IsNotEmpty()
    @IsInt()
    max: number;
    @ApiProperty({
        type: 'string',
        description: 'Currency id',
        example: '64416182ffb942fabba7fb0a',
    })
    @IsNotEmpty()
    currency: string;
    @ApiProperty({
        type: 'boolean',
        description: 'Is ordinary or not price',
        example: false,
    })
    @IsNotEmpty()
    @IsBoolean()
    isOrdinary: boolean;
}

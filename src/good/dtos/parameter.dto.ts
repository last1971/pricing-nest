import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ParameterDto {
    @ApiProperty({
        description: 'Parameter name',
        type: 'string',
        example: 'name',
    })
    @IsNotEmpty()
    name: string;
    @ApiProperty({
        description: 'Parameter string value',
        type: 'string',
        example: 'max232cpe+,',
        required: false,
    })
    @ValidateIf((o) => !o.numericValue)
    @IsNotEmpty()
    stringValue?: string;
    @ApiProperty({
        description: 'Parameter string value',
        type: 'numeric',
        example: 100.1,
        required: false,
    })
    @ValidateIf((o) => !o.stringValue)
    @IsNotEmpty()
    numericValue?: number;
    @ApiProperty({
        description: 'Parameter unit id',
        type: 'string',
        example: '64416182ffb942fabba7fb0a',
        required: false,
    })
    @IsOptional()
    unit?: string;
}

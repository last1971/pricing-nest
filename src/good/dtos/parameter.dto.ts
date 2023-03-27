import { IsNotEmpty, IsOptional, ValidateIf } from 'class-validator';

export class ParameterDto {
    @IsNotEmpty()
    name: string;
    @ValidateIf((o) => !o.numericValue)
    @IsNotEmpty()
    stringValue: string;
    @ValidateIf((o) => !o.stringValue)
    @IsNotEmpty()
    numericValue: number;
    @IsOptional()
    unit?: string;
}

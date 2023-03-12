import { IsNotEmpty, IsOptional, MinLength } from 'class-validator';
export class PriceRequestDto {
    @MinLength(3)
    @IsNotEmpty()
    search: string;

    @IsOptional()
    suppliers?: string[];

    @IsOptional()
    withCache = true;
}

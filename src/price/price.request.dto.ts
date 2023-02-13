import { IsNotEmpty, MinLength } from 'class-validator';

export class PriceRequestDto {
    @MinLength(3)
    @IsNotEmpty()
    search: string;

    suppliers?: string[];
}

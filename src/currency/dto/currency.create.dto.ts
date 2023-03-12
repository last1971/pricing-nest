import { IsNotEmpty } from 'class-validator';

export class CurrencyCreateDto {
    @IsNotEmpty()
    alfa3: string;

    @IsNotEmpty()
    number3: string;

    @IsNotEmpty()
    name: string;
}

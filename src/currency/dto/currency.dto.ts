import { IsNotEmpty } from 'class-validator';

export class CurrencyDto {
    @IsNotEmpty()
    id: string;

    @IsNotEmpty()
    alfa3: string;

    @IsNotEmpty()
    number3: string;

    @IsNotEmpty()
    name: string;
}

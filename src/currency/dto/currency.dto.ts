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

    /** Курс ЦБ РФ, рублей за единицу валюты (RUB — 1); нет, пока курс не загружен */
    rate?: number;

    rateDate?: Date;
}

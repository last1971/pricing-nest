import { IsNotEmpty } from 'class-validator';

export class PriceSetGoodIdDto {
    @IsNotEmpty()
    supplierAlias: string;

    @IsNotEmpty()
    supplierGoodId: string;

    @IsNotEmpty()
    goodId: string;
}

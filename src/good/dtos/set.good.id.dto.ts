import { IsNotEmpty } from 'class-validator';

export class SetGoodIdDto {
    @IsNotEmpty()
    supplierAlias: string;

    @IsNotEmpty()
    supplierGoodId: string;

    @IsNotEmpty()
    goodId: string;
}

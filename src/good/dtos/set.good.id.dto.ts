import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetGoodIdDto {
    @ApiProperty({ description: 'Supplier alias', example: 'elcopro' })
    @IsNotEmpty()
    supplierAlias: string;

    @ApiProperty({ description: 'Supplier Good Id', example: '1234567890' })
    @IsNotEmpty()
    supplierGoodId: string;

    @ApiProperty({ description: 'Good Id', example: '3dc5e1cc1726a755a87eed94a4862228' })
    @IsNotEmpty()
    goodId: string;
}

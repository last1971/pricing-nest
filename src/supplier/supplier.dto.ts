import { ApiProperty } from '@nestjs/swagger';

export class SupplierDto {
    @ApiProperty({
        description: 'Supplier id',
        example: '6842f59262b30b353b57635b'
    })
    id: string;

    @ApiProperty({
        description: 'Supplier alias',
        example: 'dan'
    })
    alias: string;

    @ApiProperty({
        description: 'Delivery time in days',
        example: 7
    })
    deliveryTime: number;

    @ApiProperty({
        description: 'Supplier codes mapping',
        example: { '857': 'A', '860': 'B' }
    })
    supplierCodes?: { [key: string]: string };
}

import { ApiProperty } from '@nestjs/swagger';

export class TradePriceDto {
    @ApiProperty({ description: 'Good name', type: 'string', example: 'MAX232CPE' })
    name: string;
    @ApiProperty({ description: 'Producer name', type: 'string', example: 'MAX' })
    producer: string;
    @ApiProperty({ description: 'Case name', type: 'string', example: 'DIP-16' })
    case: string;
    @ApiProperty({ description: 'Remark', type: 'string', example: 'driver' })
    remark: string;
    @ApiProperty({ description: 'Price id', type: 'string', example: '645ff5a9ec1a115b89ef0d4b' })
    id: string;
    @ApiProperty({ description: 'Seller good id', type: 'string', example: '645ff5a9ec1a115b89ef0d4b' })
    sellerGoodId: string;
    @ApiProperty({ description: 'Seller good code', type: 'string', example: '0123456789' })
    code: string;
    @ApiProperty({ description: 'Warehouse name', type: 'string', example: 'CENTER' })
    warehouseCode: string;
    @ApiProperty({ description: 'Elcopro good id', type: 'integer', example: 123456 })
    goodId: number | null;
    @ApiProperty({ description: 'Elcopro seller id', type: 'integer', example: 123456 })
    sellerId: number;
    @ApiProperty({ description: 'Package quantity', type: 'integer', example: 1000 })
    packageQuantity: number;
    @ApiProperty({ description: 'Multiple quantity', type: 'integer', example: 1000 })
    multiplicity: number;
    @ApiProperty({ description: 'Warehouse quantity', type: 'integer', example: 10000 })
    quantity: number;
    @ApiProperty({ description: 'Min price quantity', type: 'integer', example: 1 })
    minQuantity: number;
    @ApiProperty({ description: 'Max price quantity', type: 'integer', example: 999 })
    maxQuantity: number;
    @ApiProperty({ description: 'Pos', type: 'boolean', example: true })
    pos: boolean;
    @ApiProperty({ description: 'Price', type: 'float', example: 3.33 })
    price: number;
    @ApiProperty({ description: 'Currency char code', type: 'string', example: 'USD' })
    CharCode: string;
    @ApiProperty({ description: 'It is input price', type: 'boolean', example: true })
    isInput: boolean;
    @ApiProperty({ description: 'Delivery time in days', type: 'integer', example: 6 })
    deliveryTime: number;
    @ApiProperty({ description: 'It is not realy seller warehouse', type: 'boolean', example: true })
    isSomeoneElsesWarehouse: boolean;
    @ApiProperty({ description: 'It is seller api response', type: 'boolean', example: true })
    isApi: boolean;
    @ApiProperty({
        description: 'Some values from api request',
        type: 'object',
        example: { location_id: 'CENTER', pos: false, updatedAt: new Date() },
    })
    options: any;
    @ApiProperty({
        type: Date,
        description: 'Last updated at',
        example: new Date(),
    })
    updatedAt: Date;
}

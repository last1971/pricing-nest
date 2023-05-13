import { PriceDto } from './price.dto';
import { ApiProperty } from '@nestjs/swagger';

export class WarehouseDto {
    @ApiProperty({
        description: 'Warehouse name. Its not real name.',
        example: 'CENTER',
        type: 'string',
    })
    name: string;
    @ApiProperty({
        description: 'Delivery time from this warehouse in calendar days',
        example: 6,
        type: 'integer',
    })
    deliveryTime: number;
    @ApiProperty({
        description: 'Quantity',
        example: 100,
        type: 'integer',
    })
    quantity: number;
    @ApiProperty({
        description: 'Multiple quantity',
        example: 10,
        type: 'integer',
    })
    multiple: number;
    @ApiProperty({
        description: 'Prices',
        isArray: true,
        type: PriceDto,
        required: false,
    })
    prices?: PriceDto[];
    @ApiProperty({
        required: false,
        description: 'Some values from api request',
        type: 'object',
        example: { location_id: 'CENTER', pos: false, updatedAt: new Date() },
    })
    options?: any;
}

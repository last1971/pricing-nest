import { ApiProperty } from '@nestjs/swagger';

export class LiveStockDto {
    @ApiProperty({ example: 'CENTER', description: 'Склад поставщика' })
    warehouse: string;
    @ApiProperty({ example: 78965, description: 'Остаток у поставщика, шт.' })
    quantity: number;
    @ApiProperty({ example: 1, description: 'Кратность' })
    multiple: number;
    @ApiProperty({ example: 13, description: 'Срок поставки, календарных дней' })
    deliveryTime: number;
    @ApiProperty({
        example: 'api',
        enum: ['api', 'db'],
        description: 'api — ответ поставщика сейчас; db — суточный файл',
    })
    source: 'api' | 'db';
}

import { ApiProperty } from '@nestjs/swagger';

export class SupplierRateDto {
    @ApiProperty({ type: 'string', example: '1234567890' })
    id: string;
    @ApiProperty({ type: 'number', example: 1200.2334 })
    rate: number;
}

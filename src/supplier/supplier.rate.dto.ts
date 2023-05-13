import { ApiProperty } from '@nestjs/swagger';

export class SupplierRateDto {
    @ApiProperty({ type: 'string', example: '1234567890', description: 'Supplier id' })
    id: string;
    @ApiProperty({ type: 'number', example: 1200.2334, description: 'Average request time in milliseconds' })
    rate: number;
}

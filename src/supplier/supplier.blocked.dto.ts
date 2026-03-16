import { ApiProperty } from '@nestjs/swagger';

export class SupplierBlockedDto {
    @ApiProperty({ type: 'string', example: 'A', description: 'Supplier id or supplier code' })
    id: string;

    @ApiProperty({ type: 'string', example: 'compel', description: 'Supplier alias' })
    alias: string;

    @ApiProperty({ type: 'string', example: '2026-03-16T14:30:00.000+03:00', description: 'Blocked until ISO date' })
    blockedUntil: string;

    @ApiProperty({ type: 'string', example: 'Request timeout', description: 'Last error message' })
    lastError: string;
}

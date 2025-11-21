import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class GetRawResponseDto {
    @ApiProperty({
        description: 'Array of good IDs',
        example: ['81bdcd5b5ee8c7cefbaab96295d37b05', '75895be8759e53052dad5b84fab35c39'],
        isArray: true,
        type: String,
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    ids: string[];
}


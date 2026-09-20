import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MpnManufacturerDto {
    @ApiProperty({ example: 'Yageo' })
    name: string;

    @ApiProperty({ example: 'yageo' })
    slug: string;

    @ApiPropertyOptional({ example: 'https://www.yageo.com' })
    websiteUrl?: string;
}

export class MpnParameterDto {
    @ApiProperty({ example: 'resistance' })
    key: string;

    @ApiProperty({ example: 'Resistance', description: 'Подпись из specification_definitions, иначе key' })
    label: string;

    @ApiProperty({ example: '10 kΩ' })
    value: string;
}

export class MpnDatasheetDto {
    @ApiProperty({ example: 'https://pdf.mpn.cc/datasheets/rc0402fr-0710kl-….pdf' })
    url: string;

    @ApiPropertyOptional({ example: 'primary' })
    role?: string;

    @ApiProperty({ example: true })
    isPrimary: boolean;
}

export class MpnComplianceDto {
    @ApiPropertyOptional({ example: 'compliant' })
    rohs?: string;

    @ApiPropertyOptional({ example: 'REACH Unaffected' })
    reach?: string;

    @ApiPropertyOptional({ example: 'EAR99' })
    eccn?: string;

    @ApiPropertyOptional({ example: '8533.21.0030', description: 'HTS США (htsus / ushts)' })
    hts?: string;

    @ApiPropertyOptional({ example: '8532240000', description: 'TARIC (ЕС)' })
    taric?: string;

    @ApiPropertyOptional({ example: 'Japan' })
    countryOfOrigin?: string;
}

export class MpnAlternativeDto {
    @ApiProperty({ example: 'STM32F103CBT6' })
    mpn: string;

    @ApiProperty({ example: 'STMicroelectronics' })
    manufacturer: string;

    @ApiPropertyOptional({ example: 'parametric_match' })
    relationship?: string;

    @ApiPropertyOptional({ example: 1 })
    confidence?: number;

    @ApiPropertyOptional({ example: 'https://mpn.cc/parts/stmicroelectronics/stm32f103cbt6' })
    url?: string;
}

export class MpnCandidateDto {
    @ApiProperty({ example: '1N4148' })
    mpn: string;

    @ApiProperty({ example: 'Onsemi' })
    manufacturer: string;

    @ApiPropertyOptional({ example: 'on-semiconductor' })
    manufacturerSlug?: string;

    @ApiPropertyOptional({ example: 'Discrete Semiconductors/Diodes & Rectifiers' })
    category?: string;

    @ApiPropertyOptional({ example: 'https://mpn.cc/parts/on-semiconductor/1n4148' })
    url?: string;
}

export class MpnPartDto {
    @ApiProperty({ description: 'Нашлась ли каноническая запись' })
    found: boolean;

    @ApiProperty({ example: 'RC0402FR-0710KL', description: 'Запрос как пришёл' })
    query: string;

    @ApiProperty({ example: 'RC0402FR0710KL', description: 'Нормализованный MPN (ключ кэша)' })
    normalizedQuery: string;

    @ApiPropertyOptional({ example: 'RC0402FR-0710KL' })
    mpn?: string;

    @ApiPropertyOptional({ type: MpnManufacturerDto })
    manufacturer?: MpnManufacturerDto;

    @ApiPropertyOptional({ example: 'Passive Components/Resistors/Chip Resistors' })
    category?: string;

    @ApiPropertyOptional({ example: 'active', description: 'active | obsolete | nrnd | unknown …' })
    lifecycle?: string;

    @ApiPropertyOptional({ example: '0402' })
    package?: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional({ type: MpnParameterDto, isArray: true })
    parameters?: MpnParameterDto[];

    @ApiPropertyOptional({ type: MpnDatasheetDto, isArray: true })
    datasheets?: MpnDatasheetDto[];

    @ApiPropertyOptional({ type: MpnComplianceDto })
    compliance?: MpnComplianceDto;

    @ApiPropertyOptional({ example: '853321', description: 'Первые 6 цифр TARIC/HTS = ГС = префикс ТНВЭД' })
    tnvedHint?: string;

    @ApiPropertyOptional({ type: MpnAlternativeDto, isArray: true })
    alternatives?: MpnAlternativeDto[];

    @ApiPropertyOptional({
        type: MpnCandidateDto,
        isArray: true,
        description: 'Варианты при неоднозначном/похожем совпадении (found=false)',
    })
    candidates?: MpnCandidateDto[];

    @ApiPropertyOptional({ example: 'https://mpn.cc/parts/yageo/rc0402fr-0710kl' })
    url?: string;

    @ApiProperty({ example: 'live', description: 'cache | live | acquired' })
    source: 'cache' | 'live' | 'acquired';

    @ApiProperty({ example: '2026-09-19T15:20:13.081Z' })
    fetchedAt: string;
}

export class MpnBlockedDto {
    @ApiProperty({ example: 'mpn_blocked' })
    error: string;

    @ApiProperty({ example: '2026-09-19T15:21:13.081Z' })
    blockedUntil: string;

    @ApiProperty({ example: 'Too many searches. Slow down and try again.' })
    message: string;
}

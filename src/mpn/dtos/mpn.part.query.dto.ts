import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

/** Не меньше 4 букв/цифр после нормализации — единственный гейт на длину MPN. */
export const MIN_MPN_ALNUM = 4;
export const MPN_QUERY_PATTERN = new RegExp(`^(?:[^A-Za-z0-9]*[A-Za-z0-9]){${MIN_MPN_ALNUM}}`);

export class MpnPartQueryDto {
    @ApiProperty({
        example: 'RC0402FR-0710KL',
        description: 'Голый MPN (не меньше 4 букв/цифр), без описания и кириллицы',
    })
    @IsString()
    @Length(MIN_MPN_ALNUM, 120)
    @Matches(MPN_QUERY_PATTERN, { message: `q must contain at least ${MIN_MPN_ALNUM} latin letters or digits` })
    q: string;

    @ApiPropertyOptional({
        example: 'yageo',
        description: 'Slug производителя на mpn.cc — выбор среди кандидатов и подсказка для acquisitions',
    })
    @IsOptional()
    @IsString()
    @Length(1, 120)
    manufacturer?: string;

    @ApiPropertyOptional({ example: true, description: 'Перечитать карточку с mpn.cc, минуя кэш (кнопка «обновить»)' })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true' || value === '1')
    @IsBoolean()
    refresh?: boolean;
}

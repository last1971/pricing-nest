import { UnitCreateDto } from './unit.create.dto';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class UnitSeedDto {
    @IsNotEmpty()
    baseUnit: UnitCreateDto;
    @IsOptional()
    units?: UnitCreateDto[];
}

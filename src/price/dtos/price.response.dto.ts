import { GoodDto } from '../../good/dtos/good.dto';
import { PriceRequestDto } from './price.request.dto';
import { Exclude } from 'class-transformer';

export class PriceResponseDto {
    data: Array<GoodDto>;
    @Exclude()
    request: PriceRequestDto;
    constructor(partial: Partial<PriceResponseDto>) {
        Object.assign(this, partial);
    }
}

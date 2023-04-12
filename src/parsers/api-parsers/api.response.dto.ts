import { GoodDto } from '../../good/dtos/good.dto';
import { DateTime } from 'luxon';

export class ApiResponseDto {
    data: GoodDto[] = [];
    isSuccess = true;
    errorMessage: string = null;
    start: DateTime = DateTime.now();
}

import { DateTime } from 'luxon';

export class ApiRequestStatDto {
    supplier: string;
    isSuccess: boolean;
    errorMessage?: string;
    dateTime: DateTime;
    duration: number;
}

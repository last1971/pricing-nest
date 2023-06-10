import { ScheduleParser } from './schedule.parser';
import { IScheduleParsers } from '../../interfaces/IScheduleParsers';

export class ScheduleUploadParser extends ScheduleParser {
    constructor(protected schedule: IScheduleParsers, protected file: string) {
        super(schedule);
    }
}

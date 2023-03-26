import { ScheduleParser } from './schedule.parser';

export class TestParser extends ScheduleParser {
    async execute(): Promise<void> {
        this.schedule.getLog().debug('test message');
    }
}

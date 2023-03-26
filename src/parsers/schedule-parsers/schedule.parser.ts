import { IScheduleParsers } from '../../interfaces/IScheduleParsers';

export class ScheduleParser implements ICommand {
    constructor(protected schedule: IScheduleParsers) {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async execute(): Promise<void> {}
}

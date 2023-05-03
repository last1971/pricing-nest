import { ScheduleParser } from './schedule.parser';

export class RuElectronicsParser extends ScheduleParser {
    protected supplierAlias = 'ruelectronics';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {

    }
}

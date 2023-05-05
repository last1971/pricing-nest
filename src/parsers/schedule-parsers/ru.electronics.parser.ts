import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js';

export class RuElectronicsParser extends ScheduleParser {
    protected supplierAlias = 'ruelectronics';
    protected currencyAlfa3 = 'RUB';
    async parse(): Promise<void> {
        const url = this.schedule.getConfigService().get<string>('API_RUELECTRONICS_URL');
        const res = await this.schedule.getHttp().get(url);
        const { data } = await firstValueFrom(res);
        const goods = await parseStringPromise(data, {
            explicitRoot: false,
            explicitArray: false,
            mergeAttrs: true,
        });
    }
}

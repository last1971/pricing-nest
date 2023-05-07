import { ScheduleParser } from './schedule.parser';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { Open } from 'unzipper';

export class CompelDbfParser extends ScheduleParser {
    protected supplierAlias = 'compel';
    protected currencyAlfa3 = 'USD';
    async parse(): Promise<void> {
        const res = await this.schedule
            .getHttp()
            .get(this.schedule.getConfigService().get<string>('API_COMPEL_DBF_URL'), { responseType: 'arraybuffer' });
        const response = await firstValueFrom(res);
        const directory = await Open.buffer(response.data);
        const file = await directory.files[0].buffer();
        const workbook = XLSX.read(file, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const promises = XLSX.utils.sheet_to_json(worksheet).map((good) => {

        });
    }
}

import { ElcoParser } from './elco.parser';

export class ElectronicaParser extends ElcoParser {
    getAlias(): string {
        return 'electronica';
    }
    protected getUrl(): string {
        return this.parsers.getConfigService().get<string>('API_ELECTRONICA_URL');
    }
    protected getToken(): string {
        return this.parsers.getConfigService().get<string>('API_ELECTRONICA_TOKEN');
    }
}

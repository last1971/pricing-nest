import { ElcoParser } from './elco.parser';

export class ElectronicaParser extends ElcoParser {
    getAlias(): string {
        return 'electronica';
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js';
import { decode } from 'iconv-lite';

/** Курсы ЦБ РФ на дату: рублей за ОДНУ единицу валюты (у ЦБ номинал бывает 10 или 100 — уже поделено) */
export interface CbrRates {
    date: Date;
    rates: Map<string, number>;
}

const CBR_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';

const toArray = <T>(value: T | T[] | undefined): T[] => (value ? (Array.isArray(value) ? value : [value]) : []);

/** Число ЦБ: запятая как десятичный разделитель («80,5381») */
const cbrNumber = (value: unknown): number => parseFloat(String(value ?? '').replace(',', '.'));

/** Разбор XML_daily.asp (уже в utf-8): <ValCurs Date="24.10.2026"><Valute><CharCode>USD</CharCode><Nominal>1</Nominal><Value>80,5381</Value>… */
export async function parseCbrXml(xml: string): Promise<CbrRates> {
    const { ValCurs } = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true });
    const [day, month, year] = String(ValCurs?.Date ?? '')
        .split('.')
        .map(Number);
    if (!day || !month || !year) {
        throw new Error('ЦБ: нет даты в ответе');
    }
    const rates = new Map<string, number>();
    toArray(ValCurs.Valute).forEach((valute: any) => {
        const nominal = cbrNumber(valute.Nominal);
        const value = cbrNumber(valute.Value);
        if (valute.CharCode && nominal > 0 && value > 0) {
            rates.set(String(valute.CharCode).toUpperCase(), value / nominal);
        }
    });
    if (rates.size === 0) {
        throw new Error('ЦБ: нет курсов в ответе');
    }
    return { date: new Date(Date.UTC(year, month - 1, day)), rates };
}

/** Официальные курсы ЦБ РФ (XML в windows-1251). Только сеть и разбор; что с курсами делать — CurrencyService */
@Injectable()
export class CbrClient {
    private readonly logger = new Logger(CbrClient.name);

    constructor(private readonly http: HttpService) {}

    async rates(): Promise<CbrRates> {
        const response = await firstValueFrom(this.http.get(CBR_URL, { responseType: 'arraybuffer', timeout: 20000 }));
        const result = await parseCbrXml(decode(Buffer.from(response.data), 'win1251'));
        this.logger.log(`ЦБ: курсы на ${result.date.toISOString().slice(0, 10)}, валют ${result.rates.size}`);
        return result;
    }
}

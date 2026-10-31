import { ScheduleParser } from './schedule.parser';
import { PromelecParser } from '../api-parsers/promelec.parser';
import { repairSupplierJson } from '../api-parsers/repair-json';
import { IApiParsers } from '../../interfaces/IApiParsers';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

/** API returns at most 100 rows; only an empty page completes the full catalogue. */
export function catalogCursor(rows: any[], cursor: number): number {
    if (!Array.isArray(rows)) throw new Error('Promelec catalogue is not an array');
    for (const row of rows) {
        const id = Number(row?.item_id);
        if (!Number.isSafeInteger(id) || id <= cursor) throw new Error('Promelec catalogue cursor did not advance');
        cursor = id;
    }
    return cursor;
}

export class PromelecCatalogParser extends ScheduleParser {
    protected supplierAlias = 'promelec';
    protected currencyAlfa3 = 'RUB';
    private static running = false;
    private readonly directory = path.resolve('var/catalog');

    async execute(): Promise<void> {
        if (PromelecCatalogParser.running) return;
        PromelecCatalogParser.running = true;
        try { await super.execute(); } finally { PromelecCatalogParser.running = false; }
    }

    /** Used once for an already completed, validated catalogue; no supplier API calls. */
    async executeSnapshot(file: string): Promise<void> {
        await this.start();
        const count = await this.importSnapshot(file);
        await this.finish();
        this.status({ completed: true, phase: 'complete', total: count, source: file });
    }

    private status(data: Record<string, unknown>): void {
        fs.mkdirSync(this.directory, { recursive: true });
        const file = path.join(this.directory, 'promelec-status.json');
        fs.writeFileSync(file + '.tmp', JSON.stringify({ ...data, updatedAt: new Date().toISOString() }), { mode: 0o600 });
        fs.renameSync(file + '.tmp', file);
    }

    async parse(): Promise<void> {
        const creds = await this.schedule.getVault().get('promelec');
        fs.mkdirSync(this.directory, { recursive: true });
        const target = path.join(this.directory, 'promelec.jsonl');
        const temporary = target + '.download';
        const fd = fs.openSync(temporary, 'w', 0o600);
        let cursor = 0, total = 0, pages = 0, complete = false;
        try {
            for (; pages < 10000; ) {
                let response: any;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        response = await firstValueFrom(this.schedule.getHttp().post(creds.URL_API as string, {
                            method: 'items_data_get', login: creds.LOGIN, password: creds.PASSWORD,
                            customer_id: creds.CUSTOMER_ID, extended: 1, item_id: cursor,
                        }, { timeout: 60000, transformResponse: (data) => data }));
                        break;
                    } catch (error) {
                        if (attempt === 2) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    }
                }
                const rows = typeof response.data === 'string' ? repairSupplierJson(response.data) : response.data;
                cursor = catalogCursor(rows, cursor);
                if (!rows.length) { complete = true; break; }
                for (const row of rows) fs.writeSync(fd, JSON.stringify(row) + '\n');
                total += rows.length; pages++;
                if (pages % 10 === 0) this.status({ completed: false, phase: 'downloading', total, pages, cursor });
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            if (!complete || total < 100000) throw new Error('Promelec catalogue incomplete or unexpectedly small');
        } catch (error) {
            this.status({ completed: false, phase: 'error', total, pages, cursor });
            throw error;
        } finally { fs.closeSync(fd); }
        fs.renameSync(temporary, target);
        const imported = await this.importSnapshot(target);
        this.status({ completed: false, phase: 'cleanup', total: imported, pages, cursor });
    }

    protected async finish(): Promise<void> {
        await super.finish();
        let previous: Record<string, unknown> = {};
        try { previous = JSON.parse(fs.readFileSync(path.join(this.directory, 'promelec-status.json'), 'utf8')); } catch { /* first run */ }
        this.status({ ...previous, completed: true, phase: 'complete' });
    }

    private async importSnapshot(file: string): Promise<number> {
        // Validate the entire file before the first database write. A truncated/invalid response must not clear stock.
        let count = 0, cursor = 0;
        for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
            if (!line.trim()) continue;
            cursor = catalogCursor([JSON.parse(line)], cursor); count++;
        }
        if (count < 100000) throw new Error('Promelec catalogue snapshot unexpectedly small');
        const adapter = {
            getSuppliers: () => new Map([['promelec', this.supplier]]),
            getCurrencies: () => new Map([['RUB', this.currency]]),
            getPiece: () => this.piece,
        } as unknown as IApiParsers;
        const parser = new PromelecParser({ search: '', withCache: false } as PriceRequestDto, adapter);
        let batch: any[] = [], imported = 0;
        const flush = async () => {
            const goods = await parser.parseResponse(batch);
            await this.schedule.getGoods().upsertCatalogBatch(goods);
            imported += goods.length; batch = [];
            if (imported % 5000 === 0) this.status({ completed: false, phase: 'database', total: count, imported });
        };
        for await (const line of readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity })) {
            if (!line.trim()) continue;
            batch.push(JSON.parse(line));
            if (batch.length >= 500) await flush();
        }
        if (batch.length) await flush();
        return imported;
    }
}

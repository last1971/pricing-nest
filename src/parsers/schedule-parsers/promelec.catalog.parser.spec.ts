import { catalogCursor, PromelecCatalogParser } from './promelec.catalog.parser';

describe('Promelec full catalogue', () => {
    it('advances through short pages; page size does not imply EOF', () => {
        expect(catalogCursor([{ item_id: 10 }, { item_id: 20 }], 0)).toBe(20);
        expect(catalogCursor([{ item_id: 21 }], 20)).toBe(21);
        expect(catalogCursor([], 21)).toBe(21);
    });
    it('rejects malformed, repeated and unordered identifiers', () => {
        for (const rows of [[{ item_id: 20 }], [{ item_id: 22 }, { item_id: 21 }], [{ item_id: 'bad' }], [{ item_id: 20.5 }]]) {
            expect(() => catalogCursor(rows, 20)).toThrow();
        }
        expect(() => catalogCursor({ error: 'failed' } as any, 20)).toThrow();
    });
    it('does not write or clear stock for an incomplete snapshot', async () => {
        const goods = { upsertCatalogBatch: jest.fn(), find: jest.fn() };
        const schedule = { getLog: () => ({ log: jest.fn() }), getSuppliers: () => ({ alias: async () => ({ id: 's' }) }), getCurrencies: () => ({ alfa3: async () => ({ id: 'r' }) }), getUnitService: () => ({ name: async () => ({ id: 'u' }) }), getGoods: () => goods } as any;
        const fs = require('fs'), os = require('os'), path = require('path');
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prom-catalog-'));
        const file = path.join(dir, 'small.jsonl'); fs.writeFileSync(file, '{"item_id":1}\n');
        try {
            await expect(new PromelecCatalogParser(schedule).executeSnapshot(file)).rejects.toThrow('unexpectedly small');
            expect(goods.upsertCatalogBatch).not.toHaveBeenCalled();
            expect(goods.find).not.toHaveBeenCalled();
        } finally { fs.rmSync(dir, { recursive: true }); }
    });
});

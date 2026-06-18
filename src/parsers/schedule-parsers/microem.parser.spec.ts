import { dedupeRowsByMaxQuantity } from './microem.parser';

describe('dedupeRowsByMaxQuantity', () => {
    // index 0 всегда отбрасывается (как в парсере), поэтому первой кладём строку-заглушку
    const header = { code: 'HEADER', quantity: 0 };

    it('при дубле кода оставляет строку с бо́льшим количеством', () => {
        const rows = [
            header,
            { code: '2564', name: 'VHR-4N', quantity: 65, price: 991 },
            { code: '2564', name: 'VHR-4N', quantity: 16800, price: 1022 },
        ];
        const result = dedupeRowsByMaxQuantity(rows);
        expect(result).toHaveLength(1);
        expect(result[0].quantity).toEqual(16800);
        expect(result[0].price).toEqual(1022);
    });

    it('порядок строк не влияет — бо́льшее количество всё равно выигрывает', () => {
        const rows = [
            header,
            { code: '777', quantity: 500 },
            { code: '777', quantity: 10 },
        ];
        expect(dedupeRowsByMaxQuantity(rows)[0].quantity).toEqual(500);
    });

    it('отбрасывает первую строку (index 0) и строки с нечисловым quantity', () => {
        const rows = [
            { code: '111', quantity: 999 }, // index 0 — отбрасывается
            { code: '222', quantity: NaN },
            { code: '333', quantity: 'abc' },
            { code: '444', quantity: 5 },
        ];
        const result = dedupeRowsByMaxQuantity(rows);
        expect(result.map((r) => r.code)).toEqual(['444']);
    });

    it('сохраняет все уникальные коды', () => {
        const rows = [header, { code: 'a', quantity: 1 }, { code: 'b', quantity: 2 }, { code: 'c', quantity: 3 }];
        const result = dedupeRowsByMaxQuantity(rows);
        expect(result.map((r) => r.code).sort()).toEqual(['a', 'b', 'c']);
    });
});

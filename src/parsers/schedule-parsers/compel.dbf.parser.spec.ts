import { compelOptions, compelParameters, compelPrices } from './compel.dbf.parser';

// Строка DBF в том виде, как её отдаёт XLSX.utils.sheet_to_json (числа — числами, пустые строки — '')
const good = (extra: any = {}): any => ({
    CODE: 1006025,
    NAME: '1N4007',
    PRODUCER: 'YJ',
    QNT_PACK: 5000,
    MOQ: 1,
    QTY: 52515,
    PRICE_1: 0.02593,
    QTY_1: 1,
    PRICE_2: 0.02094,
    QTY_2: 1525,
    PRICE_3: 0.01821,
    QTY_3: 2475,
    PRICE_4: 0,
    QTY_4: 0,
    PRICE_5: 0,
    QTY_5: 0,
    PRICE_6: 0,
    QTY_6: 0,
    CORPUS: 'DO41',
    CLASS: '0401020101',
    CLASS_NAME: 'Диоды и сборки выпрямительные',
    WEIGHT: '0.330',
    CHZ: 'No',
    TNVED: '8541100009',
    ...extra,
});

describe('compelPrices', () => {
    it('ступени до первой пустой, max — от следующей минус кратность', () => {
        expect(compelPrices(good(), 'usd')).toEqual([
            { value: 0.02593, min: 1, max: 1524, currency: 'usd', isOrdinary: false },
            { value: 0.02094, min: 1525, max: 2474, currency: 'usd', isOrdinary: false },
            { value: 0.01821, min: 2475, max: 0, currency: 'usd', isOrdinary: false },
        ]);
    });
});

describe('compelParameters', () => {
    it('категория, код категории и вес в граммах добавляются к прежним параметрам', () => {
        expect(compelParameters(good(), 'piece', 'gram')).toEqual([
            { name: 'name', stringValue: '1N4007' },
            { name: 'producer', stringValue: 'YJ' },
            { name: 'case', stringValue: 'DO41' },
            { name: 'packageQuantity', numericValue: 5000, unit: 'piece' },
            { name: 'categoryCode', stringValue: '0401020101' },
            { name: 'category', stringValue: 'Диоды и сборки выпрямительные' },
            { name: 'weight', numericValue: 0.33, unit: 'gram' },
        ]);
    });
    it('пустые корпус, категория и нулевой вес не записываются', () => {
        const names = compelParameters(
            good({ CORPUS: '', CLASS: '', CLASS_NAME: '', WEIGHT: '0.000' }),
            'piece',
            'gram',
        ).map((p) => p.name);
        expect(names).toEqual(['name', 'producer', 'packageQuantity']);
    });
});

describe('compelOptions', () => {
    it('CHZ Yes/No → marking, TNVED → tnved', () => {
        expect(compelOptions(good())).toEqual({ marking: false, tnved: '8541100009' });
        expect(compelOptions(good({ CHZ: 'Yes' }))).toEqual({ marking: true, tnved: '8541100009' });
    });
    it('без CHZ и TNVED — пусто', () => {
        expect(compelOptions(good({ CHZ: '', TNVED: '' }))).toEqual({});
    });
});

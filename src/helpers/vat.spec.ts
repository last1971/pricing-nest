import { vatRate, withVat } from './vat';

describe('vatRate', () => {
    it('ставка по дате', () => {
        expect(vatRate(new Date('2018-12-31'))).toEqual(18);
        expect(vatRate(new Date('2019-01-01'))).toEqual(20);
        expect(vatRate(new Date('2025-12-31'))).toEqual(20);
        expect(vatRate(new Date('2026-01-01'))).toEqual(22);
    });
});

describe('withVat', () => {
    it('накидывает ставку и округляет до 4 знаков', () => {
        expect(withVat(1.5, 22)).toEqual(1.83);
        expect(withVat(0.0552, 22)).toEqual(0.0673);
        expect(withVat(47.2564, 20)).toEqual(56.7077);
    });
});

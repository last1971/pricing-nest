import { parseCbrXml } from './cbr.client';

const xml = `<?xml version="1.0" encoding="utf-8"?><ValCurs Date="24.10.2026" name="Foreign Currency Market">
<Valute ID="R01235"><NumCode>840</NumCode><CharCode>USD</CharCode><Nominal>1</Nominal><Name>Доллар США</Name><Value>80,5381</Value><VunitRate>80,5381</VunitRate></Valute>
<Valute ID="R01375"><NumCode>156</NumCode><CharCode>CNY</CharCode><Nominal>1</Nominal><Name>Юань</Name><Value>12,0557</Value><VunitRate>12,0557</VunitRate></Valute>
<Valute ID="R01820"><NumCode>392</NumCode><CharCode>JPY</CharCode><Nominal>100</Nominal><Name>Иен</Name><Value>52,8000</Value><VunitRate>0,528</VunitRate></Valute>
</ValCurs>`;

describe('parseCbrXml', () => {
    it('дата ЦБ и курс за одну единицу (номинал 100 поделен)', async () => {
        const result = await parseCbrXml(xml);
        expect(result.date.toISOString().slice(0, 10)).toBe('2026-10-24');
        expect(result.rates.get('USD')).toBeCloseTo(80.5381, 4);
        expect(result.rates.get('CNY')).toBeCloseTo(12.0557, 4);
        expect(result.rates.get('JPY')).toBeCloseTo(0.528, 4);
    });
    it('без даты или без валют — ошибка', async () => {
        await expect(parseCbrXml('<ValCurs></ValCurs>')).rejects.toThrow('нет даты');
        await expect(parseCbrXml('<ValCurs Date="24.10.2026"></ValCurs>')).rejects.toThrow('нет курсов');
    });
});

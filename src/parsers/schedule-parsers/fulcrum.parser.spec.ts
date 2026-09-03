import { buildFulcrumPrices, fulcrumOptMin, FulcrumRow, parseFulcrumCsv, parseFulcrumPrice } from './fulcrum.parser';

describe('parseFulcrumPrice', () => {
    it('парсит цену с запятой', () => {
        expect(parseFulcrumPrice('90,63')).toEqual(90.63);
        expect(parseFulcrumPrice('3415,90')).toEqual(3415.9);
    });

    it('возвращает NaN для "по запросу"', () => {
        expect(parseFulcrumPrice('по запросу')).toBeNaN();
    });
});

describe('fulcrumOptMin', () => {
    it('дешёвые позиции — опт от 10 шт', () => {
        expect(fulcrumOptMin(12)).toEqual(10);
        expect(fulcrumOptMin(1.5)).toEqual(10);
    });

    it('средние позиции — опт от суммы 1000 руб', () => {
        expect(fulcrumOptMin(250)).toEqual(4);
        expect(fulcrumOptMin(600)).toEqual(2);
    });

    it('дороже тысячи — 1 шт розница, от 2 шт опт', () => {
        expect(fulcrumOptMin(1500)).toEqual(2);
        expect(fulcrumOptMin(1000)).toEqual(2);
    });
});

describe('buildFulcrumPrices', () => {
    const row = (price: number, priceOpt: number): FulcrumRow => ({
        code: 'X|Y',
        product: 'X',
        manufacturer: 'Y',
        quantity: 1,
        price,
        priceOpt,
    });

    it('розница и опт с порогом', () => {
        const prices = buildFulcrumPrices(row(250, 200), 'rub');
        expect(prices).toEqual([
            { value: 250, min: 1, max: 3, currency: 'rub', isOrdinary: false },
            { value: 200, min: 4, max: 0, currency: 'rub', isOrdinary: false },
        ]);
    });

    it('опт "по запросу" — только розница без ограничений', () => {
        const prices = buildFulcrumPrices(row(250, NaN), 'rub');
        expect(prices).toEqual([{ value: 250, min: 1, max: 0, currency: 'rub', isOrdinary: false }]);
    });
});

describe('parseFulcrumCsv', () => {
    const header = 'Product;Manufacturer;Quantity;Price;Price_Opt \n';

    it('парсит обычную строку с хвостовыми пробелами', () => {
        const rows = parseFulcrumCsv(header + '108;Keystone;77;230,81;192,35 \n');
        expect(rows).toEqual([
            {
                code: '108|Keystone',
                product: '108',
                manufacturer: 'Keystone',
                quantity: 77,
                price: 230.81,
                priceOpt: 192.35,
            },
        ]);
    });

    it('пропускает строки без розничной цены и с нулевым количеством', () => {
        const rows = parseFulcrumCsv(
            header + 'A9160006;OKW;1;по запросу;по запросу\n' + 'BCP69T1G;Onsemi;0;3,00;2,70\n',
        );
        expect(rows).toHaveLength(0);
    });

    it('один Product у разных производителей — разные позиции', () => {
        const rows = parseFulcrumCsv(header + 'FT232RL;<N/D>;86;382,58;344,32\n' + 'FT232RL;JSMSEMI;5;197,25;150,00\n');
        expect(rows.map((r) => r.code)).toEqual(['FT232RL|<N/D>', 'FT232RL|JSMSEMI']);
    });

    it('полный дубль — остаётся строка с бо́льшим количеством', () => {
        const rows = parseFulcrumCsv(
            header + 'M5113215;Metcase;1;1335,60;по запросу \n' + 'M5113215;Metcase;6;5333,76;по запросу \n',
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].quantity).toEqual(6);
        expect(rows[0].price).toEqual(5333.76);
    });

    it('пустой файл — пустой результат', () => {
        expect(parseFulcrumCsv('')).toHaveLength(0);
    });
});

import { DateTime } from 'luxon';
import {
    ruelOptions,
    ruelPackageQuantity,
    ruelPacks,
    ruelPrices,
    ruelWarehouses,
    toArray,
} from './ru.electronics.parser';

// Товары в том виде, как их отдаёт xml2js (explicitArray: false, mergeAttrs: true)
const good = (extra: any = {}): any => ({
    article: '71810',
    product_name: 'DXI30N-A 0.25W 50ohm',
    truesign: '0',
    tnved: '8518299600',
    packets: [
        { year: '2019', norma: '13', quant: '1' },
        { year: '2019', norma: '15', quant: '1' },
        { year: '2020', norma: '200', quant: '3' },
        { year: '2021', norma: '1000', quant: '1' },
    ],
    quant: '1628',
    quant_arrived: '',
    quant_arrives: '',
    quant_industry: '',
    date_arrives: '',
    norma_arrives: '',
    price: '53.91',
    optprice: '47.44',
    vipprice: '43.00',
    ...extra,
});

describe('toArray', () => {
    it('одиночный тег, массив и пустое значение', () => {
        expect(toArray({ a: 1 })).toEqual([{ a: 1 }]);
        expect(toArray([1, 2])).toEqual([1, 2]);
        expect(toArray(undefined)).toEqual([]);
        expect(toArray('')).toEqual([]);
    });
});

describe('ruelPacks', () => {
    it('quant в packets — число упаковок, остаток = норма × упаковки', () => {
        expect(ruelPacks(good())).toEqual([
            { norma: 13, quantity: 13 },
            { norma: 15, quantity: 15 },
            { norma: 200, quantity: 600 },
            { norma: 1000, quantity: 1000 },
        ]);
    });

    it('одна упаковка приходит объектом, а не массивом', () => {
        expect(ruelPacks(good({ packets: { year: '2020', norma: '200', quant: '5' } }))).toEqual([
            { norma: 200, quantity: 1000 },
        ]);
    });

    it('одинаковые нормы разных годов складываются, пустые пропускаются', () => {
        const packets = [
            { year: '2019', norma: '2', quant: '77' },
            { year: '2020', norma: '2', quant: '480' },
            { year: '', norma: '', quant: '' },
        ];
        expect(ruelPacks(good({ packets }))).toEqual([{ norma: 2, quantity: 1114 }]);
    });
});

describe('ruelPrices', () => {
    it('розница до 3 упаковок, опт от 3 упаковок, vip закупочная', () => {
        expect(ruelPrices(good(), 200, 'rub')).toEqual([
            { value: 53.91, min: 200, max: 599, currency: 'rub', isOrdinary: true },
            { value: 47.44, min: 600, max: 0, currency: 'rub', isOrdinary: true },
            { value: 43, min: 200, max: 0, currency: 'rub', isOrdinary: false },
        ]);
    });

    it('пустая цена пропускается', () => {
        expect(ruelPrices(good({ optprice: '' }), 1, 'rub').map((p) => p.value)).toEqual([53.91, 43]);
    });
});

describe('ruelOptions', () => {
    it('маркировка булевой и ТН ВЭД', () => {
        expect(ruelOptions(good({ truesign: '1' }))).toEqual({ marking: true, tnved: '8518299600' });
        expect(ruelOptions(good())).toEqual({ marking: false, tnved: '8518299600' });
    });

    it('без тегов — пусто', () => {
        expect(ruelOptions(good({ truesign: undefined, tnved: '' }))).toEqual({});
    });
});

describe('ruelPackageQuantity', () => {
    const withPack = (value: string) => good({ techinfo: { parameter: { name: 'Упаковка', value } } });

    it('штуки из параметра «Упаковка»', () => {
        expect(ruelPackageQuantity(withPack('REEL, 3000 шт.'), [])).toEqual(3000);
        expect(ruelPackageQuantity(withPack('3000'), [])).toEqual(3000);
        expect(ruelPackageQuantity(withPack('1000 шт'), [])).toEqual(1000);
    });

    it('не штуки — берём самую крупную упаковку на складе', () => {
        const item = withPack('поставляется в пачках отрезками кратно 1,0 м');
        expect(ruelPackageQuantity(item, ruelPacks(item))).toEqual(1000);
    });

    it('количество в производстве не считается нормой упаковки', () => {
        const item = good({ quant_industry: '5000', packets: { norma: '1', quant: '10' } });
        expect(ruelPackageQuantity(item, ruelPacks(item))).toEqual(0);
    });
});

describe('ruelWarehouses', () => {
    const now = DateTime.fromISO('2026-09-29');

    it('на каждую норму свой склад с кратностью и минимумом по норме', () => {
        const warehouses = ruelWarehouses(good({ truesign: '1' }), 11, 'rub', now);
        expect(warehouses.map((w) => [w.name, w.quantity, w.multiple, w.prices[0].min])).toEqual([
            ['CENTER', 13, 13, 13],
            ['CENTER-15', 15, 15, 15],
            ['CENTER-200', 600, 200, 200],
            ['CENTER-1000', 1000, 1000, 1000],
        ]);
        expect(warehouses[2]).toMatchObject({
            deliveryTime: 11,
            options: { location_id: 'ОДИНЦОВО', marking: true, tnved: '8518299600' },
        });
    });

    it('в пути и на приёмке — кратность из norma_arrives, срок по дате прибытия', () => {
        const warehouses = ruelWarehouses(
            good({
                packets: { norma: '200', quant: '5' },
                quant_arrived: '400',
                quant_arrives: '3000',
                date_arrives: '20261021',
                norma_arrives: '200',
                quant_industry: '10000',
            }),
            11,
            'rub',
            now,
        );
        expect(warehouses.map((w) => [w.name, w.quantity, w.multiple, w.deliveryTime])).toEqual([
            ['CENTER', 1000, 200, 11],
            ['ARRIVED', 400, 200, 13],
            ['TRANSIT', 3000, 200, 33],
            ['PRODUCED', 10000, 1, 111],
        ]);
        expect(warehouses[2].options).toEqual({ location_id: 'ЕДЕТЪ', marking: false, tnved: '8518299600' });
    });

    it('битая дата прибытия не ломает срок', () => {
        const item = good({ packets: [], quant: '0', quant_arrives: '10', date_arrives: '' });
        const warehouses = ruelWarehouses(item, 11, 'rub', now);
        expect(warehouses).toHaveLength(1);
        expect(warehouses[0]).toMatchObject({ name: 'TRANSIT', deliveryTime: 11, multiple: 1 });
    });

    it('остаток без упаковок — один склад с кратностью 1', () => {
        const item = good({ packets: { year: '', norma: '', quant: '' }, quant: '20' });
        expect(ruelWarehouses(item, 11, 'rub', now).map((w) => [w.name, w.quantity, w.multiple])).toEqual([
            ['CENTER', 20, 1],
        ]);
    });

    it('без цен склады не создаются', () => {
        const item = good({ price: '0.00', optprice: '0.00', vipprice: '0.00' });
        expect(ruelWarehouses(item, 11, 'rub', now)).toEqual([]);
    });
});

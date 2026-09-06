import * as XLSX from 'xlsx';
import { CurrencyDto } from '../../currency/dto/currency.dto';
import { buildEcompWarehouses, EcompItem, mergeLot, parseEcompGold, parseEcompOrder } from './ecomp.parser';

const GOLD_HEADER = [
    ['Ценовая группа: ПартнерскийЗолото'],
    [
        'Производитель',
        'Артикул',
        'Описание',
        'Data code',
        'Норма упаковке',
        'Остатки ЦС',
        'Цена без НДС, USD',
        'Распродажа Цена без НДС USD',
        'Склад в пути, шт',
        'Срок поставки, недель',
        'Код номенклатуры',
    ],
];
const ORDER_HEADER = [
    ['Производитель', 'Артикул', 'Описание', 'Количество', 'Цена без НДС, CNY', 'Срок поставки, недель', 'Код'],
];

function goldBook(rows: any[][], freeMarketRows: any[][] = []): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([...GOLD_HEADER, ...rows]), 'Франчайз');
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([...GOLD_HEADER, ...freeMarketRows]),
        'Свободный рынок',
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['', 'Дата', 'Курс']]), 'Валютный курс ЭЛТЕХ');
    return workbook;
}

function orderBook(rows: any[][]): XLSX.WorkBook {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([...ORDER_HEADER, ...rows]), 'ПартнерПрайсЗаказ');
    return workbook;
}

const usd = { id: 'usd' } as CurrencyDto;
const cny = { id: 'cny' } as CurrencyDto;

describe('mergeLot', () => {
    it('первая партия возвращается как есть', () => {
        expect(mergeLot(undefined, { quantity: 5, price: 1, weeks: 2 })).toEqual({ quantity: 5, price: 1, weeks: 2 });
    });

    it('партии суммируются, цена минимальная, срок ближайший', () => {
        const merged = mergeLot({ quantity: 234, price: 0.2168, weeks: 5 }, { quantity: 6, price: 0.3521, weeks: 2 });
        expect(merged).toEqual({ quantity: 240, price: 0.2168, weeks: 2 });
    });
});

describe('parseEcompGold', () => {
    it('обычная строка со складским остатком', () => {
        const items = parseEcompGold(
            goldBook([
                ['3L', 'LHP322512-2R2M', 'Силовая индуктивность', '', 3000, 57000, 0.0552, null, null, null, 'Т1'],
            ]),
        );
        expect(Array.from(items.values())).toEqual([
            {
                code: 'Т1',
                product: 'LHP322512-2R2M',
                producer: '3L',
                remark: 'Силовая индуктивность',
                multiple: 3000,
                stock: { quantity: 57000, price: 0.0552, weeks: 0 },
            },
        ]);
    });

    it('партии одного кода суммируются, цена минимальная', () => {
        const items = parseEcompGold(
            goldBook([
                ['Dinkle', 'ECH250R-08P', '', '', 730, 234, 0.2168, null, null, null, 'Т2'],
                ['Dinkle', 'ECH250R-08P', '', '', 730, 6, 0.3521, null, null, null, 'Т2'],
                ['Dinkle', 'ECH250R-08P', '', '', 730, 49, 0.3521, null, null, null, 'Т2'],
            ]),
        );
        expect(items.size).toEqual(1);
        expect(items.get('Т2').stock).toEqual({ quantity: 289, price: 0.2168, weeks: 0 });
    });

    it('строка с остатком 0 и "в пути" — транзит со сроком в неделях', () => {
        const items = parseEcompGold(
            goldBook([
                ['Fucon', 'PCT-2-3C', '', '', 50, 0, 0.1666, null, 1500, 2, 'Т3'],
                ['Fucon', 'PCT-2-3C', '', '', 50, 211, 0.1666, null, null, null, 'Т3'],
            ]),
        );
        expect(items.get('Т3')).toMatchObject({
            stock: { quantity: 211, price: 0.1666, weeks: 0 },
            transit: { quantity: 1500, price: 0.1666, weeks: 2 },
        });
    });

    it('цена распродажи имеет приоритет, норма упаковки 0 даёт кратность 1', () => {
        const items = parseEcompGold(goldBook([['AUO', 'G104', '', '', 0, 3, 80.93, 60.5, null, null, 'Т4']]));
        expect(items.get('Т4')).toMatchObject({ multiple: 1, stock: { quantity: 3, price: 60.5, weeks: 0 } });
    });

    it('пропускает строки без цены и без кода', () => {
        const items = parseEcompGold(
            goldBook([
                ['AUO', 'M320QAN01.0', '', '', 1, 1, null, null, null, null, 'Т5'],
                ['AUO', 'X', '', '', 1, 1, 5, null, null, null, null],
            ]),
        );
        expect(items.size).toEqual(0);
    });

    it('читает оба листа с ценами и игнорирует лист курсов', () => {
        const items = parseEcompGold(
            goldBook(
                [['3L', 'A', '', '', 1, 10, 1, null, null, null, 'Т6']],
                [['Traco', 'TEN 40-1211', '', '', 5, 2, 53.6972, null, null, null, 'Т7']],
            ),
        );
        expect(Array.from(items.keys())).toEqual(['Т6', 'Т7']);
    });
});

describe('parseEcompOrder', () => {
    it('добавляет склад под заказ к позиции из Gold', () => {
        const items = parseEcompGold(goldBook([['MeanWell', 'HDR-15-5', '', '', 1, 10, 50, null, null, null, 'Т8']]));
        parseEcompOrder(orderBook([['MeanWell', 'HDR-15-5', 'AC-DC', 421, 47.2564, 1, 'Т8']]), items);
        expect(items.size).toEqual(1);
        expect(items.get('Т8')).toMatchObject({
            stock: { quantity: 10, price: 50, weeks: 0 },
            order: { quantity: 421, price: 47.2564, weeks: 1 },
        });
    });

    it('новая позиция только под заказ, партии суммируются', () => {
        const items = parseEcompOrder(
            orderBook([
                ['MeanWell', 'HDR-15-5', 'AC-DC', 421, 47.2564, 1, 'Т9'],
                ['MeanWell', 'HDR-15-5', 'AC-DC', 1120, 47.2564, 5, 'Т9'],
            ]),
        );
        expect(Array.from(items.values())).toEqual([
            {
                code: 'Т9',
                product: 'HDR-15-5',
                producer: 'MeanWell',
                remark: 'AC-DC',
                multiple: 1,
                order: { quantity: 1541, price: 47.2564, weeks: 1 },
            },
        ]);
    });
});

describe('buildEcompWarehouses', () => {
    const item: EcompItem = {
        code: 'Т1',
        product: 'A',
        producer: 'B',
        remark: '',
        multiple: 10,
        stock: { quantity: 100, price: 1.5, weeks: 0 },
        transit: { quantity: 300, price: 1.5, weeks: 2 },
        order: { quantity: 500, price: 9.9, weeks: 3 },
    };

    it('склад в USD, транзит и заказ со сроком по неделям, заказ в CNY', () => {
        expect(buildEcompWarehouses(item, 14, usd, cny)).toEqual([
            {
                name: 'CENTER',
                deliveryTime: 14,
                quantity: 100,
                multiple: 10,
                prices: [{ value: 1.5, min: 1, max: 0, currency: 'usd', isOrdinary: false }],
            },
            {
                name: 'TRANSIT',
                deliveryTime: 28,
                quantity: 300,
                multiple: 10,
                prices: [{ value: 1.5, min: 1, max: 0, currency: 'usd', isOrdinary: false }],
            },
            {
                name: 'PRODUCED',
                deliveryTime: 35,
                quantity: 500,
                multiple: 10,
                prices: [{ value: 9.9, min: 1, max: 0, currency: 'cny', isOrdinary: false }],
            },
        ]);
    });

    it('без партий — без складов', () => {
        expect(
            buildEcompWarehouses({ ...item, stock: undefined, transit: undefined, order: undefined }, 14, usd, cny),
        ).toEqual([]);
    });
});

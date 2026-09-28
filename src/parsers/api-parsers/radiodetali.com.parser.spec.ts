import { RadiodetaliComParser } from './radiodetali.com.parser';
import { ParsersService } from '../parsers.service';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { SupplierDto } from '../../supplier/supplier.dto';
import { CurrencyDto } from '../../currency/dto/currency.dto';

describe('RadiodetaliComParser', () => {
    let parser: RadiodetaliComParser;
    let mockParsersService: Partial<ParsersService>;
    let httpGet: jest.Mock;

    const item = {
        partnum: 'LM358DR',
        manf: 'JSMICRO',
        itemid: '194289',
        id_stock: 1,
        qty: 1748,
        curr: 'USD',
        price_up5: [{ min_qty: 100, price: 0.02183 }],
        unit: 'шт',
        dlv_days: 7,
        ext: {
            analogs: null,
            tnved: '8542339000',
            weight_g: 0.15,
            marking: 'Нет',
            permit_kind: null,
            permit_number: null,
            permit_date: null,
            permit_url: null,
            refusal_number: '0038',
            refusal_url: 'https://radiodetali.com/api/connectors/1153b886477abaa89844707336eadf2c/doc/2732',
            datasheet_url: null,
            image_url: null,
            thumb_url: null,
            images_extra: null,
            specs: '{"type": "Операционный усилитель", "package": "SOIC-8", "mounting": "SMD", "current_a": 0.0005, "voltage_v": 32.0}',
            site_url: 'https://radiodetali.com/product/194289',
            packing: 2000,
        },
    };

    beforeEach(async () => {
        const mockSupplier: SupplierDto = {
            id: 'supplier-id',
            alias: 'radiodetalicom',
            deliveryTime: 5,
        } as SupplierDto;

        const mockCurrency: CurrencyDto = {
            id: 'currency-id',
            alfa3: 'USD',
        } as CurrencyDto;

        const suppliersMap = new Map<string, SupplierDto>();
        suppliersMap.set('radiodetalicom', mockSupplier);

        const currenciesMap = new Map<string, CurrencyDto>();
        currenciesMap.set('USD', mockCurrency);

        const mockVault = {
            get: jest.fn().mockResolvedValue({
                URL: 'https://radiodetali.com/api.php',
                TOKEN: 'test-token',
                IGNORE: '',
            }),
        };

        httpGet = jest.fn().mockReturnValue({
            toPromise: jest.fn().mockResolvedValue({ data: { message: '', item: [item], ext: 'ok' } }),
        });

        mockParsersService = {
            getVault: jest.fn().mockReturnValue(mockVault),
            getHttp: jest.fn().mockReturnValue({ get: httpGet }),
            getSuppliers: jest.fn().mockReturnValue(suppliersMap),
            getCurrencies: jest.fn().mockReturnValue(currenciesMap),
            getPiece: jest.fn().mockReturnValue({ id: 'piece-id' }),
        };

        const request = new PriceRequestDto();
        request.search = 'LM358';

        parser = new RadiodetaliComParser(request, mockParsersService as ParsersService);
    });

    it('should be defined', () => {
        expect(parser).toBeDefined();
    });

    it('should have alias radiodetalicom', () => {
        expect(parser.getAlias()).toBe('radiodetalicom');
    });

    it('should request with ext=1', async () => {
        await parser.getResponse();
        expect(httpGet).toHaveBeenCalledWith('https://radiodetali.com/api.php', {
            params: { id: 'test-token', offs: '', opt: 'by_part_n', seek: 'LM358', ext: 1 },
        });
    });

    it('should parse response correctly', async () => {
        const goods = await parser.parseResponse({ message: '', item: [item], ext: 'ok' });

        expect(goods).toHaveLength(1);
        expect(goods[0].code).toBe('194289');
        expect(goods[0].alias).toBe('LM358DR');
        expect(goods[0].warehouses[0].quantity).toBe(1748);
        expect(goods[0].warehouses[0].deliveryTime).toBe(14);
        expect(goods[0].warehouses[0].prices).toEqual([
            { value: 0.02183, min: 100, max: 0, currency: 'currency-id', isOrdinary: false },
        ]);
    });

    it('should map ext.specs.package to case and ext.packing to packageQuantity', async () => {
        const goods = await parser.parseResponse({ item: [item] });

        expect(goods[0].parameters).toEqual([
            { name: 'name', stringValue: 'LM358DR' },
            { name: 'producer', stringValue: 'JSMICRO' },
            { name: 'case', stringValue: 'SOIC-8' },
            { name: 'packageQuantity', numericValue: 2000, unit: 'piece-id' },
        ]);
    });

    it('should map marking "Да" to true', async () => {
        const marked = { ...item, ext: { ...item.ext, marking: 'Да' } };

        const goods = await parser.parseResponse({ item: [marked] });

        expect(goods[0].warehouses[0].options.marking).toBe(true);
    });

    it('should skip marking and tnved when empty', async () => {
        const noMarking = { ...item, ext: { ...item.ext, marking: null, tnved: '' } };

        const goods = await parser.parseResponse({ item: [noMarking] });

        expect(goods[0].warehouses[0].options.marking).toBeUndefined();
        expect(goods[0].warehouses[0].options.tnved).toBeUndefined();
    });

    it('should put refusal letter into warehouse options and skip empty permit', async () => {
        const goods = await parser.parseResponse({ item: [item] });

        expect(goods[0].warehouses[0].options).toEqual({
            location_id: undefined,
            marking: false,
            tnved: '8542339000',
            refusal: {
                number: '0038',
                url: 'https://radiodetali.com/api/connectors/1153b886477abaa89844707336eadf2c/doc/2732',
            },
        });
        expect(goods[0].warehouses[0].options.permit).toBeUndefined();
    });

    it('should put permit into warehouse options when present', async () => {
        const withPermit = {
            ...item,
            ext: {
                ...item.ext,
                permit_kind: 'Декларация о соответствии',
                permit_number: 'ЕАЭС N RU Д-CN.РА01.В.12345/22',
                permit_date: '2022-05-10',
                permit_url: 'https://radiodetali.com/api/connectors/x/doc/1',
                refusal_number: null,
                refusal_url: null,
            },
        };

        const goods = await parser.parseResponse({ item: [withPermit] });

        expect(goods[0].warehouses[0].options.permit).toEqual({
            kind: 'Декларация о соответствии',
            number: 'ЕАЭС N RU Д-CN.РА01.В.12345/22',
            date: '2022-05-10',
            url: 'https://radiodetali.com/api/connectors/x/doc/1',
        });
        expect(goods[0].warehouses[0].options.refusal).toBeUndefined();
    });

    it('should work without ext (ext=1 not honored or old response)', async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { ext, ...withoutExt } = item;

        const goods = await parser.parseResponse({ item: [withoutExt] });

        expect(goods[0].parameters).toEqual([
            { name: 'name', stringValue: 'LM358DR' },
            { name: 'producer', stringValue: 'JSMICRO' },
        ]);
        expect(goods[0].warehouses[0].options).toEqual({ location_id: undefined });
    });

    it('should ignore broken specs json', async () => {
        const broken = { ...item, ext: { ...item.ext, specs: '{not json' } };

        const goods = await parser.parseResponse({ item: [broken] });

        expect(goods[0].parameters.find((p) => p.name === 'case')).toBeUndefined();
        expect(goods[0].parameters.find((p) => p.name === 'packageQuantity')?.numericValue).toBe(2000);
    });
});

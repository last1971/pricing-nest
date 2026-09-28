import { PromelecParser } from './promelec.parser';
import { ParsersService } from '../parsers.service';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { SupplierDto } from '../../supplier/supplier.dto';
import { CurrencyDto } from '../../currency/dto/currency.dto';

describe('PromelecParser', () => {
    let parser: PromelecParser;
    let mockParsersService: Partial<ParsersService>;

    const item = {
        item_id: 349050,
        name: 'HDR-15-12',
        producer_name: 'Mean Well',
        quant: 1399,
        description: 'AC-DC, 15Вт',
        pack_quant: 160,
        moq: 1,
        price_unit: 1,
        weight: 90,
        flag_nds: 0,
        flag_marking: 1,
        restriction: 'Проблема: Сертификат',
        pricebreaks: [
            { quant: 1, price: 865.91, pureprice: 910.96 },
            { quant: 9, price: 830.91, pureprice: 865.91 },
        ],
        vendors: [
            {
                vendor: 0,
                mpq: 1,
                moq: 1,
                quant: 1399,
                delivery: 0,
                pricebreaks: [{ quant: 1, price: 865.91, pureprice: 910.96 }],
            },
            {
                vendor: 86,
                mpq: 1,
                moq: 9,
                quant: 2544,
                delivery: 7,
                comment: 'Склад дистрибьютора',
                pricebreaks: [{ quant: 9, price: 796.2, pureprice: 810.05 }],
            },
        ],
    };

    beforeEach(async () => {
        const mockSupplier: SupplierDto = {
            id: 'supplier-id',
            alias: 'promelec',
            deliveryTime: 5,
        } as SupplierDto;

        const mockCurrency: CurrencyDto = {
            id: 'currency-id',
            alfa3: 'RUB',
        } as CurrencyDto;

        const suppliersMap = new Map<string, SupplierDto>();
        suppliersMap.set('promelec', mockSupplier);

        const currenciesMap = new Map<string, CurrencyDto>();
        currenciesMap.set('RUB', mockCurrency);

        mockParsersService = {
            getVault: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({}) }),
            getHttp: jest.fn().mockReturnValue({ post: jest.fn() }),
            getSuppliers: jest.fn().mockReturnValue(suppliersMap),
            getCurrencies: jest.fn().mockReturnValue(currenciesMap),
            getPiece: jest.fn().mockReturnValue({ id: 'piece-id' }),
        };

        const request = new PriceRequestDto();
        request.search = 'HDR-15-12';

        parser = new PromelecParser(request, mockParsersService as ParsersService);
    });

    it('should have alias promelec', () => {
        expect(parser.getAlias()).toBe('promelec');
    });

    it('should parse response correctly', async () => {
        const goods = await parser.parseResponse([item]);

        expect(goods).toHaveLength(1);
        expect(goods[0].code).toBe('349050');
        expect(goods[0].warehouses).toHaveLength(3);
        expect(goods[0].warehouses[0].name).toBe('CENTER');
        expect(goods[0].warehouses[1].options.location_id).toBe('Элкит');
        expect(goods[0].warehouses[2].options.location_id).toBe('Склад дистрибьютора');
    });

    it('should put boolean marking into options of every warehouse', async () => {
        const goods = await parser.parseResponse([item]);

        expect(goods[0].warehouses.map((w) => w.options.marking)).toEqual([true, true, true]);
    });

    it('should map flag_marking 0 to false', async () => {
        const goods = await parser.parseResponse([{ ...item, flag_marking: 0 }]);

        expect(goods[0].warehouses.map((w) => w.options.marking)).toEqual([false, false, false]);
    });

    it('should skip marking when flag_marking is absent', async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { flag_marking, ...withoutFlag } = item;

        const goods = await parser.parseResponse([withoutFlag]);

        expect(goods[0].warehouses[0].options).toEqual({});
        expect(goods[0].warehouses[1].options).toEqual({ location_id: 'Элкит' });
    });

    it('should parse string response', async () => {
        const goods = await parser.parseResponse(JSON.stringify([item]));

        expect(goods[0].warehouses[0].options.marking).toBe(true);
    });

    it('should throw on error response', async () => {
        await expect(parser.parseResponse({ error: 'bad login' })).rejects.toThrow('bad login');
    });
});

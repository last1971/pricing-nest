import { CompelDmsParser } from './compel.dms.parser';
import { ParsersService } from '../parsers.service';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { GoodDto } from '../../good/dtos/good.dto';
import { SupplierDto } from '../../supplier/supplier.dto';
import { CurrencyDto } from '../../currency/dto/currency.dto';

describe('CompelDmsParser', () => {
    let parser: CompelDmsParser;
    let mockParsersService: Partial<ParsersService>;

    beforeEach(async () => {
        const mockSupplier: SupplierDto = {
            id: 'supplier-id',
            alias: 'compeldms',
            deliveryTime: 5,
        } as SupplierDto;

        const mockCurrency: CurrencyDto = {
            id: 'currency-id',
            alfa3: 'USD',
        } as CurrencyDto;

        const suppliersMap = new Map<string, SupplierDto>();
        suppliersMap.set('compeldms', mockSupplier);

        const currenciesMap = new Map<string, CurrencyDto>();
        currenciesMap.set('USD', mockCurrency);

        const mockVault = {
            get: jest.fn().mockResolvedValue({
                API_URL: 'https://api.test.com',
                HASH: 'test-hash',
                COEFF: 1.02,
            }),
        };

        mockParsersService = {
            getVault: jest.fn().mockReturnValue(mockVault),
            getHttp: jest.fn().mockReturnValue({
                post: jest.fn().mockReturnValue({
                    toPromise: jest.fn().mockResolvedValue({
                        data: {
                            result: {
                                items: [
                                    {
                                        item_id: '7641486',
                                        item_name: 'LRS-350-24',
                                        item_brend: 'KEENSIDE',
                        proposals: [
                            {
                                location_id: '',
                                prognosis_id: '3 дня',
                                prognosis_days: 3,
                                vend_type: 'ID',
                                vend_qty: 257,
                                cut_tape: true,
                                mpq: 1,
                                price_qty: [{ price: 18.08638, min_qty: 1, max_qty: 2 }],
                            },
                        ],
                                    },
                                ],
                            },
                        },
                    }),
                }),
            }),
            getSuppliers: jest.fn().mockReturnValue(suppliersMap),
            getCurrencies: jest.fn().mockReturnValue(currenciesMap),
            getPiece: jest.fn().mockReturnValue({ id: 'piece-id' }),
        };

        const request = new PriceRequestDto();
        request.search = 'LRS-350-24';

        parser = new CompelDmsParser(request, mockParsersService as ParsersService);
    });

    it('should be defined', () => {
        expect(parser).toBeDefined();
    });

    it('should have alias compeldms', () => {
        expect(parser.getAlias()).toBe('compeldms');
    });

    it('should parse response correctly', async () => {
        const response = {
            result: {
                items: [
                    {
                        item_id: '7641486',
                        item_name: 'LRS-350-24',
                        item_brend: 'KEENSIDE',
                        proposals: [
                            {
                                location_id: '',
                                prognosis_id: '3 дня',
                                prognosis_days: 3,
                                vend_type: 'ID',
                                vend_qty: 257,
                                cut_tape: true,
                                mpq: 1,
                                price_qty: [{ price: 18.08638, min_qty: 1, max_qty: 2 }],
                            },
                        ],
                    },
                ],
            },
        };

        const goods = await parser.parseResponse(response);

        expect(goods).toHaveLength(1);
        expect(goods[0].code).toBe('7641486');
        expect(goods[0].warehouses[0].options.prognosis_id).toBe('3 дня');
    });

    it('should parse multiple items correctly', async () => {
        const response = {
            result: {
                items: [
                    {
                        item_id: '7641484',
                        item_name: 'LRS-350-24',
                        item_brend: 'LZTEC',
                        proposals: [
                            {
                                location_id: '',
                                prognosis_id: '5 недель',
                                prognosis_days: 22,
                                vend_type: 'CD',
                                vend_qty: 1,
                                cut_tape: true,
                                mpq: 1,
                                price_qty: [],
                            },
                        ],
                    },
                    {
                        item_id: '7641486',
                        item_name: 'LRS-350-24',
                        item_brend: 'KEENSIDE',
                        proposals: [
                            {
                                location_id: '',
                                prognosis_id: '3 дня',
                                prognosis_days: 3,
                                vend_type: 'ID',
                                vend_qty: 257,
                                cut_tape: true,
                                mpq: 1,
                                price_qty: [],
                            },
                        ],
                    },
                ],
            },
        };

        const goods = await parser.parseResponse(response);

        expect(goods).toHaveLength(2);
        expect(goods.find((g) => g.code === '7641486')?.warehouses[0].options.prognosis_id).toBe('3 дня');
        expect(goods.find((g) => g.code === '7641484')?.warehouses[0].options.prognosis_id).toBe('5 недель');
    });
});


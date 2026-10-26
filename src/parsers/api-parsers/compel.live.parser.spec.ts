import { CompelLiveParser, LIVE_API_TIMEOUT_DEFAULT } from './compel.live.parser';
import { ParsersService } from '../parsers.service';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { SupplierDto } from '../../supplier/supplier.dto';
import { CurrencyDto } from '../../currency/dto/currency.dto';

describe('CompelLiveParser', () => {
    let parser: CompelLiveParser;
    const post = jest.fn().mockReturnValue({ pipe: jest.fn() });
    const configGet = jest.fn();

    beforeEach(() => {
        const suppliersMap = new Map<string, SupplierDto>();
        suppliersMap.set('compel', { id: 'compel-id', alias: 'compel', deliveryTime: 5 } as SupplierDto);
        const currenciesMap = new Map<string, CurrencyDto>();
        currenciesMap.set('USD', { id: 'usd-id', alfa3: 'USD' } as CurrencyDto);
        const mockParsersService: Partial<ParsersService> = {
            getVault: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ API_URL: 'https://api.test.com', HASH: 'test-hash' }),
            }),
            getHttp: jest.fn().mockReturnValue({ post }),
            getSuppliers: jest.fn().mockReturnValue(suppliersMap),
            getCurrencies: jest.fn().mockReturnValue(currenciesMap),
            getPiece: jest.fn().mockReturnValue({ id: 'piece-id' }),
            getConfigService: jest.fn().mockReturnValue({ get: configGet }),
        };
        const request = new PriceRequestDto();
        request.search = 'CR2032';
        request.withCache = false;
        parser = new CompelLiveParser(request, mockParsersService as ParsersService);
        post.mockClear();
        configGet.mockReset();
    });

    it('свой ключ ошибок, но поставщик — compel', () => {
        expect(parser.getAlias()).toBe('compel-live');
        expect(parser.getSupplier().alias).toBe('compel');
        expect(parser.getCacheKey()).toBe('compel-live : CR2032');
    });

    it('спрашивает точным именем без «*», без расчёта цен, с остатком', async () => {
        await parser.getResponse();
        expect(post).toHaveBeenCalledTimes(1);
        const [url, body] = post.mock.calls[0];
        expect(url).toBe('https://api.test.com');
        expect(body.method).toBe('search_item_name_h');
        expect(body.params).toMatchObject({
            user_hash: 'test-hash',
            query_string: 'CR2032',
            calc_price: false,
            calc_qty: true,
        });
    });

    it('таймаут 5 с по умолчанию, LIVE_API_TIMEOUT переопределяет', () => {
        configGet.mockReturnValue(undefined);
        expect(parser['getTimeout']()).toBe(LIVE_API_TIMEOUT_DEFAULT);
        configGet.mockReturnValue('3000');
        expect(parser['getTimeout']()).toBe(3000);
    });

    it('разбирает ответ без цен: остаток, кратность, срок', async () => {
        const goods = await parser.parseResponse({
            result: {
                items: [
                    {
                        item_id: '1185005',
                        item_name: 'CR2032',
                        item_brend: 'EVE',
                        locations: [
                            {
                                location_id: 'CENTRE',
                                prognosis_id: '1 день',
                                prognosis_days: 8,
                                vend_qty: 78965,
                                mpq: 1,
                            },
                        ],
                    },
                ],
            },
        });
        expect(goods).toHaveLength(1);
        expect(goods[0].code).toBe('1185005');
        expect(goods[0].warehouses[0]).toMatchObject({
            name: 'CENTRE',
            quantity: 78965,
            multiple: 1,
            deliveryTime: 13,
        });
        expect(goods[0].warehouses[0].prices).toEqual([]);
    });
});

import { CompelOfferParser } from './compel.offer.parser';
import { PromelecOfferParser } from './promelec.offer.parser';
import { ParsersService } from '../parsers.service';

describe('Checkout offers', () => {
    const post = jest.fn();
    const suppliers = new Map([['compel', { alias: 'compel' }], ['promelec', { alias: 'promelec' }]]);
    const parsers = {
        getVault: () => ({ get: async () => ({ API_URL: 'https://compel.test', URL_API: 'https://promelec.test' }) }),
        getHttp: () => ({ post }), getSuppliers: () => suppliers,
        getConfigService: () => ({ get: () => undefined }),
    } as unknown as ParsersService;

    it('Компэл: точное имя, расчёт количества и цены включён, отдельный ключ ошибок', async () => {
        const parser = new CompelOfferParser({ search: 'STM32F103C8T6', withCache: false, dbOnly: false }, parsers);
        await parser.getResponse();
        expect(post.mock.calls.at(-1)[1].params).toMatchObject({ query_string: 'STM32F103C8T6', calc_price: true, calc_qty: true });
        expect(parser.getSupplier().alias).toBe('compel');
        expect(parser.getAlias()).toBe('compel-offer');
        expect(parser['getTimeout']()).toBe(5000);
    });

    it('Промэлектроника: расширенный ответ с ценами и складами, timeout 5 с и отдельный ключ ошибок', async () => {
        const parser = new PromelecOfferParser({ search: 'TDA7850', withCache: false, dbOnly: false }, parsers);
        await parser.getResponse();
        expect(post.mock.calls.at(-1)[1]).toMatchObject({ method: 'items_data_find', name: 'TDA7850', extended: 1 });
        expect(parser.getSupplier().alias).toBe('promelec');
        expect(parser.getAlias()).toBe('promelec-offer');
        expect(parser['getTimeout']()).toBe(5000);
    });

    it('короткое имя: берёт страницу перед точным кодом, без неработающего поиска SF16', async () => {
        const parser = new PromelecOfferParser({ search: 'SF16', withCache: false, dbOnly: false }, parsers);
        parser.supplierCode = '6079';
        await parser.getResponse();
        const body = post.mock.calls.at(-1)[1];
        expect(body).toMatchObject({ method: 'items_data_get', item_id: 6078, extended: 1 });
        expect(body.name).toBeUndefined();
    });
});

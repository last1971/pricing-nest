import { AbstractParser } from './AbstractParser';
import { Source } from '../../good/dtos/source.enum';
import { GoodDto } from '../../good/dtos/good.dto';
import { PriceDto } from '../../good/dtos/price.dto';

export class PromelecParser extends AbstractParser {
    getAlias(): string {
        return 'promelec';
    }
    getCurrencyAlfa(): string {
        return 'RUB';
    }
    getParams(): any {
        return {
            method: 'items_data_find',
            login: this.parsers.getConfigService().get<string>('API_PROM_LOGIN'),
            password: this.parsers.getConfigService().get<string>('API_PROM_PASS'),
            customer_id: this.parsers.getConfigService().get<string>('API_PROM_ID'),
            name: this.search,
            extended: 1,
        };
    }
    getUrl(): string {
        return this.parsers.getConfigService().get<string>('API_PROM_URL');
    }
    parseResponse(response: any): GoodDto[] {
        return response.map((item) => ({
            source: Source.Api,
            alias: item.name,
            code: item.item_id,
            supplier: this.getSupplier().id,
            warehouses: [
                {
                    name: 'CENTER',
                    deliveryTime: 8,
                    quantity: item.quant,
                    multiple: item.price_unit ?? 1,
                    prices: this.parsePrices(item.pricebreaks, item),
                },
            ].concat(
                (item.vendors ?? []).map((vendor) => ({
                    name: 'PromelecVendor' + vendor.vendor,
                    deliveryTime: 8 + vendor.delivery,
                    quantity: vendor.quant,
                    multiple: vendor.mpq ?? 1,
                    prices: this.parsePrices(vendor.pricebreaks, vendor),
                })),
            ),
        }));
    }

    private parsePrices(data: any, item: any): any {
        return (data ?? []).map(
            (price, index, prices): PriceDto => ({
                value: price.price / (item.price_unit ?? 1),
                min: item.moq > price.quant ? item.moq : price.quant,
                max: index + 1 === prices.length ? 0 : prices[index + 1].quant - 1,
                currency: this.getCurrency().id,
            }),
        );
    }
}

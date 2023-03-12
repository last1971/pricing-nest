import { AbstractParser } from './AbstractParser';
import { v4 } from 'uuid';
import { GoodDto } from '../good/dtos/good.dto';
import { Source } from '../good/dtos/source.enum';
import { WarehouseDto } from '../good/dtos/warehouse.dto';
import { PriceDto } from '../good/dtos/price.dto';
export class CompelParser extends AbstractParser {
    getAlias(): string {
        return 'compel';
    }
    getCurrencyAlfa(): string {
        return 'USD';
    }
    getParams(): any {
        return {
            id: v4(),
            method: 'search_item_name_h',
            params: {
                user_hash: this.parsers.getConfigService().get<string>('API_COMPEL_HASH'),
                query_string: this.search + '*',
                calc_price: true,
                calc_qty: true,
            },
        };
    }

    getUrl(): string {
        return this.parsers.getConfigService().get<string>('API_COMPEL_URL');
    }

    parseResponse(response: any): GoodDto[] {
        if (response.error) throw response.error;
        return response.result.items.map(
            (item): GoodDto => ({
                supplier: this.getSupplier().id,
                code: item.item_id,
                alias: item.item_name,
                source: Source.Api,
                warehouses: item.locations.map(
                    (location): WarehouseDto => ({
                        name: location.item_id,
                        deliveryTime: this.getSupplier().deliveryTime + location.prognosis_days,
                        quantity: location.vend_qty,
                        multiple: location.mpq,
                        prices: (location.price_qty ?? []).map(
                            (price): PriceDto => ({
                                value: price.price,
                                min: price.min_qty,
                                max: price.max_qty,
                                currency: this.getCurrency().id,
                            }),
                        ),
                    }),
                ),
            }),
        );
    }
}

import { AbstractParser } from './abstract.parser';
import { v4 } from 'uuid';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { PriceDto } from '../../good/dtos/price.dto';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
export class CompelParser extends AbstractParser {
    getAlias(): string {
        return 'compel';
    }
    getCurrencyAlfa(): string {
        return 'USD';
    }
    useGetMethod(): boolean {
        return false;
    }
    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().post(this.parsers.getConfigService().get<string>('API_COMPEL_URL'), {
            id: v4(),
            method: 'search_item_name_h',
            params: {
                user_hash: this.parsers.getConfigService().get<string>('API_COMPEL_HASH'),
                query_string: this.search + '*',
                calc_price: true,
                calc_qty: true,
            },
        });
    }
    async parseResponse(response: any): Promise<GoodDto[]> {
        if (response.error) throw response.error;
        return response.result.items.map(
            (item): GoodDto =>
                new GoodDto({
                    updatedAt: new Date(),
                    supplier: this.getSupplier().id,
                    code: item.item_id.toString(),
                    alias: item.item_name.toString(),
                    source: Source.Api,
                    parameters: [
                        { name: 'name', stringValue: item.item_name },
                        { name: 'producer', stringValue: item.item_brend },
                        ...(item.package_name ? [{ name: 'case', stringValue: item.package_name }] : []),
                        ...(item.qty_in_pack
                            ? [
                                  {
                                      name: 'packageQuantity',
                                      numericValue: item.qty_in_pack,
                                      unit: this.parsers.getPiece().id,
                                  },
                              ]
                            : []),
                    ],
                    warehouses: item.locations.map(
                        (location): WarehouseDto => ({
                            name: location.location_id ?? 'CENTER',
                            deliveryTime: this.getSupplier().deliveryTime + location.prognosis_days,
                            quantity: location.vend_qty,
                            multiple: location.mpq,
                            prices: (location.price_qty ?? []).map(
                                (price): PriceDto => ({
                                    value: price.price,
                                    min: price.min_qty,
                                    max: price.max_qty,
                                    currency: this.getCurrency().id,
                                    isOrdinary: false,
                                }),
                            ),
                        }),
                    ),
                }),
        );
    }
}

import { AbstractParser } from './abstract.parser';
import { v4 } from 'uuid';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { PriceDto } from '../../good/dtos/price.dto';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
export class CompelParser extends AbstractParser {
    private supplierTypes = {
        CD: 'Каталожный дистрибьютор',
        M: 'Производитель',
        OD: 'Официальный дистрибьютор',
        MIX: 'Дистрибьютор со смешанной моделью',
        ID: 'Независимый дистрибьютор',
        MF: 'Франчайзинговый производитель',
        EOL: 'Независимый дистрибьютор (EOL)',
    };
    getAlias(): string {
        return 'compel';
    }
    getCurrencyAlfa(): string {
        return 'USD';
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
                    warehouses: (this.getAlias() === 'compel'
                        ? item.locations
                        : item.proposals.filter((location) => !location.location_id.trim())
                    ).map(
                        (location): WarehouseDto => ({
                            name: !!location.location_id.trim()
                                ? location.location_id
                                : location.prognosis_id +
                                  ';' +
                                  location.vend_type +
                                  ';' +
                                  location.vend_qty +
                                  ';' +
                                  location.cut_tape +
                                  ';' +
                                  location.vend_note,
                            deliveryTime: this.getSupplier().deliveryTime + location.prognosis_days,
                            quantity:
                                location.vend_qty ?? (location.price_qty?.length ? location.price_qty.slice(-1)[0] : 0),
                            multiple: location.mpq,
                            options: {
                                location_id: !!location.location_id.trim()
                                    ? location.location_id
                                    : (this.supplierTypes[location.vend_type] ?? location.vend_type) +
                                      (location.cut_tape ? ', обрезки' : ''),
                                pos: item.pos,
                                ...(!!location.vend_proposal_date
                                    ? { updatedAt: new Date(location.vend_proposal_date) }
                                    : null),
                            },
                            prices: (location.price_qty ?? []).map(
                                (price): PriceDto => ({
                                    value: price.price * this.parsers.getConfigService().get<number>('API_COMPEL_COEF'),
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

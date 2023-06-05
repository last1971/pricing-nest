import { AbstractParser } from './abstract.parser';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { PriceDto } from '../../good/dtos/price.dto';

export class ElitanParser extends AbstractParser {
    getAlias(): string {
        return 'elitan';
    }

    getCurrencyAlfa(): string {
        return 'RUB';
    }

    async getResponse(): Promise<Observable<AxiosResponse<any, any>>> {
        const elitan = await this.parsers.getVault().get('elitan');
        const url = elitan.URL as string;
        const email_aut = elitan.EMAIL as string;
        const mail_hash = elitan.MAIL_HASH as string;
        const Cookie = 'email_aut=' + email_aut + '; mail_hash=' + mail_hash + ';';
        return this.parsers.getHttp().get(url, {
            headers: {
                Accept: 'application/json',
                Cookie,
            },
            params: {
                find: this.search.replace(' ', ''),
            },
        });
    }

    parseResponse(response: any): Promise<GoodDto[]> {
        return (response.items.data ?? []).map(
            (good: any): GoodDto =>
                new GoodDto({
                    code: good.Ntovara,
                    updatedAt: new Date(),
                    supplier: this.getSupplier().id,
                    source: Source.Api,
                    alias: good.partname.split('@')[0],
                    parameters: [
                        { name: 'name', stringValue: good.partname.split('@')[0] },
                        ...(good.namemfg ? [{ name: 'producer', stringValue: good.namemfg }] : []),
                        ...(good.housing ? [{ name: 'case', stringValue: good.housing }] : []),
                        ...(good?.stock[0]?.pack
                            ? [
                                  {
                                      name: 'packageQuantity',
                                      numericValue: parseInt(good.stock[0].pack),
                                      unit: this.parsers.getPiece().id,
                                  },
                              ]
                            : []),
                        ...(good.bignote ? [{ name: 'remark', stringValue: good.bignote }] : []),
                    ],
                    warehouses: (good.stock ?? []).map(
                        (warehouse): WarehouseDto => ({
                            name: warehouse.id_stock,
                            multiple: warehouse.normoupakovka ? parseInt(warehouse.normoupakovka) : 1,
                            deliveryTime: this.getSupplier().deliveryTime + parseInt(warehouse.term_delay),
                            quantity: parseInt(warehouse.stock),
                            options: {
                                location_id:
                                    warehouse.blitz === '1'
                                        ? 'БЛИЦ!'
                                        : warehouse.term_delay_string.trim() === 'сегодня'
                                        ? 'Удмуртия'
                                        : parseInt(warehouse.term_delay) > 10
                                        ? 'Буржуиния'
                                        : 'Россия',
                            },
                            prices: warehouse.price.map(
                                (price, index, prices): PriceDto => ({
                                    value: parseFloat(price.price),
                                    currency: this.getCurrency().id,
                                    min: parseInt(price.count),
                                    max: index === 0 ? 0 : parseInt(prices[index - 1].count) - 1,
                                    isOrdinary: false,
                                }),
                            ),
                        }),
                    ),
                }),
        );
    }
}

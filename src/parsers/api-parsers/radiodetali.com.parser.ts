import { AbstractParser } from './abstract.parser';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { PriceDto } from '../../good/dtos/price.dto';

export class RadiodetaliComParser extends AbstractParser {
    getAlias(): string {
        return 'radiodetalicom';
    }

    getCurrencyAlfa(): string {
        return 'USD';
    }

    async getResponse(): Promise<Observable<AxiosResponse<any, any>>> {
        const rd = await this.parsers.getVault().get('radiodetali.com');
        return this.parsers.getHttp().get(rd.URL as string, {
            params: {
                id: rd.TOKEN,
                offs: rd.IGNORE,
                opt: 'by_part_n',
                seek: this.search,
            },
        });
    }

    async parseResponse(response: any): Promise<GoodDto[]> {
        return (response.item ?? [])
            .filter((good) => good.itemid || good.partnum)
            .map(
                (good): GoodDto =>
                    new GoodDto({
                        alias: good.partnum,
                        code: good.itemid ?? good.partnum,
                        supplier: this.getSupplier().id,
                        updatedAt: new Date(),
                        source: Source.Api,
                        parameters: [
                            { name: 'name', stringValue: good.partnum },
                            ...(good.manf ? [{ name: 'producer', stringValue: good.manf }] : []),
                            ...(good.note ? [{ name: 'remark', stringValue: good.note }] : []),
                        ],
                        warehouses: [
                            {
                                name: 'CENTER',
                                deliveryTime: good.dlv_days + 7,
                                quantity: parseInt(good.qty),
                                multiple: good.p_rate ?? 1,
                                options: {
                                    location_id: good.nm_stock,
                                },
                                prices: good.price_up5.map(
                                    (price, index, prices): PriceDto => ({
                                        value: parseFloat(price.price),
                                        min: parseInt(price.min_qty),
                                        max: index + 1 === prices.length ? 0 : prices[index + 1].min_qty - 1,
                                        currency: this.getCurrency().id,
                                        isOrdinary: false,
                                    }),
                                ),
                            },
                        ],
                    }),
            );
    }
}

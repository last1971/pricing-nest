import { AbstractParser } from './abstract.parser';
import { Source } from '../../good/dtos/source.enum';
import { GoodDto } from '../../good/dtos/good.dto';
import { PriceDto } from '../../good/dtos/price.dto';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';

export class PromelecParser extends AbstractParser {
    getAlias(): string {
        return 'promelec';
    }
    getCurrencyAlfa(): string {
        return 'RUB';
    }
    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().post(this.parsers.getConfigService().get<string>('API_PROM_URL'), {
            method: 'items_data_find',
            login: this.parsers.getConfigService().get<string>('API_PROM_LOGIN'),
            password: this.parsers.getConfigService().get<string>('API_PROM_PASS'),
            customer_id: this.parsers.getConfigService().get<string>('API_PROM_ID'),
            name: this.search,
            extended: 1,
        });
    }
    async parseResponse(response: any): Promise<GoodDto[]> {
        return response.map(
            (item): GoodDto =>
                new GoodDto({
                    updatedAt: new Date(),
                    source: Source.Api,
                    alias: item.name.toString(),
                    code: item.item_id.toString(),
                    supplier: this.getSupplier().id,
                    parameters: [
                        { name: 'name', stringValue: item.name },
                        ...(item.producer_name ? [{ name: 'producer', stringValue: item.producer_name }] : []),
                        ...(item.package ? [{ name: 'case', stringValue: item.package }] : []),
                        ...(item.description ? [{ name: 'remark', stringValue: item.description }] : []),
                        ...(item.pack_quant
                            ? [
                                  {
                                      name: 'packageQuantity',
                                      numericValue: item.pack_quant,
                                      unit: this.parsers.getPiece().id,
                                  },
                              ]
                            : []),
                    ],
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
                            name: 'Vendor' + vendor.vendor,
                            deliveryTime: 8 + vendor.delivery,
                            quantity: vendor.quant,
                            multiple: vendor.mpq ?? 1,
                            options: {
                                location_id: vendor.delivery === 2 ? 'М А Г А З И Н' : vendor.comment ?? 'Л А Б А З',
                            },
                            prices: this.parsePrices(vendor.pricebreaks, vendor),
                        })),
                    ),
                }),
        );
    }

    private parsePrices(data: any, item: any): any {
        return (data ?? [])
            .map((price, index, prices): PriceDto[] => {
                return [
                    {
                        value: price.price / (item.price_unit ?? 1),
                        min: item.moq > price.quant ? item.moq : price.quant,
                        max: index + 1 === prices.length ? 0 : prices[index + 1].quant - 1,
                        currency: this.getCurrency().id,
                        isOrdinary: false,
                    },
                    ...(!item.vendors
                        ? []
                        : [
                              {
                                  value: price.pureprice / (item.price_unit ?? 1),
                                  min: item.moq > price.quant ? item.moq : price.quant,
                                  max: index + 1 === prices.length ? 0 : prices[index + 1].quant - 1,
                                  currency: this.getCurrency().id,
                                  isOrdinary: true,
                              },
                          ]),
                ];
            })
            .flat();
    }
}

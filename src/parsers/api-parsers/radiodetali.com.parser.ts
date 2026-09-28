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
                ext: 1,
            },
        });
    }

    private parseSpecs(ext: any): Record<string, any> {
        if (!ext?.specs) return {};
        try {
            return JSON.parse(ext.specs) ?? {};
        } catch {
            return {};
        }
    }

    private parseCertificates(ext: any): Record<string, any> {
        if (!ext) return {};
        const permit = {
            kind: ext.permit_kind,
            number: ext.permit_number,
            date: ext.permit_date,
            url: ext.permit_url,
        };
        const refusal = {
            number: ext.refusal_number,
            url: ext.refusal_url,
        };
        return {
            ...(Object.values(permit).some((v) => v) ? { permit } : {}),
            ...(Object.values(refusal).some((v) => v) ? { refusal } : {}),
        };
    }

    async parseResponse(response: any): Promise<GoodDto[]> {
        return (response.item ?? [])
            .filter((good) => good.itemid || good.partnum)
            .map((good): GoodDto => {
                const specs = this.parseSpecs(good.ext);
                const packing = parseInt(good.ext?.packing);
                return new GoodDto({
                    alias: good.partnum,
                    code: good.itemid ?? good.partnum,
                    supplier: this.getSupplier().id,
                    updatedAt: new Date(),
                    source: Source.Api,
                    parameters: [
                        { name: 'name', stringValue: good.partnum },
                        ...(good.manf ? [{ name: 'producer', stringValue: good.manf }] : []),
                        ...(good.note ? [{ name: 'remark', stringValue: good.note }] : []),
                        ...(specs.package ? [{ name: 'case', stringValue: specs.package }] : []),
                        ...(packing > 0
                            ? [
                                  {
                                      name: 'packageQuantity',
                                      numericValue: packing,
                                      unit: this.parsers.getPiece().id,
                                  },
                              ]
                            : []),
                    ],
                    warehouses: [
                        {
                            name: 'CENTER',
                            deliveryTime: good.dlv_days + 7,
                            quantity: parseInt(good.qty),
                            multiple: good.p_rate ?? 1,
                            options: {
                                location_id: good.nm_stock,
                                ...this.parseCertificates(good.ext),
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
                });
            });
    }
}

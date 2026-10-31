import { AbstractParser } from './abstract.parser';
import { Source } from '../../good/dtos/source.enum';
import { GoodDto } from '../../good/dtos/good.dto';
import { PriceDto } from '../../good/dtos/price.dto';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { isString } from 'lodash';
import { repairSupplierJson } from './repair-json';

export class PromelecParser extends AbstractParser {
    getAlias(): string {
        return 'promelec';
    }
    getCurrencyAlfa(): string {
        return 'RUB';
    }
    protected getMinSearchLength(): number {
        return 5;
    }
    protected lookupParameters(): { method: string; name?: string; item_id?: number } {
        return { method: 'items_data_find', name: this.search };
    }
    async getResponse(): Promise<Observable<AxiosResponse<any, any>>> {
        const promelec = await this.parsers.getVault().get('promelec');
        return this.parsers.getHttp().post(
            promelec.URL_API as string,
            {
                ...this.lookupParameters(),
                login: promelec.LOGIN,
                password: promelec.PASSWORD,
                customer_id: promelec.CUSTOMER_ID,
                extended: 1,
            },
            { transformResponse: (data) => data },
        );
    }
    async parseResponse(response: any): Promise<GoodDto[]> {
        const data = isString(response) ? repairSupplierJson(response) : response;
        if (data.error) throw new Error(data.error);
        return data.map(
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
                        // remark оставляем для прежних клиентов; description понимает импорт Sylius.
                        ...(item.description
                            ? [
                                  { name: 'remark', stringValue: item.description },
                                  { name: 'description', stringValue: item.description },
                              ]
                            : []),
                        ...this.catalogParameters(item),
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
                            deliveryTime: this.getSupplier().deliveryTime,
                            quantity: item.quant,
                            multiple: item.quant_unit ?? 1,
                            options: {
                                ...this.parseMarking(item),
                                ...this.pickupOnly(item),
                            },
                            prices: this.parsePrices(item.pricebreaks, item),
                        },
                    ].concat(
                        (item.vendors ?? []).map((vendor) => ({
                            name: 'Vendor' + vendor.vendor,
                            deliveryTime: this.getSupplier().deliveryTime + Math.max(0, Number(vendor.delivery) || 0),
                            quantity: vendor.quant,
                            multiple: vendor.mpq ?? 1,
                            options: {
                                location_id:
                                    vendor.delivery === 0
                                        ? 'Элкит'
                                        : vendor.delivery === 2
                                          ? 'М А Г А З И Н'
                                          : (vendor.comment ?? 'Л А Б А З'),
                                ...this.parseMarking(item),
                                ...this.pickupOnly(item),
                            },
                            prices: this.parsePrices(vendor.pricebreaks, vendor),
                        })),
                    ),
                }),
        );
    }

    /** Поля расширенного ответа API: не теряем категории и содержимое карточки. */
    private catalogParameters(item: any): { name: string; stringValue?: string; numericValue?: number }[] {
        const result: { name: string; stringValue?: string; numericValue?: number }[] = [];
        const categoryCode = [item.class2_id, item.class1_id, item.class0_id].find(
            (code) => code !== undefined && code !== null && String(code).trim() !== '' && String(code) !== '0',
        );
        if (categoryCode !== undefined) result.push({ name: 'categoryCode', stringValue: String(categoryCode) });
        const category = [item.class0name, item.class1name, item.class2name]
            .filter((value) => typeof value === 'string' && value.trim() !== '')
            .map((value) => value.trim())
            .join(' / ');
        if (category) result.push({ name: 'category', stringValue: category });
        for (const [field, parameter] of Object.entries({
            remark: 'supplierRemark',
            photo_url: 'images',
            datasheet: 'datasheet',
            description_eng: 'descriptionEnglish',
            packaging: 'packaging',
            mounting_type: 'mountingType',
            temperature: 'temperature',
            tnved: 'tnved',
        })) {
            if (typeof item[field] === 'string' && item[field].trim() !== '') {
                result.push({ name: parameter, stringValue: item[field].trim() });
            }
        }
        const techinfo = [];
        if (typeof item.mounting_type === 'string' && /[a-zа-я]/i.test(item.mounting_type)) {
            techinfo.push({ name: 'Тип монтажа', value: item.mounting_type.trim() });
        }
        if (typeof item.temperature === 'string' && /\d/.test(item.temperature)) {
            techinfo.push({ name: 'Рабочая температура', value: item.temperature.trim() });
        }
        if (techinfo.length) result.push({ name: 'techinfo', stringValue: JSON.stringify(techinfo) });
        if (item.weight !== undefined && item.weight !== null && Number.isFinite(Number(item.weight)) && Number(item.weight) > 0) {
            result.push({ name: 'weight', numericValue: Number(item.weight) });
        }
        return result;
    }

    private pickupOnly(item: any): { pickupOnly?: boolean } {
        return typeof item.remark === 'string' && item.remark.toLowerCase().includes('самовывоз')
            ? { pickupOnly: true }
            : {};
    }

    private parseMarking(item: any): { marking?: boolean } {
        return item.flag_marking === undefined || item.flag_marking === null ? {} : { marking: !!+item.flag_marking };
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
            .flat()
            .filter((price) => Number.isFinite(price.value) && price.value > 0);
    }
}

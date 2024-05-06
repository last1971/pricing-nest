import { AbstractParser } from './abstract.parser';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';
import { PriceDto } from '../../good/dtos/price.dto';

export class GetchipsParser extends AbstractParser {
    getAlias(): string {
        return 'getchips';
    }

    getCurrencyAlfa(): string {
        return 'USD';
    }

    async getResponse(): Promise<Observable<AxiosResponse<any, any>>> {
        const getchips = await this.parsers.getVault().get('getchips');
        return this.parsers.getHttp().get(getchips.URL_API as string, {
            params: {
                token: getchips.TOKEN,
                input: this.search,
                qty: 1,
                //currency_code: 1, // USD
            },
        });
    }

    parseResponse(response: any): Promise<GoodDto[]> {
        return response.data.map(
            (item): GoodDto =>
                new GoodDto({
                    updatedAt: new Date(),
                    supplier: this.getSupplier().id,
                    code: item.donor + ':' + item.title,
                    alias: item.title.toString(),
                    source: Source.Api,
                    parameters: [
                        { name: 'name', stringValue: item.title },
                        { name: 'producer', stringValue: item.brand },
                        {
                            name: 'packageQuantity',
                            numericValue: parseInt(item.sPack),
                            unit: this.parsers.getPiece().id,
                        },
                    ],
                    warehouses: [
                        {
                            name: item.donor,
                            deliveryTime: this.getSupplier().deliveryTime + item.orderdays,
                            quantity: parseInt(item.quantity),
                            multiple: parseInt(item.folddivision),
                            options: {
                                location_id: item.donor,
                            },
                            prices: item.priceBreak
                                .map(
                                    (price, index, prices): PriceDto => ({
                                        value: parseFloat(price.price),
                                        min: Math.max(parseInt(price.quantity), parseInt(item.minq)),
                                        max: index + 1 === prices.length ? 0 : parseInt(prices[index + 1].quantity) - 1,
                                        currency: this.getCurrency().id,
                                        isOrdinary: false,
                                    }),
                                )
                                .filter((price: PriceDto) => price.min < price.max || price.max === 0),
                        },
                    ],
                }),
        );
    }
}

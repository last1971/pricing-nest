import { AbstractParser } from './abstract.parser';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { GoodDto } from '../../good/dtos/good.dto';
import { Source } from '../../good/dtos/source.enum';

export class ElcoParser extends AbstractParser {
    getAlias(): string {
        return 'elcopro';
    }

    getCurrencyAlfa(): string {
        return 'RUB';
    }

    protected getUrl(): string {
        return this.parsers.getConfigService().get<string>('API_ELCO_URL');
    }

    protected getToken(): string {
        return this.parsers.getConfigService().get<string>('API_ELCO_TOKEN');
    }

    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().get(this.getUrl(), {
            headers: {
                Authorization: 'Bearer ' + this.getToken(),
                Accept: 'application/json',
            },
            params: {
                sellerId: 0,
                search: this.search,
            },
        });
    }

    async parseResponse(response: any): Promise<GoodDto[]> {
        const result: Map<string, GoodDto> = new Map<string, GoodDto>();

        response.data.forEach((item: any) => {
            let good: GoodDto = result.get(item.code);
            if (!good) {
                good = new GoodDto({
                    alias: item.name,
                    supplier: this.getSupplier().id,
                    code: item.code,
                    source: Source.Api,
                    updatedAt: new Date(),
                    parameters: [
                        { name: 'name', stringValue: item.name },
                        { name: 'producer', stringValue: item.producer },
                        { name: 'case', stringValue: item.case },
                    ],
                    warehouses: [
                        {
                            name: 'CENTER',
                            quantity: item.quantity,
                            deliveryTime: this.getSupplier().deliveryTime,
                            multiple: 1,
                            prices: [],
                        },
                    ],
                });
                result.set(item.code, good);
            }
            good.warehouses[0].prices.push({
                value: item.price,
                currency: this.getCurrency().id,
                min: item.minQuantity,
                max: item.maxQuantity,
                isOrdinary: !item.isInput,
            });
        });
        return [...result].map(([, value]) => value);
    }
}

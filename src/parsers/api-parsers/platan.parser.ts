import { AbstractParser } from './abstract.parser';
import { GoodDto } from '../../good/dtos/good.dto';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { Source } from '../../good/dtos/source.enum';
import { PriceDto } from '../../good/dtos/price.dto';
import { times } from 'lodash';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { DateTime } from 'luxon';

export class PlatanParser extends AbstractParser {
    getAlias(): string {
        return 'platan';
    }

    getCurrencyAlfa(): string {
        return 'RUB';
    }

    getResponse(): Observable<AxiosResponse<any, any>> {
        return this.parsers.getHttp().get(this.parsers.getConfigService().get<string>('API_PLATAN_URL'), {
            params: { search: this.search },
        });
    }
    async parseResponse(response: any): Promise<GoodDto[]> {
        const retails: Map<string, any> = new Map<string, any>();
        const codes = response.items.map((item) => {
            const code: string = item.NOM_N.toString();
            retails.set(code, item);
            return code;
        });
        const login = this.parsers.getConfigService().get<string>('API_PLATAN_LOGIN');
        const pass = this.parsers.getConfigService().get<string>('API_PLATAN_PASS');
        const sha1 = crypto
            .createHash('sha1')
            .update(login + ';' + codes.join(';') + ';' + pass)
            .digest('hex')
            .toUpperCase();
        const url = new URL(this.parsers.getConfigService().get<string>('API_PLATAN_URL'));
        url.searchParams.append('login', login);
        codes.forEach((id) => url.searchParams.append('id', id));
        url.searchParams.append('sha1', sha1);
        const wholesales = await firstValueFrom(this.parsers.getHttp().get(url.toString()));
        return wholesales.data.items.map((item): GoodDto => {
            const retail = retails.get(item.NOM_N);
            const warehouses: WarehouseDto[] = [];
            if (item.QUANTY || item.PRIHOD) {
                const minFromWarehouse = item.MINSOSKL ? item.MINSOSKL : 1;
                const prices: PriceDto[] = times(5)
                    .slice(1)
                    .map((i) => {
                        const currentQuantity = parseInt(item['QUANTY_' + i]);
                        return [
                            {
                                value: item['PRICE_' + i],
                                min: minFromWarehouse > currentQuantity ? minFromWarehouse : currentQuantity,
                                max: i == 5 ? 0 : parseInt(item['QUANTY_' + (i + 1)]) - 1,
                                currency: this.getCurrency().id,
                                isOrdinary: false,
                            },
                            {
                                value: retail['PRICE_' + i],
                                min: minFromWarehouse > currentQuantity ? minFromWarehouse : currentQuantity,
                                max: i == 5 ? 0 : parseInt(retail['QUANTY_' + (i + 1)]) - 1,
                                currency: this.getCurrency().id,
                                isOrdinary: true,
                            },
                        ];
                    })
                    .flat();
                if (item.QUANTY) {
                    warehouses.push({
                        name: 'CENTER',
                        deliveryTime: this.getSupplier().deliveryTime,
                        multiple: parseInt(item.KRATNOST),
                        quantity: parseInt(item.QUANTY),
                        prices,
                    });
                }
                if (item.PRIHOD) {
                    const days = Math.round(
                        DateTime.fromFormat(item.PRIHOD_DATE, 'dd.LL').diff(DateTime.now(), 'days').days,
                    );
                    warehouses.push({
                        name: 'TRANSIT',
                        deliveryTime: this.getSupplier().deliveryTime + days,
                        multiple: parseInt(item.KRATNOST),
                        quantity: parseInt(item.PRIHOD),
                        prices,
                    });
                }
            }
            return {
                updatedAt: new Date(),
                source: Source.Api,
                alias: item.NAME,
                code: item.NOM_N,
                supplier: this.getSupplier().id,
                parameters: [
                    { name: 'name', stringValue: item.NAME },
                    { name: 'producer', stringValue: item.MANUFAC },
                    { name: 'packageQuantity', numericValue: item.QUANTY_PACK, unit: this.parsers.getPiece().id },
                ],
                warehouses,
            };
        });
    }
}

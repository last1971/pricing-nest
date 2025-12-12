import { AbstractParser } from './abstract.parser';
import { GoodDto } from '../../good/dtos/good.dto';
import { firstValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { Source } from '../../good/dtos/source.enum';
import { PriceDto } from '../../good/dtos/price.dto';
import { times, isString } from 'lodash';
import { WarehouseDto } from '../../good/dtos/warehouse.dto';
import { DateTime } from 'luxon';

export class PlatanParser extends AbstractParser {
    getAlias(): string {
        return 'platan';
    }

    getCurrencyAlfa(): string {
        return 'RUB';
    }

    async getResponse(): Promise<Observable<AxiosResponse<any, any>>> {
        const platan = await this.parsers.getVault().get('platan');
        return this.parsers.getHttp().get(platan.URL as string, {
            params: { search: this.search },
            transformResponse: (data) => data,
        });
    }
    async parseResponse(response: any): Promise<GoodDto[]> {
        const retails: Map<string, any> = new Map<string, any>();
        const fixJson = (str: string) => str.replace(/\/"(?![,}\]])/g, '\\"');
        let responseWithoutErrors;
        try {
            responseWithoutErrors = isString(response) ? JSON.parse(fixJson(response)) : response;
        } catch (e) {
            const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
            throw new Error(`retail JSON error at pos ${pos}: ${response.substring(pos - 30, pos + 30)}`);
        }
        const codes = responseWithoutErrors.items.map((item) => {
            const code: string = item.NOM_N.toString();
            retails.set(code, item);
            return code;
        });
        const platan = await this.parsers.getVault().get('platan');
        const sha1 = crypto
            .createHash('sha1')
            .update(platan.LOGIN + ';' + codes.join(';') + ';' + platan.PASS)
            .digest('hex')
            .toUpperCase();
        const url = new URL(platan.URL as string);
        url.searchParams.append('login', platan.LOGIN as string);
        codes.forEach((id) => url.searchParams.append('id', id));
        url.searchParams.append('sha1', sha1);
        const wholesales = await firstValueFrom(this.parsers.getHttp().get(url.toString(), { transformResponse: (data) => data }));
        let data;
        try {
            data = JSON.parse(fixJson(wholesales.data));
        } catch (e) {
            const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
            throw new Error(`wholesale JSON error at pos ${pos}: ${wholesales.data.substring(pos - 30, pos + 30)}`);
        }
        return data.items.map((item): GoodDto => {
            const retail = retails.get(item.NOM_N);
            const warehouses: WarehouseDto[] = [];
            if (item.QUANTY || item.PRIHOD) {
                const minFromWarehouse = item.MINSOSKL ? parseInt(item.MINSOSKL) : 1;
                const prices: PriceDto[] = times(6)
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
                        multiple: parseInt(item.KRATNOST) || 1,
                        quantity: parseInt(item.QUANTY),
                        options: {
                            location_id: 'Одинцово',
                        },
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
                        multiple: parseInt(item.KRATNOST) || 1,
                        quantity: parseInt(item.PRIHOD),
                        options: {
                            location_id: 'Транзит',
                        },
                        prices,
                    });
                }
            }
            return new GoodDto({
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
            });
        });
    }
}

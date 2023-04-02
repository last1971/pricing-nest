import { GoodDto } from '../../good/dtos/good.dto';
import { IApiParsers } from '../../interfaces/IApiParsers';
import { SupplierDto } from '../../supplier/supplier.dto';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { catchError, firstValueFrom, map, Observable } from 'rxjs';
import { Source } from '../../good/dtos/source.enum';
import { AxiosError, AxiosResponse } from 'axios';
import { CurrencyDto } from '../../currency/dto/currency.dto';
import { DateTime } from 'luxon';
import { ApiRequestStatDto } from '../../api-request-stat/api.request.stat.dto';

export abstract class AbstractParser {
    protected search: string;
    protected withCache: boolean;
    public constructor(priceRequest: PriceRequestDto, protected parsers: IApiParsers) {
        ({ search: this.search, withCache: this.withCache } = priceRequest);
    }
    abstract getAlias(): string;
    abstract getCurrencyAlfa(): string;
    abstract getResponse(): Observable<AxiosResponse<any, any>>;
    getSupplier(): SupplierDto {
        return this.parsers.getSuppliers().get(this.getAlias());
    }
    getCurrency(): CurrencyDto {
        return this.parsers.getCurrencies().get(this.getCurrencyAlfa());
    }
    abstract parseResponse(response: any): Promise<GoodDto[]>;
    async parse(): Promise<GoodDto[]> {
        const key = this.getAlias() + ' : ' + this.search;
        let response: GoodDto[];
        if (this.withCache) {
            response = await this.parsers.getCache().get<GoodDto[]>(key);
        }
        if (!response) {
            const dateTime = DateTime.now();
            let errorMessage = null;
            let isSuccess = true;
            response = await firstValueFrom(
                this.getResponse()
                    .pipe(map((res) => res.data))
                    .pipe(map(async (res) => await this.parseResponse(res)))
                    .pipe(
                        catchError(async (error: AxiosError) => {
                            errorMessage = error.message;
                            isSuccess = false;
                            return [];
                        }),
                    ),
            );
            const apiRequestStat: ApiRequestStatDto = {
                dateTime,
                duration: DateTime.now().diff(dateTime, 'milliseconds').milliseconds,
                supplier: this.getSupplier().id,
                search: this.search,
                isSuccess,
                errorMessage,
            };
            await this.parsers.getQueue().add('apiRequestStats', apiRequestStat);
            if (isSuccess) {
                await this.parsers.getCache().set(key, response);
                await this.parsers.getQueue().add('keys', key);
            }
        } else {
            response.forEach((good) => {
                good.source = Source.Cache;
            });
        }
        return response;
    }
}
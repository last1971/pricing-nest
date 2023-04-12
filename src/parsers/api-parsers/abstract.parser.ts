import { GoodDto } from '../../good/dtos/good.dto';
import { IApiParsers } from '../../interfaces/IApiParsers';
import { SupplierDto } from '../../supplier/supplier.dto';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { catchError, firstValueFrom, map, Observable } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { CurrencyDto } from '../../currency/dto/currency.dto';
import { DateTime } from 'luxon';
import { ApiRequestStatDto } from '../../api-request-stat/api.request.stat.dto';
import { ApiResponseDto } from './api.response.dto';
import { isEmpty } from 'lodash';

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
    getCacheKey(): string {
        return this.getAlias() + ' : ' + this.search;
    }
    async getFromDb(): Promise<GoodDto[]> {
        return this.parsers.getGoodService().find({
            alias: this.search,
            supplier: this.getSupplier().id,
        });
    }
    async getFromCache(response: ApiResponseDto): Promise<ApiResponseDto> {
        if (this.withCache && isEmpty(response.data)) {
            response.data = (await this.parsers.getCache().get<GoodDto[]>(this.getCacheKey())) ?? [];
            //response.data.forEach((good) => {
            //    good.source = Source.Cache;
            //});
        }
        return response;
    }
    async checkError(response: ApiResponseDto): Promise<ApiResponseDto> {
        if (await this.parsers.getCache().get<string>('error : ' + this.getAlias())) {
            response.data = await this.getFromDb();
        }
        return response;
    }
    async obtainError(error: AxiosError, response: ApiResponseDto) {
        response.errorMessage = error.message;
        response.isSuccess = false;
        await this.parsers
            .getCache()
            .set('error : ' + this.getAlias(), true, await this.parsers.getCache().get<number>('CACHE_ERROR_EXP'));
    }
    async saveStat(response: ApiResponseDto): Promise<void> {
        const apiRequestStat: ApiRequestStatDto = {
            dateTime: response.start,
            duration: DateTime.now().diff(response.start, 'milliseconds').milliseconds,
            supplier: this.getSupplier().id,
            search: this.search,
            isSuccess: response.isSuccess,
            errorMessage: response.errorMessage,
        };
        await this.parsers.getQueue().add('apiRequestStats', apiRequestStat);
    }
    async saveToCache(response: ApiResponseDto): Promise<void> {
        if (response.isSuccess) {
            await this.parsers.getCache().set(this.getCacheKey(), response);
            await this.parsers.getQueue().add('keys', this.getCacheKey());
        }
    }
    async getFromHttp(response): Promise<ApiResponseDto> {
        if (isEmpty(response.data)) {
            response.data = await firstValueFrom(
                this.getResponse()
                    .pipe(map((res) => res.data))
                    .pipe(map(async (res) => await this.parseResponse(res)))
                    .pipe(
                        catchError(async (error: AxiosError) => {
                            await this.obtainError(error, response);
                            return await this.getFromDb();
                        }),
                    ),
            );
            await this.saveStat(response);
            await this.saveToCache(response);
        }
        return response;
    }
    abstract parseResponse(response: any): Promise<GoodDto[]>;
    async parse(): Promise<GoodDto[]> {
        const response = new ApiResponseDto();
        await this.checkError(response);
        await this.getFromCache(response);
        await this.getFromHttp(response);
        return response.data;
    }
}

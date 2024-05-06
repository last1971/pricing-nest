import { GoodDto } from '../../good/dtos/good.dto';
import { IApiParsers } from '../../interfaces/IApiParsers';
import { SupplierDto } from '../../supplier/supplier.dto';
import { PriceRequestDto } from '../../price/dtos/price.request.dto';
import { catchError, firstValueFrom, map, Observable } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { CurrencyDto } from '../../currency/dto/currency.dto';
import { DateTime, Duration } from 'luxon';
import { ApiRequestStatDto } from '../../api-request-stat/api.request.stat.dto';
import { ApiResponseDto } from './api.response.dto';
import { Source } from '../../good/dtos/source.enum';
import { MAIL_ERROR_MESSAGE } from '../../mail/mail.constants';

export abstract class AbstractParser {
    protected search: string;
    protected withCache: boolean;
    public constructor(
        priceRequest: PriceRequestDto,
        protected parsers: IApiParsers,
    ) {
        ({ search: this.search, withCache: this.withCache } = priceRequest);
    }
    abstract getAlias(): string;
    abstract getCurrencyAlfa(): string;
    abstract getResponse(): Observable<AxiosResponse<any, any>> | Promise<Observable<AxiosResponse<any, any>>>;
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
        if (this.withCache && !response.isFinished) {
            const result = await this.parsers.getCache().get<GoodDto[]>(this.getCacheKey());
            if (result) {
                response.data = result.map((good) => {
                    good = new GoodDto(good);
                    good.source = Source.Cache;
                    return good;
                });
                response.isFinished = true;
            }
        }
        return response;
    }
    async checkError(response: ApiResponseDto): Promise<ApiResponseDto> {
        if (await this.parsers.getCache().get<string>('error : ' + this.getAlias())) {
            response.data = await this.getFromDb();
            response.isFinished = true;
        }
        return response;
    }
    async obtainError(error: Error, response: ApiResponseDto) {
        const coeff = await this.parsers.getStatService().todayErrorCount(this.getSupplier());
        response.errorMessage = error.message;
        response.isSuccess = false;
        const milliseconds = (await this.parsers.getConfigService().get<number>('CACHE_ERROR_EXP')) * coeff;
        const time = DateTime.now();
        const exp = time.plus(Duration.fromObject({ milliseconds }));
        await this.parsers.getCache().set('error : ' + this.getAlias(), true, milliseconds);
        await this.parsers.getQueue().add(MAIL_ERROR_MESSAGE, {
            time: time.toLocaleString(DateTime.DATETIME_FULL),
            duration: exp.toLocaleString(DateTime.DATETIME_FULL),
            error: error.message,
            module: this.getAlias().toUpperCase() + ' parser',
        });
        this.parsers.getLogger().error(`Api request to ${this.getAlias()} response error: ${error.message}`);
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
            await this.parsers.getCache().set(this.getCacheKey(), response.data);
            await this.parsers.getQueue().add('keys', this.getCacheKey());
        }
    }
    async getFromHttp(response): Promise<ApiResponseDto> {
        if (!response.isFinished) {
            response.data = await firstValueFrom(
                (await this.getResponse())
                    .pipe(
                        map((res) => {
                            return res.data;
                        }),
                    )
                    .pipe(
                        map(async (res) => {
                            try {
                                return await this.parseResponse(res);
                            } catch (error) {
                                this.parsers.getLogger().debug(res);
                                await this.obtainError(error, response);
                                return await this.getFromDb();
                            }
                        }),
                    )
                    .pipe(
                        catchError(async (error: AxiosError) => {
                            await this.obtainError(error, response);
                            return await this.getFromDb();
                        }),
                    ),
            );
            response.isFinished = true;
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

import { GoodDto } from '../good/dtos/good.dto';
import { IParsers } from '../interfaces/IParsers';
import { SupplierDto } from '../supplier/supplier.dto';
import { PriceRequestDto } from '../price/dtos/price.request.dto';
import { catchError, firstValueFrom, map } from 'rxjs';
import { Source } from '../good/dtos/source.enum';
import { AxiosError } from 'axios';
import { CurrencyDto } from '../currency/dto/currency.dto';

export abstract class AbstractParser {
    protected search: string;
    protected withCache: boolean;
    public constructor(priceRequest: PriceRequestDto, protected parsers: IParsers) {
        ({ search: this.search, withCache: this.withCache } = priceRequest);
    }
    abstract getAlias(): string;
    abstract getCurrencyAlfa(): string;
    abstract getUrl(): string;
    abstract getParams(): any;
    getSupplier(): SupplierDto {
        return this.parsers.getSuppliers().get(this.getAlias());
    }
    getCurrency(): CurrencyDto {
        return this.parsers.getCurrencies().get(this.getCurrencyAlfa());
    }
    abstract parseResponse(response: any): GoodDto[];
    async parse(): Promise<GoodDto[]> {
        const key = this.getAlias() + ' : ' + this.search;
        let response: GoodDto[];
        if (this.withCache) {
            response = await this.parsers.getCache().get<GoodDto[]>(key);
        }
        if (!response) {
            response = await firstValueFrom(
                this.parsers
                    .getHttp()
                    .post(this.getUrl(), this.getParams())
                    .pipe(map((res) => res.data))
                    .pipe(map((res) => this.parseResponse(res)))
                    .pipe(
                        catchError((error: AxiosError) => {
                            throw error.message;
                        }),
                    ),
            );
            await this.parsers.getCache().set(key, response);
            await this.parsers.getQueue().add('keys', key);
        } else {
            response.forEach((good) => {
                good.source = Source.Cache;
            });
        }
        return response;
    }
}

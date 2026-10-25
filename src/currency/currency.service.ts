import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Currency, CurrencyDocument } from './currency.schema';
import { Model } from 'mongoose';
import { CurrencyDto } from './dto/currency.dto';
import { plainToInstance } from 'class-transformer';
import { Cron } from '@nestjs/schedule';
import { CbrClient } from './cbr.client';

const RUB = 'RUB';

@Injectable()
export class CurrencyService {
    private readonly logger = new Logger(CurrencyService.name);
    private mapIdCurrencies: Map<string, CurrencyDto>;
    private mapAlfa3Currencies: Map<string, CurrencyDto>;

    constructor(
        @InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>,
        private readonly cbr: CbrClient,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.load();
        // Курса ещё не было (первый запуск после этой версии) — не ждать вечернего расписания
        if (Array.from(this.mapAlfa3Currencies.values()).some((c) => c.alfa3 !== RUB && !(c.rate > 0))) {
            await this.updateRates().catch((e) => this.logger.error(`ЦБ: курсы при старте не загружены: ${e.message}`));
        }
    }

    private async load(): Promise<void> {
        const currencies = await this.currencyModel.find();
        this.mapIdCurrencies = currencies.reduce(
            (map: Map<string, CurrencyDto>, currency) =>
                map.set(currency.id, plainToInstance(CurrencyDto, currency.toObject({ virtuals: true }))),
            new Map<string, CurrencyDto>(),
        );
        this.mapAlfa3Currencies = currencies.reduce(
            (map: Map<string, CurrencyDto>, currency) =>
                map.set(currency.alfa3, plainToInstance(CurrencyDto, currency.toObject({ virtuals: true }))),
            new Map<string, CurrencyDto>(),
        );
    }

    async all(): Promise<CurrencyDto[]> {
        return Array.from(this.mapAlfa3Currencies, ([, value]) => value);
    }

    async alfa3(alfa3: string): Promise<CurrencyDto> {
        return this.mapAlfa3Currencies.get(alfa3);
    }

    id(id: string): CurrencyDto {
        return this.mapIdCurrencies.get(id);
    }

    /**
     * Курсы ЦБ РФ в currencies.rate (рублей за единицу, RUB = 1). ЦБ публикует курс на завтра около 15:30–17:30
     * по Томску (сервер в Asia/Tomsk), поэтому 18:00 — уже завтрашний курс; прайсы поставщиков идут позже вечером.
     * Валюта, которой нет у ЦБ, остаётся с прежним курсом (пишется в лог).
     */
    @Cron('0 0 18 * * *', { name: 'currencyRates' })
    async updateRates(): Promise<CurrencyDto[]> {
        const { date, rates } = await this.cbr.rates();
        for (const currency of this.mapAlfa3Currencies.values()) {
            const rate = currency.alfa3 === RUB ? 1 : rates.get(currency.alfa3);
            if (!(rate > 0)) {
                this.logger.warn(`ЦБ: нет курса ${currency.alfa3}, остаётся ${currency.rate ?? 'пусто'}`);
                continue;
            }
            await this.currencyModel.updateOne({ alfa3: currency.alfa3 }, { rate, rateDate: date });
        }
        await this.load();
        return this.all();
    }
}

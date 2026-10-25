import { Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { CurrencyDto } from './dto/currency.dto';

@ApiTags('currency')
@Controller('currency')
export class CurrencyController {
    constructor(private readonly service: CurrencyService) {}

    @ApiOperation({ summary: 'Валюты с курсом ЦБ РФ (rate — рублей за единицу, rateDate — дата курса)' })
    @ApiOkResponse({ isArray: true, type: CurrencyDto })
    @Get()
    async all(): Promise<CurrencyDto[]> {
        return this.service.all();
    }

    @ApiOperation({ summary: 'Обновить курсы с ЦБ РФ сейчас (обычно — по расписанию в 18:00)' })
    @ApiOkResponse({ isArray: true, type: CurrencyDto })
    @Post('rates')
    async updateRates(): Promise<CurrencyDto[]> {
        return this.service.updateRates();
    }
}

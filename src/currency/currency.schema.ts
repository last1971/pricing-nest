import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CurrencyDocument = HydratedDocument<Currency>;
@Schema({ timestamps: true })
export class Currency {
    @Prop({ required: true, unique: true })
    alfa3: string;

    @Prop({ required: true, unique: true })
    number3: string;

    @Prop({ required: true })
    name: string;

    /** Курс ЦБ РФ: рублей за одну единицу валюты (у RUB — 1); пусто, пока ни разу не обновлялся */
    @Prop()
    rate?: number;

    /** На какую дату курс ЦБ */
    @Prop()
    rateDate?: Date;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);

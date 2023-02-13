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
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Currency } from '../../currency/currency.schema';

@Schema()
export class Price {
    @Prop({ required: true, sparse: true })
    value: number;

    @Prop({ required: true, sparse: true })
    min: number;

    @Prop({ required: true, sparse: true })
    max: number;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Currency' })
    currency: Currency;
}

export const PriceSchema = SchemaFactory.createForClass(Price);

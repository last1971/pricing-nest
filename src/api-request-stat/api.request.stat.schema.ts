import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Supplier } from '../supplier/supplier.schema';
import { DateTime } from 'luxon';

export type ApiRequestStatDocument = HydratedDocument<ApiRequestStat>;
@Schema()
export class ApiRequestStat {
    @Prop({ type: Types.ObjectId, required: true, ref: 'Supplier' })
    supplier: Supplier;
    @Prop({ required: true, default: true })
    isSuccess: boolean;
    @Prop({ required: false })
    errorMessage?: string;
    @Prop({ type: DateTime, required: true })
    dateTime: DateTime;
    @Prop({ required: true })
    duration: number;
    @Prop({ required: true })
    search: string;
}
export const ApiRequestStatSchema = SchemaFactory.createForClass(ApiRequestStat);

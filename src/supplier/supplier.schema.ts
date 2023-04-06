import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';

export type SupplierDocument = HydratedDocument<Supplier>;
@Schema({ timestamps: true })
export class Supplier {
    @Prop({ required: true, unique: true })
    alias: string;
    @Prop({ required: true })
    deliveryTime: number;
    @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
    supplierCodes?: any;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

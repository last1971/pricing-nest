import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SupplierDocument = HydratedDocument<Supplier>;
@Schema({ timestamps: true })
export class Supplier {
    @Prop({ required: true, unique: true })
    alias: string;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

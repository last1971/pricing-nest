import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Supplier } from '../../supplier/supplier.schema';
import { Warehouse, WarehouseSchema } from './warehouse.schema';
import { Parameter, ParameterSchema } from './parameter.schema';

export type GoodDocumnet = HydratedDocument<Good>;
@Schema()
export class Good {
    @Prop({ type: Types.ObjectId, required: true, ref: 'Supplier' })
    supplier: Supplier;

    @Prop({ required: true })
    code: string;

    @Prop({ required: true })
    alias: string;

    @Prop({ type: [WarehouseSchema], required: true })
    warehouses: Warehouse[];

    @Prop({ type: [ParameterSchema] })
    parameters?: Parameter[];
}

export const GoodSchema = SchemaFactory.createForClass(Good);

GoodSchema.index({ supplier: 1, code: 1 }, { unique: true });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Supplier } from '../../supplier/supplier.schema';
import { Warehouse, WarehouseSchema } from './warehouse.schema';
import { Parameter, ParameterSchema } from './parameter.schema';
import { Source } from '../dtos/source.enum';
import mongoose from 'mongoose';

export type GoodDocument = HydratedDocument<Good>;
@Schema({ timestamps: true, _id: false })
export class Good {
    @Prop({ required: true, unique: true })
    id: string;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Supplier' })
    supplier: Supplier;

    @Prop({ required: true })
    code: string;

    @Prop({ required: true, index: true })
    alias: string;

    @Prop({ type: String, enum: Source })
    source: Source;

    @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
    goodId?: any;

    @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
    rawResponse?: any;

    @Prop({ type: [WarehouseSchema], required: true })
    warehouses: Warehouse[];

    @Prop({ type: [ParameterSchema], required: false })
    parameters?: Parameter[];
}

const GoodSchema = SchemaFactory.createForClass(Good);

GoodSchema.index({ supplier: 1, code: 1 }, { unique: true });

export { GoodSchema };

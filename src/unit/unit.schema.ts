import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UnitDocument = HydratedDocument<Unit>;
@Schema({ timestamps: true })
export class Unit {
    @Prop({ unique: true, required: true })
    name: string;
    @Prop({ required: true, default: 1 })
    coefficient: number;

    @Prop({ required: true, default: true })
    isMultiply: boolean;

    @Prop({ type: Types.ObjectId, required: false, ref: 'Unit' })
    baseUnit?: Unit;
}

export const UnitSchema = SchemaFactory.createForClass(Unit);

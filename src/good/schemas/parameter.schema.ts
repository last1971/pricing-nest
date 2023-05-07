import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Unit } from '../../unit/unit.schema';

export type ParameterDocument = HydratedDocument<Parameter>;
@Schema({ _id: false })
export class Parameter {
    @Prop({ required: true })
    name: string;

    @Prop()
    stringValue?: string;

    @Prop()
    numericValue?: number;

    @Prop({ type: Types.ObjectId, required: false, ref: 'Unit' })
    unit?: Unit;
}

export const ParameterSchema = SchemaFactory.createForClass(Parameter);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Price, PriceSchema } from './price.schema';

@Schema()
export class Warehouse {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop({ required: true })
    deliveryTime: number;

    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true })
    multiple: number;

    @Prop({ type: [PriceSchema] })
    prices: Price[];
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

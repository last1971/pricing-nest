import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Price, PriceSchema } from '../../price/schemas/price.schema';

@Schema()
export class Warehouse {
    @Prop({ required: true, sparse: true })
    name: string;

    @Prop({ required: true })
    deliveryTime: number;

    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true })
    multiple: number;

    @Prop({ type: [PriceSchema], required: false })
    prices?: Price[];
}

export const WarehouseSchema = SchemaFactory.createForClass(Warehouse);

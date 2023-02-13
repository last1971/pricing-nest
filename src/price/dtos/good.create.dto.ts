import { Types } from 'mongoose';
import { WarehouseCreateDto } from './warehouse.create.dto';
import { ParameterCreateDto } from './parameter.create.dto';

export class GoodCreateDto {
    supplier: Types.ObjectId;
    code: string;
    alias: string;
    warehouses: WarehouseCreateDto[];
    parameters: ParameterCreateDto[];
}

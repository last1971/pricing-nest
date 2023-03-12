import { Types } from 'mongoose';
import { WarehouseCreateDto } from '../../price/dtos/warehouse.create.dto';
import { ParameterCreateDto } from '../../price/dtos/parameter.create.dto';

export class GoodCreateDto {
    supplier: Types.ObjectId;
    code: string;
    alias: string;
    warehouses: WarehouseCreateDto[];
    parameters: ParameterCreateDto[];
}

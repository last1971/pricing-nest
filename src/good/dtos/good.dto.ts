import { Source } from './source.enum';
import { WarehouseDto } from './warehouse.dto';
import { ParameterDto } from './parameter.dto';

export class GoodDto {
    supplier: string;
    code: string;
    goodId?: string | any;
    alias: string;
    source?: Source = Source.Db;
    warehouses: WarehouseDto[];
    parameters?: ParameterDto[];
    updatedAt: Date;
}

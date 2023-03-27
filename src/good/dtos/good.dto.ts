import { Source } from './source.enum';
import { WarehouseDto } from './warehouse.dto';
import { ParameterDto } from './parameter.dto';

export class GoodDto {
    supplier: string;
    code: string;
    alias: string;
    source?: Source = Source.Db;
    warehouses: WarehouseDto[];
    parameters?: ParameterDto[];
}

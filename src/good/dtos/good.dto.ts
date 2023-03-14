import { Source } from './source.enum';
import { WarehouseDto } from './warehouse.dto';

export class GoodDto {
    supplier: string;
    code: string;
    alias: string;
    source?: Source = Source.Db;
    warehouses: WarehouseDto[];
}

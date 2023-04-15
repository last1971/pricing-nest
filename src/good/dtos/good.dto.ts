import { Source } from './source.enum';
import { WarehouseDto } from './warehouse.dto';
import { ParameterDto } from './parameter.dto';
import { ISupplierable } from '../../interfaces/i.supplierable';

export class GoodDto implements ISupplierable {
    supplier: string;
    code: string;
    goodId?: string | any;
    alias: string;
    source?: Source = Source.Db;
    warehouses: WarehouseDto[];
    parameters?: ParameterDto[];
    updatedAt: Date;

    constructor(data?: Partial<GoodDto>) {
        (Object as any).assign(this, data);
    }
    getGoodId(): any {
        return this.goodId;
    }

    getSupplier(): string {
        return this.supplier;
    }

    setGoodId(goodId: string): void {
        this.goodId = goodId;
    }

    setSupplier(supplier: string) {
        this.supplier = supplier;
    }
}

import { Source } from './source.enum';
import { WarehouseDto } from './warehouse.dto';
import { ParameterDto } from './parameter.dto';
import { ISupplierable } from '../../interfaces/i.supplierable';
import * as crypto from 'crypto';

export class GoodDto implements ISupplierable {
    id: string;
    supplier: string;
    code: string;
    goodId?: string | any = null;
    alias: string;
    source?: Source = Source.Db;
    warehouses: WarehouseDto[];
    parameters?: ParameterDto[];
    updatedAt: Date;

    constructor(data?: Partial<GoodDto>) {
        if (data?.supplier && data?.code) {
            this.id =
                data.id ??
                crypto
                    .createHash('md5')
                    .update(data.supplier + data.code)
                    .digest('hex');
        }
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

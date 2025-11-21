import { Source } from './source.enum';
import { WarehouseDto } from './warehouse.dto';
import { ParameterDto } from './parameter.dto';
import { ISupplierable } from '../../interfaces/i.supplierable';
import * as crypto from 'crypto';
import { ApiProperty } from '@nestjs/swagger';

export class GoodDto implements ISupplierable {
    @ApiProperty({
        type: 'string',
        description: 'Good id (hash from code+supplier)',
        example: '3dc5e1cc1726a755a87eed94a4862228',
    })
    id: string;
    @ApiProperty({
        type: 'string',
        description: 'Supplier id. If request with supplierAlias than its id in supplierAlias system',
        example: '857',
    })
    supplier: string;
    @ApiProperty({
        type: 'string',
        description: 'Good code in supplier api or price-list',
        example: '1234567890',
    })
    code: string;
    @ApiProperty({
        type: 'string',
        required: false,
        description: 'If request with supplierAlias than its goodId in supplierAlias system',
        example: 'abcdefgh',
    })
    goodId?: string | any = null;
    @ApiProperty({
        type: 'string',
        required: false,
        description: 'Good name alias. Only digits and alphabet',
        example: 'max232cpe',
    })
    alias: string;
    @ApiProperty({
        enum: Source,
        description: 'Data type',
        example: Source.Db,
    })
    source?: Source = Source.Db;
    @ApiProperty({
        isArray: true,
        type: WarehouseDto,
        description: 'Warehouses',
    })
    warehouses: WarehouseDto[];
    @ApiProperty({
        isArray: true,
        type: ParameterDto,
        description: 'Parameters',
        required: false,
    })
    parameters?: ParameterDto[];
    @ApiProperty({
        type: Date,
        description: 'Last updated at',
        example: new Date(),
    })
    updatedAt: Date;

    rawResponse?: any;

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

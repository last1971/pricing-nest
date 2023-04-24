export class TradePriceDto {
    name: string;
    producer: string;
    case: string;
    remark: string;
    id: string;
    sellerGoodId: string;
    code: string;
    warehouseCode: string;
    goodId: number | null;
    sellerId: number;
    packageQuantity: number;
    multiplicity: number;
    quantity: number;
    minQuantity: number;
    maxQuantity: number;
    pos: boolean;
    price: number;
    CharCode: string;
    isInput: boolean;
    deliveryTime: number;
    isSomeoneElsesWarehouse: boolean;
    isApi: boolean;
    options: any;
    updatedAt: Date;
}

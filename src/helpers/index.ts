import { ISupplierable } from '../interfaces/i.supplierable';
import { SupplierDto } from '../supplier/supplier.dto';

export const alias = (s: string) => s.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g, '');

export class ApplySupplier implements ICommand {
    constructor(private supplierable: ISupplierable, private supplier?: SupplierDto) {}
    execute(): void {
        if (!this.supplier) {
            this.supplierable.setGoodId(null);
        }
        const goodId = this.supplierable.getGoodId();
        if (this.supplier && goodId) {
            this.supplierable.setGoodId(goodId[this.supplier.id]);
        }
        if (this.supplier && this.supplier.supplierCodes) {
            this.supplierable.setSupplier(this.supplier.supplierCodes[this.supplierable.getSupplier()]);
        }
    }
}

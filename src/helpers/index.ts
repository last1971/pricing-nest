import { ISupplierable } from '../interfaces/i.supplierable';
import { SupplierDto } from '../supplier/supplier.dto';

export const alias = (s: string) => s.replace(/[^а-яёА-ЯЁa-zA-Z0-9]/g, '');

// Для поставщиков, чьё API принимает только латинские партномера (getchips):
// если строка смешанная (латиница + кириллица) — выкидываем кириллицу, оставляя партномер;
// если только латиница ИЛИ только кириллица (+знаки) — возвращаем как есть.
export const dropCyrillicIfMixed = (s: string): string => {
    const hasLatin = /[a-zA-Z]/.test(s);
    const hasCyrillic = /[а-яёА-ЯЁ]/.test(s);
    if (hasLatin && hasCyrillic) {
        return s.replace(/[а-яёА-ЯЁ]/g, '').replace(/\s+/g, ' ').trim();
    }
    return s;
};

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

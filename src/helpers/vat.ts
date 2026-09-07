// Ставка НДС в России на дату. Та же таблица, что в VatHelper проекта Trade —
// при смене ставки править обе.
export function vatRate(date: Date = new Date()): number {
    if (date < new Date('2019-01-01')) return 18;
    if (date < new Date('2026-01-01')) return 20;
    return 22;
}

// Цена с НДС, округлённая до 4 знаков (как цены в прайсах поставщиков)
export function withVat(price: number, rate: number): number {
    return Math.round(price * (100 + rate) * 100) / 10000;
}

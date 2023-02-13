import { Injectable } from '@nestjs/common';
import { CurrencySeed } from '../currency/currency.seed';
import { SupplierSeed } from '../supplier/supplier.seed';
import { UnitSeed } from '../unit/unit.seed';

@Injectable()
export class SeedService implements ICommand {
    private services: ICommand[];
    constructor(currency: CurrencySeed, supplier: SupplierSeed, unit: UnitSeed) {
        this.services = [currency, supplier, unit];
    }

    async execute(): Promise<void> {
        await Promise.all(this.services.map((service: ICommand) => service.execute()));
    }
}

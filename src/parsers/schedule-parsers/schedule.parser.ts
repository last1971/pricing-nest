import { IScheduleParsers } from '../../interfaces/IScheduleParsers';
import { DateTime } from 'luxon';
import { SupplierDto } from '../../supplier/supplier.dto';
import { CurrencyDto } from '../../currency/dto/currency.dto';
import { UnitDto } from '../../unit/dtos/unit.dto';

export class ScheduleParser implements ICommand {
    protected supplierAlias: string;
    protected supplier: SupplierDto;
    protected currencyAlfa3: string;
    protected currency: CurrencyDto;
    protected piece: UnitDto;
    protected startTime: string;
    constructor(protected schedule: IScheduleParsers) {}
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected async start(): Promise<void> {
        this.schedule.getLog().log(`Start ${this.supplierAlias} parse`);
        this.startTime = DateTime.now().toISO();
        this.supplier = await this.schedule.getSuppliers().alias(this.supplierAlias);
        this.currency = await this.schedule.getCurrencies().alfa3(this.currencyAlfa3);
        this.piece = await this.schedule.getUnitService().name('штука');
    }
    protected async finish(): Promise<void> {
        const rancidGoods = await this.schedule
            .getGoods()
            .find({ updatedAt: { $lt: this.startTime }, supplier: this.supplier.id });
        await Promise.all(
            rancidGoods.map((rancidGood) => {
                rancidGood.warehouses = [];
                return this.schedule.getGoods().createOrUpdate(rancidGood);
            }),
        );
        this.schedule.getLog().log(`Finish ${this.supplierAlias} parse`);
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected async parse(): Promise<void> {}
    async execute(): Promise<void> {
        await this.start();
        await this.parse();
        await this.finish();
    }
}

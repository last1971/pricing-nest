import { AbstractStrategy } from './interfaces/AbstractStrategy';
import { PriceRequestDto } from './price.request.dto';

export class PriceStrategiesService implements ICommandWithResponse<AbstractStrategy[]> {
    private strategies: any = {};
    constructor(private readonly request: PriceRequestDto) {
        this.strategies = new Map();
    }
    execute(): AbstractStrategy[] {
        return this.request.suppliers.map((supplier: string) => new this.strategies[supplier](this.request));
    }
}

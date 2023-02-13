import { Price } from '../schemas/price.schema';
import { PriceRequestDto } from '../price.request.dto';

export abstract class AbstractStrategy implements ICommandWithResponse<Price[]> {
    constructor(private readonly request: PriceRequestDto) {}
    abstract execute(): Price[];
}

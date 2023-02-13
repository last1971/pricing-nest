import { PriceCreateDto } from './dtos/price.create.dto';

export class PriceCreateService implements ICommandWithResponse<PriceCreateDto> {
    constructor() {}

    execute(): PriceCreateDto {
        return undefined;
    }
}

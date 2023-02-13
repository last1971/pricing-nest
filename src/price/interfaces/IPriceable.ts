import { Price } from '../schemas/price.schema';

interface IPriceable {
    getPrices(): Price[];
}

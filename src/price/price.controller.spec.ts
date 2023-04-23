import { Test, TestingModule } from '@nestjs/testing';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { GoodDto } from '../good/dtos/good.dto';
import { SupplierService } from '../supplier/supplier.service';
import { CurrencyService } from '../currency/currency.service';
import { GoodService } from '../good/good.service';
import { PriceSetGoodIdDto } from './dtos/price.set.good.id.dto';

describe('PriceController', () => {
    let controller: PriceController;
    const setGood = jest.fn();
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PriceController],
            providers: [
                {
                    provide: PriceService,
                    useValue: {
                        getPrices: async () => [new GoodDto()],
                    },
                },
                {
                    provide: SupplierService,
                    useValue: {},
                },
                {
                    provide: CurrencyService,
                    useValue: {},
                },
                {
                    provide: GoodService,
                    useValue: { setGood },
                },
            ],
        }).compile();

        controller = module.get<PriceController>(PriceController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('get prices', async () => {
        const response = await controller.findAll({ search: '123', dbOnly: false, withCache: true });
        expect(response).toHaveProperty('request', { dbOnly: false, search: '123', withCache: true });
        expect(response).toHaveProperty('data');
        expect(response['data']).toHaveLength(1);
        expect(response['data'][0]).toBeInstanceOf(GoodDto);
    });

    it('setGood ', async () => {
        await controller.setGoodId(new PriceSetGoodIdDto());
        expect(setGood.mock.calls).toHaveLength(1);
    });
});

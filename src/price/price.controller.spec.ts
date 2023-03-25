import { Test, TestingModule } from '@nestjs/testing';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { GoodDto } from '../good/dtos/good.dto';

describe('PriceController', () => {
    let controller: PriceController;

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
            ],
        }).compile();

        controller = module.get<PriceController>(PriceController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('get prices', () => {
        const response = controller.findAll({ search: '123', dbOnly: false, withCache: true });
        expect(response).resolves.toStrictEqual([new GoodDto()]);
    });
});

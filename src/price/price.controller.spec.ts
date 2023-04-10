import { Test, TestingModule } from '@nestjs/testing';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { GoodDto } from '../good/dtos/good.dto';
import { SupplierService } from '../supplier/supplier.service';
import { PriceResponseDto } from './dtos/price.response.dto';

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
                {
                    provide: SupplierService,
                    useValue: {},
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
        expect(response).resolves.toStrictEqual(
            new PriceResponseDto({
                data: [new GoodDto()],
                request: { dbOnly: false, search: '123', withCache: true },
            }),
        );
    });
});

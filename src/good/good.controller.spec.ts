import { Test, TestingModule } from '@nestjs/testing';
import { GoodController } from './good.controller';
import { SetGoodIdDto } from './dtos/set.good.id.dto';
import { GoodService } from './good.service';

describe('GoodController', () => {
    let controller: GoodController;
    const setGood = jest.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GoodController],
            providers: [
                {
                    provide: GoodService,
                    useValue: { setGood },
                },
            ],
        }).compile();

        controller = module.get<GoodController>(GoodController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('setGood ', async () => {
        await controller.setGoodId(new SetGoodIdDto());
        expect(setGood.mock.calls).toHaveLength(1);
    });
});

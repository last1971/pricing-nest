import { Test, TestingModule } from '@nestjs/testing';
import { GoodController } from './good.controller';
import { SetGoodIdDto } from './dtos/set.good.id.dto';
import { GetRawResponseDto } from './dtos/get-raw-response.dto';
import { GoodService } from './good.service';
import { GoodDto } from './dtos/good.dto';

describe('GoodController', () => {
    let controller: GoodController;
    const setGood = jest.fn();
    const findByIds = jest.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GoodController],
            providers: [
                {
                    provide: GoodService,
                    useValue: { setGood, findByIds },
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

    it('getRawResponse should call findByIds with correct ids', async () => {
        const dto = new GetRawResponseDto();
        dto.ids = ['id1', 'id2'];
        const mockGoods: GoodDto[] = [
            { id: 'id1', code: 'code1', alias: 'alias1', supplier: 'supplier1', warehouses: [], updatedAt: new Date() } as GoodDto,
            { id: 'id2', code: 'code2', alias: 'alias2', supplier: 'supplier2', warehouses: [], updatedAt: new Date() } as GoodDto,
        ];
        findByIds.mockResolvedValue(mockGoods);

        const result = await controller.getRawResponse(dto);

        expect(findByIds).toHaveBeenCalledWith(dto.ids);
        expect(result).toEqual(mockGoods);
    });
});

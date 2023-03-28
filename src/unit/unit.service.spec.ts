import { Test, TestingModule } from '@nestjs/testing';
import { UnitService } from './unit.service';
import { Unit } from './unit.schema';
import { getModelToken } from '@nestjs/mongoose';

const findOne = jest.fn().mockResolvedValue({ toObject: () => ({}) });
describe('UnitService', () => {
    let service: UnitService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UnitService,
                {
                    provide: getModelToken(Unit.name),
                    useValue: {
                        findOne,
                    },
                },
            ],
        }).compile();

        service = module.get<UnitService>(UnitService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('test name', async () => {
        await service.name('test');
        expect(findOne.mock.calls[0]).toEqual([{ name: 'test' }]);
    });
});

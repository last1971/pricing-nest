import { Test, TestingModule } from '@nestjs/testing';
import { ApiRequestStatService } from './api-request-stat.service';
import { getModelToken } from '@nestjs/mongoose';
import { ApiRequestStat } from './api.request.stat.schema';
import { ApiRequestStatDto } from './api.request.stat.dto';
describe('ApiRequestStatService', () => {
    let service: ApiRequestStatService;
    const create = jest.fn();
    const aggregate = jest.fn().mockReturnValue([
        { _id: '1', duration: 1 },
        { _id: '2', duration: 2 },
    ]);

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiRequestStatService,
                {
                    provide: getModelToken(ApiRequestStat.name),
                    useValue: { create, aggregate },
                },
            ],
        }).compile();

        service = module.get<ApiRequestStatService>(ApiRequestStatService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('test create', async () => {
        await service.create(new ApiRequestStatDto());
        expect(create.mock.calls).toHaveLength(1);
    });

    it('test rate', async () => {
        const res = await service.duration();
        expect(aggregate.mock.calls).toEqual([
            [
                [
                    { $match: { isSuccess: true } },
                    {
                        $group: {
                            _id: '$supplier',
                            duration: { $avg: '$duration' },
                        },
                    },
                ],
            ],
        ]);
        expect(res).toEqual(new Map(Object.entries({ '1': 1, '2': 2 })));
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ApiRequestStatService } from './api-request-stat.service';
import { getModelToken } from '@nestjs/mongoose';
import { ApiRequestStat } from './api.request.stat.schema';
import { ApiRequestStatDto } from './api.request.stat.dto';

const create = jest.fn();
describe('ApiRequestStatService', () => {
    let service: ApiRequestStatService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiRequestStatService,
                {
                    provide: getModelToken(ApiRequestStat.name),
                    useValue: { create },
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
});

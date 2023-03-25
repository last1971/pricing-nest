import { Test, TestingModule } from '@nestjs/testing';
import { PriceService } from './price.service';
import { GoodService } from '../good/good.service';
import { ParsersService } from '../parsers/parsers.service';

describe('PriceService', () => {
    let service: PriceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PriceService,
                {
                    provide: GoodService,
                    useValue: {
                        search: async () => ['db'],
                    },
                },
                {
                    provide: ParsersService,
                    useValue: {
                        search: async () => ['api'],
                    },
                },
            ],
        }).compile();

        service = module.get<PriceService>(PriceService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('Test full search', async () => {
        const response = await service.getPrices({ search: '123', dbOnly: false, withCache: false });
        expect(response).toEqual(['db', 'api']);
    });

    it('Test db search', async () => {
        const response = await service.getPrices({ search: '123', dbOnly: true, withCache: true });
        expect(response).toEqual(['db']);
    });
});

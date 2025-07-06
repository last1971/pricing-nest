import { Test, TestingModule } from '@nestjs/testing';
import { TriggerParser } from './trigger.parser';

describe('TriggerParser', () => {
    let service: TriggerParser;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TriggerParser],
        }).compile();

        service = module.get<TriggerParser>(TriggerParser);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
}); 
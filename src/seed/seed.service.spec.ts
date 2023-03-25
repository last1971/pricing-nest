import { Test, TestingModule } from '@nestjs/testing';
import { SeedService } from './seed.service';
import { SupplierSeed } from '../supplier/supplier.seed';
import { CurrencySeed } from '../currency/currency.seed';
import { UnitSeed } from '../unit/unit.seed';

class MockCommand implements ICommand {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async execute() {}
}

const mockCommand = new MockCommand();

describe('SeedService', () => {
    let service: SeedService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SeedService,
                {
                    provide: SupplierSeed,
                    useValue: mockCommand,
                },
                {
                    provide: CurrencySeed,
                    useValue: mockCommand,
                },
                {
                    provide: UnitSeed,
                    useValue: mockCommand,
                },
            ],
        }).compile();

        service = module.get<SeedService>(SeedService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('test execute', () => {
        const res = service.execute();
        expect(res).resolves.toBeUndefined();
    });
});

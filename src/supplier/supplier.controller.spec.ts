import { Test, TestingModule } from '@nestjs/testing';
import { SupplierController } from './supplier.controller';
import { SupplierService } from './supplier.service';

describe('SupplierController', () => {
    let controller: SupplierController;
    const rate = jest.fn();

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SupplierController],
            providers: [
                {
                    provide: SupplierService,
                    useValue: { rate },
                },
            ],
        }).compile();

        controller = module.get<SupplierController>(SupplierController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('test rate', async () => {
        await controller.rate('alias');
        expect(rate.mock.calls).toHaveLength(1);
        expect(rate.mock.calls[0]).toEqual(['alias']);
    });
});

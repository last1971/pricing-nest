import { Test, TestingModule } from '@nestjs/testing';
import { SupplierCodesPipe } from './supplier.codes.pipe';
import { SupplierService } from '../supplier/supplier.service';
import { PriceRequestDto } from '../price/dtos/price.request.dto';

describe('SupplierCodesPipe', () => {
    let pipe: SupplierCodesPipe;
    let supplierService: SupplierService;

    const mockSupplier = {
        id: '6842f59262b30b353b57636b',
        alias: 'elcopro',
        supplierCodes: {
            '857': '6842f59262b30b353b57635b',
            '858': '6842f59262b30b353b576363',
            '2758': '6842f59262b30b353b57636c',
            '1068': '6842f59262b30b353b576361',
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SupplierCodesPipe,
                {
                    provide: SupplierService,
                    useValue: {
                        alias: jest.fn(),
                    },
                },
            ],
        }).compile();

        pipe = module.get<SupplierCodesPipe>(SupplierCodesPipe);
        supplierService = module.get<SupplierService>(SupplierService);
    });

    it('should be defined', () => {
        expect(pipe).toBeDefined();
    });

    it('should map supplier codes to internal IDs when supplierAlias and suppliers are provided', async () => {
        jest.spyOn(supplierService, 'alias').mockResolvedValue(mockSupplier as any);

        const input: PriceRequestDto = {
            search: 'test',
            supplierAlias: 'elcopro',
            suppliers: ['2758', '858'],
            withCache: true,
            dbOnly: false,
        };

        const result = await pipe.transform(input, {} as any);

        expect(supplierService.alias).toHaveBeenCalledWith('elcopro');
        expect(result.suppliers).toEqual([
            '6842f59262b30b353b57636c', // 2758 mapped
            '6842f59262b30b353b576363', // 858 mapped
        ]);
    });

    it('should use original code as fallback when code is not in supplierCodes', async () => {
        jest.spyOn(supplierService, 'alias').mockResolvedValue(mockSupplier as any);

        const input: PriceRequestDto = {
            search: 'test',
            supplierAlias: 'elcopro',
            suppliers: ['2758', '9999'], // 9999 not in supplierCodes
            withCache: true,
            dbOnly: false,
        };

        const result = await pipe.transform(input, {} as any);

        expect(result.suppliers).toEqual([
            '6842f59262b30b353b57636c', // 2758 mapped
            '9999', // 9999 fallback to original
        ]);
    });

    it('should not modify suppliers when supplierAlias is not provided', async () => {
        const input: PriceRequestDto = {
            search: 'test',
            suppliers: ['2758', '858'],
            withCache: true,
            dbOnly: false,
        };

        const result = await pipe.transform(input, {} as any);

        expect(supplierService.alias).not.toHaveBeenCalled();
        expect(result.suppliers).toEqual(['2758', '858']); // unchanged
    });

    it('should not modify suppliers when suppliers array is not provided', async () => {
        const input: PriceRequestDto = {
            search: 'test',
            supplierAlias: 'elcopro',
            withCache: true,
            dbOnly: false,
        };

        const result = await pipe.transform(input, {} as any);

        expect(supplierService.alias).not.toHaveBeenCalled();
        expect(result.suppliers).toBeUndefined();
    });

    it('should not modify suppliers when supplier is not found', async () => {
        jest.spyOn(supplierService, 'alias').mockResolvedValue(null);

        const input: PriceRequestDto = {
            search: 'test',
            supplierAlias: 'unknown',
            suppliers: ['2758', '858'],
            withCache: true,
            dbOnly: false,
        };

        const result = await pipe.transform(input, {} as any);

        expect(supplierService.alias).toHaveBeenCalledWith('unknown');
        expect(result.suppliers).toEqual(['2758', '858']); // unchanged
    });

    it('should not modify suppliers when supplierCodes is not defined', async () => {
        const supplierWithoutCodes = {
            id: '6842f59262b30b353b57636b',
            alias: 'elcopro',
        };
        jest.spyOn(supplierService, 'alias').mockResolvedValue(supplierWithoutCodes as any);

        const input: PriceRequestDto = {
            search: 'test',
            supplierAlias: 'elcopro',
            suppliers: ['2758', '858'],
            withCache: true,
            dbOnly: false,
        };

        const result = await pipe.transform(input, {} as any);

        expect(result.suppliers).toEqual(['2758', '858']); // unchanged
    });
});


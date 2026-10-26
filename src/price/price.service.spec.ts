import { Test, TestingModule } from '@nestjs/testing';
import { PriceService } from './price.service';
import { GoodService } from '../good/good.service';
import { ParsersService } from '../parsers/parsers.service';
import { CompelLiveParser } from '../parsers/api-parsers/compel.live.parser';
import { Source } from '../good/dtos/source.enum';

jest.mock('../parsers/api-parsers/compel.live.parser');
const liveParse = jest.fn();
(CompelLiveParser as jest.Mock).mockImplementation(() => ({ parse: liveParse }));
const findBySupplierCodes = jest.fn();

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
                        findBySupplierCodes,
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

    describe('live', () => {
        const dbGood = {
            code: '1185005',
            alias: 'CR2032',
            parameters: [{ name: 'name', stringValue: 'CR2032' }],
            warehouses: [{ name: 'CENTER', quantity: 79307, multiple: 1, deliveryTime: 12 }],
        };
        beforeEach(() => {
            liveParse.mockReset();
            findBySupplierCodes.mockReset();
            (CompelLiveParser as jest.Mock).mockClear();
        });

        it('API ответил — остаток живой, source=api; неизвестный код — null', async () => {
            findBySupplierCodes.mockResolvedValue([dbGood]);
            liveParse.mockResolvedValue([
                {
                    code: '1027088',
                    source: Source.Api,
                    warehouses: [{ name: 'CENTRE', quantity: 0, multiple: 1, deliveryTime: 13 }],
                },
                {
                    code: '1185005',
                    source: Source.Api,
                    warehouses: [{ name: 'CENTRE', quantity: 78965, multiple: 1, deliveryTime: 13 }],
                },
            ]);
            const result = await service.live('compel', ['1185005', 'nope']);
            expect(findBySupplierCodes).toHaveBeenCalledWith('compel', ['1185005', 'nope']);
            expect((CompelLiveParser as jest.Mock).mock.calls[0][0]).toMatchObject({
                search: 'CR2032',
                withCache: false,
            });
            expect(result).toEqual({
                '1185005': { warehouse: 'CENTRE', quantity: 78965, multiple: 1, deliveryTime: 13, source: 'api' },
                nope: null,
            });
        });

        it('API не ответил (парсер вернул базу или пусто) — остаток из суточного файла, source=db', async () => {
            findBySupplierCodes.mockResolvedValue([dbGood]);
            liveParse.mockResolvedValue([{ code: '1185005', source: Source.Db, warehouses: dbGood.warehouses }]);
            const result = await service.live('compel', ['1185005']);
            expect(result['1185005']).toEqual({
                warehouse: 'CENTER',
                quantity: 79307,
                multiple: 1,
                deliveryTime: 12,
                source: 'db',
            });
        });

        it('у поставщика без живого API — всегда из базы, парсер не создаётся', async () => {
            findBySupplierCodes.mockResolvedValue([dbGood]);
            const result = await service.live('promelec', ['1185005']);
            expect(CompelLiveParser).not.toHaveBeenCalled();
            expect(result['1185005'].source).toBe('db');
        });
    });
});

import { ISupplierable } from '../interfaces/i.supplierable';
import { ApplySupplier, dropCyrillicIfMixed } from './index';

describe('Test helpers', () => {
    it('ApplySupplier without supplier', () => {
        const supplierable: ISupplierable = {
            getSupplier: jest.fn(() => null),
            setSupplier: jest.fn(),
            getGoodId: jest.fn(),
            setGoodId: jest.fn(),
        };
        const command = new ApplySupplier(supplierable, null);
        command.execute();
        expect((supplierable.getSupplier as jest.Mock<any, any>).mock.calls).toHaveLength(0);
        expect((supplierable.getGoodId as jest.Mock<any, any>).mock.calls).toHaveLength(1);
        expect((supplierable.setSupplier as jest.Mock<any, any>).mock.calls).toHaveLength(0);
        expect((supplierable.setGoodId as jest.Mock<any, any>).mock.calls[0][0]).toBeNull();
    });

    it('ApplySupplier with empty supplier', () => {
        const supplierable: ISupplierable = {
            getSupplier: jest.fn(() => null),
            setSupplier: jest.fn(),
            getGoodId: jest.fn(),
            setGoodId: jest.fn(),
        };
        const command = new ApplySupplier(supplierable, {
            alias: '1',
            deliveryTime: 1,
            id: '1',
        });
        command.execute();
        expect((supplierable.getSupplier as jest.Mock<any, any>).mock.calls).toHaveLength(0);
        expect((supplierable.getGoodId as jest.Mock<any, any>).mock.calls).toHaveLength(1);
        expect((supplierable.setSupplier as jest.Mock<any, any>).mock.calls).toHaveLength(0);
        expect((supplierable.setGoodId as jest.Mock<any, any>).mock.calls).toHaveLength(0);
    });

    it('ApplySupplier with supplierCodes and goodId', () => {
        const supplierable: ISupplierable = {
            getSupplier: jest.fn(() => '1'),
            setSupplier: jest.fn(),
            getGoodId: jest.fn(() => ({ '1': '222' })),
            setGoodId: jest.fn(),
        };
        const command = new ApplySupplier(supplierable, {
            alias: '1',
            deliveryTime: 1,
            id: '1',
            supplierCodes: { '1': '111' },
        });
        command.execute();
        expect((supplierable.getSupplier as jest.Mock<any, any>).mock.calls).toHaveLength(1);
        expect((supplierable.getGoodId as jest.Mock<any, any>).mock.calls).toHaveLength(1);
        expect((supplierable.setSupplier as jest.Mock<any, any>).mock.calls).toHaveLength(1);
        expect((supplierable.setSupplier as jest.Mock<any, any>).mock.calls[0]).toContain('111');
        expect((supplierable.setGoodId as jest.Mock<any, any>).mock.calls).toHaveLength(1);
        expect((supplierable.setGoodId as jest.Mock<any, any>).mock.calls[0]).toContain('222');
    });

    describe('dropCyrillicIfMixed', () => {
        it('удаляет кириллицу из смешанной строки и схлопывает пробелы', () => {
            expect(dropCyrillicIfMixed('Микросхема C167CSL40MCAKXQLA2')).toEqual('C167CSL40MCAKXQLA2');
            expect(dropCyrillicIfMixed('разъем IDC-10F')).toEqual('IDC-10F');
            expect(dropCyrillicIfMixed('конденсатор 10 мкФ X7R')).toEqual('10 X7R');
        });

        it('оставляет как есть строку только из латиницы', () => {
            expect(dropCyrillicIfMixed('IDC-10F')).toEqual('IDC-10F');
            expect(dropCyrillicIfMixed('LM358N')).toEqual('LM358N');
        });

        it('оставляет как есть строку только из кириллицы (+знаки/цифры)', () => {
            expect(dropCyrillicIfMixed('конденсатор')).toEqual('конденсатор');
            expect(dropCyrillicIfMixed('резистор 10')).toEqual('резистор 10');
        });
    });
});

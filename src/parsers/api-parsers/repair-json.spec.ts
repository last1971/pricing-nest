import { repairSupplierJson } from './repair-json';

describe('repairSupplierJson', () => {
    it('чинит внутренние кавычки /"…/" внутри значения (кейс platan)', () => {
        const broken = '{"items":[{"NAME":"серия /"Classic/" жало"}]}';
        const data = repairSupplierJson(broken);
        expect(data.items[0].NAME).toEqual('серия "Classic" жало');
    });

    it('чинит внутреннюю кавычку прямо перед запятой (/",)', () => {
        const broken = '{"items":[{"NAME":"Набор /"конус/", подставка"}]}';
        const data = repairSupplierJson(broken);
        expect(data.items[0].NAME).toEqual('Набор "конус", подставка');
    });

    it('не портит валидный JSON со значением-URL, заканчивающимся на /', () => {
        const valid = '{"items":[{"SHOP":"http://soldering.com.tw/" }]}';
        const data = repairSupplierJson(valid);
        expect(data.items[0].SHOP).toEqual('http://soldering.com.tw/');
    });

    it('возвращает обычный валидный JSON без изменений', () => {
        const valid = '{"items":[{"NOM_N":"123","NAME":"LM358"}]}';
        expect(repairSupplierJson(valid)).toEqual({ items: [{ NOM_N: '123', NAME: 'LM358' }] });
    });

    it('чинит сырые \\r\\n внутри строкового литерала (кейс promelec)', () => {
        const broken = '[{"vendors":[{"comment":"Склад дистрибьютора.\r\n"}]}]';
        const data = repairSupplierJson(broken);
        expect(data[0].vendors[0].comment).toEqual('Склад дистрибьютора.\r\n');
    });

    it('чинит прочие управляющие символы через \\uXXXX', () => {
        const broken = '{"comment":"до\x00после"}';
        const data = repairSupplierJson(broken);
        expect(data.comment).toEqual('до\x00после');
    });

    it('чинит смешанный брак: и control-символы, и /" в одном ответе', () => {
        const broken = '[{"comment":"строка 1\r\nсерия /"Classic/""}]';
        const data = repairSupplierJson(broken);
        expect(data[0].comment).toEqual('строка 1\r\nсерия "Classic"');
    });

    it('пробрасывает ошибку, если JSON неустраним', () => {
        expect(() => repairSupplierJson('{"items": [')).toThrow();
    });
});

import { repairPlatanJson } from './platan.parser';

describe('repairPlatanJson', () => {
    it('чинит внутренние кавычки /"…/" внутри значения', () => {
        const broken = '{"items":[{"NAME":"серия /"Classic/" жало"}]}';
        const data = repairPlatanJson(broken);
        expect(data.items[0].NAME).toEqual('серия "Classic" жало');
    });

    it('чинит внутреннюю кавычку прямо перед запятой (/",)', () => {
        const broken = '{"items":[{"NAME":"Набор /"конус/", подставка"}]}';
        const data = repairPlatanJson(broken);
        expect(data.items[0].NAME).toEqual('Набор "конус", подставка');
    });

    it('не портит валидный JSON со значением-URL, заканчивающимся на /', () => {
        const valid = '{"items":[{"SHOP":"http://soldering.com.tw/" }]}';
        const data = repairPlatanJson(valid);
        expect(data.items[0].SHOP).toEqual('http://soldering.com.tw/');
    });

    it('возвращает обычный валидный JSON без изменений', () => {
        const valid = '{"items":[{"NOM_N":"123","NAME":"LM358"}]}';
        expect(repairPlatanJson(valid)).toEqual({ items: [{ NOM_N: '123', NAME: 'LM358' }] });
    });

    it('пробрасывает ошибку, если JSON неустраним', () => {
        expect(() => repairPlatanJson('{"items": [')).toThrow();
    });
});

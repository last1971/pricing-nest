import { ModelToDto } from './modelToDto';
import { IsNotEmpty } from 'class-validator';

class TestDto {
    @IsNotEmpty()
    test: string;
}

const toObject = () => {
    return { test: 'test' };
};
class TestDecorate {
    @ModelToDto(TestDto)
    async testOne(): Promise<any> {
        return { toObject };
    }
    @ModelToDto(TestDto)
    async testMany(): Promise<any> {
        return [{ toObject }, { toObject }];
    }
}
describe('ModelToDto Decorator', () => {
    let testDecorate: TestDecorate;
    beforeEach(() => {
        testDecorate = new TestDecorate();
    });
    it('Test single Model', async () => {
        const response = await testDecorate.testOne();
        expect(response).toEqual({ test: 'test' });
    });

    it('Test many Models', async () => {
        const response = await testDecorate.testMany();
        expect(response).toEqual([{ test: 'test' }, { test: 'test' }]);
    });
});

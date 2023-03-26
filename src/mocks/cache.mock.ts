import { GoodDto } from '../good/dtos/good.dto';

export const CacheSet = jest.fn();
export const CacheMock = {
    get: (key: string) => {
        switch (key) {
            case 'first : 123':
                return [{}];
            case 'test : 123':
                return [new GoodDto()];
            default:
                return null;
        }
    },
    set: CacheSet,
};

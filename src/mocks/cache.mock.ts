import { GoodDto } from '../good/dtos/good.dto';

export const CacheSet = jest.fn();
export const CacheDel = jest.fn();
export const CacheMock = {
    get: (key: string) => {
        switch (key) {
            case 'first : 123':
                return [{}];
            case 'test : 123':
                return [new GoodDto()];
            case 'error : third':
                return true;
            case 'error : compel':
                return { blockedUntil: '2026-03-16T14:30:00.000+03:00', error: 'Request timeout' };
            default:
                return null;
        }
    },
    del: CacheDel,
    set: CacheSet,
};

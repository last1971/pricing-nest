export const CacheSet = jest.fn();
export const CacheMock = {
    get: (key: string) => {
        return key === 'first : 123' ? [{}] : null;
    },
    set: CacheSet,
};

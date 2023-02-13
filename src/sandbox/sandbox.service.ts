import { Injectable } from '@nestjs/common';

interface Hz {
    method(): string;
}

abstract class HzClass implements Hz {
    constructor(protected readonly some: string) {}
    abstract method(): string;
}

class Hz1 extends HzClass {
    method(): string {
        return this.some;
    }
}

class Hz2 extends HzClass {
    method(): string {
        return 'class2';
    }
}

const uuu: any = { '1': Hz1, '2': Hz2 };

@Injectable()
export class SandboxService {
    private hzs: Map<string, HzClass>;
    constructor() {
        const b: Hz1 = new uuu['2'](2);
        console.log(b.method());
        this.hzs = new Map([['1', new Hz1('1')]]);
    }
    test(): void {}
}

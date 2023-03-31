import Bull from 'bull';

export class JobMock implements Bull.Job {
    attemptsMade: number;
    data: any;
    id: Bull.JobId;
    name: string;
    opts: Bull.JobOptions;
    queue: Bull.Queue<any>;
    returnvalue: any;
    stacktrace: string[];
    timestamp: number;

    discard(): Promise<void> {
        return Promise.resolve(undefined);
    }

    finished(): Promise<any> {
        return Promise.resolve(undefined);
    }

    getState(): Promise<Bull.JobStatus | 'stuck'> {
        return Promise.resolve(undefined);
    }

    isActive(): Promise<boolean> {
        return Promise.resolve(false);
    }

    isCompleted(): Promise<boolean> {
        return Promise.resolve(false);
    }

    isDelayed(): Promise<boolean> {
        return Promise.resolve(false);
    }

    isFailed(): Promise<boolean> {
        return Promise.resolve(false);
    }

    isPaused(): Promise<boolean> {
        return Promise.resolve(false);
    }

    isStuck(): Promise<boolean> {
        return Promise.resolve(false);
    }

    isWaiting(): Promise<boolean> {
        return Promise.resolve(false);
    }

    lockKey(): string {
        return '';
    }

    log(row: string): Promise<any> {
        return Promise.resolve(undefined);
    }

    moveToCompleted(returnValue?: string, ignoreLock?: boolean, notFetch?: boolean): Promise<[any, Bull.JobId] | null> {
        return Promise.resolve(undefined);
    }

    moveToFailed(errorInfo: { message: string }, ignoreLock?: boolean): Promise<[any, Bull.JobId] | null> {
        return Promise.resolve(undefined);
    }

    progress(): any;
    progress(value: any): Promise<void>;
    progress(value?: any): any {}

    promote(): Promise<void> {
        return Promise.resolve(undefined);
    }

    releaseLock(): Promise<void> {
        return Promise.resolve(undefined);
    }

    remove(): Promise<void> {
        return Promise.resolve(undefined);
    }

    retry(): Promise<void> {
        return Promise.resolve(undefined);
    }

    takeLock(): Promise<number | false> {
        return Promise.resolve(undefined);
    }

    toJSON(): {
        id: Bull.JobId;
        name: string;
        data: any;
        opts: Bull.JobOptions;
        progress: number;
        delay: number;
        timestamp: number;
        attemptsMade: number;
        failedReason: any;
        stacktrace: string[] | null;
        returnvalue: any;
        finishedOn: number | null;
        processedOn: number | null;
    } {
        return {
            attemptsMade: 0,
            data: undefined,
            delay: 0,
            failedReason: undefined,
            finishedOn: undefined,
            id: undefined,
            name: '',
            opts: undefined,
            processedOn: undefined,
            progress: 0,
            returnvalue: undefined,
            stacktrace: undefined,
            timestamp: 0,
        };
    }

    update(data: any): Promise<void> {
        return Promise.resolve(undefined);
    }
}

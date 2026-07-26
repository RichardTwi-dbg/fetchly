export class ApiError<TBody = unknown> extends Error {
    public readonly name = "ApiError";

    constructor(message: string, public readonly status: number, public readonly body: TBody, public readonly headers: Headers)
    {
        super(message);
    }
}

export class TimeoutError extends Error  {
    public readonly name = "TimeoutError";

    constructor(public readonly timeout: number)
    {
        super(`Request timed out after ${timeout}ms`);
    }
}
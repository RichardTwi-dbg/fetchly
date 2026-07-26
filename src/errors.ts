export class ApiError<TBody = unknown> extends Error {
    public readonly name = "ApiError";

    constructor(
        message: string,
        public readonly status: number,
        public readonly body: TBody,
        public readonly headers: Headers,
    ) {
        super(message);
    }
}
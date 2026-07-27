import type {
    FetchlyPlugin,
    Middleware,
    RetryOptions,
} from "../types.js";

interface ResolvedRetryOptions {
    count: number;
    delay: number;
    statuses: readonly number[];
}

const defaultRetryStatuses = [500, 502, 503, 504] as const;

function resolveRetryOptions(
    retry: RetryOptions | undefined,
): ResolvedRetryOptions | undefined {
    if (!retry) {
        return undefined;
    }

    const options: ResolvedRetryOptions = {
        count: retry.count,
        delay: retry.delay ?? 0,
        statuses: retry.statuses ?? defaultRetryStatuses,
    };

    if (!Number.isInteger(options.count) || options.count < 0) {
        throw new RangeError("Retry count must be a non-negative integer");
    }

    if (!Number.isFinite(options.delay) || options.delay < 0) {
        throw new RangeError("Retry delay must be a non-negative finite number");
    }

    return options;
}

function wait(delay: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

export function createRetryMiddleware(
    defaultOptions?: RetryOptions,
): Middleware {
    return async (context, next) => {
        const options = resolveRetryOptions(
            context.request.retry ?? defaultOptions,
        );

        if (!options) {
            return next();
        }

        for (let attempt = 0; ; attempt += 1) {
            const response = await next();

            if (!options.statuses.includes(response.status) || attempt >= options.count) {
                return response;
            }

            await wait(options.delay);
        }
    };
}

export function retry(options: RetryOptions): FetchlyPlugin {
    return {
        name: "retry",
        install(client) {
            client.use(createRetryMiddleware(options));
        },
    };
}

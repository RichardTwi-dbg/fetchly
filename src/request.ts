import { ApiError, TimeoutError } from "./errors.js";
import type { InternalInterceptorManager } from "./interceptors.js";
import type {
    InterceptorRequest,
    JsonValue,
    QueryValue,
    RetryOptions,
} from "./types.js";

interface RequestConfig extends Omit<InterceptorRequest, "headers"> {
    clientHeaders?: HeadersInit;
    headers?: HeadersInit;
}

interface RequestInterceptors {
    request: InternalInterceptorManager<InterceptorRequest>;
    response: InternalInterceptorManager<Response>;
}

interface ResolvedRetryOptions {
    count: number;
    delay: number;
    statuses: readonly number[];
}

const defaultRetryStatuses = [500, 502, 503, 504] as const;

function createUrl(baseUrl: string | undefined, path: string, query: Record<string, QueryValue> | undefined): string {
    const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}` : path;

    if (!query) {
        return url;
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) 
    {
        if (value !== null && value !== undefined) 
        {
            params.set(key, String(value));
        }
    }

    const queryString = params.toString();
    return queryString ? `${url}${url.includes("?") ? "&" : "?"}${queryString}` : url;
}

function createHeaders(clientHeaders: HeadersInit | undefined, requestHeaders: HeadersInit | undefined, body: JsonValue | undefined): Headers {
    const headers = new Headers(clientHeaders);

    new Headers(requestHeaders).forEach((value, key) => {
        headers.set(key, value);
    });

    if (!headers.has("accept")) {
        headers.set("accept", "application/json");
    }

    if (body !== undefined && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
    }

    return headers;
}

function validateTimeout(timeout: number | undefined): void {
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0)) {
        throw new RangeError("Timeout must be a non-negative finite number");
    }
}

function resolveRetryOptions(retry: RetryOptions | undefined): ResolvedRetryOptions {
    const options: ResolvedRetryOptions = {
        count: retry?.count ?? 0,
        delay: retry?.delay ?? 0,
        statuses: retry?.statuses ?? defaultRetryStatuses,
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

async function fetchWithTimeout(config: InterceptorRequest): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;

    const forwardAbort = () => {
        controller.abort(config.signal?.reason);
    };

    if (config.signal?.aborted) {
        forwardAbort();
    } else {
        config.signal?.addEventListener("abort", forwardAbort, { once: true });
    }

    const timeoutId = config.timeout === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, config.timeout);

    try {
        return await fetch(createUrl(config.baseUrl, config.path, config.query), {
            method: config.method,
            headers: config.headers,
            body: config.body === undefined ? undefined : JSON.stringify(config.body),
            signal: controller.signal,
        });
    } catch (error) {
        if (timedOut && config.timeout !== undefined) {
            throw new TimeoutError(config.timeout);
        }

        throw error;
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }

        config.signal?.removeEventListener("abort", forwardAbort);
    }
}

async function parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("application/json") ? response.json() : response.text();
}

export async function request<T>(config: RequestConfig, interceptors: RequestInterceptors): Promise<T> {
    const interceptedConfig = await interceptors.request.apply({
        baseUrl: config.baseUrl,
        method: config.method,
        path: config.path,
        query: config.query,
        headers: createHeaders(config.clientHeaders, config.headers, config.body),
        body: config.body,
        signal: config.signal,
        timeout: config.timeout,
        retry: config.retry,
    });

    validateTimeout(interceptedConfig.timeout);
    const retry = resolveRetryOptions(interceptedConfig.retry);

    let response: Response;

    for (let attempt = 0; ; attempt += 1) {
        response = await fetchWithTimeout(interceptedConfig);
        response = await interceptors.response.apply(response);

        if (!retry.statuses.includes(response.status) || attempt >= retry.count) {
            break;
        }

        await wait(retry.delay);
    }

    const body = await parseBody(response);

    if (!response.ok) {
        throw new ApiError(
            `Request failed with status ${response.status}`,
            response.status,
            body,
            response.headers,
        );
    }

    return body as T;
}

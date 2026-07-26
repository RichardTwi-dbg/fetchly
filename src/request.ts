import { ApiError, TimeoutError} from "./errors.js";
import type { HttpMethod, JsonValue, QueryValue, RequestOptions } from "./types.js";

interface RequestConfig extends RequestOptions {
    baseUrl?: string;
    clientHeaders?: HeadersInit;
    method: HttpMethod;
    path: string;
    timeout?: number;
}

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

    if (!queryString)
    {
        return url;
    }

    return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

function createHeaders(clientHeaders: HeadersInit | undefined, requestHeaders: HeadersInit | undefined, body: JsonValue | undefined): Headers {
    const headers = new Headers(clientHeaders);

    new Headers(requestHeaders).forEach((value, key) => {
        headers.set(key, value);
    });

    if (!headers.has("accept"))
    {
        headers.set("accept", "application/json");
    }

    if (body !== undefined && !headers.has("content-type"))
    {
        headers.set("content-type", "application/json");
    }

    return headers;
}

function validateTimeout(timeout: number | undefined): void {
    if (timeout !== undefined  && (!Number.isFinite(timeout) || timeout < 0))
    {
        throw new RangeError("Timeout must be a non-negative finite number");
    }
}

async function parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json"))
    {
        return response.json();
    }

    return response.text();
}

export async function request<T>(config:RequestConfig): Promise<T> {
    const headers = createHeaders(
        config.clientHeaders,
        config.headers,
        config.body
    );

    validateTimeout(config.timeout);

    const controller = new AbortController();
    let bTimedOut = false;

    const forwardAbort = () => {
        controller.abort(config.signal?.reason);
    };

    if (config.signal?.aborted)
    {
        forwardAbort();
    } else 
    {
        config.signal?.addEventListener("abort", forwardAbort, {once:true});
    }

    const iTimeOutId = config.timeout === undefined ? undefined : setTimeout(() => {
        bTimedOut = true;
        controller.abort();
    }, config.timeout);

    let response: Response;

    try {
        response = await fetch(createUrl(config.baseUrl, config.path, config.query), {
            method: config.method,
            headers,
            body: config.body === undefined ? undefined : JSON.stringify(config.body),
            signal: controller.signal,
        });
    } catch (error)
    {
        if (bTimedOut && config.timeout !== undefined)
        {
            throw new TimeoutError(config.timeout);
        }

        throw error;
    } finally {
        if (iTimeOutId !== undefined)
        {
            clearTimeout(iTimeOutId);
        }

        config.signal?.removeEventListener("abort", forwardAbort);
    }

    const body  = await parseBody(response);

    if (!response.ok)
    {
        throw new ApiError(
            `Request failed with status ${response.status}`,
            response.status,
            body,
            response.headers,
        );
    }

    return body as T;
}
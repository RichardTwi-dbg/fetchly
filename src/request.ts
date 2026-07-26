import { ApiError, TimeoutError} from "./errors.js";
import type { HttpMethod, InterceptorRequest, JsonValue, QueryValue, RequestOptions } from "./types.js";
import type { InternalInterceptorManager } from "./interceptors.js";

interface RequestConfig extends Omit<InterceptorRequest, "headers"> {
    clientHeaders?: HeadersInit;
    headers?: HeadersInit;
}

interface RequestInterceptors {
    request: InternalInterceptorManager<InterceptorRequest>;
    response: InternalInterceptorManager<Response>;
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

export async function request<T>(config:RequestConfig, interceptors: RequestInterceptors): Promise<T> {
    const interceptedConfig = await interceptors.request.apply({
        baseUrl: config.baseUrl,
        method: config.method,
        path: config.path,
        query: config.query,
        headers: createHeaders(
            config.clientHeaders,
            config.headers,
            config.body,
        ),
        body: config.body,
        signal: config.signal,
        timeout: config.timeout
    })

    validateTimeout(interceptedConfig.timeout);

    const controller = new AbortController();
    let bTimedOut = false;

    const forwardAbort = () => {
        controller.abort(interceptedConfig.signal?.reason);
    };

    if (interceptedConfig.signal?.aborted)
    {
        forwardAbort();
    } else 
    {
        interceptedConfig.signal?.addEventListener("abort", forwardAbort, {once:true});
    }

    const iTimeOutId = interceptedConfig.timeout === undefined ? undefined : setTimeout(() => {
        bTimedOut = true;
        controller.abort();
    }, interceptedConfig.timeout);

    let response: Response;

    try {
        response = await fetch(createUrl(interceptedConfig.baseUrl, interceptedConfig.path, interceptedConfig.query), {
            method: interceptedConfig.method,
            headers: interceptedConfig.headers,
            body: interceptedConfig.body === undefined ? undefined : JSON.stringify(interceptedConfig.body),
            signal: controller.signal,
        });
    } catch (error)
    {
        if (bTimedOut && interceptedConfig.timeout !== undefined)
        {
            throw new TimeoutError(interceptedConfig.timeout);
        }

        throw error;
    } finally {
        if (iTimeOutId !== undefined)
        {
            clearTimeout(iTimeOutId);
        }

        interceptedConfig.signal?.removeEventListener("abort", forwardAbort);
    }

    response = await interceptors.response.apply(response);

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

import { ApiError } from "./errors.js";
import type { HttpMethod, RequestOptions } from "./types.js";

interface RequestConfig extends RequestOptions {
    baseUrl?: string;
    method: HttpMethod;
    path: string;
}

function createUrl(baseUrl: string | undefined, path: string): string {
    if (!baseUrl)
    {
        return path;
    }

    return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
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
    const response = await fetch(createUrl(config.baseUrl, config.path), {
        method: config.method,
        signal: config.signal,
    });

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
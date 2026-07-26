import { request } from "./request.js";
import type { ApiClient, ClientOptions, HttpMethod, RequestOptions } from "./types.js";

export function createClient(options: ClientOptions = {}): ApiClient {
    const createMethod = (method: HttpMethod) => 
        <T>(path: string, requestOptions?: RequestOptions): Promise<T> =>
            request<T>({
                baseUrl: options.baseUrl,
                clientHeaders: options.headers,
                method,
                path,
                ...requestOptions
            });

    return {
        get: createMethod("GET"),
        post: createMethod("POST"),
        put: createMethod("PUT"),
        patch: createMethod("PATCH"),
        delete: createMethod("DELETE"),
    }
}
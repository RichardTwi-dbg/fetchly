import { createInterceptorManager } from "./interceptors.js";
import { request } from "./request.js";
import { InterceptorRequest, type ApiClient, type ClientOptions, type HttpMethod, type RequestOptions } from "./types.js";

export function createClient(options: ClientOptions = {}): ApiClient {
    const interceptors = {
        request: createInterceptorManager<InterceptorRequest>(),
        response: createInterceptorManager<Response>()
    }

    const createMethod = (method: HttpMethod) => 
        <T>(path: string, requestOptions?: RequestOptions): Promise<T> =>
            request<T>({
                baseUrl: options.baseUrl,
                clientHeaders: options.headers,
                timeout: options.timeout,
                retry: options.retry,
                method,
                path,
                ...requestOptions
            },
            interceptors
        );

    return {
        interceptors,
        get: createMethod("GET"),
        post: createMethod("POST"),
        put: createMethod("PUT"),
        patch: createMethod("PATCH"),
        delete: createMethod("DELETE"),
    }
}

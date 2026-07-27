import { createInterceptorManager } from "./interceptors.js";
import { createMiddlewareManager } from "./middleware.js";
import { createRetryMiddleware } from "./plugins/retry.js";
import { request } from "./request.js";
import { InterceptorRequest, type ApiClient, type ClientOptions, type FetchlyPlugin, type HttpMethod, type RequestOptions } from "./types.js";

export function createClient(options: ClientOptions = {}): ApiClient {
    const interceptors = {
        request: createInterceptorManager<InterceptorRequest>(),
        response: createInterceptorManager<Response>()
    }

    const middlewares = createMiddlewareManager();
    middlewares.use(createRetryMiddleware());

    const use = (plugin: FetchlyPlugin): void => {
        plugin.install(middlewares);
    };

    for (const plugin of options.plugins ?? []) {
        use(plugin);
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
            interceptors,
            middlewares,
        );

    return {
        interceptors,
        use,
        get: createMethod("GET"),
        post: createMethod("POST"),
        put: createMethod("PUT"),
        patch: createMethod("PATCH"),
        delete: createMethod("DELETE"),
    }
}

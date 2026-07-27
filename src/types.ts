export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean  | null | undefined;

export type JsonValue = | string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type Interceptor<T> = (value: T) => T | Promise<T>;

export interface RetryOptions {
    count: number;
    delay?: number;
    statuses?: readonly number[];
}

export interface JwtOptions {
    getAccessToken: () => string | undefined | Promise<string | undefined>;
    refreshToken: () => void | Promise<void>;
}

export interface RequestContext {
    request: InterceptorRequest;
    meta: Map<symbol, unknown>;
}

export type MiddlewareNext = () => Promise<Response>;

export type Middleware = (
    context: RequestContext,
    next: MiddlewareNext,
) => Promise<Response>;

export interface MiddlewareRegistry {
    use(middleware: Middleware): void;
}

export interface FetchlyPlugin {
    name: string;
    install(client: MiddlewareRegistry): void;
}

export interface ClientOptions {
    baseUrl?: string;
    headers?: HeadersInit;
    timeout?: number;
    retry?: RetryOptions;
    plugins?: readonly FetchlyPlugin[];
}

export interface RequestOptions {
    query?: Record<string, QueryValue>;
    headers?: HeadersInit;
    body?: JsonValue;
    signal?: AbortSignal;
    timeout?: number;
    retry?: RetryOptions;
}

export interface InterceptorRequest {
    baseUrl?: string;
    method: HttpMethod;
    path: string;
    query?: Record<string, QueryValue>;
    headers: Headers;
    body?: JsonValue;
    signal?: AbortSignal;
    timeout?: number;
    retry?: RetryOptions;
}

export interface InterceptorManager<T> {
    use(interceptor: Interceptor<T>): number;
    eject(id: number): void;
    clear(): void;
}

export interface ClientInterceptors {
    request: InterceptorManager<InterceptorRequest>;
    response: InterceptorManager<Response>;
}

export interface ApiClient{
    readonly interceptors: ClientInterceptors;

    use(plugin: FetchlyPlugin): void;

    get<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<T>;
    post<T>(path: string, options?: RequestOptions): Promise<T>;
    put<T>(path: string, options?: RequestOptions): Promise<T>;
    patch<T>(path: string, options?: RequestOptions): Promise<T>;
    delete<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<T>;
}

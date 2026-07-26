export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean  | null | undefined;

export type JsonValue = | string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type Interceptor<T> = (value: T) => T | Promise<T>;

export interface ClientOptions {
    baseUrl?: string;
    headers?: HeadersInit;
    timeout?: number;
}

export interface RequestOptions {
    query?: Record<string, QueryValue>;
    headers?: HeadersInit;
    body?: JsonValue;
    signal?: AbortSignal;
    timeout?: number;
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

    get<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<T>;
    post<T>(path: string, options?: RequestOptions): Promise<T>;
    put<T>(path: string, options?: RequestOptions): Promise<T>;
    patch<T>(path: string, options?: RequestOptions): Promise<T>;
    delete<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<T>;
}
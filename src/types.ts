export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean  | null | undefined;

export type JsonValue = | string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

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

export interface ApiClient{
    get<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<T>;

    post<T>(path: string, options?: RequestOptions): Promise<T>;
    put<T>(path: string, options?: RequestOptions): Promise<T>;
    patch<T>(path: string, options?: RequestOptions): Promise<T>;

    delete<T>(path: string, options?: Omit<RequestOptions, "body">): Promise<T>;
}
import type { Interceptor, InterceptorManager } from "./types.js";

export interface InternalInterceptorManager<T> extends InterceptorManager<T> {
    apply(value: T): Promise<T>;
}

export function createInterceptorManager<T>(): InternalInterceptorManager<T> {
    const handlers = new Map<number, Interceptor<T>>();
    let nextId = 0;

    return {
        use(interceptor) {
            const id = nextId++;
            handlers.set(id, interceptor);

            return id;
        },
        eject(id) {
            handlers.delete(id);
        },
        clear() {
            handlers.clear();
        },

        async apply(value) {
            let result = value;

            for (const interceptor of handlers.values())
            {
                result = await interceptor(result);
            }

            return result;
        },
    };
}
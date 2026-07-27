import type {
    Middleware,
    MiddlewareRegistry,
    RequestContext,
} from "./types.js";

export interface InternalMiddlewareManager extends MiddlewareRegistry {
    execute(
        context: RequestContext,
        transport: () => Promise<Response>,
    ): Promise<Response>;
}

export function createMiddlewareManager(): InternalMiddlewareManager {
    const middlewares: Middleware[] = [];

    return {
        use(middleware) {
            middlewares.push(middleware);
        },

        execute(context, transport) {
            const dispatch = (index: number): Promise<Response> => {
                const middleware = middlewares[index];

                if (!middleware) {
                    return transport();
                }

                return middleware(context, () => dispatch(index + 1));
            };

            return dispatch(0);
        },
    };
}

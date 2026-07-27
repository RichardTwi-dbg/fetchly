import { FetchlyPlugin, JwtOptions } from "../types.js";

const refreshedKey = Symbol("fetchly.jwt.refreshed");

export function jwt(options: JwtOptions): FetchlyPlugin {
    let refreshPromise: Promise<void> | undefined;

    function refresh(): Promise<void> {
        if (!refreshPromise)
        {
            refreshPromise = Promise.resolve(options.refreshToken()).finally(() => {
                refreshPromise = undefined;
            })
        }

        return refreshPromise;
    }

    async function applyToken(headers:Headers): Promise<void> {
        const token = await options.getAccessToken();

        if (token)
        {
            headers.set("Authorization", `Bearer ${token}`);
        }
    }

    return {
        name: "jwt",
        
        install(client) {
            client.use(async (context, next) => {
                await applyToken(context.request.headers);

                const response = await next();

                if (response.status !== 401)
                {
                    return response;
                }

                if (context.meta.has(refreshedKey))
                {
                    return response;
                }

                context.meta.set(refreshedKey, true);

                await refresh();
                await applyToken(context.request.headers);

                return next();
            });
        },
    };
}
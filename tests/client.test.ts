import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, createClient, jwt } from "../src/index.js";

describe("createClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds baseUrl and parses a JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: "John" }), {
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const api = createClient({ baseUrl: "/api" });
    const user = await api.get<{ id: number; name: string }>("/users/1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/1",
      expect.objectContaining({ method: "GET" }),
    );
    expect(user).toEqual({ id: 1, name: "John" });
  });

  it("sends query, headers and a JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1, name: "John" }), {
        headers: {
            "content-type": "application/json",
        },
        }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const api = createClient({
        baseUrl: "/api",
        headers: {
        Authorization: "Bearer initial-token",
        },
    });

    await api.post<{ id: number; name: string }>("/users", {
        query: { active: true, page: 1, ignored: undefined },
        headers: {
        Authorization: "Bearer request-token",
        },
        body: { name: "John" },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);

    expect(url).toBe("/api/users?active=true&page=1");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "John" }));
    expect(headers.get("authorization")).toBe("Bearer request-token");
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
  });

  it("applies request interceptors before sending the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const api = createClient({ baseUrl: "/api" });
    api.interceptors.request.use((config) => {
      config.headers.set("Authorization", "Bearer token");
      config.query = { source: "interceptor" };
      return config;
    });

    await api.get("/users");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/users?source=interceptor");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer token");
  });

  it("applies response interceptors before parsing the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        headers: { "content-type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const api = createClient();
    const responseInterceptor = vi.fn((response: Response) => response);
    api.interceptors.response.use(responseInterceptor);

    await api.get("/users/1");

    expect(responseInterceptor).toHaveBeenCalledTimes(1);
    expect(responseInterceptor).toHaveBeenCalledWith(expect.any(Response));
  });

  it("throws ApiError with the parsed error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const api = createClient();
    const error = await api.get("/missing").catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 404,
      body: { message: "Not found" },
    });
  });

  it("retries configured temporary server errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Service unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("Bad gateway", { status: 502 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 1 }), {
          headers: { "content-type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const api = createClient({ retry: { count: 2, delay: 0 } });
    const user = await api.get<{ id: number }>("/users/1");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(user).toEqual({ id: 1 });
  });

  it("does not retry statuses outside the retry list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("Not found", { status: 404 }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const api = createClient({ retry: { count: 3, delay: 0 } });
    await expect(api.get("/missing")).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("allows plugins to modify a request through middleware", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const api = createClient();
    api.use({
      name: "request-id",
      install(client) {
        client.use(async (context, next) => {
          context.request.headers.set("X-Request-Id", "test-id");
          return next();
        });
      },
    });

    await api.get("/users");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("x-request-id")).toBe("test-id");
  });

  it("refreshes a JWT token after 401 and retries the request", async () => {
    let accessToken = "expired-token";

    const refreshToken = vi.fn(async () => {
      accessToken = "fresh-token";
    });

    const fetchMock = vi.fn((_: string, init: RequestInit) => {
      const authorization = new Headers(init.headers).get("authorization");

      if (authorization === "Bearer expired-token") {
        return Promise.resolve(new Response(null, { status: 401 }));
      }

      return Promise.resolve(
        new Response(JSON.stringify({ id: 1 }), {
          headers: { "content-type": "application/json" },
        }),
      );
    });

    vi.stubGlobal("fetch", fetchMock);

    const api = createClient();

    api.use(jwt({
      getAccessToken: () => accessToken,
      refreshToken,
    }));

    const user = await api.get<{ id: number }>("/users/1");

    expect(user).toEqual({ id: 1 });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, secondRequest] = fetchMock.mock.calls[1] as [string, RequestInit];

    expect(
      new Headers(secondRequest.headers).get("authorization"),
    ).toBe("Bearer fresh-token");
  });

  it("does not refresh more than once for a request", async () => {
    const refreshToken = vi.fn(async () => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    const api = createClient();

    api.use(jwt({
      getAccessToken: () => "expired-token",
      refreshToken,
    }));

    await expect(api.get("/users/1")).rejects.toBeInstanceOf(ApiError);

    expect(refreshToken).toHaveBeenCalledTimes(1);
  });
});

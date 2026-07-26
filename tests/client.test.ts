import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "../src/index.js";

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
});
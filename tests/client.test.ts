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
});
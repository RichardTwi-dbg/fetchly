# Fetchly

Fetchly is a lightweight, type-safe HTTP client built on top of the native Fetch API.

It removes repetitive response handling while keeping the API close to `fetch`.

It shares nothing but the name with the similar npm package `fetchly`.

```ts
const response = await fetch("/api/users");

if (!response.ok) {
  throw new Error();
}

const users = await response.json();
```

With Fetchly:

```ts
const users = await api.get<User[]>("/users");
```

## Status

Fetchly is currently under active development.

## Features

- Type-safe request results
- `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` methods
- Configurable base URL
- Client-level and request-level headers
- Query parameters
- Automatic JSON serialization for request bodies
- Automatic JSON response parsing
- Typed API errors
- Request timeout support
- Request cancellation through `AbortSignal`
- ESM and CommonJS builds
- TypeScript declarations

## Installation

```bash
npm install @richardtwi-dbg/fetchly
```

## Basic usage

```ts
import { createClient } from "fetchly";

interface User {
  id: number;
  name: string;
}

const api = createClient({
  baseUrl: "/api",
});

const users = await api.get<User[]>("/users");

const user = await api.get<User>("/users/1");
```

## Client configuration

```ts
const api = createClient({
  baseUrl: "/api",
  headers: {
    Authorization: "Bearer token",
  },
  timeout: 10000,
});
```

Configuration options:

| Option | Type | Description |
|---|---|---|
| `baseUrl` | `string` | Prefix added to every request path |
| `headers` | `HeadersInit` | Headers sent with every request |
| `timeout` | `number` | Default timeout in milliseconds |

## Query parameters

```ts
const users = await api.get<User[]>("/users", {
  query: {
    page: 1,
    size: 50,
    active: true,
  },
});
```

The resulting request URL:

```txt
/api/users?page=1&size=50&active=true
```

Values equal to `null` or `undefined` are omitted.

## JSON request body

```ts
const user = await api.post<User>("/users", {
  body: {
    name: "John",
  },
});
```

Fetchly automatically:

- serializes the body with `JSON.stringify`
- sets `Content-Type: application/json`
- sets `Accept: application/json`

You can override default headers for an individual request:

```ts
const user = await api.post<User>("/users", {
  headers: {
    Authorization: "Bearer another-token",
  },
  body: {
    name: "John",
  },
});
```

Request headers take precedence over client headers.

## HTTP methods

```ts
api.get<User[]>("/users");

api.post<User>("/users", {
  body: { name: "John" },
});

api.put<User>("/users/1", {
  body: { name: "John Doe" },
});

api.patch<User>("/users/1", {
  body: { name: "Jane Doe" },
});

api.delete<void>("/users/1");
```

## Errors

Fetchly throws `ApiError` when the server responds with a non-success HTTP status.

```ts
import { ApiError } from "fetchly";

try {
  await api.get<User>("/users/1");
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status);
    console.log(error.body);
    console.log(error.headers);
  }
}
```

`ApiError` contains:

| Property | Description |
|---|---|
| `status` | HTTP response status |
| `body` | Parsed JSON body or response text |
| `headers` | Response headers |

## Timeout

Set a timeout for the whole client:

```ts
const api = createClient({
  baseUrl: "/api",
  timeout: 5000,
});
```

Or override it for one request:

```ts
await api.get<User[]>("/users", {
  timeout: 2000,
});
```

A timed-out request throws `TimeoutError`.

```ts
import { TimeoutError } from "fetchly";

try {
  await api.get<User[]>("/slow-endpoint");
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log(error.timeout);
  }
}
```

## Cancellation

Use a native `AbortController` to cancel a request.

```ts
const controller = new AbortController();

const request = api.get<User[]>("/users", {
  signal: controller.signal,
});

controller.abort();

await request;
```

## Development

Install dependencies:

```bash
npm install
```

Run type checks:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Build the package:

```bash
npm run build
```

## Roadmap

- [x] Request and response interceptors.
- [x] Retry support for temporary server errors
- [ ] JWT token refresh
- [ ] FormData upload support
- [ ] File download helpers
- [ ] Middleware API
- [ ] Cache support and TTL
- [ ] React hooks package
- [ ] OpenAPI client generation
- [ ] GitHub Actions CI
- [x] npm publishing and release automation

## License

MIT
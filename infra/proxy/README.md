# Carter browser engine

This independent service runs on port 3001, on a different origin from Carter Games. It uses the same unmodified Scramjet/Controller/Epoxy/Wisp components as 55GMS. Websites execute in this service's origin; they do not share Carter Games' local storage or API origin.

Install with `bun install --frozen-lockfile` in this directory and run `node server.mjs`. Run network policy tests with `node --test policy.test.mjs`. The main application's startup script starts the service automatically. Forward ports 3000 and 3001 publicly when sharing the application.

This service is AGPL-3.0-only. Its complete authored runtime sources, dependency lockfile, license, and this document are available publicly at `/source`. The main Carter Games application is a separate application that communicates with this service using window messages.

Unmodified corresponding upstream source:

- [Scramjet 2.0.67-alpha.2](https://github.com/MercuryWorkshop/scramjet/tree/c26bfc6d7f7c7f4dac52ce182a2ceab90e851823), including its Rust WASM source and build scripts.
- [Scramjet Controller 0.0.14 and Utils 0.0.3](https://github.com/MercuryWorkshop/scramjet/tree/c26bfc6d7f7c7f4dac52ce182a2ceab90e851823/packages).
- [Epoxy Transport 3.0.1](https://github.com/MercuryWorkshop/epoxy-transport) and [Epoxy TLS](https://github.com/MercuryWorkshop/epoxy-tls).
- [Wisp JS 0.5.0](https://github.com/MercuryWorkshop/wisp-client-js), LGPL-3.0.

Destinations must resolve entirely to public unicast addresses. Every socket validates and pins its destination independently, including mapped IPv6 and direct IP destinations. Only HTTP/HTTPS ports are accepted; private networks, metadata addresses, and UDP are unavailable. There is no public website blocklist. WebSocket origins and connection counts are checked before accepting a tunnel.

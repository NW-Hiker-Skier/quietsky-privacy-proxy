# Security Policy

## Reporting a vulnerability

Please report security issues privately by email to **support@getquietsky.app**
rather than opening a public issue. Include steps to reproduce and, if relevant,
the `x-quietsky-worker-version` header from an affected response so we can map it
to the exact deployed source.

We aim to acknowledge reports within 3 business days.

## Scope

This repository is the **privacy core** of the Quiet Sky weather proxy. The most
valuable reports concern the privacy guarantees this code makes:

- any path by which a client's IP, headers, cookies, user-agent, or identity
  could reach a weather provider or a cache key or a log line;
- any way to bypass the input validation, gates, or rate-limit backstop;
- any way a provider API key could be exposed.

Provider integration adapters (`src/adapters/`) are not included in the public
release; a SHA-256 manifest of them ships with each release. If you believe a
privacy invariant is violated *inside* a withheld adapter, report it — the
adapter contract hands an adapter only an allowlist-reduced URL (coordinates plus
the route's public query allowlist) and the Worker env, never the client Request,
headers, or identity, and we treat a breach of that contract as in scope.

## Not in scope

- Rate-limit thresholds (deliberately high and CGNAT-safe; a 429 requires
  scripted volume from a single IP).
- Cloudflare's own edge operational logs (~7-day platform retention, outside
  this Worker's control; disclosed in our privacy policy).

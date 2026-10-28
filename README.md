# Quiet Sky Privacy Proxy (Cloudflare Worker)

The privacy core of [Quiet Sky](https://getquietsky.app)'s weather proxy. Every
request from the Quiet Sky Android or iPhone app reaches weather providers only through this
Worker — and this code
is what guarantees **providers never receive your IP address, device headers,
cookies, or identity of any kind**.

## App privacy policy

Read the [published Quiet Sky Privacy Policy](https://getquietsky.app/Privacy)
for Android and iPhone, or the [matching policy copy in this repository](PRIVACY.md).

**This repository exists for verification, not reuse.** The privacy-relevant
core — identity stripping, cache-key construction, logging shape, gates, and
rate limiting — is public and inspectable. The provider integration adapters (`src/adapters/`) are proprietary
and excluded from the public release; a SHA-256 manifest of them is published
with each release so the withheld portion is versioned and tamper-evident. A
synthetic `example` adapter documents the full contract adapters must satisfy.

The manifest (`ADAPTERS.sha256`) hashes the six withheld sources: `foreca.ts`,
`sunsethue.ts`, `rainbow.ts`, `radar.ts`, and the private `adapters/index.ts` +
`bindings.ts` registry. Note that `src/adapters/index.ts` also appears in *this*
public tree — but as a **synthetic stub** (every provider returns
`provider_unavailable`), so it intentionally hashes differently from the withheld
registry the manifest lists.

## The trust boundary

```
 Android app ──▶ Cloudflare edge ──▶ THIS WORKER ──▶ weather providers
 (applies your   (sees your IP,       identity is      receive route data ONLY:
  location-       ~7-day platform     discarded here   the coordinates you sent,
  precision       edge logs, not      ─ the gate       allowlisted params, and a
  setting)        ours to disable)    block is the     server-side provider key —
                                      ONLY reader)     never your IP or identity
```

Two mechanically-enforced invariants — the shipped suite (`test/invariants.test.mjs`, run `npm test`) checks both:

1. **Identity is unreachable outside the gate.** `request.headers` is read only
   by the request-gate helpers near the top of `index.ts` (client-token gate,
   debug gate, presence-only adoption counter, rate-limit key). A source-scan
   test fails if any other code — core or adapter — touches the client request.
2. **Every authenticated upstream request is built from scratch** in one public
   chokepoint (`src/upstream.ts`). No code path copies inbound headers to an
   upstream request. Adapters declare *where* requests go and *how* they
   authenticate; they physically cannot attach what they never receive.

**What this proxy does NOT do: hide your location from providers.** A weather
provider needs coordinates to answer a weather query, and the app sends them so
your forecast is accurate. *Location precision is your choice* — the app applies
your on-device precision setting before the request ever leaves your phone, and
the proxy forwards exactly that. What the proxy strips is **identity** (IP,
device headers, cookies, user-agent, tokens), so a provider learns "someone
wants the weather near these coordinates" and nothing about who or what device
you are. Cache keys are rounded for cache-sharing efficiency (see below); that
rounding is a storage choice and never changes what a provider receives.

## Routes and what providers can see

Providers are disclosed, not discovered — the app attributes every provider in
its UI and Privacy Dashboard. Per-route policy (enforced by `ROUTE_REGISTRY` +
`validateRouteInput` + `buildCacheKey`):

| Route | Purpose | Coordinates to provider | Cache-key rounding |
|---|---|---|---|
| `GET /v1/forecast` | Weather forecast (Open-Meteo) | client-selected precision | ~1.1 km (2 dp) |
| `GET /v1/air-quality` | Air quality (Open-Meteo) | client-selected precision | ~1.1 km (2 dp) |
| `GET /v1/geocoding/search` | Place lookup (Open-Meteo) | search text only | normalized name |
| `GET /v1/foreca` | Weather forecast (Foreca, premium) | client-selected precision | ~1.1 km (2 dp) |
| `GET /v1/pirate` | Weather forecast (Pirate Weather) | client-selected precision | ~1.1 km (2 dp) |
| `GET /v1/aqi-anchor` | AQI anchor (IQAir) — *dormant, app uses Open-Meteo AQI* | client-selected precision | ~11 km (0.1°) |
| `GET /v1/sunset-quality` | Sunset quality (SunsetHue) | ~55 km bucket † | ~55 km bucket |
| `GET /v1/nowcast/rainbow/{lon}/{lat}` | Minute precipitation nowcast (Rainbow.ai) | client-supplied path coords | ~1.1 km + 10-min bucket |
| `GET /v1/radar-tile/{rainviewer\|iem}/{ts}/{z}/{x}/{y}.{png\|webp}` | Radar imagery (RainViewer / IEM-NOAA) | tile coordinates only | per tile, 120 s |
| `GET /v1/radar-frames[/rainviewer]` | Radar frames manifest | none | shared, 60 s |
| `GET /v1/build-status` | Test-build kill switch (Worker-local) | none | 300 s |

Providers receive the client-selected coordinate precision — the app applies
the user's location-precision setting on-device (default: full), and the proxy
forwards it unchanged so weather stays accurate. Cache-key rounding is a
separate, storage-side efficiency choice (nearby requests reuse one cached
payload) and never changes what a provider sees.

† **Sunset quality is the one route that sends a coarsened coordinate to its
provider** — a ~55 km bucket — because sunset quality is an inherently
wide-area phenomenon and the provider itself models on a coarse grid. This is a
data-granularity choice, not an identity measure.

The `x-quietsky-precision` response header (surfaced in the app's Privacy
Dashboard) reports each route's registry precision label. For `aqi-anchor` and
`nowcast/rainbow` that label names the cache-sharing grid; the provider still
receives the client-selected precision shown in the "Coordinates to provider"
column above. Only `sunset-quality` coarsens what the provider actually receives.

## What is cached, honestly

Short-lived weather payloads keyed by **grid-rounded coordinates + allowlisted
params** — a shared cache of "the weather at this ~1 km cell", never a user
database. Cache keys exclude IPs, user agents, cookies, tokens, raw URLs, and
any un-allowlisted parameter (tested). Durable KV entries self-expire on the
same TTLs. There is no user-linked record anywhere in this Worker.

## What is logged, honestly

Worker application logs are aggregate-only: `{day, provider, metric, value}`
counters plus provider-outcome diagnostics (status, duration, and a coarse
failure reason). No IPs, no coordinates, no URLs, no headers, no tokens. The
metric loggers never touch the client request; the one logging helper that does —
the token-presence counter — runs inside the gate and reads only WHETHER a client
token is present (a boolean), never its value or any identity. The full private
suite additionally feeds sentinel identity through every route class and fails if
any sentinel reaches a log line. No Logpush, no analytics store, no request journal.
Cloudflare's own edge retains standard operational logs (~7 days) under its
policy; that is disclosed in the privacy policy and is not something Worker code
can disable.

## Access controls

- **Client token** (`x-quietsky-client`; the legacy `x-aurora-client` is still
  accepted during a migration window): a rotatable app-build token counted
  (presence only) for adoption metrics; enforcement is a deliberate later
  cutover. It is an anti-abuse speed bump, not a user identity — one value is
  shared by every install of a given build.
- **Debug gate** (`x-quietsky-debug` vs the `QUIETSKY_DEBUG_TOKEN` secret): the only
  way to use diagnostic hooks (`fresh=1` cache bypass). Without the secret set,
  those hooks are inert and silently ignored.
- **Rate limiting**: per-IP, per-route-class backstop with deliberately high,
  CGNAT-safe thresholds (mobile carriers put thousands of users behind one IP).
  Fails open — it is an abuse backstop, not a correctness gate.
- **Input validation**: coordinates bounded to real-world ranges, tile z/x/y
  bounded to the tile grid, free text length-capped; malformed input is rejected
  with 400 before any cache or upstream work.
- Provider API keys live only in Worker secrets and are attached server-side by
  the constructors in `src/upstream.ts` (as a query parameter, request header, or
  bearer token, per each provider's API) — the client never holds or transmits a
  key, and this Worker writes no URLs to any log, so no key is ever logged.

## Mapping this source to production

Every response carries `x-quietsky-worker-version` with the git SHA its deploy was
built from (`wrangler deploy --var WORKER_VERSION:<sha>`), so any response can be
traced to the exact source that served it. `curl -sI https://<worker-host>/v1/build-status`
and compare against this tree.

## Verify it yourself

```bash
npm install
npm run typecheck
npm test          # builds, then runs test/invariants.test.mjs
```

`npm test` runs the shipped privacy-invariant suite against the stub adapter
registry: the chokepoint source-scan, the built-from-scratch upstream-header
check, the allowlist-only upstream-URL check, and the cache-key exclusion check —
the guarantees this README makes. Provider-behavior tests are **not** shipped
(they depend on the withheld adapters). Running a functional Worker additionally
requires writing your own adapters and a `wrangler.toml` for your own provider
accounts — this repo deliberately does not ship Quiet Sky's integrations.

## Secrets (names only; values never leave Cloudflare)

`FORECA_API_KEY`, `PIRATE_API_KEY`, `IQAIR_API_KEY`, `SUNSETHUE_API_KEY`,
`RAINBOW_API_KEY`, `OPEN_METEO_API_KEY` (optional), `QUIETSKY_CLIENT_TOKEN`
(optional gate), `QUIETSKY_DEBUG_TOKEN` (optional debug gate). Set via
`npx wrangler secret put <NAME>`. The public repo ships `wrangler.example.toml`
with placeholder bindings; production deploy config stays private.

## Deploying your own

This repo ships source + `wrangler.example.toml`, not a deploy wrapper. Provide
your own `wrangler.toml` (KV namespaces + bindings), set your provider secrets
(`npx wrangler secret put <NAME>`), write your own `src/adapters/`, and
`wrangler deploy --var WORKER_VERSION:<git sha>`. After deploying, `wrangler tail`
and confirm the new `x-quietsky-worker-version` is live before trusting it (stale
compiled artifacts have shadowed source before).

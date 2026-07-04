import { buildUpstreamUrl, buildUpstreamHeaders } from "./upstream.js";
import type { UpstreamBinding } from "./upstream.js";

import { ADAPTERS } from "./adapters/index.js";

type RateLimiterBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export interface Env {
  OPEN_METEO_UPSTREAM: string;
  OPEN_METEO_AIR_QUALITY_UPSTREAM: string;
  OPEN_METEO_GEOCODING_UPSTREAM: string;
  FORECA_UPSTREAM: string;
  PIRATE_UPSTREAM: string;
  IQAIR_UPSTREAM: string;
  SUNSETHUE_UPSTREAM: string;
  RAINVIEWER_UPSTREAM?: string;

  IEM_UPSTREAM?: string;

  RAINBOW_UPSTREAM?: string;
  RAINBOW_API_KEY?: string;
  OPEN_METEO_API_KEY?: string;
  FORECA_API_KEY?: string;
  PIRATE_API_KEY?: string;
  IQAIR_API_KEY?: string;
  SUNSETHUE_API_KEY?: string;

  EXAMPLE_API_KEY?: string;
  QUIETSKY_CLIENT_TOKEN?: string;

  QUIETSKY_DEBUG_TOKEN?: string;

  WORKER_VERSION?: string;
  BUILD_STATUS_KILLED_VERSION_CODES?: string;
  BUILD_STATUS_KILL_MESSAGE?: string;

  RL_GATED?: RateLimiterBinding;
  RL_TILE?: RateLimiterBinding;

  SUNSETHUE_CACHE?: KVNamespace;

  AQI_CACHE?: KVNamespace;

  RAINBOW_CACHE?: KVNamespace;

  FORECA_CACHE?: KVNamespace;
}

type Provider =
  | "open-meteo"
  | "open-meteo-air-quality"
  | "open-meteo-geocoding"
  | "foreca"
  | "pirate"
  | "iqair"
  | "iem"
  | "sunsethue"
  | "rainviewer"
  | "rainbow"
  | "build-status";

type RouteCategory = "forecast" | "air-quality" | "geocoding" | "supplemental" | "radar-tile" | "nowcast" | "internal";
type RoutePrecision =
  | "Client-selected forecast precision"
  | "Coordinate ~1 km grid"
  | "Coordinate ~11 km grid"
  | "Bucket ~55 km"
  | "Search text only"
  | "Tile coordinate"
  | "None";
type RouteKind = "json-proxy" | "foreca-merged" | "sunset-quality" | "radar-tile" | "radar-frames" | "build-status";

export type RouteConfig = {
  id: string;
  path: string;
  kind: RouteKind;
  provider: Provider;
  purpose: string;
  category: RouteCategory;
  precision: RoutePrecision;
  cacheTtlSeconds: number;
  queryAllowlist: readonly string[];

  secretRequired?: boolean;

  kvCache?: boolean;

  keyCoarsenDegrees?: number;
};

const WEATHER_QUERY_ALLOWLIST = [
  "latitude",
  "longitude",
  "current",
  "hourly",
  "daily",
  "minutely_15",
  "temperature_unit",
  "wind_speed_unit",
  "precipitation_unit",
  "timezone",
  "forecast_days",
  "hourly_steps",
  "daily_steps",
  "units",
  "exclude",
] as const;

const AQI_QUERY_ALLOWLIST = [
  "latitude",
  "longitude",
  "current",
  "hourly",
  "forecast_hours",
  "timezone",
] as const;

const GEOCODING_QUERY_ALLOWLIST = [
  "name",
  "count",
  "language",
  "format",
] as const;

export const RAINBOW_CACHE_TTL_SECONDS = 600;

const ROUTES = [
  {
    id: "forecast",
    path: "/v1/forecast",
    kind: "json-proxy",
    provider: "open-meteo",
    purpose: "weather forecast",
    category: "forecast",
    precision: "Client-selected forecast precision",
    cacheTtlSeconds: 300,
    queryAllowlist: WEATHER_QUERY_ALLOWLIST,
  },
  {
    id: "air-quality",
    path: "/v1/air-quality",
    kind: "json-proxy",
    provider: "open-meteo-air-quality",
    purpose: "air quality",
    category: "air-quality",

    precision: "Client-selected forecast precision",
    cacheTtlSeconds: 300,
    queryAllowlist: AQI_QUERY_ALLOWLIST,
  },
  {
    id: "geocoding-search",
    path: "/v1/geocoding/search",
    kind: "json-proxy",
    provider: "open-meteo-geocoding",
    purpose: "place lookup",
    category: "geocoding",
    precision: "Search text only",
    cacheTtlSeconds: 3600,
    queryAllowlist: GEOCODING_QUERY_ALLOWLIST,
  },
  {
    id: "foreca",
    path: "/v1/foreca",
    kind: "foreca-merged",
    provider: "foreca",
    secretRequired: true,
    purpose: "weather forecast",
    category: "forecast",
    precision: "Client-selected forecast precision",
    cacheTtlSeconds: 300,
    queryAllowlist: WEATHER_QUERY_ALLOWLIST,
  },
  {
    id: "pirate",
    path: "/v1/pirate",
    kind: "json-proxy",
    provider: "pirate",
    secretRequired: true,
    purpose: "weather forecast",
    category: "forecast",
    precision: "Client-selected forecast precision",
    cacheTtlSeconds: 300,
    queryAllowlist: WEATHER_QUERY_ALLOWLIST,
  },
  {
    id: "aqi-anchor",
    path: "/v1/aqi-anchor",
    kind: "json-proxy",
    provider: "iqair",
    secretRequired: true,
    purpose: "air quality anchor",
    category: "air-quality",
    precision: "Coordinate ~11 km grid",
    cacheTtlSeconds: 300,
    kvCache: true,
    keyCoarsenDegrees: 0.1,
    queryAllowlist: ["latitude", "longitude"] as const,
  },
  {
    id: "sunset-quality",
    path: "/v1/sunset-quality",
    kind: "sunset-quality",
    provider: "sunsethue",
    secretRequired: true,
    purpose: "sunset quality",
    category: "supplemental",
    precision: "Bucket ~55 km",
    cacheTtlSeconds: 300,
    queryAllowlist: ["latitude", "longitude", "date", "dateLocal"] as const,
  },
  {
    id: "radar-tile",
    path: "/v1/radar-tile",
    kind: "radar-tile",
    provider: "rainviewer",
    purpose: "radar tile",
    category: "radar-tile",
    precision: "Tile coordinate",
    cacheTtlSeconds: 120,
    queryAllowlist: [] as const,
  },
  {
    id: "radar-frames",
    path: "/v1/radar-frames",
    kind: "radar-frames",
    provider: "rainviewer",
    purpose: "radar frames manifest",
    category: "radar-tile",
    precision: "None",
    cacheTtlSeconds: 60,
    queryAllowlist: [] as const,
  },
  {
    id: "nowcast-rainbow",
    path: "/v1/nowcast/rainbow",
    kind: "json-proxy",
    provider: "rainbow",
    purpose: "minute precipitation nowcast",
    category: "nowcast",
    precision: "Coordinate ~1 km grid",
    cacheTtlSeconds: RAINBOW_CACHE_TTL_SECONDS,
    queryAllowlist: ["start_timestamp"] as const,
  },
  {
    id: "build-status",
    path: "/v1/build-status",
    kind: "build-status",
    provider: "build-status",
    purpose: "build status",
    category: "internal",
    precision: "None",
    cacheTtlSeconds: 300,
    queryAllowlist: ["versionCode"] as const,
  },
] satisfies readonly RouteConfig[];

export const ROUTE_REGISTRY: readonly RouteConfig[] = ROUTES;

const ROUTES_BY_PATH = new Map<string, RouteConfig>(ROUTES.map((route) => [route.path, route]));
const CORS_HEADERS = {
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "x-quietsky-client, x-aurora-client",
};

export type SunsetBucket = {
  latitude: number;
  longitude: number;
};

export type SunsetQualityResult =
  | { ok: true; normalized: SunsetHueNormalized }
  | { ok: false; status: number };

export type RainbowNowcastPath = {
  longitude: string;
  latitude: string;
};

export type AdapterRegistry = {
  bindings: Record<string, UpstreamBinding>;
  forecaMergedResponse: (url: URL, env: Env) => Promise<Response>;
  sunsetQuality: (bucket: SunsetBucket, dateLocal: string, env: Env) => Promise<SunsetQualityResult>;
  rainbowUpstreamUrl: (path: RainbowNowcastPath, startTimestamp: string | null, env: Env) => URL;
  radarFramesMetadataUrl: (env: Env) => URL;
  radarTileUrl: (tile: RadarTileRequest, env: Env) => Promise<URL | null>;
};

const RAINBOW_PATH_RE = /^\/v1\/nowcast\/rainbow\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/;

export function parseRainbowNowcastPath(pathname: string): RainbowNowcastPath | null {
  const match = pathname.match(RAINBOW_PATH_RE);
  if (!match) return null;
  return { longitude: match[1], latitude: match[2] };
}

export function rainbowCacheKey(path: RainbowNowcastPath, nowSeconds: number): string {
  const lon = roundToNowcastGrid(path.longitude);
  const lat = roundToNowcastGrid(path.latitude);
  const bucket = Math.floor(nowSeconds / RAINBOW_CACHE_TTL_SECONDS) * RAINBOW_CACHE_TTL_SECONDS;
  return `https://quietsky-cache.local/nowcast/rainbow/${lon}/${lat}/${bucket}`;
}

function roundToNowcastGrid(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return (Math.round(n * 100) / 100).toFixed(2);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    let response: Response;
    try {
      response = await handleRequest(request, env, ctx);
    } catch {

      response = withCors(new Response(JSON.stringify({ error: "internal_error" }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      }));
    }

    response.headers.set("x-quietsky-worker-version", env.WORKER_VERSION || "dev");

    mirrorLegacyResponseHeaders(response.headers);
    return response;
  },
};

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return withCors(new Response("Method Not Allowed", { status: 405 }));
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith("/v1/radar-tile/")) {
      const tileLimited = await checkRateLimit(request, env, "tile");
      if (tileLimited) return tileLimited;
      return fetchRadarTile(url, env, ctx);
    }
    if (url.pathname === "/v1/radar-frames/rainviewer" || url.pathname === "/v1/radar-frames") {
      const framesLimited = await checkRateLimit(request, env, "tile");
      if (framesLimited) return framesLimited;
      return fetchRadarFrames(env, ctx);
    }

    const unauthorized = validateClientToken(request, env);
    if (unauthorized) return unauthorized;

    const limited = await checkRateLimit(request, env, "gated");
    if (limited) return limited;

    const allowFresh = isDebugAuthorized(request, env);

    if (url.pathname.startsWith("/v1/nowcast/rainbow/")) {
      logTokenPresence(request);
      return fetchRainbowNowcast(url, env, ctx);
    }

    const route = routeByPath(url.pathname);
    if (!route) {
      return withCors(new Response("Not Found", { status: 404 }));
    }

    if (route.kind === "radar-tile") {
      return withCors(routeError(route, "invalid_request", 400));
    }

    logTokenPresence(request);

    const invalidInput = validateRouteInput(url, route);
    if (invalidInput) return withCors(invalidInput);

    const routeUrl = reduceUrlToAllowlist(url, route);

    if (route.kind === "build-status") {
      return withCors(buildStatusResponse(routeUrl, env, route));
    }

    if (route.kind === "sunset-quality") {
      return fetchSunsetHueQuality(routeUrl, env, ctx, route);
    }

    const missingSecret = missingRequiredSecret(route, env);
    if (missingSecret) {

      logConfigError(route.provider, missingSecret);
      return withCors(routeError(route, "provider_unavailable", 502));
    }

    if (route.kind === "foreca-merged") {
      return fetchForecaCachedRoute(routeUrl, env, ctx, route, allowFresh);
    }

    return fetchCachedJsonRoute(routeUrl, env, ctx, route, allowFresh);
}

export function routeByPath(path: string): RouteConfig | undefined {
  return ROUTES_BY_PATH.get(path);
}

export function buildRadarTileCacheKey(args: RadarTileRequest): string {
  return `https://quietsky-cache.local/radar-tile/${args.provider}/${args.timestamp}/${args.z}/${args.x}/${args.y}.${args.format}`;
}

function mirrorLegacyResponseHeaders(headers: Headers): void {
  const twins: Array<[string, string]> = [];
  headers.forEach((value, key) => {
    if (key.startsWith("x-quietsky-")) {
      twins.push([`x-aurora-${key.slice("x-quietsky-".length)}`, value]);
    }
  });
  for (const [name, value] of twins) headers.set(name, value);
}

function validateClientToken(request: Request, env: Env): Response | null {
  const expectedClientToken = env.QUIETSKY_CLIENT_TOKEN;
  if (typeof expectedClientToken === "string" && expectedClientToken.length > 0) {
    if (providedClientToken(request) !== expectedClientToken) {
      return withCors(new Response("Unauthorized", { status: 401 }));
    }
  }
  return null;
}

function providedClientToken(request: Request): string {
  return request.headers.get("x-quietsky-client")
    ?? request.headers.get("x-aurora-client")
    ?? "";
}

function isDebugAuthorized(request: Request, env: Env): boolean {
  const expected = env.QUIETSKY_DEBUG_TOKEN;
  if (typeof expected !== "string" || expected.length === 0) return false;
  const provided = request.headers.get("x-quietsky-debug")
    ?? request.headers.get("x-aurora-debug");
  return provided === expected;
}

function logTokenPresence(request: Request): void {
  const present = providedClientToken(request).length > 0;
  console.log(JSON.stringify({
    day: new Date().toISOString().slice(0, 10),
    metric: present ? "token_present" : "token_absent",
    value: 1,
  }));
}

function logConfigError(provider: Provider, detail: string): void {
  console.log(JSON.stringify({
    day: new Date().toISOString().slice(0, 10),
    provider,
    metric: "config_error",
    detail,
    value: 1,
  }));
}

async function checkRateLimit(
  request: Request,
  env: Env,
  routeClass: "gated" | "tile",
): Promise<Response | null> {
  const limiter = routeClass === "tile" ? env.RL_TILE : env.RL_GATED;
  if (!limiter) return null;
  const key = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const { success } = await limiter.limit({ key });
    if (success) return null;
  } catch {
    return null;
  }
  return withCors(new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: { "content-type": "application/json; charset=utf-8" },
  }));
}

function validateRouteInput(url: URL, route: RouteConfig): Response | null {
  const parseCoord = (raw: string | null): number =>
    raw === null || raw.trim() === "" ? Number.NaN : Number(raw);

  if (route.queryAllowlist.includes("latitude")) {
    const lat = parseCoord(url.searchParams.get("latitude"));
    const lon = parseCoord(url.searchParams.get("longitude"));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
        !Number.isFinite(lon) || lon < -180 || lon > 180) {
      return routeError(route, "invalid_coordinates", 400);
    }
  }

  if (route.category === "geocoding") {

    const name = url.searchParams.get("name") ?? "";
    if (name.length > 200) {
      return routeError(route, "invalid_query", 400);
    }
    const countRaw = url.searchParams.get("count");
    if (countRaw !== null) {
      const count = Number(countRaw);
      if (!Number.isInteger(count) || count < 1 || count > 100) {
        return routeError(route, "invalid_query", 400);
      }
    }
  }

  const boundedParams: ReadonlyArray<readonly [string, number, number]> = [
    ["forecast_days", 1, 16],
    ["forecast_hours", 1, 384],
    ["hourly_steps", 1, 384],
    ["daily_steps", 1, 16],
  ];
  for (const [key, min, max] of boundedParams) {
    if (!route.queryAllowlist.includes(key)) continue;
    const raw = url.searchParams.get(key);
    if (raw === null) continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      return routeError(route, "invalid_query", 400);
    }
  }

  for (const key of route.queryAllowlist) {
    const value = url.searchParams.get(key);
    if (value !== null && value.length > 1024) {
      return routeError(route, "invalid_query", 400);
    }
  }

  return null;
}

async function fetchCachedJsonRoute(
  url: URL,
  env: Env,
  ctx: ExecutionContext,
  route: RouteConfig,
  allowFresh: boolean,
): Promise<Response> {
  const dayBucket = new Date().toISOString().slice(0, 10);
  const cacheKey = buildCacheKey(url, route);
  const cache = caches.default;
  const cacheRequest = new Request(cacheKey, { method: "GET" });
  const kv = route.kvCache ? env.AQI_CACHE : undefined;

  const forceFresh = allowFresh && url.searchParams.get("fresh") === "1";

  if (!forceFresh) {

    const cachedResponse = await cache.match(cacheRequest);
    if (cachedResponse) {
      logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
      logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: route.provider });
      const response = new Response(cachedResponse.body, cachedResponse);
      applyRouteHeaders(response.headers, route, "CACHED");
      return withCors(response);
    }

    if (kv) {
      const envelope = await readKvCache(kv, cacheKey);
      if (envelope && !isAtOrAfter(new Date(), envelope.expiresAtUtc)) {
        const response = kvCachedJsonResponse(envelope, route);
        ctx.waitUntil(cache.put(cacheRequest, response.clone()));
        logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
        logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: route.provider });
        return withCors(response);
      }

      const lockKey = `${cacheKey}::lock`;
      const gotLock = await acquireKvLock(kv, lockKey);
      if (!gotLock) {
        const coalesced = await awaitKvCache(kv, cacheKey);
        if (coalesced && !isAtOrAfter(new Date(), coalesced.expiresAtUtc)) {
          const response = kvCachedJsonResponse(coalesced, route);
          ctx.waitUntil(cache.put(cacheRequest, response.clone()));
          logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
          logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: route.provider });
          return withCors(response);
        }

      }
    }
  }

  const start = Date.now();
  let upstreamResponse = await fetchStandardUpstream(url, env, route);

  if (!upstreamResponse.ok && route.secretRequired) {
    upstreamResponse = routeError(route, "upstream_error", upstreamResponse.status);
  }

  const response = new Response(upstreamResponse.body, upstreamResponse);
  applyRouteHeaders(response.headers, route, "PROXIED");

  if (response.ok) {
    ctx.waitUntil(cache.put(cacheRequest, response.clone()));
    if (kv) ctx.waitUntil(writeKvCache(kv, cacheKey, response.clone(), route.cacheTtlSeconds));
  }

  const latencyMs = Date.now() - start;
  logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
  logMetric({ dayBucket, metric: "cache_miss", value: 1, provider: route.provider });
  logMetric({ dayBucket, metric: "upstream_latency_ms", value: latencyMs, provider: route.provider });

  if (forceFresh) {
    logMetric({ dayBucket, metric: "forced_fresh", value: 1, provider: route.provider });
  }

  return withCors(response);
}

async function fetchForecaCachedRoute(
  url: URL,
  env: Env,
  ctx: ExecutionContext,
  route: RouteConfig,
  allowFresh: boolean,
): Promise<Response> {
  const dayBucket = new Date().toISOString().slice(0, 10);

  const cacheKey = buildCacheKey(url, route);
  const cache = caches.default;
  const cacheRequest = new Request(cacheKey, { method: "GET" });
  const kv = env.FORECA_CACHE;

  const forceFresh = allowFresh && url.searchParams.get("fresh") === "1";

  if (!forceFresh) {

    const cachedResponse = await cache.match(cacheRequest);
    if (cachedResponse) {
      logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
      logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: route.provider });
      const response = new Response(cachedResponse.body, cachedResponse);
      applyRouteHeaders(response.headers, route, "CACHED");
      return withCors(response);
    }

    if (kv) {
      const envelope = await readKvCache(kv, cacheKey);
      if (envelope && !isAtOrAfter(new Date(), envelope.expiresAtUtc)) {
        const response = kvCachedJsonResponse(envelope, route);
        ctx.waitUntil(cache.put(cacheRequest, response.clone()));
        logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
        logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: route.provider });
        logMetric({ dayBucket, metric: "foreca_kv_hit", value: 1, provider: route.provider });
        return withCors(response);
      }

      logMetric({ dayBucket, metric: "foreca_kv_miss", value: 1, provider: route.provider });
      const lockKey = `${cacheKey}::lock`;
      const gotLock = await acquireKvLock(kv, lockKey);
      if (!gotLock) {
        const coalesced = await awaitKvCache(kv, cacheKey);
        if (coalesced && !isAtOrAfter(new Date(), coalesced.expiresAtUtc)) {
          const response = kvCachedJsonResponse(coalesced, route);
          ctx.waitUntil(cache.put(cacheRequest, response.clone()));
          logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
          logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: route.provider });
          logMetric({ dayBucket, metric: "foreca_singleflight_coalesced", value: 1, provider: route.provider });
          return withCors(response);
        }

      }
    }
  }

  const start = Date.now();
  const upstreamResponse = await ADAPTERS.forecaMergedResponse(url, env).catch((error) => {
    logMetric({ dayBucket, metric: "foreca_route_error", value: 1, provider: route.provider });
    console.log(JSON.stringify({
      provider: route.provider,
      metric: "foreca_route_error",
      reason: error instanceof Error ? error.name : "unknown",
      value: 1,
    }));
    return routeError(route, "Foreca merged route failed", 502);
  });

  const response = new Response(upstreamResponse.body, upstreamResponse);
  applyRouteHeaders(response.headers, route, "PROXIED");

  const forecaDegraded =
    response.headers.get("x-quietsky-foreca-stale") === "1" ||
    response.headers.get("x-quietsky-foreca-daily-stale") === "1";
  if (response.ok && !forecaDegraded) {
    ctx.waitUntil(cache.put(cacheRequest, response.clone()));
    if (kv) ctx.waitUntil(writeKvCache(kv, cacheKey, response.clone(), route.cacheTtlSeconds));
  }

  const latencyMs = Date.now() - start;
  logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
  logMetric({ dayBucket, metric: "cache_miss", value: 1, provider: route.provider });
  logMetric({ dayBucket, metric: "upstream_latency_ms", value: latencyMs, provider: route.provider });
  if (forceFresh) {
    logMetric({ dayBucket, metric: "forced_fresh", value: 1, provider: route.provider });
  }

  if (response.status === 401 || response.status === 403) {
    logMetric({ dayBucket, metric: "foreca_fallback", value: 1, provider: route.provider });
  }

  return withCors(response);
}

type KvCacheEnvelope = { body: string; contentType: string; expiresAtUtc: string };

const KV_LOCK_TTL_SECONDS = 60;
const KV_COALESCE_TOTAL_MS = 2500;
const KV_COALESCE_POLL_MS = 200;

function kvCachedJsonResponse(envelope: KvCacheEnvelope, route: RouteConfig): Response {
  const response = new Response(envelope.body, {
    status: 200,
    headers: { "content-type": envelope.contentType || "application/json; charset=utf-8" },
  });
  applyRouteHeaders(response.headers, route, "CACHED");
  return response;
}

async function readKvCache(kv: KVNamespace, cacheKey: string): Promise<KvCacheEnvelope | null> {
  try {
    return await kv.get<KvCacheEnvelope>(cacheKey, "json");
  } catch {
    return null;
  }
}

async function writeKvCache(
  kv: KVNamespace,
  cacheKey: string,
  response: Response,
  ttlSeconds: number,
): Promise<void> {
  const body = await response.text().catch(() => null);
  if (body == null) return;

  const ttl = Math.max(60, Math.floor(ttlSeconds));
  const envelope: KvCacheEnvelope = {
    body,
    contentType: response.headers.get("content-type") ?? "application/json; charset=utf-8",
    expiresAtUtc: new Date(Date.now() + ttl * 1000).toISOString(),
  };
  try {
    await kv.put(cacheKey, JSON.stringify(envelope), { expirationTtl: ttl });
  } catch {

  }
}

async function acquireKvLock(kv: KVNamespace, lockKey: string): Promise<boolean> {
  try {
    const existing = await kv.get(lockKey);
    if (existing) return false;
    await kv.put(lockKey, "1", { expirationTtl: KV_LOCK_TTL_SECONDS });
    return true;
  } catch {
    return true;
  }
}

async function awaitKvCache(kv: KVNamespace, cacheKey: string): Promise<KvCacheEnvelope | null> {
  const deadline = Date.now() + KV_COALESCE_TOTAL_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, KV_COALESCE_POLL_MS));
    const envelope = await readKvCache(kv, cacheKey);
    if (envelope) return envelope;
  }
  return null;
}

async function fetchStandardUpstream(url: URL, env: Env, route: RouteConfig): Promise<Response> {
  const binding = ADAPTERS.bindings[route.id];
  if (!binding) {
    logConfigError(route.provider, "no adapter binding for route");
    return routeError(route, "provider_unavailable", 502);
  }
  const upstreamUrl = buildUpstreamUrl(url, binding, route.queryAllowlist, env);
  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: "GET",
    headers: buildUpstreamHeaders(binding, env),
  });
  return new Response(upstreamResponse.body, upstreamResponse);
}

function buildStatusResponse(url: URL, env: Env, route: RouteConfig): Response {
  const body = buildStatusBody(url, env);
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
  applyRouteHeaders(response.headers, route, "PROXIED");
  return response;
}

function buildStatusBody(url: URL, env: Env): {
  status: "active" | "expired";
  message: string;
  playStoreUrl: string;
  killedVersionCodes: number[];
  serverTime: string;
} {
  const versionCodeParam = url.searchParams.get("versionCode");
  const versionCode = versionCodeParam ? Number(versionCodeParam) : Number.NaN;
  const killed = parseKilledVersionCodes(env.BUILD_STATUS_KILLED_VERSION_CODES);
  const isKilled = Number.isFinite(versionCode) && killed.includes(versionCode);
  const message = (env.BUILD_STATUS_KILL_MESSAGE ?? "").trim();
  return {
    status: isKilled ? "expired" : "active",
    message: isKilled
      ? message ||
        "This test build has expired\n\nThanks for testing Quiet Sky! This pre-release build is no longer active. Either update to a more recent test build or install Quiet Sky from the Play Store."
      : "",
    playStoreUrl: "https://play.google.com/store/apps/details?id=app.getquietsky.android",
    killedVersionCodes: killed,
    serverTime: new Date().toISOString(),
  };
}

function parseKilledVersionCodes(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => Number(p))
    .filter((n) => Number.isFinite(n));
}

const PROXY_DIRECTIVE_PARAMS = ["fresh"] as const;

function reduceUrlToAllowlist(url: URL, route: RouteConfig): URL {
  const reduced = new URL(url.pathname, url.origin);
  for (const key of [...route.queryAllowlist, ...PROXY_DIRECTIVE_PARAMS]) {
    const value = url.searchParams.get(key);
    if (value !== null) reduced.searchParams.set(key, value);
  }
  return reduced;
}

export function buildCacheKey(url: URL, route: RouteConfig): string {
  if (route.category === "geocoding") {
    const canonical = new URLSearchParams();
    for (const key of route.queryAllowlist) {
      const value = url.searchParams.get(key);
      if (value) canonical.set(key, key === "name" ? value.trim().toLowerCase() : value);
    }
    return `https://quietsky-cache.local/${route.provider}/${route.id}?${canonical.toString()}`;
  }

  if (route.precision === "Bucket ~55 km") {
    const bucket = sunsetBucketFromUrl(url);
    const dateLocal = dateLocalFromUrl(url);
    return `https://quietsky-cache.local/${route.provider}/${route.id}/${formatBucket(bucket.latitude)}/${formatBucket(bucket.longitude)}/${dateLocal}`;
  }

  const canonical = new URLSearchParams();
  if (route.queryAllowlist.includes("latitude") || route.queryAllowlist.includes("longitude")) {
    const latRaw = Number(url.searchParams.get("latitude") ?? "0");
    const lonRaw = Number(url.searchParams.get("longitude") ?? "0");
    if (typeof route.keyCoarsenDegrees === "number" && route.keyCoarsenDegrees > 0) {
      const grid = route.keyCoarsenDegrees;
      const snap = (v: number) => (Math.round(v / grid) * grid).toFixed(2);
      canonical.set("latitude", Number.isFinite(latRaw) ? snap(latRaw) : "0.00");
      canonical.set("longitude", Number.isFinite(lonRaw) ? snap(lonRaw) : "0.00");
    } else {
      canonical.set("latitude", Number.isFinite(latRaw) ? latRaw.toFixed(2) : "0.00");
      canonical.set("longitude", Number.isFinite(lonRaw) ? lonRaw.toFixed(2) : "0.00");
    }
  }
  for (const key of route.queryAllowlist) {
    if (key === "latitude" || key === "longitude") continue;
    const value = url.searchParams.get(key);
    if (value) canonical.set(key, value);
  }

  return `https://quietsky-cache.local/${route.provider}/${route.id}?${canonical.toString()}`;
}

type FreshnessOverride = {
  fetchedAtUtc: string;
  expiresSoftAtUtc: string;
};

function computeFreshnessSeconds(override: FreshnessOverride, now: Date = new Date()): {
  maxAgeSeconds: number;
  ageSeconds: number;
} {
  const nowMs = now.getTime();
  const softMs = Date.parse(override.expiresSoftAtUtc);
  const fetchedMs = Date.parse(override.fetchedAtUtc);
  const maxAgeSeconds = Number.isFinite(softMs)
    ? Math.max(0, Math.floor((softMs - nowMs) / 1000))
    : 0;
  const ageSeconds = Number.isFinite(fetchedMs)
    ? Math.max(0, Math.floor((nowMs - fetchedMs) / 1000))
    : 0;
  return { maxAgeSeconds, ageSeconds };
}

function applyRouteHeaders(
  headers: Headers,
  route: RouteConfig,
  cacheStatus: "PROXIED" | "CACHED",
  freshness?: FreshnessOverride,
): void {
  if (freshness) {
    const { maxAgeSeconds, ageSeconds } = computeFreshnessSeconds(freshness);
    headers.set("cache-control", `public, max-age=${maxAgeSeconds}`);
    headers.set("age", String(ageSeconds));
  } else {
    headers.set("cache-control", `public, max-age=${route.cacheTtlSeconds}`);
  }
  headers.set("x-quietsky-cache-status", cacheStatus);
  headers.set("x-quietsky-provider", route.provider);
  headers.set("x-quietsky-route", "proxied");
  headers.set("x-quietsky-purpose", route.purpose);
  headers.set("x-quietsky-category", route.category);
  headers.set("x-quietsky-precision", route.precision);
}

type RadarTileProvider = "rainviewer" | "iem";
type RadarTileFormat = "png" | "webp";
export type RadarTileRequest = {
  provider: RadarTileProvider;
  timestamp: string;
  z: string;
  x: string;
  y: string;
  format: RadarTileFormat;
};

async function fetchRadarFrames(env: Env, ctx: ExecutionContext): Promise<Response> {
  const route = routeByPath("/v1/radar-frames");
  if (!route) return withCors(new Response("Not Found", { status: 404 }));

  const metadataUrl = ADAPTERS.radarFramesMetadataUrl(env);

  const cache = caches.default;
  const cacheRequest = new Request("https://quietsky-cache.local/radar-frames/rainviewer.json", { method: "GET" });
  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    logMetric({
      dayBucket: new Date().toISOString().slice(0, 10),
      metric: "cache_hit",
      value: 1,
      provider: route.provider,
    });
    const response = new Response(cachedResponse.body, cachedResponse);
    applyRouteHeaders(response.headers, route, "CACHED");
    response.headers.set("content-type", "application/json");
    response.headers.set("x-quietsky-attribution", "RainViewer");
    return withCors(response);
  }

  const start = Date.now();
  const upstreamResponse = await fetch(metadataUrl.toString(), {
    method: "GET",
    headers: new Headers({ "x-quietsky-proxy": "1" }),
  });
  if (!upstreamResponse.ok) {
    const response = new Response("Radar frames unavailable", { status: 502 });
    applyRouteHeaders(response.headers, route, "PROXIED");
    return withCors(response);
  }

  const response = new Response(upstreamResponse.body, upstreamResponse);
  applyRouteHeaders(response.headers, route, "PROXIED");
  response.headers.set("content-type", "application/json");
  response.headers.set("x-quietsky-attribution", "RainViewer");

  if (response.ok) {
    ctx.waitUntil(cache.put(cacheRequest, response.clone()));
  }

  const dayBucket = new Date().toISOString().slice(0, 10);
  logMetric({ dayBucket, metric: "request_count", value: 1, provider: route.provider });
  logMetric({ dayBucket, metric: "cache_miss", value: 1, provider: route.provider });
  logMetric({ dayBucket, metric: "upstream_latency_ms", value: Date.now() - start, provider: route.provider });

  return withCors(response);
}

function radarTileAttribution(provider: RadarTileProvider): string {
  return provider === "iem" ? "IEM / NOAA MRMS" : "RainViewer";
}

function radarTileCacheKeyRequest(parsed: RadarTileRequest): RadarTileRequest {
  if (parsed.provider !== "iem") return parsed;
  const bucket = String(Math.floor(Date.now() / 1000 / 120) * 120);
  return { ...parsed, timestamp: bucket };
}

async function fetchRadarTile(url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  const route = routeByPath("/v1/radar-tile");
  if (!route) return withCors(new Response("Not Found", { status: 404 }));

  const parsed = parseRadarTilePath(url.pathname);
  if (!parsed) {
    const response = new Response("Not Found", { status: 404 });
    applyRouteHeaders(response.headers, route, "PROXIED");
    return withCors(response);
  }

  if (!isValidRadarTileRequest(parsed)) {
    const response = new Response("Invalid tile request", { status: 400 });
    applyRouteHeaders(response.headers, route, "PROXIED");
    return withCors(response);
  }

  const attribution = radarTileAttribution(parsed.provider);
  const metricProvider: Provider = parsed.provider === "iem" ? "iem" : "rainviewer";
  const contentType = parsed.format === "webp" ? "image/webp" : "image/png";

  const cache = caches.default;
  const cacheRequest = new Request(buildRadarTileCacheKey(radarTileCacheKeyRequest(parsed)), { method: "GET" });
  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    logMetric({
      dayBucket: new Date().toISOString().slice(0, 10),
      metric: "cache_hit",
      value: 1,
      provider: metricProvider,
    });
    const response = new Response(cachedResponse.body, cachedResponse);
    applyRouteHeaders(response.headers, route, "CACHED");
    response.headers.set("content-type", contentType);
    response.headers.set("x-quietsky-provider", metricProvider);
    response.headers.set("x-quietsky-attribution", attribution);
    return withCors(response);
  }

  const tileUrl = await ADAPTERS.radarTileUrl(parsed, env);
  if (!tileUrl) {
    const response = new Response("Radar frame not available", { status: 404 });
    applyRouteHeaders(response.headers, route, "PROXIED");
    response.headers.set("x-quietsky-provider", metricProvider);
    return withCors(response);
  }

  const start = Date.now();

  const upstreamResponse = await fetch(tileUrl.toString(), {
    method: "GET",
    headers: new Headers({ "x-quietsky-proxy": "1" }),
  });
  const response = new Response(upstreamResponse.body, upstreamResponse);
  applyRouteHeaders(response.headers, route, "PROXIED");
  response.headers.set("cache-control", "public, max-age=120");
  response.headers.set("content-type", contentType);
  response.headers.set("x-quietsky-provider", metricProvider);
  response.headers.set("x-quietsky-attribution", attribution);

  if (response.ok) {
    ctx.waitUntil(cache.put(cacheRequest, response.clone()));
  }

  const dayBucket = new Date().toISOString().slice(0, 10);
  logMetric({ dayBucket, metric: "request_count", value: 1, provider: metricProvider });
  logMetric({ dayBucket, metric: "cache_miss", value: 1, provider: metricProvider });
  logMetric({ dayBucket, metric: "upstream_latency_ms", value: Date.now() - start, provider: metricProvider });

  return withCors(response);
}

function isValidRadarTileRequest(request: RadarTileRequest): boolean {
  const z = Number(request.z);
  const x = Number(request.x);
  const y = Number(request.y);
  if (!Number.isInteger(z) || z < 0 || z > 18) return false;
  const cells = 2 ** z;
  return Number.isInteger(x) && x < cells &&
    Number.isInteger(y) && y < cells &&
    request.timestamp.length <= 12;
}

function parseRadarTilePath(pathname: string): RadarTileRequest | null {
  const match = pathname.match(/^\/v1\/radar-tile\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\.(png|webp)$/);
  if (!match) return null;
  const provider = match[1];
  if (provider !== "rainviewer" && provider !== "iem") return null;
  return {
    provider,
    timestamp: match[2],
    z: match[3],
    x: match[4],
    y: match[5],
    format: match[6] as RadarTileFormat,
  };
}

async function fetchRainbowNowcast(url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  const route = routeByPath("/v1/nowcast/rainbow");
  if (!route) return withCors(new Response("Not Found", { status: 404 }));

  const parsed = parseRainbowNowcastPath(url.pathname);
  if (!parsed) {
    const response = new Response("Not Found", { status: 404 });
    applyRouteHeaders(response.headers, route, "PROXIED");
    return withCors(response);
  }

  const pathLat = Number(parsed.latitude);
  const pathLon = Number(parsed.longitude);
  if (!Number.isFinite(pathLat) || pathLat < -90 || pathLat > 90 ||
      !Number.isFinite(pathLon) || pathLon < -180 || pathLon > 180) {
    return withCors(routeError(route, "invalid_coordinates", 400));
  }
  const startTimestampRaw = url.searchParams.get("start_timestamp");
  if (startTimestampRaw !== null && !/^\d{1,12}$/.test(startTimestampRaw)) {
    return withCors(routeError(route, "invalid_query", 400));
  }

  const rainbowBinding = ADAPTERS.bindings["nowcast-rainbow"];
  const apiKey = env.RAINBOW_API_KEY;
  if (!rainbowBinding || !apiKey) {

    logConfigError(route.provider, "nowcast adapter or key is not configured");
    return withCors(routeError(route, "provider_unavailable", 502));
  }

  const startTimestamp = url.searchParams.get("start_timestamp");
  const cache = caches.default;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const cacheKey = rainbowCacheKey(parsed, nowSeconds);
  const cacheRequest = new Request(cacheKey, { method: "GET" });

  const cached = await cache.match(cacheRequest);
  if (cached) {
    logMetric({ dayBucket: new Date().toISOString().slice(0, 10), metric: "cache_hit", value: 1, provider: "rainbow" });
    const response = new Response(cached.body, cached);
    applyRouteHeaders(response.headers, route, "CACHED");
    response.headers.set("content-type", "application/json");
    response.headers.set("x-quietsky-attribution", "Rainbow.ai");
    return withCors(response);
  }

  const kv = env.RAINBOW_CACHE;
  if (kv) {
    const envelope = await readKvCache(kv, cacheKey);
    if (envelope) {

      const edgeResponse = rainbowEdgeResponse(envelope);
      ctx.waitUntil(cache.put(cacheRequest, edgeResponse.clone()));
      logMetric({ dayBucket: new Date().toISOString().slice(0, 10), metric: "cache_hit", value: 1, provider: "rainbow" });
      const response = rainbowCachedResponse(envelope, route);
      return withCors(response);
    }

    const lockKey = `${cacheKey}::lock`;
    const gotLock = await acquireKvLock(kv, lockKey);
    if (!gotLock) {
      const coalesced = await awaitKvCache(kv, cacheKey);
      if (coalesced) {
        const edgeResponse = rainbowEdgeResponse(coalesced);
        ctx.waitUntil(cache.put(cacheRequest, edgeResponse.clone()));
        logMetric({ dayBucket: new Date().toISOString().slice(0, 10), metric: "cache_hit", value: 1, provider: "rainbow" });
        const response = rainbowCachedResponse(coalesced, route);
        return withCors(response);
      }

    }
  }

  const upstream = ADAPTERS.rainbowUpstreamUrl(parsed, startTimestamp, env);
  const start = Date.now();
  const upstreamResponse = await fetch(upstream.toString(), {
    method: "GET",
    headers: buildUpstreamHeaders(rainbowBinding, env),
  });

  if (upstreamResponse.status === 404) {
    const response = new Response(JSON.stringify({ forecast: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    applyRouteHeaders(response.headers, route, "PROXIED");
    response.headers.set("x-quietsky-attribution", "Rainbow.ai");
    logMetric({ dayBucket: new Date().toISOString().slice(0, 10), metric: "request_count", value: 1, provider: "rainbow" });
    return withCors(response);
  }

  if (!upstreamResponse.ok) {
    const errorResponse = routeError(route, "upstream_error", upstreamResponse.status);
    logMetric({ dayBucket: new Date().toISOString().slice(0, 10), metric: "request_count", value: 1, provider: "rainbow" });
    return withCors(errorResponse);
  }

  const response = new Response(upstreamResponse.body, upstreamResponse);
  applyRouteHeaders(response.headers, route, "PROXIED");
  response.headers.set("cache-control", `public, max-age=${RAINBOW_CACHE_TTL_SECONDS}`);
  response.headers.set("content-type", "application/json");
  response.headers.set("x-quietsky-attribution", "Rainbow.ai");

  if (response.ok) {

    ctx.waitUntil(cache.put(cacheRequest, response.clone()));
    if (kv) {
      ctx.waitUntil(writeKvCache(kv, cacheKey, response.clone(), RAINBOW_CACHE_TTL_SECONDS));
    }
  }

  const dayBucket = new Date().toISOString().slice(0, 10);
  logMetric({ dayBucket, metric: "request_count", value: 1, provider: "rainbow" });
  logMetric({ dayBucket, metric: "cache_miss", value: 1, provider: "rainbow" });
  logMetric({ dayBucket, metric: "upstream_latency_ms", value: Date.now() - start, provider: "rainbow" });

  return withCors(response);
}

function rainbowCachedResponse(envelope: KvCacheEnvelope, route: RouteConfig): Response {
  const response = new Response(envelope.body, {
    status: 200,
    headers: { "content-type": envelope.contentType || "application/json" },
  });
  applyRouteHeaders(response.headers, route, "CACHED");
  response.headers.set("content-type", "application/json");
  response.headers.set("x-quietsky-attribution", "Rainbow.ai");
  return response;
}

function rainbowEdgeResponse(envelope: KvCacheEnvelope): Response {
  return new Response(envelope.body, {
    status: 200,
    headers: {
      "content-type": envelope.contentType || "application/json",
      "cache-control": `public, max-age=${RAINBOW_CACHE_TTL_SECONDS}`,
    },
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function missingRequiredSecret(route: RouteConfig, env: Env): string | null {
  if (!route.secretRequired) return null;
  const secretName = ADAPTERS.bindings[route.id]?.apiKeySecret;
  if (!secretName) return "no adapter binding for route";
  const value = env[secretName];
  return typeof value === "string" && value.length > 0
    ? null
    : `${String(secretName)} is not configured`;
}

function routeError(route: RouteConfig, message: string, status: number): Response {
  const response = new Response(JSON.stringify({ error: message }), {
    status: status >= 500 ? 502 : status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
  applyRouteHeaders(response.headers, route, "PROXIED");
  return response;
}

function logMetric(args: {
  dayBucket: string;
  metric:
    | "request_count"
    | "cache_hit"
    | "cache_miss"
    | "upstream_refresh"
    | "upstream_latency_ms"
    | "foreca_fallback"
    | "foreca_upstream_outcome"
    | "foreca_route_error"
    | "foreca_served_stale"
    | "foreca_kv_hit"
    | "foreca_kv_miss"
    | "foreca_singleflight_coalesced"
    | "forced_fresh";
  value: number;
  provider: Provider;
}): void {
  console.log(
    JSON.stringify({
      day: args.dayBucket,
      provider: args.provider,
      metric: args.metric,
      value: args.value,
    }),
  );
}

export type SunsetHueNormalized = {
  provider: "SunsetHue";
  type: "sunset";
  bucket: {
    latitude: number;
    longitude: number;
    precisionLabel: "Bucket ~55 km";
  };
  dateLocal: string;
  modelData: boolean;
  quality: {
    score: number | null;
    label: string | null;
  };
  cloudCover: number | null;
  sunsetTimeUtc: string | null;
  goldenHourUtc: {
    start: string | null;
    end: string | null;
  };
  blueHourUtc: {
    start: string | null;
    end: string | null;
  };
  directionDegrees: number | null;
  fetchedAtUtc: string;
  expiresSoftAtUtc: string;
  expiresHardAtUtc: string;
  source: {
    name: "SunsetHue";
    route: "proxied";
  };
};

async function fetchSunsetHueQuality(
  url: URL,
  env: Env,
  ctx: ExecutionContext,
  route: RouteConfig,
): Promise<Response> {
  const missingSecret = missingRequiredSecret(route, env);
  if (missingSecret) {

    logConfigError(route.provider, missingSecret);
    return withCors(routeError(route, "provider_unavailable", 502));
  }

  const dayBucket = new Date().toISOString().slice(0, 10);
  const bucket = sunsetBucketFromUrl(url);
  const dateLocal = dateLocalFromUrl(url);
  const cache = caches.default;
  const cacheKey = buildCacheKey(url, route);
  const cacheRequest = new Request(cacheKey, { method: "GET" });
  const kv = env.SUNSETHUE_CACHE;

  const cachedResponse = await cache.match(cacheRequest);
  if (cachedResponse) {
    const cachedBody = await cachedResponse.clone().json().catch(() => null) as SunsetHueNormalized | null;
    const now = new Date();
    if (cachedBody && !isAtOrAfter(now, cachedBody.expiresHardAtUtc)) {
      if (isAtOrAfter(now, cachedBody.expiresSoftAtUtc)) {
        ctx.waitUntil(refreshSunsetHueCache(cache, cacheRequest, cacheKey, bucket, dateLocal, env, route, dayBucket));
      }
      logMetric({ dayBucket, metric: "request_count", value: 1, provider: "sunsethue" });
      logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: "sunsethue" });
      return withCors(sunsetHueCachedResponse(cachedBody, route));
    }
  }

  if (kv) {
    const kvBody = await readSunsetHueKv(kv, cacheKey);
    const now = new Date();
    if (kvBody && !isAtOrAfter(now, kvBody.expiresHardAtUtc)) {

      ctx.waitUntil(cache.put(cacheRequest, sunsetHueCachedResponse(kvBody, route).clone()));
      if (isAtOrAfter(now, kvBody.expiresSoftAtUtc)) {
        ctx.waitUntil(refreshSunsetHueCache(cache, cacheRequest, cacheKey, bucket, dateLocal, env, route, dayBucket));
      }
      logMetric({ dayBucket, metric: "request_count", value: 1, provider: "sunsethue" });
      logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: "sunsethue" });
      return withCors(sunsetHueCachedResponse(kvBody, route));
    }
  }

  if (kv) {
    const lockKey = `${cacheKey}::lock`;
    const gotLock = await acquireSunsetHueLock(kv, lockKey);
    if (!gotLock) {

      const coalesced = await awaitSunsetHueKv(kv, cacheKey);
      if (coalesced && !isAtOrAfter(new Date(), coalesced.expiresHardAtUtc)) {
        ctx.waitUntil(cache.put(cacheRequest, sunsetHueCachedResponse(coalesced, route).clone()));
        logMetric({ dayBucket, metric: "request_count", value: 1, provider: "sunsethue" });
        logMetric({ dayBucket, metric: "cache_hit", value: 1, provider: "sunsethue" });
        return withCors(sunsetHueCachedResponse(coalesced, route));
      }

    }
  }

  const start = Date.now();
  const freshResponse = await fetchSunsetHueFresh(bucket, dateLocal, env, route);
  if (freshResponse.ok) {
    ctx.waitUntil(cache.put(cacheRequest, freshResponse.clone()));
    if (kv) ctx.waitUntil(writeSunsetHueKv(kv, cacheKey, freshResponse.clone()));
  }
  const latencyMs = Date.now() - start;
  logMetric({ dayBucket, metric: "request_count", value: 1, provider: "sunsethue" });
  logMetric({ dayBucket, metric: "cache_miss", value: 1, provider: "sunsethue" });
  logMetric({ dayBucket, metric: "upstream_latency_ms", value: latencyMs, provider: "sunsethue" });
  return withCors(freshResponse);
}

function sunsetHueCachedResponse(body: SunsetHueNormalized, route: RouteConfig): Response {
  const response = new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  applyRouteHeaders(response.headers, route, "CACHED", {
    fetchedAtUtc: body.fetchedAtUtc,
    expiresSoftAtUtc: body.expiresSoftAtUtc,
  });
  return response;
}

const SUNSETHUE_LOCK_TTL_SECONDS = 60;
const SUNSETHUE_COALESCE_TOTAL_MS = 2500;
const SUNSETHUE_COALESCE_POLL_MS = 200;

async function readSunsetHueKv(kv: KVNamespace, cacheKey: string): Promise<SunsetHueNormalized | null> {
  try {
    return await kv.get<SunsetHueNormalized>(cacheKey, "json");
  } catch {
    return null;
  }
}

async function writeSunsetHueKv(kv: KVNamespace, cacheKey: string, response: Response): Promise<void> {
  const body = await response.json().catch(() => null) as SunsetHueNormalized | null;
  if (!body) return;

  const hardMs = Date.parse(body.expiresHardAtUtc);
  const ttlSeconds = Number.isFinite(hardMs)
    ? Math.max(60, Math.floor((hardMs - Date.now()) / 1000))
    : 60;
  try {
    await kv.put(cacheKey, JSON.stringify(body), { expirationTtl: ttlSeconds });
  } catch {

  }
}

async function acquireSunsetHueLock(kv: KVNamespace, lockKey: string): Promise<boolean> {
  try {
    const existing = await kv.get(lockKey);
    if (existing) return false;
    await kv.put(lockKey, "1", { expirationTtl: SUNSETHUE_LOCK_TTL_SECONDS });
    return true;
  } catch {

    return true;
  }
}

async function awaitSunsetHueKv(kv: KVNamespace, cacheKey: string): Promise<SunsetHueNormalized | null> {
  const deadline = Date.now() + SUNSETHUE_COALESCE_TOTAL_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, SUNSETHUE_COALESCE_POLL_MS));
    const body = await readSunsetHueKv(kv, cacheKey);
    if (body) return body;
  }
  return null;
}

async function refreshSunsetHueCache(
  cache: Cache,
  cacheRequest: Request,
  cacheKey: string,
  bucket: SunsetBucket,
  dateLocal: string,
  env: Env,
  route: RouteConfig,
  dayBucket: string,
): Promise<void> {

  const start = Date.now();
  const response = await fetchSunsetHueFresh(bucket, dateLocal, env, route).catch(() => null);
  if (response?.ok) {
    await cache.put(cacheRequest, response.clone());
    if (env.SUNSETHUE_CACHE) await writeSunsetHueKv(env.SUNSETHUE_CACHE, cacheKey, response.clone());
    logMetric({ dayBucket, metric: "upstream_refresh", value: 1, provider: "sunsethue" });
    logMetric({ dayBucket, metric: "upstream_latency_ms", value: Date.now() - start, provider: "sunsethue" });
  }
}

async function fetchSunsetHueFresh(
  bucket: SunsetBucket,
  dateLocal: string,
  env: Env,
  route: RouteConfig,
): Promise<Response> {

  const result = await ADAPTERS.sunsetQuality(bucket, dateLocal, env);
  if (!result.ok) {
    return routeError(route, "upstream_error", result.status);
  }
  const response = new Response(JSON.stringify(result.normalized), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  applyRouteHeaders(response.headers, route, "PROXIED", {
    fetchedAtUtc: result.normalized.fetchedAtUtc,
    expiresSoftAtUtc: result.normalized.expiresSoftAtUtc,
  });
  return response;
}

function sunsetBucketFromUrl(url: URL): SunsetBucket {
  const rawLat = Number(url.searchParams.get("latitude") ?? "0");
  const rawLon = Number(url.searchParams.get("longitude") ?? "0");
  return {
    latitude: roundToNearestHalfDegree(Number.isFinite(rawLat) ? rawLat : 0),
    longitude: roundToNearestHalfDegree(Number.isFinite(rawLon) ? rawLon : 0),
  };
}

function dateLocalFromUrl(url: URL): string {
  const raw = url.searchParams.get("date") ?? url.searchParams.get("dateLocal") ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
}

function roundToNearestHalfDegree(value: number): number {
  return Math.round(value * 2) / 2;
}

function formatBucket(value: number): string {
  return value.toFixed(1);
}

function isAtOrAfter(now: Date, isoUtc: string): boolean {
  const target = Date.parse(isoUtc);
  return Number.isFinite(target) && now.getTime() >= target;
}

export { buildUpstreamUrl, buildUpstreamHeaders };

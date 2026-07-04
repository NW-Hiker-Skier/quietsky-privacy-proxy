// Public privacy-invariant suite.
//
// These are the mechanically-checkable guarantees the README makes. They run
// against the PUBLIC tree — the stub adapter registry + the synthetic `example`
// adapter — so a reviewer can clone this repo and watch them pass without any
// proprietary provider integration. Provider-behavior tests (which need the
// withheld adapters) are intentionally not shipped.
//
//   npm test
//
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROUTE_REGISTRY,
  buildCacheKey,
  buildUpstreamHeaders,
  buildUpstreamUrl,
  routeByPath,
} from "../dist/index.js";
import { EXAMPLE_BINDING } from "../dist/adapters/example.js";

const env = { EXAMPLE_API_KEY: "example-secret" };

let failures = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.error(`not ok - ${name}`);
    console.error("  " + err.message);
  }
}

// 1. The headline invariant: client identity is physically unreachable outside the
//    request-gate helpers. This is a source scan — it fails the build if any core
//    code or adapter reads the inbound request outside the gate.
await test("client identity is unreachable outside the gate block (chokepoint scan)", async () => {
  const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

  // Adapters may NEVER touch the client request.
  const adapterDir = join(srcDir, "adapters");
  for (const name of readdirSync(adapterDir)) {
    if (!name.endsWith(".ts")) continue;
    const source = readFileSync(join(adapterDir, name), "utf8");
    assert.ok(!/\brequest\.headers\b/.test(source), `${name} reads request headers`);
    assert.ok(!/:\s*Request\b/.test(source), `${name} accepts a Request parameter`);
  }

  // In the core, request.headers is readable ONLY inside the gate block
  // (validateClientToken .. validateRouteInput): the token gate, the debug gate,
  // the presence-only adoption counter, and the rate-limit key.
  const core = readFileSync(join(srcDir, "index.ts"), "utf8");
  const gateStart = core.indexOf("function validateClientToken");
  const gateEnd = core.indexOf("function validateRouteInput");
  assert.ok(gateStart > 0 && gateEnd > gateStart, "gate block markers present");
  const outsideGate = core.slice(0, gateStart) + core.slice(gateEnd);
  assert.ok(
    !/\brequest\.headers\b/.test(outsideGate),
    "request.headers referenced outside the gate block",
  );

  // The upstream chokepoint never touches a request at all.
  const upstream = readFileSync(join(srcDir, "upstream.ts"), "utf8");
  const upstreamNoComments = upstream.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/\brequest\b/i.test(upstreamNoComments), "upstream.ts references a request");
});

// 2. Every authenticated upstream request is built from scratch: the only headers
//    are the proxy marker + server-side credentials. No inbound client header can
//    appear, because none is ever passed in.
await test("upstream request headers are built from scratch — no client identity", () => {
  const headers = buildUpstreamHeaders(EXAMPLE_BINDING, env);
  assert.equal(headers.get("x-quietsky-proxy"), "1");
  assert.equal(headers.get("x-example-key"), "example-secret"); // server-side key, from env only
  for (const h of ["x-quietsky-client", "x-aurora-client", "cookie", "authorization", "x-forwarded-for", "user-agent"]) {
    assert.equal(headers.get(h), null, `built-from-scratch headers leaked ${h}`);
  }
});

// 3. The upstream URL carries only the route's allowlisted query params. Identity
//    or stray client params never reach the provider.
await test("upstream URL forwards only allowlisted params — identity + stray params dropped", () => {
  const route = routeByPath("/v1/forecast");
  const url = new URL(
    "https://proxy.test/v1/forecast?latitude=47.61&longitude=-122.20&hourly=temperature_2m&token=secret&session=abc&user=me",
  );
  const upstream = buildUpstreamUrl(url, EXAMPLE_BINDING, route.queryAllowlist, env);
  assert.equal(upstream.searchParams.get("latitude"), "47.61");
  assert.equal(upstream.searchParams.get("hourly"), "temperature_2m");
  for (const p of ["token", "session", "user"]) {
    assert.equal(upstream.searchParams.get(p), null, `stray param ${p} reached upstream`);
  }
});

// 4. Cache keys exclude identity and un-allowlisted params: two requests that
//    differ only in host / identity / stray params produce the SAME key, and the
//    key contains none of that metadata.
await test("cache keys exclude identity and un-allowlisted params", () => {
  const route = routeByPath("/v1/forecast");
  const a = buildCacheKey(
    new URL("https://proxy.test/v1/forecast?latitude=47.6123&longitude=-122.2044&hourly=temperature_2m&session=abc&token=secret"),
    route,
  );
  const b = buildCacheKey(
    new URL("https://other-host.test/anything?longitude=-122.2044&latitude=47.6123&hourly=temperature_2m&userAgent=phone"),
    route,
  );
  assert.equal(a, b);
  assert.doesNotMatch(a, /session|token|userAgent|proxy\.test|other-host/);
});

// 5. Sanity: the route registry is present and every route declares a precision
//    policy (the label surfaced to the app's Privacy Dashboard).
await test("route registry declares a precision policy for every route", () => {
  assert.ok(ROUTE_REGISTRY.length > 0, "route registry is non-empty");
  for (const route of ROUTE_REGISTRY) {
    assert.ok(typeof route.precision === "string" && route.precision.length > 0, `${route.path} has no precision label`);
  }
});

if (failures > 0) {
  console.error(`\n${failures} invariant test(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${5} invariant tests passed.`);

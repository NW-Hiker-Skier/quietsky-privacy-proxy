import type { Env } from "../index.js";
import type { UpstreamBinding } from "../upstream.js";

/*!
 * ===== PUBLIC: reference adapter =====
 *
 * This synthetic adapter demonstrates the adapter contract without shipping any
 * real provider integration. It is what a provider binding looks like: a
 * declaration of WHERE requests go and HOW they authenticate, consumed
 * exclusively by the public constructors in ../upstream.ts.
 *
 * The contract an adapter binding gets — and everything it gets:
 *   - a URL whose query params were already validated and reduced to the
 *     route's public allowlist (coordinates are the client-selected precision,
 *     forwarded for accuracy; the proxy does not re-coarsen what a provider
 *     sees, except the one supplemental route that models on a coarse grid);
 *   - the Worker env (for upstream hosts and server-side secrets).
 *
 * An adapter never receives the client Request, client headers, or client
 * identity of any kind — the core never passes them, and a source-scan test
 * enforces that no adapter references them.
 */
export const EXAMPLE_BINDING: UpstreamBinding = {
  upstreamBase: (_env: Env) => "https://weather.example.invalid",
  upstreamPath: "/v1/example-forecast",
  apiKeySecret: "EXAMPLE_API_KEY",
  apiKeyAsHeader: "x-example-key",
};

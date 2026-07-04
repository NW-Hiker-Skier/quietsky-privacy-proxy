import type { AdapterRegistry } from "../index.js";
import { EXAMPLE_BINDING } from "./example.js";

/*!
 * ===== Adapter registry (PUBLIC stub variant) =====
 *
 * The public source release ships THIS file as src/adapters/index.ts (the
 * export tooling renames it). It wires only the synthetic `example` binding and
 * leaves every real provider integration unimplemented — real routes answer
 * `provider_unavailable`, radar/nowcast return null. This is what makes the
 * public tree compile and pass the core test suite without shipping any
 * proprietary integration. A SHA-256 manifest of the withheld adapters is
 * published alongside each release.
 */
export const ADAPTERS: AdapterRegistry = {

  bindings: { example: EXAMPLE_BINDING },
  async forecaMergedResponse() {
    return new Response(JSON.stringify({ error: "provider_unavailable" }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  },
  async sunsetQuality() {
    return { ok: false, status: 502 };
  },
  rainbowUpstreamUrl() {
    throw new Error("provider_unavailable");
  },
  radarFramesMetadataUrl() {
    return new URL("https://radar.example.invalid/frames.json");
  },
  async radarTileUrl() {
    return null;
  },
};

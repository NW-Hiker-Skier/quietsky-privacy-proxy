import type { Env } from "./index.js";

export type UpstreamBinding = {
  upstreamBase: (env: Env) => string;
  upstreamPath?: string;
  apiKeySecret?: keyof Env;

  apiKeyParamName?: string;
  apiKeyInPath?: boolean;
  apiKeyAsBearer?: boolean;
  apiKeyAsHeader?: string;
  coordsInPath?: boolean;
};

export function buildUpstreamUrl(
  url: URL,
  binding: UpstreamBinding,
  queryAllowlist: readonly string[],
  env: Env,
): URL {
  const upstreamBase = binding.upstreamBase(env);
  if (!upstreamBase || !binding.upstreamPath) {
    throw new Error("Binding has no upstream");
  }
  const apiKey = binding.apiKeySecret ? env[binding.apiKeySecret] : undefined;

  if (binding.apiKeyInPath) {

    const lat = url.searchParams.get("latitude") ?? "0";
    const lon = url.searchParams.get("longitude") ?? "0";
    const upstreamUrl = new URL(`${binding.upstreamPath}/key-in-header/${lat},${lon}`, upstreamBase);
    copyAllowedQueryParams(url, upstreamUrl, queryAllowlist, ["latitude", "longitude"]);
    return upstreamUrl;
  }

  if (binding.coordsInPath) {
    const lat = url.searchParams.get("latitude") ?? "0";
    const lon = url.searchParams.get("longitude") ?? "0";
    const upstreamUrl = new URL(`${binding.upstreamPath}/${lon},${lat}`, upstreamBase);
    copyAllowedQueryParams(url, upstreamUrl, queryAllowlist, ["latitude", "longitude"]);
    return upstreamUrl;
  }

  const upstreamUrl = new URL(binding.upstreamPath, upstreamBase);
  copyAllowedQueryParams(url, upstreamUrl, queryAllowlist);

  if (typeof apiKey === "string" && apiKey.length > 0 && binding.apiKeyParamName) {
    upstreamUrl.searchParams.set(binding.apiKeyParamName, apiKey);
  }

  return upstreamUrl;
}

export function copyAllowedQueryParams(
  source: URL,
  target: URL,
  queryAllowlist: readonly string[],
  exclude: readonly string[] = [],
): void {
  for (const key of queryAllowlist) {
    if (exclude.includes(key)) continue;
    const value = source.searchParams.get(key);
    if (value !== null) target.searchParams.set(key, value);
  }
}

export function buildUpstreamHeaders(binding: UpstreamBinding, env: Env): Headers {
  const headers = new Headers({
    "x-quietsky-proxy": "1",
  });

  if (binding.apiKeyAsBearer && binding.apiKeySecret) {
    const bearerKey = env[binding.apiKeySecret];
    if (typeof bearerKey === "string" && bearerKey.length > 0) {
      headers.set("authorization", `Bearer ${bearerKey}`);
    }
  }

  if (binding.apiKeyAsHeader && binding.apiKeySecret) {
    const key = env[binding.apiKeySecret];
    if (typeof key === "string" && key.length > 0) {
      headers.set(binding.apiKeyAsHeader, key);
    }
  }

  return headers;
}

export function objectValue(obj: Record<string, unknown> | undefined, key: string): Record<string, unknown> {
  const value = obj?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function objectValueOrNull(obj: Record<string, unknown> | undefined, key: string): Record<string, unknown> | null {
  const value = obj?.[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function arrayValue(obj: Record<string, unknown>, key: string): unknown[] {
  const value = obj[key];
  return Array.isArray(value) ? value : [];
}

export function stringAt(values: unknown[], index: number): string | null {
  const value = values[index];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function stringifyOptional(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

export function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

export function pickTemperatureF(
  obj: Record<string, unknown>,
  fahrenheitOrNativeKeys: string[],
  celsiusKeys: string[] = [],
): number | undefined {
  const native = pickNumber(obj, fahrenheitOrNativeKeys);
  if (native !== undefined) return native;
  const celsius = pickNumber(obj, celsiusKeys);
  return celsius === undefined ? undefined : celsius * 9 / 5 + 32;
}

export function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

export function pickBoolean(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

export function pickAny(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return undefined;
}

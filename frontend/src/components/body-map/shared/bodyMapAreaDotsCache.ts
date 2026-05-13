/** LRU helpers for Area-view dot samples (bounded memory when filters change often). */

const DEFAULT_MAX_ENTRIES = 8;

export function areaDotsLruTouch<V>(
  map: Map<string, V>,
  key: string,
): V | undefined {
  const v = map.get(key);
  if (v === undefined) return undefined;
  map.delete(key);
  map.set(key, v);
  return v;
}

export function areaDotsLruPut<V>(
  map: Map<string, V>,
  key: string,
  value: V,
  maxEntries: number = DEFAULT_MAX_ENTRIES,
): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > maxEntries) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}

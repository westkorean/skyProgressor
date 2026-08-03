type ObjectParser<T> = (value: unknown) => T;

/** Memoizes pure profile parsers by the raw API object's identity. */
export function memoizeProfileParser<T>(parser: ObjectParser<T>): ObjectParser<T> {
  const cache = new WeakMap<object, T>();
  return (value: unknown): T => {
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return parser(value);
    const object = value as object;
    if (cache.has(object)) return cache.get(object) as T;
    const parsed = parser(value);
    cache.set(object, parsed);
    return parsed;
  };
}

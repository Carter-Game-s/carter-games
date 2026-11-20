const limit = 32 * 1024 * 1024;
const lifetime = 5 * 60 * 1000;
const cache = new Map<
  string,
  { data: Uint8Array<ArrayBuffer>; until: number }
>();
let bytes = 0;

function remove(key: string) {
  const value = cache.get(key);
  if (value) bytes -= value.data.byteLength;
  cache.delete(key);
}

export function hotGame(key: string) {
  const value = cache.get(key);
  if (!value) return;
  if (value.until <= Date.now()) {
    remove(key);
    return;
  }
  cache.delete(key);
  cache.set(key, value);
  return value.data;
}

export function rememberGame(key: string, data: Uint8Array<ArrayBuffer>) {
  for (const [id, value] of cache) if (value.until <= Date.now()) remove(id);
  if (data.byteLength > limit / 2) return;
  remove(key);
  cache.set(key, { data, until: Date.now() + lifetime });
  bytes += data.byteLength;
  for (const id of cache.keys()) {
    if (bytes <= limit && cache.size <= 64) break;
    remove(id);
  }
}

const cleanup = setInterval(() => {
  for (const [id, value] of cache) if (value.until <= Date.now()) remove(id);
}, lifetime);
cleanup.unref();

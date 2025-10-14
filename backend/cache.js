// cache.js
import crypto from 'node:crypto';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// redis
export const redis = createClient({ url: REDIS_URL });
redis.on('error', (e) => console.error('[redis] error:', e));
if (!redis.isOpen) await redis.connect();

export const json = {
  async get(key) {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  },
  async set(key, val, ttlSec) {
    const raw = JSON.stringify(val);
    if (ttlSec) return redis.set(key, raw, { EX: ttlSec });
    return redis.set(key, raw);
  },
  async del(key) { return redis.del(key); },
};

// Anti-breakdown: Only one concurrent request for the same key is allowed to perform "source query"
export async function withSingleFlight(key, ttlSec, worker, lockTtlSec = 10) {
  const lockKey = `sbridg:lock:${key}`;
  const got = await redis.set(lockKey, '1', { NX: true, EX: lockTtlSec });
  if (got) {
    try {
      const val = await worker();
      await json.set(key, val, ttlSec);
      return val;
    } finally {
      await redis.del(lockKey);
    }
  } else {
    // Waiting for the lock holder to write
    for (let i = 0; i < 20; i++) {
      const cached = await json.get(key);
      if (cached) return cached;
      await new Promise(r => setTimeout(r, 100)); //Wait up to 2 seconds
    }
    // Timeout fallback: calculate and write it yourself
    const val = await worker();
    await json.set(key, val, ttlSec);
    return val;
  }
}

// Make the POST body stable as a hash: remove spaces, adjust case, and sort (to avoid different keys due to different orders)
export function stableHashSelections(selections) {
  const norm = (selections ?? [])
    .map(x => ({ type: String(x?.type || '').toLowerCase(), code: String(x?.code || '').trim() }))
    .filter(x => x.type && x.code)
    .sort((a, b) => (a.type + a.code).localeCompare(b.type + b.code));
  const s = JSON.stringify(norm);
  return crypto.createHash('sha1').update(s).digest('base64url');
}




export async function delByPattern(pattern, count = 1000) {
  let deleted = 0;
  const pipeline = [];
  for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: count })) {
    pipeline.push(key);
    if (pipeline.length >= 1000) {
      deleted += await redis.del(pipeline);
      pipeline.length = 0;
    }
  }
  if (pipeline.length) {
    deleted += await redis.del(pipeline);
  }
  return deleted;
}

/** Clear the cache (use with caution) */
export async function flushAll() {
  await redis.sendCommand(['FLUSHALL']);
  return 'OK';
}

// cache.js
import crypto from 'node:crypto';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// 单例 Redis 客户端
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

// 防击穿：同一 key 并发只让一个请求做“源查询”
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
    // 等待持锁方写入
    for (let i = 0; i < 20; i++) {
      const cached = await json.get(key);
      if (cached) return cached;
      await new Promise(r => setTimeout(r, 100)); // 最多等 2s
    }
    // 超时兜底：自己算并写入
    const val = await worker();
    await json.set(key, val, ttlSec);
    return val;
  }
}

// 让 POST 体稳定成 hash：去空、规整大小写并排序（避免顺序不同导致不同 key）
export function stableHashSelections(selections) {
  const norm = (selections ?? [])
    .map(x => ({ type: String(x?.type || '').toLowerCase(), code: String(x?.code || '').trim() }))
    .filter(x => x.type && x.code)
    .sort((a, b) => (a.type + a.code).localeCompare(b.type + b.code));
  const s = JSON.stringify(norm);
  return crypto.createHash('sha1').update(s).digest('base64url');
}



/** 删除指定模式的 key（使用 SCAN，安全不会阻塞） */
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

/** 清空缓存（慎用） */
export async function flushAll() {
  await redis.sendCommand(['FLUSHALL']);
  return 'OK';
}

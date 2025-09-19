// training-advice.proxy.js
import 'dotenv/config';
import express from 'express';

const router = express.Router();

const TGA_PY_URL = (process.env.TGA_PY_URL || '').replace(/\/$/, '');
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 120000);

if (!TGA_PY_URL) {
  console.warn('[training-advice] WARNING: TGA_PY_URL is not set. Please set it in .env.');
}

// 小工具：带超时的 fetch
async function httpGetJson(url, { timeoutMs = HTTP_TIMEOUT_MS } = {}) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
  try {
    const resp = await fetch(url, { signal: ctrl.signal });
    const text = await resp.text();
    if (!resp.ok) {
      throw Object.assign(new Error(`upstream_${resp.status}`), {
        status: resp.status, body: text
      });
    }
    // 直接转 JSON
    return JSON.parse(text);
  } finally {
    clearTimeout(tid);
  }
}

/**
 * 统一接口：GET /training-advice/:code?limit=5
 * 规则：
 * - 纯数字(4-6位) => 视为 ANZSCO，转发到 Python: /training-advice/by-anzsco/:code
 * - 其他 => 暂不支持（你的 Python 只暴露了 by-anzsco；如果之后加了 by-tga 可一并转发）
 */
router.get('/training-advice/:code', async (req, res) => {
  const code = (req.params.code || '').trim();
  const limit = Math.max(1, Math.min(Number(req.query.limit || 5), 20));

  if (!code) return res.status(400).json({ error: 'code_required' });
  if (!TGA_PY_URL) {
    return res.status(500).json({ error: 'python_url_missing', detail: 'Set TGA_PY_URL in .env' });
  }

  const isAnzsco = /^\d{4,6}$/.test(code);

  try {
    if (!isAnzsco) {
      // 你的 Python 目前只开放了 by-anzsco。若以后加了 by-tga，这里可转发：
      // return res.json(await httpGetJson(`${TGA_PY_URL}/training-advice/by-tga/${code}`));
      return res.status(400).json({ error: 'unsupported_code', detail: 'Only ANZSCO (4-6 digits) is supported right now.' });
    }

    const url = `${TGA_PY_URL}/training-advice/by-anzsco/${code}?limit=${limit}`;
    const data = await httpGetJson(url);
    return res.json(data);
  } catch (e) {
    console.error('[training-advice proxy]', e);
    return res.status(502).json({
      error: 'upstream_failed',
      detail: e.message,
      upstreamStatus: e.status,
      upstreamBody: e.body,
    });
  }
});

export default router;

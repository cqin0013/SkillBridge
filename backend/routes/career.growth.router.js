// career.growth.router.js
// Endpoint: GET /api/career-growth/:code  (code 为4位 ANZSCO unit group，如 "2613")
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import url from 'url';

/**
 * 读取 JSON 数据：
 * - 优先读环境变量 CAREER_GROWTH_JSON_PATH
 * - 否则回退到项目内置路径 ./backend/data/career_growth.json
 */
function loadCareerGrowthMap() {
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const fallback = path.resolve(__dirname, '..', 'data', 'career_growth.json');

  const jsonPath = process.env.CAREER_GROWTH_JSON_PATH
    ? path.resolve(process.cwd(), process.env.CAREER_GROWTH_JSON_PATH)
    : fallback;

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`[career-growth] JSON not found at ${jsonPath}. Please set CAREER_GROWTH_JSON_PATH or put file at ${fallback}`);
  }
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);

  // data 形如：{ "2613": { anzscoCode, majorGroupTitle, ... }, ... }
  if (!data || typeof data !== 'object') {
    throw new Error('[career-growth] invalid JSON structure');
  }
  return { data, jsonPath };
}

export default function initCareerGrowthRouter() {
  const router = Router();

  // 仅做一次性加载；若你有热重载需求可改为按需读取+缓存
  let cache = null;
  try {
    const { data, jsonPath } = loadCareerGrowthMap();
    cache = data;
    console.log(`[career-growth] loaded ${Object.keys(cache).length} unit groups from ${jsonPath}`);
  } catch (e) {
    console.error(e);
    // 不中断启动，让健康检查可用，但接口会返回 503
  }

  /**
   * @openapi
   * /api/career-growth/{code}:
   *   get:
   *     tags: [ANZSCO]
   *     summary: Career growth metrics by 4-digit ANZSCO unit group
   *     parameters:
   *       - in: path
   *         name: code
   *         required: true
   *         schema:
   *           type: string
   *           pattern: "^[0-9]{4}$"
   *         description: 4-digit ANZSCO unit group (e.g., "2613")
   *     responses:
   *       200:
   *         description: OK
   *       400:
   *         description: Bad Request
   *       404:
   *         description: Not Found
   *       503:
   *         description: Service Unavailable (JSON not loaded)
   */
  router.get('/career-growth/:code', (req, res) => {
    const raw = String(req.params.code || '').trim();
    if (!/^\d{4}$/.test(raw)) {
      return res.status(400).json({ message: 'code must be a 4-digit ANZSCO unit group, e.g. "2613"' });
    }
    if (!cache) {
      return res.status(503).json({ message: 'career growth data not loaded' });
    }
    const record = cache[raw];
    if (!record) {
      return res.status(404).json({ message: `No data for unit group ${raw}` });
    }
    return res.json(record);
  });

  return router;
}

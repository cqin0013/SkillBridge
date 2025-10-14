// training-advice.router.js
import 'dotenv/config';
import express from 'express';
import soap from 'soap';

const router = express.Router();

// ---- Config ----
const TGA_BASE = process.env.TGA_BASE || 'https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices';
const WSDL_TCS = process.env.TGA_WSDL || `${TGA_BASE}/TrainingComponentService.svc?singleWsdl`;
const TGA_USER = process.env.TGA_USER || 'WebService.Read';
const TGA_PASS = process.env.TGA_PASS || 'Asdf098';

// ANZSCO classification scheme in the TGA
const ANZSCO_SCHEME = '01';

// ---- Utils ----
const toArr = v => (Array.isArray(v) ? v : v ? [v] : []);

const linkOf = (code) =>
  code ? `https://training.gov.au/Training/Details/${code}` : null;

// ---- SOAP client（BasicHttp /Training）----
async function makeClient() {
  const client = await soap.createClientAsync(WSDL_TCS, {
    wsdl_headers: { Connection: 'keep-alive' },
    wsdl_options: { timeout: 15000 },
  });

  //  BasicHttp（/Training）
  const ports =
    client?.wsdl?.definitions?.services?.TrainingComponentService?.ports || {};
  const epBasic =
    ports?.TrainingComponentServiceBasicHttpEndpoint?.location ||
    `${TGA_BASE}/TrainingComponentService.svc/Training`;

  client.setEndpoint(epBasic);
  client.setSecurity(new soap.WSSecurity(TGA_USER, TGA_PASS, { hasTimeStamp: false }));

  client.on('request', (_xml, eid) => {
    console.log('[soap] ->', eid || '', client.endpoint);
  });

  return client;
}

// ---- ANZSCO Search: Back to basic entries----
async function searchByAnzsco(anzscoCode) {
  const client = await makeClient();

  const req = {
    PageNumber: 1,
    PageSize: 200,
    Filter: '',
    SearchCode: true,
    SearchTitle: true,
    ClassificationFilters: {
      ClassificationFilter: [
        {
          Scheme: ANZSCO_SCHEME,
          Values: { string: [String(anzscoCode)] },
        },
      ],
    },
    TrainingComponentTypes: {
      IncludeTrainingPackage: true,
      IncludeQualification: true,
      IncludeSkillSet: true,
      IncludeAccreditedCourse: false,
      IncludeAccreditedCourseModule: false,
      IncludeUnit: false,
      IncludeUnitContextualisation: false,
    },
    IncludeDeleted: false,
    IncludeSuperseded: false,
  };

  const [resp] = await client.SearchAsync({ request: req });
  const arr = toArr(resp?.SearchResult?.Results?.TrainingComponentSummary);

  return arr
    .map(s => ({
      code: s?.Code,
      title: s?.Title,
      componentType: s?.ComponentType, // TrainingPackage | Qualification | SkillSet
      isCurrent: !!s?.IsCurrent,
      link: linkOf(s?.Code),
    }))
    .filter(x => x.code);
}

// ----Search directly by TGA code----
async function searchByCode(code) {
  const client = await makeClient();

  const req = {
    PageNumber: 1,
    PageSize: 50,
    Filter: code,
    SearchCode: true,
    SearchTitle: false,
    TrainingComponentTypes: {
      IncludeTrainingPackage: true,
      IncludeQualification: true,
      IncludeSkillSet: true,
      IncludeAccreditedCourse: false,
      IncludeAccreditedCourseModule: false,
      IncludeUnit: true,
      IncludeUnitContextualisation: false,
    },
    IncludeDeleted: false,
    IncludeSuperseded: true,
  };

  const [resp] = await client.SearchAsync({ request: req });
  const arr = toArr(resp?.SearchResult?.Results?.TrainingComponentSummary);

// Give priority to exact matching, then return the first several samples
  const exact = arr.filter(s => (s?.Code || '').toUpperCase() === code.toUpperCase());
  const list = (exact.length ? exact : arr).slice(0, 10);

  return list
    .map(s => ({
      code: s?.Code,
      title: s?.Title,
      componentType: s?.ComponentType,
      isCurrent: !!s?.IsCurrent,
      link: linkOf(s?.Code),
    }))
    .filter(x => x.code);
}


router.get('/training-advice/:code?', async (req, res) => {
  const raw = (req.params.code ?? req.query.anzsco ?? req.query.code ?? '')
    .toString()
    .trim();

  if (!raw) return res.status(400).json({ error: 'code_required' });

  try {
    const isAnzsco = /^\d{4,6}$/.test(raw);

    if (isAnzsco) {
      const items = await searchByAnzsco(raw);
      return res.json({
        input: raw,
        type: 'ANZSCO',
        count: items.length,
        items,
        note: 'Basic metadata only (sandbox).',
      });
    } else {
      const items = await searchByCode(raw);
      return res.json({
        input: raw,
        type: 'TGA',
        count: items.length,
        items,
        note: 'Basic metadata only (sandbox).',
      });
    }
  } catch (e) {
    console.error('[training-advice] error:', e?.message || e);
    res.status(502).json({ error: 'upstream_failed', detail: e?.message || String(e) });
  }
});

// ---- 
router.get('/debug/tga/ping', async (_req, res) => {
  try {
    const client = await makeClient();
    const [r] = await client.GetServerTimeAsync({});
    res.json({ ok: true, serverTime: r?.GetServerTimeResult || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;

// routes/dropbox.js — fast cards, negotiated thumbnails (AVIF/WEBP/JPEG), correct gallery sorting + orientation
const express = require('express');
const axios = require('axios');
const https = require('https');
const crypto = require('crypto');
require('dotenv').config();

// Optional relaxed JSON fallback
let JSON5 = null; try { JSON5 = require('json5'); } catch {}
// Optional image transcoder (for AVIF/WEBP). If missing, we fall back to JPEG.
let Sharp = null; try { Sharp = require('sharp'); } catch {}

const router = express.Router();

/* --------------------------------- axios --------------------------------- */
const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50, maxFreeSockets: 10 });
const AX = axios.create({ timeout: 15000, httpsAgent: keepAliveAgent });

/* ------------------------------- tiny caches ------------------------------ */
const _CACHE = new Map();
const _now = () => Date.now();
function _get(key) {
  const x = _CACHE.get(key);
  if (!x) return null;
  if (x.expires && x.expires < _now()) { _CACHE.delete(key); return null; }
  return x.value;
}
function _set(key, value, ttlMs = 10 * 60 * 1000) { _CACHE.set(key, { value, expires: _now() + ttlMs }); }

// Per-folder "project card" cache: {card, staleAfter, building}
const CARD_CACHE = new Map(); // key = folder.path_lower
const CARD_TTL_MS = 30 * 60 * 1000;            // fresh 30m
const CARD_STALE_GRACE_MS = 4 * 60 * 60 * 1000; // serve stale up to 4h while revalidating

// NEW: sidecar-order index cache (skip re-parsing sidecars when unchanged)
const ORDER_INDEX_CACHE = new Map();
const ORDER_INDEX_TTL_MS = 30 * 60 * 1000;
function _setOrderIndex(key, value) { ORDER_INDEX_CACHE.set(key, { value, expires: _now() + ORDER_INDEX_TTL_MS }); }
function _getOrderIndex(key) {
  const x = ORDER_INDEX_CACHE.get(key);
  if (!x) return null;
  if (x.expires < _now()) { ORDER_INDEX_CACHE.delete(key); return null; }
  return x.value;
}

/* ----------------------------- concurrency caps --------------------------- */
function limiter(max = 6) {
  let active = 0, q = [];
  return async fn => {
    if (active >= max) await new Promise(r => q.push(r));
    active++;
    try { return await fn(); }
    finally { active--; const n = q.shift(); if (n) n(); }
  };
}
const limitRPC = limiter(6);
const limitContent = limiter(8); // safe nudge for image/content endpoints

/* --------------------------------- helpers -------------------------------- */
const BAD_SPACES = /[\u2000-\u200A\u00A0\u202F\u205F\u3000]/g;
const BOM = /\uFEFF/g;

function cleanJsonString(s) {
  let txt = String(s)
    .replace(BOM, '')
    .replace(BAD_SPACES, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/(\d)\s*[’′]/g, '$1\u2032')
    .replace(/(\d)\s*[”″]/g, '$1\u2033')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/:\s*"([^"]*?)\s*"(?!\s*:)/g, (_m, v) => `: "${v.trim()}"`)
    .replace(/(:\s*")((?:[^"\\]|\\.)*)(")/g, (_m, open, body, close) => open + body.replace(/(?<!\\)"/g, '\\"') + close);
  return txt.trim();
}
function precleanStructuralIssues(txt) {
  return txt
    .replace(/(^|\s)\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1');
}
function safeParseJson(text, label = 'unknown.json') {
  try { return JSON.parse(text); }
  catch {
    const cleaned = cleanJsonString(text);
    try { return JSON.parse(cleaned); }
    catch {
      const pre = precleanStructuralIssues(cleaned);
      try { return JSON.parse(pre); }
      catch (e3) {
        if (JSON5) { try { return JSON5.parse(pre); } catch {} }
        console.warn(`❌ Still failed to parse ${label}.`);
        throw e3;
      }
    }
  }
}
function naturalCompare(a, b) {
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
}
function toOrderNum(v) {
  if (v === null || v === undefined) return Infinity;
  const s = String(v).trim().replace(/[^\d-]/g, '');
  if (!s) return Infinity;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : Infinity;
}
const isImage = n => /\.(jpe?g|png|gif|webp)$/i.test(n || '');
const isJson  = n => /\.json$/i.test(n || '');
const base = n => (n || '').replace(/\.[^.]+$/, '').toLowerCase();

/* ----------------------------- Dropbox token ------------------------------ */
let accessToken = null;
let _refreshing = null;

// single-process global guards (survive duplicate requires)
const INIT_FLAG_KEY = '__DROPBOX_ROUTER_INIT__';
const TIMER_KEY     = '__DROPBOX_TOKEN_TIMER__';
// debounce log to reduce duplicate-startup noise
let _lastTokenLog = 0;

async function refreshAccessToken() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    try {
      const resp = await AX.post('https://api.dropboxapi.com/oauth2/token', null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
          client_id: process.env.DROPBOX_CLIENT_ID,
          client_secret: process.env.DROPBOX_CLIENT_SECRET,
        },
      });
      const newToken = resp.data.access_token;
      if (newToken && newToken !== accessToken) {
        accessToken = newToken;
        const now = Date.now();
        if (now - _lastTokenLog > 2000) {
          console.log('🔁 Dropbox access token refreshed');
          _lastTokenLog = now;
        }
      }
    } catch (err) {
      console.error('❌ Token refresh failed:', err.response?.data || err.message);
    } finally {
      _refreshing = null;
    }
  })();
  return _refreshing;
}
async function ensureAccessToken() {
  if (accessToken) return;
  await refreshAccessToken();
}
async function initAuthOnce() {
  if (global[INIT_FLAG_KEY]) return;
  global[INIT_FLAG_KEY] = true;
  await refreshAccessToken();
  if (!global[TIMER_KEY]) {
    global[TIMER_KEY] = setInterval(refreshAccessToken, 2 * 60 * 60 * 1000);
  }
}
initAuthOnce();

/* ------------------------------ Dropbox list ------------------------------ */
async function listFolderAll(path_lower) {
  await ensureAccessToken();
  const key = `lf:${path_lower}`;
  const cached = _get(key);
  if (cached) return cached;

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const all = [];
  let resp = await limitRPC(() => AX.post(
    'https://api.dropboxapi.com/2/files/list_folder',
    { path: path_lower, recursive: false, include_non_downloadable_files: false },
    { headers }
  ));
  all.push(...(resp.data?.entries || []));
  while (resp.data?.has_more) {
    resp = await limitRPC(() => AX.post(
      'https://api.dropboxapi.com/2/files/list_folder/continue',
      { cursor: resp.data.cursor },
      { headers }
    ));
    all.push(...(resp.data?.entries || []));
  }

  _set(key, all, 3 * 60 * 1000);
  return all;
}

/* -------------------------- filename from sidecar -------------------------- */
function filenameFromLinkedImage(link) {
  if (!link || typeof link !== 'string') return null;
  try {
    let decoded = decodeURIComponent(String(link).replace(BAD_SPACES, ' ')).trim();
    decoded = decoded.split('#')[0];
    const qIndex = decoded.indexOf('?');
    if (qIndex !== -1) {
      const q = decoded.slice(qIndex + 1);
      const params = new URLSearchParams(q);
      const pv = params.get('preview');
      if (pv && /\.[a-z0-9]{3,4}$/i.test(pv)) return pv.trim().toLowerCase();
    }
    const last = decoded.split('/').pop() || '';
    const clean = last.split('?')[0].trim().toLowerCase();
    return /\.[a-z0-9]{3,4}$/i.test(clean) ? clean : null;
  } catch { return null; }
}

/* -------------------- order+orientation index from sidecars ---------------- */
// NEW: normalize project text
function normalizeOrientation(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (v === 'horizontal' || v === 'landscape') return 'horizontal';
  if (v === 'square') return 'square';
  return null;
}

async function buildOrderIndexFromSidecars(entries) {
  const jsonSidecars = (entries || [])
    .filter(e => e['.tag'] === 'file' && isJson(e.name) && e.name !== '_metadata.json');

  const imageFiles = (entries || [])
    .filter(e => e['.tag'] === 'file' && isImage(e.name));

  const byLowerName = new Map();
  const byBase = new Map();
  for (const img of imageFiles) {
    const lower = (img.name || '').toLowerCase();
    const b = base(lower);
    byLowerName.set(lower, img);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(img);
  }

  const ordByName = Object.create(null);
  const orientationByName = Object.create(null);
  const projectByName = Object.create(null);
  const zeroNames = new Set();

  await Promise.all(jsonSidecars.map(f => limitContent(async () => {
    try {
      const dl = await AX.post(
        'https://content.dropboxapi.com/2/files/download', '',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Dropbox-API-Arg': JSON.stringify({ path: f.path_lower }),
            'Content-Type': 'text/plain',
          },
          responseType: 'text',
          transformResponse: [d => d],
          validateStatus: s => s < 500,
        }
      );
      if (dl.status !== 200) { console.warn('⚠️ Sidecar download failed:', f.name, dl.status); return; }
      const meta = safeParseJson(dl.data, f.name);
      const ord = toOrderNum(meta?.order_flag);
      const orient = normalizeOrientation(meta?.orientation);
      const proj = (meta?.project ? String(meta.project).trim() : '') || null;

      let exact = filenameFromLinkedImage(meta?.linked_image);
      const assign = (candArr) => {
        for (const cand of candArr) {
          const nameLower = cand.name.toLowerCase();
          ordByName[nameLower] = ord;
          if (orient) orientationByName[nameLower] = orient;
          if (proj) projectByName[nameLower] = proj;
          if (ord === 0) zeroNames.add(nameLower);
        }
      };

      if (!exact) {
        assign(byBase.get(base(f.name.toLowerCase())) || []);
        return;
      }
      if (byLowerName.has(exact)) {
        ordByName[exact] = ord;
        if (orient) orientationByName[exact] = orient;
        if (proj) projectByName[exact] = proj;
        if (ord === 0) zeroNames.add(exact);
      } else {
        assign(byBase.get(base(exact)) || []);
      }
    } catch (err) {
      console.warn('⚠️ Sidecar parse failed:', f.name, err.response?.data || err.message);
    }
  })));

  return { ordByName, zeroNames, orientationByName, projectByName };
}

// NEW: derive a quick “version” for sidecars: max modified time + count
function sidecarVersion(entries) {
  const sidecars = (entries || [])
    .filter(e => e['.tag'] === 'file' && isJson(e.name) && e.name !== '_metadata.json');
  const maxT = sidecars.reduce((m, e) => Math.max(
    m,
    Date.parse(e.client_modified || e.server_modified || 0) || 0
  ), 0);
  return String(maxT || 0) + ':' + (sidecars.length || 0);
}

function sortAndFilterImagesByName(entries, ordByName, zeroNames) {
  const imgs = (entries || [])
    .filter(e => e['.tag'] === 'file' && isImage(e.name))
    .filter(e => !zeroNames.has((e.name || '').toLowerCase()));
  imgs.sort((a, b) => {
    const an = (a.name || '').toLowerCase();
    const bn = (b.name || '').toLowerCase();
    const ao = Object.prototype.hasOwnProperty.call(ordByName, an) ? ordByName[an] : Infinity;
    const bo = Object.prototype.hasOwnProperty.call(ordByName, bn) ? ordByName[bn] : Infinity;
    if (ao !== bo) return ao - bo;
    return naturalCompare(a.name, b.name);
  });
  return imgs;
}

/* =========================== thumbnail proxy ============================== */
const DEFAULT_THUMB = 'w640h480';

function makeThumbUrl(path_lower, size = DEFAULT_THUMB) {
  const b64 = Buffer.from(path_lower, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `/api/dropbox/thumb/${b64}?s=${encodeURIComponent(size)}`;
}

// Fetch a small JPEG from Dropbox (base), cache per (size, path)
async function fetchBaseJpeg(path_lower, size = DEFAULT_THUMB) {
  await ensureAccessToken();
  const key = `thumb:jpeg:${size}:${path_lower}`;
  const hit = _get(key);
  if (hit) return hit;

  const headers  = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const resp = await limitContent(() => AX.post(
    'https://content.dropboxapi.com/2/files/get_thumbnail_v2',
    {
      resource: { '.tag': 'path', path: path_lower },
      format: { '.tag': 'jpeg' },
      size:   { '.tag': size },
      mode:   { '.tag': 'strict' }
    },
    { headers, responseType: 'arraybuffer', validateStatus: s => s < 500 }
  ));
  if (resp.status !== 200 || !resp.data) {
    const e = new Error(`get_thumbnail_v2 ${resp.status}`);
    e.status = resp.status;
    throw e;
  }
  const buf = Buffer.from(resp.data);
  _set(key, buf, 3.5 * 60 * 60 * 1000);
  return buf;
}

// Convert to AVIF/WEBP if browser supports it and sharp is available
async function maybeTranscode(buf, wantMime) {
  if (!Sharp) return { buf, mime: 'image/jpeg' };
  try {
    if (wantMime === 'image/avif') {
      const out = await Sharp(buf).avif({ quality: 45, effort: 3 }).toBuffer();
      return { buf: out, mime: 'image/avif' };
    }
    if (wantMime === 'image/webp') {
      const out = await Sharp(buf).webp({ quality: 70 }).toBuffer();
      return { buf: out, mime: 'image/webp' };
    }
  } catch {}
  return { buf, mime: 'image/jpeg' };
}

function wantMimeFromAccept(accept = '') {
  const a = String(accept || '').toLowerCase();
  if (a.includes('image/avif')) return 'image/avif';
  if (a.includes('image/webp')) return 'image/webp';
  return 'image/jpeg';
}

async function fetchThumbNegotiated(path_lower, size, acceptHdr) {
  const want = wantMimeFromAccept(acceptHdr);
  const cacheKey = `thumb:${want}:${size}:${path_lower}`;
  const hit = _get(cacheKey);
  if (hit) return { buf: hit, mime: want };

  let base;
  try {
    base = await fetchBaseJpeg(path_lower, size);
  } catch (e) {
    const fallbacks = [DEFAULT_THUMB, 'w480h320', 'w256h256'];
    for (const s of fallbacks) {
      try { base = await fetchBaseJpeg(path_lower, s); break; } catch {}
    }
    if (!base) return { buf: null, mime: want };
  }

  const { buf, mime } = await maybeTranscode(base, want);
  _set(cacheKey, buf, 3.5 * 60 * 60 * 1000);
  return { buf, mime };
}

router.get('/thumb/:b64', async (req, res) => {
  try {
    const size = (req.query.s || DEFAULT_THUMB).toString();
    let b64 = req.params.b64.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
    const path_lower = Buffer.from(b64, 'base64').toString('utf8');

    const { buf, mime } = await fetchThumbNegotiated(path_lower, size, req.headers['accept'] || '');
    if (buf) {
      const etag = 'W/"' + crypto.createHash('sha1').update(buf).digest('base64').slice(0, 16) + `"`;
      if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=14400, stale-while-revalidate=86400');
      res.setHeader('ETag', etag);
      res.setHeader('Vary', 'Accept');
      res.send(buf);
      return;
    }
    await ensureAccessToken();
    // fallback: redirect to temp link only if we couldn't thumbnail
    const lr = await AX.post(
      'https://api.dropboxapi.com/2/files/get_temporary_link',
      { path: path_lower },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    if (lr.data?.link) { res.setHeader('Cache-Control', 'no-store'); res.redirect(302, lr.data.link); }
    else { res.status(502).end(); }
  } catch (e) {
    console.warn('thumb route error:', e.message);
    res.status(502).end();
  }
});

/* =================== FAST project card build & SWR cache ================== */
async function buildProjectCardFast(folder) {
  const entries = await listFolderAll(folder.path_lower);

  // _metadata.json (cheap)
  const metadataFile = entries.find(e => e['.tag'] === 'file' && e.name === '_metadata.json');
  let metadata = null;
  if (metadataFile) {
    try {
      const key = `meta:${metadataFile.path_lower}:${metadataFile.client_modified || metadataFile.server_modified || ''}`;
      const hit = _get(key);
      if (hit) metadata = hit;
      else {
        const r = await AX.post('https://content.dropboxapi.com/2/files/download', '', {
          headers: { Authorization: `Bearer ${accessToken}`, 'Dropbox-API-Arg': JSON.stringify({ path: metadataFile.path_lower }), 'Content-Type': 'text/plain' },
          responseType: 'text', transformResponse: [d => d], validateStatus: s => s < 500
        });
        if (r.status === 200) { metadata = safeParseJson(r.data, metadataFile.name); _set(key, metadata, 10 * 60 * 1000); }
      }
    } catch (e) { console.warn('⚠️ metadata parse failed:', folder.name, e.response?.data || e.message); }
  }

  // First real image (fast thumbnail proxy)
  const firstImg = (entries || []).find(e => e['.tag'] === 'file' && isImage(e.name));
  const thumb = firstImg ? makeThumbUrl(firstImg.path_lower || firstImg.path_display, DEFAULT_THUMB) : null;

  const orderNumeric = toOrderNum(metadata?.order_flag);
  const card = {
    id: folder.id,
    name: folder.name,
    path: folder.path_display,
    thumbnail: thumb,
    metadata,
    order: Number.isFinite(orderNumeric) ? orderNumeric : null,
  };
  return { card, entries };
}

async function refineProjectCardFromSidecars(folder, entries) {
  try {
    const { ordByName, zeroNames } = await buildOrderIndexFromSidecars(entries);
    let chosen = (entries || []).find(e => e['.tag'] === 'file' && isImage(e.name) && zeroNames.has((e.name || '').toLowerCase()));
    if (!chosen) {
      const orderedImages = sortAndFilterImagesByName(entries, ordByName, zeroNames);
      chosen = orderedImages[0];
    }
    if (!chosen) return;
    const p = chosen.path_lower || chosen.path_display;
    const refinedThumb = makeThumbUrl(p, DEFAULT_THUMB);
    const cache = CARD_CACHE.get(folder.path_lower);
    if (!cache) return;
    if (cache.card?.thumbnail !== refinedThumb) cache.card.thumbnail = refinedThumb;
  } catch (e) {
    console.warn('refine sidecars failed:', folder.name, e.message);
  }
}

async function getProjectCard(folder) {
  const key = folder.path_lower;
  const cached = CARD_CACHE.get(key);
  const fresh = cached && _now() < cached.staleAfter;
  if (fresh) return cached.card;
  if (cached && cached.building) return cached.card;

  CARD_CACHE.set(key, { card: cached?.card || null, staleAfter: _now() + CARD_STALE_GRACE_MS, building: true });
  const { card, entries } = await buildProjectCardFast(folder).catch(e => {
    console.error('card build failed:', folder.name, e.message);
    return { card: cached?.card || null, entries: null };
  });
  CARD_CACHE.set(key, { card, staleAfter: _now() + CARD_TTL_MS, building: false });

  if (entries) setTimeout(() => {
    const rec = CARD_CACHE.get(key);
    if (rec) rec.building = true;
    refineProjectCardFromSidecars(folder, entries).finally(() => {
      const cur = CARD_CACHE.get(key);
      if (cur) cur.building = false;
    });
  }, 0);

  return card;
}

/* =========================== HOME THUMB PREWARM =========================== */
// Decode the path from our /thumb/:b64 URLs so we can prewarm by path
function _decodeThumbPathFromUrl(url = '') {
  try {
    const u = new URL(url, 'http://localhost'); // base only to parse
    const m = u.pathname.match(/\/thumb\/([^/]+)$/) || u.pathname.match(/\/thumb\/([^/]+)\//) || u.pathname.match(/\/thumb\/([^?]+)/);
    const b64 = (m && m[1]) ? m[1] : null;
    if (!b64) return null;
    let b = b64.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
    return Buffer.from(b, 'base64').toString('utf8');
  } catch { return null; }
}

let _prewarming = false;
async function prewarmTopHomeThumbnails() {
  if (_prewarming) return;
  _prewarming = true;
  try {
    // Mimic /website-photos sorting to pick the same top 6
    const root = await listFolderAll('');
    const website = root.find(e => e.name === 'Website Photos' && e['.tag'] === 'folder');
    if (!website) return;

    const projects = await listFolderAll(website.path_lower);
    const folders = projects.filter(e => e['.tag'] === 'folder' && !/page/i.test(e.name));

    const cards = await Promise.all(folders.map(getProjectCard));
    const valid = cards.filter(Boolean);
    valid.sort((a, b) => {
      const ao = toOrderNum(a?.metadata?.order_flag);
      const bo = toOrderNum(b?.metadata?.order_flag);
      if (ao !== bo) return ao - bo;
      return naturalCompare(a?.name, b?.name);
    });

    const topSix = valid.slice(0, 6);
    // For each, decode the path from the thumb URL and warm all 3 mime variants
    await Promise.all(topSix.map(c => limitContent(async () => {
      const p = _decodeThumbPathFromUrl(c.thumbnail || '');
      if (!p) return;
      // Warm JPEG (Safari), WebP, and AVIF variants in cache
      await Promise.all([
        fetchThumbNegotiated(p, DEFAULT_THUMB, 'image/avif'),
        fetchThumbNegotiated(p, DEFAULT_THUMB, 'image/webp'),
        fetchThumbNegotiated(p, DEFAULT_THUMB, 'image/jpeg')
      ]);
    })));
  } catch (e) {
    console.warn('prewarmTopHomeThumbnails failed:', e.message);
  } finally {
    _prewarming = false;
  }
}
// Kick a prewarm soon after boot, then refresh periodically
setTimeout(() => { prewarmTopHomeThumbnails(); }, 2500);
setInterval(() => { prewarmTopHomeThumbnails(); }, 15 * 60 * 1000);

/* ================================ ROUTES ================================= */
// Home — fast SWR cards
router.get('/website-photos', async (req, res) => {
  try {
    const rootEntries = await listFolderAll('');
    const websitePhotosFolder = rootEntries.find(e => e.name === 'Website Photos' && e['.tag'] === 'folder');
    if (!websitePhotosFolder) return res.status(404).json({ error: 'Website Photos folder not found' });

    const projectEntries = await listFolderAll(websitePhotosFolder.path_lower);
    const projectFolders = projectEntries.filter(
      e => e['.tag'] === 'folder' && !/page/i.test(e.name)
    );

    const cards = await Promise.all(projectFolders.map(getProjectCard));
    const valid = cards.filter(Boolean);

    valid.sort((a, b) => {
      const ao = toOrderNum(a?.metadata?.order_flag);
      const bo = toOrderNum(b?.metadata?.order_flag);
      if (ao !== bo) return ao - bo;
      return naturalCompare(a?.name, b?.name);
    });

    res.setHeader('X-Card-Cache', 'SWR');
    res.json(valid);
  } catch (err) {
    console.error('❌ Failed to fetch website photos:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch website photos', details: err.message });
  }
});

/* --------- Gallery: correct sorting + thumb/display + full-size url ------- */
router.get('/files', async (req, res) => {
  try {
    const { path: folderPath = '', debug } = req.query;

    // helpers for robust ordering
    const seqFromName = (name = '') => {
      const m = String(name).match(/(?:^|[^\d])(\d{1,6})(?!\d)/);
      if (!m) return Infinity;
      const n = parseInt(m[1], 10);
      return Number.isFinite(n) ? n : Infinity;
    };
    const safeTime = (t) => {
      const n = Date.parse(t || '');
      return Number.isFinite(n) ? n : Infinity;
    };

    const entries = await listFolderAll(folderPath);

    // NEW: sidecar index cache
    const ver = sidecarVersion(entries);
    const ordKey = `ordidx:${String(folderPath || '').toLowerCase()}:${ver}`;
    let ordIdx = _getOrderIndex(ordKey);
    if (!ordIdx) { ordIdx = await buildOrderIndexFromSidecars(entries); _setOrderIndex(ordKey, ordIdx); }
    const { ordByName, zeroNames, orientationByName = {}, projectByName = {} } = ordIdx;

    const imageEntries = (entries || []).filter(e => e['.tag'] === 'file' && isImage(e.name));

    // exclude order=0 and build sorting keys
    const annotated = imageEntries
      .map(e => {
        const nameLower = (e.name || '').toLowerCase();
        const orderFlag = Object.prototype.hasOwnProperty.call(ordByName, nameLower)
          ? ordByName[nameLower]
          : Infinity;
        const orient = orientationByName[nameLower] || null;
        const proj   = projectByName[nameLower] || null;
        return {
          entry: e,
          ord: Number.isFinite(orderFlag) ? orderFlag : Infinity, // primary
          seq: seqFromName(e.name),                               // tiebreak 1
          t:   safeTime(e.client_modified),                       // tiebreak 2
          isZero: zeroNames.has(nameLower),
          orient,
          proj
        };
      })
      .filter(x => !x.isZero);

    annotated.sort((a, b) => {
      if (a.ord !== b.ord) return a.ord - b.ord;
      if (a.seq !== b.seq) return a.seq - b.seq;
      if (a.t !== b.t)     return a.t - b.t;
      return naturalCompare(a.entry.name, b.entry.name);
    });

    // Use proxy for all image sizes — removes get_temporary_link calls
    const images = await Promise.all(
      annotated.map(({ entry, ord, orient, proj }) => limitRPC(async () => {
        try {
          const pathL = entry.path_display || entry.path_lower;
          const thumb   = makeThumbUrl(pathL, 'w480h320');
          const display = makeThumbUrl(pathL, 'w1024h768');
          const large   = makeThumbUrl(pathL, 'w1600h1200'); // or 'w2048h1536'

          return {
            url: large,              // full-size via proxy
            display,                 // mid-size (use this for main image)
            thumb,                   // small preview
            name: entry.name,
            path: pathL,
            size: entry.size,
            client_modified: entry.client_modified,
            order: Number.isFinite(ord) ? ord : null,
            is_zero: false,
            orientation: orient,
            project: proj || null
          };
        } catch (err) {
          console.error('⚠️ Error building file entry:', entry.name, err.response?.data || err.message);
          return null;
        }
      }))
    );

    if (String(debug) === '1') {
      const allImageNames = imageEntries.map(e => e.name);
      return res.json({
        images: images.filter(Boolean),
        _debug: {
          zeroNames: Array.from(zeroNames),
          allImageNames,
          sortedNames: annotated.map(x => ({
            name: x.entry.name,
            ord: Number.isFinite(x.ord) ? x.ord : null,
            seq: x.seq,
            t: x.t,
            orientation: x.orient || null,
            project: x.proj || null
          })),
        }
      });
    }

    res.json({ images: images.filter(Boolean) });
  } catch (err) {
    console.error('❌ Failed to fetch files:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch files', details: err.message });
  }
});

/* ------------------------------- By-category ------------------------------ */
/* Resolve the category to ONE folder via _metadata.json.category,
   then populate images from that SAME folder (exactly like /files). */
router.get('/by-category', async (req, res) => {
  const t0 = Date.now();
  try {
    const rawCat = (req.query.category || '').toString().trim();
    const debug = String(req.query.debug || '') === '1';
    if (!rawCat) return res.status(400).json({ error: 'Missing category param' });

    const wantCat = rawCat.toLowerCase().replace(/-/g, ' ').trim();

    // 1) Find "Website Photos" root
    const rootEntries = await listFolderAll('');
    const websitePhotosFolder = rootEntries.find(
      e => e.name === 'Website Photos' && e['.tag'] === 'folder'
    );
    if (!websitePhotosFolder) {
      return res.status(404).json({ error: 'Website Photos folder not found' });
    }

    // 2) Scan immediate subfolders to find the ONE whose _metadata.json.category matches
    const projectEntries = await listFolderAll(websitePhotosFolder.path_lower);
    const projectFolders = projectEntries.filter(e => e['.tag'] === 'folder');

    let matchFolder = null;

    for (const folder of projectFolders) {
      try {
        const entries = await listFolderAll(folder.path_lower);
        const metadataFile = entries.find(
          e => e['.tag'] === 'file' && e.name === '_metadata.json'
        );
        if (!metadataFile) continue;

        const cacheKey = `meta:${metadataFile.path_lower}:${metadataFile.client_modified || metadataFile.server_modified || ''}`;
        let meta = _get(cacheKey);
        if (!meta) {
          const r = await AX.post('https://content.dropboxapi.com/2/files/download', '', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Dropbox-API-Arg': JSON.stringify({ path: metadataFile.path_lower }),
              'Content-Type': 'text/plain'
            },
            responseType: 'text',
            transformResponse: [d => d],
            validateStatus: s => s < 500
          });
          if (r.status !== 200) continue;
          meta = safeParseJson(r.data, metadataFile.name);
          _set(cacheKey, meta, 10 * 60 * 1000);
        }

        const cat = String(meta?.category || '').toLowerCase().trim();
        if (cat && cat === wantCat) {
          matchFolder = { folder, entries };
          break;
        }
      } catch (e) {
        console.warn('by-category scan error:', folder.name, e.message);
      }
    }

    if (!matchFolder) {
      return res.status(404).json({ error: `No folder found for category "${rawCat}"` });
    }

    // 3) Build images for THAT folder only (same logic as /files)
    const { folder, entries } = matchFolder;

    // NEW: sidecar index cache
    const ver = sidecarVersion(entries);
    const ordKey = `ordidx:${String(folder.path_lower || folder.path_display || '').toLowerCase()}:${ver}`;
    let ordIdx = _getOrderIndex(ordKey);
    if (!ordIdx) { ordIdx = await buildOrderIndexFromSidecars(entries); _setOrderIndex(ordKey, ordIdx); }
    const { ordByName, zeroNames, orientationByName = {}, projectByName = {} } = ordIdx;

    const imageEntries = (entries || []).filter(e => e['.tag'] === 'file' && isImage(e.name));

    const seqFromName = (name = '') => {
      const m = String(name).match(/(?:^|[^\d])(\d{1,6})(?!\d)/);
      if (!m) return Infinity;
      const n = parseInt(m[1], 10);
      return Number.isFinite(n) ? n : Infinity;
    };
    const safeTime = (t) => {
      const n = Date.parse(t || '');
      return Number.isFinite(n) ? n : Infinity;
    };

    const annotated = imageEntries
      .map(e => {
        const nameLower = (e.name || '').toLowerCase();
        const ord = Object.prototype.hasOwnProperty.call(ordByName, nameLower)
          ? ordByName[nameLower]
          : Infinity;
        return {
          entry: e,
          ord: Number.isFinite(ord) ? ord : Infinity,
          seq: seqFromName(e.name),
          t:   safeTime(e.client_modified),
          isZero: zeroNames.has(nameLower),
          orient: orientationByName[nameLower] || null,
          proj:   projectByName[nameLower] || null
        };
      })
      .filter(x => !x.isZero);

    annotated.sort((a, b) => {
      if (a.ord !== b.ord) return a.ord - b.ord;
      if (a.seq !== b.seq) return a.seq - b.seq;
      if (a.t !== b.t)     return a.t - b.t;
      return naturalCompare(a.entry.name, b.entry.name);
    });

    // Use proxy sizes; remove temp-link calls
    const images = await Promise.all(
      annotated.map(({ entry, ord, orient, proj }) => limitRPC(async () => {
        try {
          const pathL = entry.path_display || entry.path_lower;
          const thumb   = makeThumbUrl(pathL, 'w480h320');
          const display = makeThumbUrl(pathL, 'w1024h768');
          const large   = makeThumbUrl(pathL, 'w1600h1200');

          return {
            url: large,
            display,
            thumb,
            name: entry.name,
            path: pathL,
            size: entry.size,
            client_modified: entry.client_modified,
            order: Number.isFinite(ord) ? ord : null,
            is_zero: false,
            orientation: orient,
            project: proj || null,
            folder: {
              id: folder.id,
              name: folder.name,
              path: folder.path_display || folder.path_lower
            }
          };
        } catch (err) {
          console.error('⚠️ temp build failed:', entry.name, err.response?.data || err.message);
          return null;
        }
      }))
    );

    const payload = {
      images: images.filter(Boolean),
      category: rawCat,
      _debug: debug ? { ms: Date.now() - t0, folder: folder.path_display || folder.path_lower } : undefined
    };
    res.json(payload);
  } catch (err) {
    console.error('❌ Failed to fetch images by category:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch images by category', details: err.message });
  }
});

/* ------------------------ Category -> Folder resolver --------------------- */
const CATMAP_TTL_MS = 10 * 60 * 1000; // 10 minutes

router.get('/folder-by-category', async (req, res) => {
  try {
    const rawCat = String(req.query.category || '').trim();
    if (!rawCat) return res.status(400).json({ error: 'Missing category param' });

    const wantCat = rawCat.toLowerCase().replace(/-/g, ' ').trim();

    // cached?
    const ck = `catmap:${wantCat}`;
    const cached = _get(ck);
    if (cached) return res.json(cached);

    // find "Website Photos"
    const rootEntries = await listFolderAll('');
    const websitePhotosFolder = rootEntries.find(
      e => e.name === 'Website Photos' && e['.tag'] === 'folder'
    );
    if (!websitePhotosFolder) {
      return res.status(404).json({ error: 'Website Photos folder not found' });
    }

    // iterate immediate subfolders (projects)
    const projectEntries = await listFolderAll(websitePhotosFolder.path_lower);
    const projectFolders = projectEntries.filter(e => e['.tag'] === 'folder');

    for (const folder of projectFolders) {
      try {
        const entries = await listFolderAll(folder.path_lower);
        const metadataFile = entries.find(
          e => e['.tag'] === 'file' && e.name === '_metadata.json'
        );
        if (!metadataFile) continue;

        const cacheKey = `meta:${metadataFile.path_lower}:${metadataFile.client_modified || metadataFile.server_modified || ''}`;
        let meta = _get(cacheKey);
        if (!meta) {
          const r = await AX.post('https://content.dropboxapi.com/2/files/download', '', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Dropbox-API-Arg': JSON.stringify({ path: metadataFile.path_lower }),
              'Content-Type': 'text/plain'
            },
            responseType: 'text',
            transformResponse: [d => d],
            validateStatus: s => s < 500
          });
          if (r.status !== 200) continue;
          meta = safeParseJson(r.data, metadataFile.name);
          _set(cacheKey, meta, 10 * 60 * 1000);
        }

        const cat = String(meta?.category || '').toLowerCase().trim();
        if (!cat) continue;

        if (cat === wantCat) {
          const out = {
            folder: {
              id: folder.id,
              name: folder.name,
              path: folder.path_display || folder.path_lower
            },
            category: rawCat
          };
          _set(ck, out, CATMAP_TTL_MS);
          return res.json(out);
        }
      } catch (e) {
        console.warn('folder-by-category scan error:', folder.name, e.message);
        continue;
      }
    }

    return res.status(404).json({ error: `No folder found for category "${rawCat}"` });
  } catch (err) {
    console.error('❌ folder-by-category failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to resolve category to folder', details: err.message });
  }
});

/* ------------------------ NEW: Project -> Folder resolver ----------------- */
router.get('/folder-by-project', async (req, res) => {
  try {
    const rawProj = String(req.query.project || '').trim();
    if (!rawProj) return res.status(400).json({ error: 'Missing project param' });

    const norm = (s) => String(s || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const want = norm(rawProj);

    const ck = `projmap:${want}`;
    const cached = _get(ck);
    if (cached) return res.json(cached);

    // find "Website Photos"
    const rootEntries = await listFolderAll('');
    const websitePhotosFolder = rootEntries.find(
      e => e.name === 'Website Photos' && e['.tag'] === 'folder'
    );
    if (!websitePhotosFolder) {
      return res.status(404).json({ error: 'Website Photos folder not found' });
    }

    // iterate immediate subfolders (projects)
    const projectEntries = await listFolderAll(websitePhotosFolder.path_lower);
    const projectFolders = projectEntries.filter(e => e['.tag'] === 'folder');

    // 1) direct name match
    let target = projectFolders.find(f => norm(f.name) === want);

    // 2) fallback: check _metadata.json title if needed
    if (!target) {
      for (const folder of projectFolders) {
        try {
          const entries = await listFolderAll(folder.path_lower);
          const metadataFile = entries.find(e => e['.tag'] === 'file' && e.name === '_metadata.json');
          if (!metadataFile) continue;

          const cacheKey = `meta:${metadataFile.path_lower}:${metadataFile.client_modified || metadataFile.server_modified || ''}`;
          let meta = _get(cacheKey);
          if (!meta) {
            const r = await AX.post('https://content.dropboxapi.com/2/files/download', '', {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Dropbox-API-Arg': JSON.stringify({ path: metadataFile.path_lower }),
                'Content-Type': 'text/plain'
              },
              responseType: 'text',
              transformResponse: [d => d],
              validateStatus: s => s < 500
            });
            if (r.status !== 200) continue;
            meta = safeParseJson(r.data, metadataFile.name);
            _set(cacheKey, meta, 10 * 60 * 1000);
          }

          const title = norm(meta?.title || '');
          if (title && title === want) { target = folder; break; }
        } catch (e) {
          console.warn('folder-by-project metadata scan error:', folder.name, e.message);
        }
      }
    }

    if (!target) return res.status(404).json({ error: `No folder found for project "${rawProj}"` });

    const out = {
      folder: {
        id: target.id,
        name: target.name,
        path: target.path_display || target.path_lower
      },
      project: rawProj
    };
    _set(ck, out, CATMAP_TTL_MS);
    res.json(out);
  } catch (err) {
    console.error('❌ folder-by-project failed:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to resolve project to folder', details: err.message });
  }
});

module.exports = router;

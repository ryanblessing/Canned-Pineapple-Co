const express = require('express');
const axios = require('axios');
require('dotenv').config();

// Optional relaxed parser fallback (handles comments, trailing commas, unquoted keys, single quotes)
let JSON5 = null;
try { JSON5 = require('json5'); } catch (_) {}

const router = express.Router();
let accessToken = null;

/* --------------------------- light in-memory cache --------------------------- */
// super simple per-process cache; for prod use Redis or similar
const _CACHE = new Map();
const _now = () => Date.now();
function _get(key) {
  const x = _CACHE.get(key);
  if (!x) return null;
  if (x.expires && x.expires < _now()) { _CACHE.delete(key); return null; }
  return x.value;
}
function _set(key, value, ttlMs = 10 * 60 * 1000) { // default 10 minutes
  _CACHE.set(key, { value, expires: _now() + ttlMs });
}

/* --------------------------- helpers (sorting/parsing) --------------------------- */

// Gremlin catchers
const BAD_SPACES = /[\u2000-\u200A\u00A0\u202F\u205F\u3000]/g; // EN/EM/THIN/NBSP/etc.
const BOM = /\uFEFF/g; // byte-order mark

function cleanJsonString(s) {
  let txt = String(s)
    .replace(BOM, '')
    .replace(BAD_SPACES, ' ')
    .replace(/\r\n?/g, '\n');

  // feet/inches → prime/double-prime
  txt = txt
    .replace(/(\d)\s*[’′]/g, '$1\u2032')
    .replace(/(\d)\s*[”″]/g, '$1\u2033');

  // smart quotes → straight
  txt = txt.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // trim inside quoted values
  txt = txt.replace(/:\s*"([^"]*?)\s*"(?!\s*:)/g, (_m, v) => `: "${v.trim()}"`);

  // escape stray " inside value strings
  txt = txt.replace(/(:\s*")((?:[^"\\]|\\.)*)(")/g, (_m, open, body, close) => {
    const safeBody = body.replace(/(?<!\\)"/g, '\\"');
    return open + safeBody + close;
  });

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
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = cleanJsonString(text);
    try {
      return JSON.parse(cleaned);
    } catch {
      const pre = precleanStructuralIssues(cleaned);
      try {
        return JSON.parse(pre);
      } catch (e3) {
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

// STRONG numeric parse (handles thin spaces/odd chars)
function toOrderNum(v) {
  if (v === null || v === undefined) return Infinity;
  const s = String(v).trim().replace(/[^\d-]/g, ''); // digits/minus only
  if (!s) return Infinity;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : Infinity;
}

const isImage = (name) => /\.(jpe?g|png|gif|webp)$/i.test(name || '');
const isJson  = (name) => /\.json$/i.test(name || '');
const base = (name) => (name || '').replace(/\.[^.]+$/, '').toLowerCase();

/* --------------------------- dropbox list: fetch ALL entries --------------------------- */

async function listFolderAll(path_lower) {
  const key = `lf:${path_lower}`;
  const cached = _get(key);
  if (cached) return cached;

  const all = [];
  let resp = await axios.post(
    'https://api.dropboxapi.com/2/files/list_folder',
    { path: path_lower, recursive: false, include_non_downloadable_files: false },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  all.push(...(resp.data?.entries || []));
  while (resp.data?.has_more) {
    resp = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder/continue',
      { cursor: resp.data.cursor },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    all.push(...(resp.data?.entries || []));
  }

  _set(key, all, 5 * 60 * 1000); // cache 5 min
  return all;
}

/* --------------------------- filename extraction from linked_image --------------------------- */

/**
 * Return EXACT filename (lowercased) from a linked_image URL, including its extension.
 * Examples it handles:
 *   .../Queens?preview=nashville-mural-foo.jpg
 *   .../some/path/nashville-mural-foo.jpg
 */
function filenameFromLinkedImage(link) {
  if (!link || typeof link !== 'string') return null;
  try {
    // Normalize spaces, decode, strip anchors
    let decoded = decodeURIComponent(String(link).replace(BAD_SPACES, ' ')).trim();
    decoded = decoded.split('#')[0];

    // Prefer ?preview=xyz.jpg
    const qIndex = decoded.indexOf('?');
    if (qIndex !== -1) {
      const q = decoded.slice(qIndex + 1);
      const params = new URLSearchParams(q);
      const pv = params.get('preview');
      if (pv && /\.[a-z0-9]{3,4}$/i.test(pv)) {
        return pv.trim().toLowerCase();
      }
    }

    // Fallback: last path segment
    const last = decoded.split('/').pop() || '';
    const clean = last.split('?')[0].trim().toLowerCase();
    if (/\.[a-z0-9]{3,4}$/i.test(clean)) return clean;
    return null;
  } catch {
    return null;
  }
}

/* --------------------------- ORDER mapping built by EXACT filename --------------------------- */

async function buildOrderIndexFromSidecars(entries) {
  const jsonSidecars = (entries || [])
    .filter(e => e['.tag'] === 'file' && isJson(e.name) && e.name !== '_metadata.json');

  const imageFiles = (entries || [])
    .filter(e => e['.tag'] === 'file' && isImage(e.name));

  // quick lookup by lowercase filename and by basename
  const byLowerName = new Map();
  const byBase = new Map(); // basename -> array of entries
  for (const img of imageFiles) {
    const lower = (img.name || '').toLowerCase();
    const b = base(lower);
    byLowerName.set(lower, img);
    if (!byBase.has(b)) byBase.set(b, []);
    byBase.get(b).push(img);
  }

  const ordByName = Object.create(null); // name.ext -> order
  const zeroNames = new Set();           // name.ext where order===0

  await Promise.all(jsonSidecars.map(async (f) => {
    try {
      const dl = await axios.post(
        'https://content.dropboxapi.com/2/files/download',
        '',
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
      if (dl.status !== 200) {
        console.warn('⚠️ Sidecar download failed:', f.name, dl.status);
        return;
      }
      const meta = safeParseJson(dl.data, f.name);
      const ord = toOrderNum(meta?.order_flag);

      // 1) Try exact filename from linked_image
      let exact = filenameFromLinkedImage(meta?.linked_image);

      // 2) Fallback to any image that shares the sidecar basename
      if (!exact) {
        const sidecarBase = base(f.name.toLowerCase());
        const candidates = byBase.get(sidecarBase) || [];
        if (candidates.length) {
          for (const cand of candidates) {
            const nameLower = cand.name.toLowerCase();
            ordByName[nameLower] = ord;
            if (ord === 0) zeroNames.add(nameLower);
          }
          return;
        }
      }

      if (exact) {
        if (byLowerName.has(exact)) {
          ordByName[exact] = ord;
          if (ord === 0) zeroNames.add(exact);
        } else {
          // Final fallback: map all that share the basename
          const b = base(exact);
          const candidates = byBase.get(b) || [];
          for (const cand of candidates) {
            const nameLower = cand.name.toLowerCase();
            ordByName[nameLower] = ord;
            if (ord === 0) zeroNames.add(nameLower);
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ Sidecar parse failed:', f.name, err.response?.data || err.message);
    }
  }));

  return { ordByName, zeroNames };
}

/* --------------------------- Sorting & Excluding by exact filename --------------------------- */

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

/* --------------------------- Thumbnail (project card) from order===0 --------------------------- */

async function pickThumbnailFromZero(entries, zeroNames, folderName) {
  const zeroImg = (entries || []).find(e =>
    e['.tag'] === 'file' &&
    isImage(e.name) &&
    zeroNames.has((e.name || '').toLowerCase())
  );
  if (!zeroImg) return null;

  try {
    const linkResponse = await axios.post(
      'https://api.dropboxapi.com/2/files/get_temporary_link',
      { path: zeroImg.path_lower || zeroImg.path_display },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return linkResponse.data?.link || null;
  } catch (err) {
    console.warn(`⚠️ Could not get zero-order thumbnail for ${folderName}:`, err.response?.data || err.message);
    return null;
  }
}

/* --------------------------------- auth refresh -------------------------------- */

async function refreshAccessToken() {
  try {
    const response = await axios.post('https://api.dropboxapi.com/oauth2/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: process.env.DROPBOX_REFRESH_TOKEN,
        client_id: process.env.DROPBOX_CLIENT_ID,
        client_secret: process.env.DROPBOX_CLIENT_SECRET,
      },
    });
    accessToken = response.data.access_token;
    console.log('🔁 Dropbox access token refreshed');
  } catch (err) {
    console.error('❌ Token refresh failed:', err.response?.data || err.message);
  }
}
refreshAccessToken();
setInterval(refreshAccessToken, 2 * 60 * 60 * 1000);

/* --------------------------- GET /api/dropbox/website-photos --------------------------- */

router.get('/website-photos', async (req, res) => {
  try {
    const rootEntries = await listFolderAll('');
    const websitePhotosFolder = rootEntries.find(
      entry => entry.name === 'Website Photos' && entry['.tag'] === 'folder'
    );
    if (!websitePhotosFolder) {
      return res.status(404).json({ error: 'Website Photos folder not found' });
    }
    console.log('📂 Found Website Photos folder');

    const projectEntries = await listFolderAll(websitePhotosFolder.path_lower);
    const projectFolders = projectEntries.filter(e => e['.tag'] === 'folder');
    console.log(`📁 Found ${projectFolders.length} project folders`);

    const projects = await Promise.all(projectFolders.map(async (folder) => {
      try {
        const entries = await listFolderAll(folder.path_lower);

        // _metadata.json
        const metadataFile = entries.find(e => e.name === '_metadata.json' && e['.tag'] === 'file');
        let metadata = null;
        if (metadataFile) {
          try {
            const key = `meta:${metadataFile.path_lower}:${metadataFile.client_modified || metadataFile.server_modified || ''}`;
            const cachedMeta = _get(key);
            if (cachedMeta) {
              metadata = cachedMeta;
            } else {
              const metadataResponse = await axios.post(
                'https://content.dropboxapi.com/2/files/download',
                '',
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: metadataFile.path_lower }),
                    'Content-Type': 'text/plain',
                  },
                  responseType: 'text',
                  transformResponse: [d => d],
                  validateStatus: s => s < 500,
                }
              );
              if (metadataResponse.status === 200) {
                metadata = safeParseJson(metadataResponse.data, metadataFile.name);
                _set(key, metadata, 10 * 60 * 1000);
              }
            }
            console.log(`✅ Parsed metadata for ${folder.name}`);
          } catch (err) {
            const body = err?.response?.data;
            const summary = body?.error_summary || body || err.message;
            console.warn(`⚠️ Could not parse metadata for ${folder.name}:`, summary);
          }
        } else {
          console.warn(`ℹ️ No _metadata.json found in ${folder.name}`);
        }

        // Build exact filename index for sidecars
        const { ordByName, zeroNames } = await buildOrderIndexFromSidecars(entries);

        // Prefer project-card thumbnail from order=0
        let thumbnail = await pickThumbnailFromZero(entries, zeroNames, folder.name);

        // Fallback: first non-zero ordered image
        if (!thumbnail) {
          const orderedImages = sortAndFilterImagesByName(entries, ordByName, zeroNames);
          const first = orderedImages[0];
          if (first) {
            try {
              const linkResponse = await axios.post(
                'https://api.dropboxapi.com/2/files/get_temporary_link',
                { path: first.path_lower || first.path_display },
                { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
              );
              thumbnail = linkResponse.data.link;
            } catch (err) {
              console.warn(`⚠️ Could not get fallback thumbnail for ${folder.name}:`, err.response?.data || err.message);
            }
          }
        }

        const orderNumeric = toOrderNum(metadata?.order_flag);
        return {
          id: folder.id,
          name: folder.name,
          path: folder.path_display,
          thumbnail,
          metadata,
          order: Number.isFinite(orderNumeric) ? orderNumeric : null,
        };
      } catch (err) {
        console.error(`❌ Error processing folder ${folder.name}:`, err.message);
        return null;
      }
    }));

    const validProjects = projects.filter(Boolean);
    validProjects.sort((a, b) => {
      const ao = toOrderNum(a?.metadata?.order_flag);
      const bo = toOrderNum(b?.metadata?.order_flag);
      if (ao !== bo) return ao - bo;
      return naturalCompare(a?.name, b?.name);
    });

    res.json(validProjects);
  } catch (err) {
    console.error('❌ Failed to fetch website photos:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch website photos', details: err.message });
  }
});

/* --------------------------- GET /api/dropbox/files (project gallery) --------------------------- */

router.get('/files', async (req, res) => {
  try {
    const { path: folderPath = '', debug } = req.query;

    // a) Fetch all entries in the folder
    const entries = await listFolderAll(folderPath);

    // b) Build exact filename → order map (+ zero set)
    const { ordByName, zeroNames } = await buildOrderIndexFromSidecars(entries);

    // c) Gather image files and compute their order
    const imageEntries = (entries || []).filter(e => e['.tag'] === 'file' && isImage(e.name));

    const annotated = imageEntries
      .map(e => {
        const nameLower = (e.name || '').toLowerCase();
        const ord = Object.prototype.hasOwnProperty.call(ordByName, nameLower)
          ? ordByName[nameLower]
          : Infinity;
        const isZero = zeroNames.has(nameLower);
        return { entry: e, nameLower, ord, isZero };
      })
      .filter(x => !x.isZero) // exclude order 0
      .sort((a, b) => {
        if (a.ord !== b.ord) return a.ord - b.ord;  // 1,2,3,... then Infinity
        return naturalCompare(a.entry.name, b.entry.name);
      });

    // d) Build response in this exact sorted order
    const images = await Promise.all(
      annotated.map(async ({ entry, ord }) => {
        try {
          const lr = await axios.post(
            'https://api.dropboxapi.com/2/files/get_temporary_link',
            { path: entry.path_display || entry.path_lower },
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
          );
          return {
            url: lr.data.link,
            name: entry.name,
            path: entry.path_display || entry.path_lower,
            size: entry.size,
            client_modified: entry.client_modified,
            order: Number.isFinite(ord) ? ord : null, // 1,2,3,… or null
            is_zero: false, // since we filtered above, but keep an explicit flag
          };
        } catch (err) {
          console.error('⚠️ Error getting link for file:', entry.name, err.response?.data || err.message);
          return null;
        }
      })
    );

    // e) Optional debug payload to see exactly what the server thinks
    if (String(debug) === '1') {
      const allImageNames = imageEntries.map(e => e.name);
      return res.json({
        images: images.filter(Boolean),
        _debug: {
          ordByName_sample: Object.fromEntries(Object.entries(ordByName).slice(0, 25)),
          zeroNames: Array.from(zeroNames),
          allImageNames,
          sortedNames: annotated.map(x => ({ name: x.entry.name, ord: Number.isFinite(x.ord) ? x.ord : null })),
        }
      });
    }

    res.json({ images: images.filter(Boolean) });
  } catch (err) {
    console.error('❌ Failed to fetch files:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch files', details: err.message });
  }
});

/* --------------------------- HELPER: meta index incl. category (cached) --------------------------- */
/**
 * Builds:
 *  - metaByName: { 'file.jpg': { order, category } }
 *  - zeroNames: Set of names where order==0
 * Uses linked_image exact filename OR basename fallback, same as your order index.
 * Cached per-folder.
 */
async function buildMetaIndexFromSidecarsCached(entries, folderKey) {
  const ck = `metaix:${folderKey}`;
  const hit = _get(ck);
  if (hit) return hit;

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

  const metaByName = Object.create(null);
  const zeroNames = new Set();

  await Promise.all(jsonSidecars.map(async (f) => {
    try {
      const dl = await axios.post(
        'https://content.dropboxapi.com/2/files/download',
        '',
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
      if (dl.status !== 200) return;

      const meta = safeParseJson(dl.data, f.name);
      const ord = toOrderNum(meta?.order_flag);
      const category = (meta?.category || '').toString().trim();
      const exact = filenameFromLinkedImage(meta?.linked_image);

      const applyTo = (arr) => {
        for (const cand of arr) {
          const key = cand.name.toLowerCase();
          metaByName[key] = { order: ord, category };
          if (ord === 0) zeroNames.add(key);
        }
      };

      if (exact && byLowerName.has(exact)) {
        metaByName[exact] = { order: ord, category };
        if (ord === 0) zeroNames.add(exact);
      } else if (exact) {
        const b = base(exact);
        applyTo(byBase.get(b) || []);
      } else {
        const sidecarBase = base(f.name.toLowerCase());
        applyTo(byBase.get(sidecarBase) || []);
      }
    } catch (err) {
      console.warn('⚠️ Sidecar parse failed (meta index):', f.name, err.response?.data || err.message);
    }
  }));

  const out = { metaByName, zeroNames };
  _set(ck, out, 10 * 60 * 1000); // cache 10 min
  return out;
}

/* --------------------------- helper: temp link cache --------------------------- */
async function getTempLinkCached(path_lower) {
  const k = `tl:${path_lower}`;
  const hit = _get(k);
  if (hit) return hit;
  const resp = await axios.post(
    'https://api.dropboxapi.com/2/files/get_temporary_link',
    { path: path_lower },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
  );
  const link = resp.data?.link || null;
  // Temp links last ~4 hours; cache ~3.5h to be safe
  _set(k, link, 3.5 * 60 * 60 * 1000);
  return link;
}

/* --------------------------- GET /api/dropbox/by-category --------------------------- */
/**
 * Returns ALL images across Website Photos whose sidecar has category=<param>.
 * - Case-insensitive, hyphen-insensitive ("gold-leaf" → "gold leaf")
 * - Excludes order_flag===0
 * - ?debug=1 returns some counts to help diagnose
 * Example: /api/dropbox/by-category?category=signs
 */
router.get('/by-category', async (req, res) => {
  const t0 = Date.now();
  try {
    const rawCat = (req.query.category || '').toString().trim();
    const debug = String(req.query.debug || '') === '1';
    if (!rawCat) return res.status(400).json({ error: 'Missing category param' });

    // normalize slug: "gold-leaf" -> "gold leaf"
    const wantCat = rawCat.toLowerCase().replace(/-/g, ' ').trim();

    // Find Website Photos root
    const rootEntries = await listFolderAll('');
    const websitePhotosFolder = rootEntries.find(
      entry => entry.name === 'Website Photos' && entry['.tag'] === 'folder'
    );
    if (!websitePhotosFolder) {
      return res.status(404).json({ error: 'Website Photos folder not found' });
    }

    // List project folders
    const projectEntries = await listFolderAll(websitePhotosFolder.path_lower);
    const projectFolders = projectEntries.filter(e => e['.tag'] === 'folder');

    const results = [];
    let foldersScanned = 0, imagesConsidered = 0, imagesMatched = 0;

    for (const folder of projectFolders) {
      try {
        const entries = await listFolderAll(folder.path_lower);
        const { metaByName, zeroNames } = await buildMetaIndexFromSidecarsCached(entries, folder.path_lower);

        // Build candidates for this folder (non-zero images only)
        const imgs = (entries || []).filter(e => e['.tag'] === 'file' && isImage(e.name));
        for (const e of imgs) {
          imagesConsidered++;
          const key = (e.name || '').toLowerCase();
          if (zeroNames.has(key)) continue;
          const meta = metaByName[key] || {};
          const cat = (meta.category || '').toString().trim().toLowerCase();
          if (!cat || cat !== wantCat) continue;

          const pathL = e.path_lower || e.path_display;
          let url = null;
          try {
            url = await getTempLinkCached(pathL);
          } catch (err) {
            console.warn('⚠️ temp link failed:', e.name, err.response?.data || err.message);
            continue; // skip this one rather than bombing the whole request
          }

          results.push({
            url,
            name: e.name,
            path: pathL,
            category: meta.category || '',
            order: Number.isFinite(meta.order) ? meta.order : null,
            folder: { id: folder.id, name: folder.name, path: folder.path_display }
          });
          imagesMatched++;
        }

        foldersScanned++;
      } catch (folderErr) {
        console.warn(`⚠️ Skipping folder due to error: ${folder.name}`, folderErr.response?.data || folderErr.message);
        continue; // keep scanning other folders
      }
    }

    // Sort: folder name, then image order, then natural filename
    results.sort((a, b) => {
      const nf = naturalCompare(a.folder?.name, b.folder?.name);
      if (nf !== 0) return nf;
      const ao = Number.isFinite(a.order) ? a.order : Infinity;
      const bo = Number.isFinite(b.order) ? b.order : Infinity;
      if (ao !== bo) return ao - bo;
      return naturalCompare(a.name, b.name);
    });

    const payload = { images: results, category: rawCat };
    if (debug) {
      payload._debug = {
        normalizedCategory: wantCat,
        foldersScanned,
        imagesConsidered,
        imagesMatched,
        ms: Date.now() - t0
      };
    }

    res.json(payload);
  } catch (err) {
    console.error('❌ Failed to fetch images by category:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch images by category', details: err.message });
  }
});

module.exports = router;

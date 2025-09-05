const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

let accessToken = null;

/* --------------------------- helpers (sorting/parsing) --------------------------- */

function cleanJsonString(s) {
  return String(s)
    .replace(/^\uFEFF/, '')     // strip BOM
    .replace(/[“”]/g, '"')      // smart double quotes -> "
    .replace(/[‘’]/g, "'")      // smart single quotes -> '
    .trim();
}

function naturalCompare(a, b) {
  return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
}

function toOrderNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : Infinity; // push missing/invalid to the end
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
    // 1) list root and find "Website Photos"
    const rootResponse = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      { path: '' },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const websitePhotosFolder = rootResponse.data.entries.find(
      entry => entry.name === 'Website Photos' && entry['.tag'] === 'folder'
    );
    if (!websitePhotosFolder) {
      return res.status(404).json({ error: 'Website Photos folder not found' });
    }
    console.log('📂 Found Website Photos folder');

    // 2) list project folders inside it
    const websitePhotosResponse = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      { path: websitePhotosFolder.path_lower },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const projectFolders = websitePhotosResponse.data.entries.filter(
      entry => entry['.tag'] === 'folder'
    );
    console.log(`📁 Found ${projectFolders.length} project folders`);

    // 3) for each project folder, read metadata + pick deterministic thumbnail
    const projects = await Promise.all(
      projectFolders.map(async (folder) => {
        try {
          // list folder contents
          const folderResponse = await axios.post(
            'https://api.dropboxapi.com/2/files/list_folder',
            { path: folder.path_lower },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          // find & parse _metadata.json (using your previously working request shape)
          const metadataFile = folderResponse.data.entries.find(
            entry => entry.name === '_metadata.json' && entry['.tag'] === 'file'
          );

          let metadata = null;
          if (metadataFile) {
            try {
              const metadataResponse = await axios.post(
                'https://content.dropboxapi.com/2/files/download',
                '', // <-- as you had before
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: metadataFile.path_lower }),
                    'Content-Type': 'text/plain', // <-- as you had before
                  },
                  responseType: 'text',
                  transformResponse: [d => d],   // prevent axios auto-parsing
                  validateStatus: s => s < 500,  // show 4xx bodies if any
                }
              );

              if (metadataResponse.status !== 200) {
                console.warn(
                  `⚠️ Could not download metadata for ${folder.name}: ${metadataResponse.status}`,
                  metadataResponse.data || ''
                );
              } else {
                const text = cleanJsonString(metadataResponse.data);
                metadata = JSON.parse(text); // strict JSON
                console.log(`✅ Parsed metadata for ${folder.name}`);
              }
            } catch (err) {
              const body = err?.response?.data;
              const summary = body?.error_summary || body || err.message;
              console.warn(`⚠️ Could not parse metadata for ${folder.name}:`, summary);
            }
          } else {
            console.warn(`ℹ️ No _metadata.json found in ${folder.name}`);
          }

          // deterministic thumbnail: sort image files first, then pick first
          const imageFiles = folderResponse.data.entries
            .filter(e => e['.tag'] === 'file' && /\.(jpe?g|png|gif|webp)$/i.test(e.name))
            .sort((a, b) => naturalCompare(a.name, b.name));

          let thumbnail = null;
          if (imageFiles.length) {
            const first = imageFiles[0];
            try {
              const linkResponse = await axios.post(
                'https://api.dropboxapi.com/2/files/get_temporary_link',
                { path: first.path_lower },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              thumbnail = linkResponse.data.link;
            } catch (err) {
              console.warn(`⚠️ Could not get thumbnail for ${folder.name}:`, err.response?.data || err.message);
            }
          }

          return {
            id: folder.id,
            name: folder.name,
            path: folder.path_display,
            thumbnail,
            metadata
          };
        } catch (err) {
          console.error(`❌ Error processing folder ${folder.name}:`, err.message);
          return null;
        }
      })
    );

    // 4) filter & sort by order_flag, then name
    const validProjects = projects.filter(Boolean);

    validProjects.sort((a, b) => {
      const ao = toOrderNum(a?.metadata?.order_flag);
      const bo = toOrderNum(b?.metadata?.order_flag);
      if (ao !== bo) return ao - bo;
      return naturalCompare(a?.name, b?.name);
    });

    // (Optional) expose numeric order for UI/debugging
    validProjects.forEach(p => {
      p.order = Number(p?.metadata?.order_flag) || null;
    });

    res.json(validProjects);
  } catch (err) {
    console.error('❌ Failed to fetch website photos:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Unable to fetch website photos',
      details: err.message
    });
  }
});

/* --------------------------- GET /api/dropbox/files --------------------------- */

router.get('/files', async (req, res) => {
  try {
    const { path: folderPath = '' } = req.query;

    const response = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      {
        path: folderPath,
        recursive: false,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const entries = response.data.entries;
    console.log('📂 Files in folder:', entries.map(e => e.name));

    // images only, then sort by natural filename order so 2 < 10
    const isImage = name => /\.(jpe?g|png|gif|webp)$/i.test(name);
    const imageFiles = entries
      .filter(entry => entry['.tag'] === 'file' && isImage(entry.name))
      .sort((a, b) => naturalCompare(a.name, b.name));
      // If you prefer newest-first: replace the line above with:
      // .sort((a, b) => new Date(b.client_modified) - new Date(a.client_modified));

    // Fetch image links (preserves sorted order)
    const imageUrls = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          const linkResponse = await axios.post(
            'https://api.dropboxapi.com/2/files/get_temporary_link',
            { path: file.path_display || file.path_lower },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          return {
            url: linkResponse.data.link,
            name: file.name,
            path: file.path_display || file.path_lower,
            size: file.size,
            client_modified: file.client_modified,
          };
        } catch (error) {
          console.error('⚠️ Error getting link for file:', file.name, error.response?.data || error.message);
          return null;
        }
      })
    );

    res.json({
      images: imageUrls.filter(Boolean)
    });
  } catch (err) {
    console.error('❌ Failed to fetch files:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Unable to fetch files',
      details: err.message
    });
  }
});

module.exports = router;

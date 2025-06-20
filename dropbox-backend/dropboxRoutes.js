const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

let accessToken = null;

// 🔁 Refresh token
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

// 📁 GET /api/dropbox/files?path=/folder-name
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

    // Filter image files
    const isImage = name => /\.(jpe?g|png|gif|webp)$/i.test(name);
    const imageFiles = entries.filter(
      entry => entry['.tag'] === 'file' && isImage(entry.name)
    );

    // Check for _metadata.json
    const metadataEntry = entries.find(
      entry => entry['.tag'] === 'file' && entry.name.toLowerCase() === '_metadata.json'
    );

    console.log('metadataEntry', metadataEntry);

    // Fetch image links
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

    // ✅ Fetch metadata if it exists
    let metadata = null;
    if (metadataEntry) {
      try {
        const metadataResponse = await axios.post(
          'https://content.dropboxapi.com/2/files/download',
          '', // must be non-null
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Dropbox-API-Arg': JSON.stringify({ path: metadataEntry.path_lower }),
              'Content-Type': 'text/plain' // ✅ Dropbox-approved
            },
            responseType: 'text'
          }
        );

        console.log('📥 Raw _metadata.json content:', metadataResponse.data);
        metadata = JSON.parse(metadataResponse.data);
      } catch (err) {
        console.warn('⚠️ Could not fetch or parse _metadata.json:', err.response?.data || err.message);
      }
    }

    res.json({
      images: imageUrls.filter(Boolean),
      metadata: metadata || null,
    });

  } catch (err) {
    console.error('❌ Failed to fetch files:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch files', details: err.message });
  }
});

module.exports = router;

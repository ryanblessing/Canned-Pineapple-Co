const express = require('express');
const axios = require('axios');
require('dotenv').config();
const cors = require('cors');
const { createDropboxInstance, fetchImagesFromFolder, fetchAllFolders } = require('./dropbox');

let accessToken = null;

const app = express();
const PORT = 3001;
app.use(cors()); 

// Automatically refresh the token
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
    console.error('❌ Failed to refresh token:', err.response?.data || err.message);
  }
}

// Run immediately on server start
refreshAccessToken();

// Refresh every 2 hours
setInterval(refreshAccessToken, 2 * 60 * 60 * 1000);

// ✅ NEW: Serve access token to frontend
app.get('/api/dropbox/token', (req, res) => {
  if (!accessToken) {
    return res.status(503).json({ error: 'Dropbox token not available yet' });
  }
  res.json({ accessToken });
});

// Route: List all root-level files (simple)
app.get('/api/dropbox/files', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      { path: '' },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data.entries);
  } catch (err) {
    console.error('❌ Dropbox API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Dropbox request failed' });
  }
});

// Route: Get image URLs from a specific Dropbox folder
app.get('/api/dropbox/images', async (req, res) => {
  try {
    const dbx = createDropboxInstance(accessToken);
    const urls = await fetchImagesFromFolder(dbx, '');
    res.json(urls);
  } catch (err) {
    console.error('❌ Image fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch image URLs' });
  }
});

// Route: List all folders
app.get('/api/dropbox/folders', async (req, res) => {
  try {
    const dbx = createDropboxInstance(accessToken);
    const folders = await fetchAllFolders(dbx);
    res.json(folders);
  } catch (err) {
    console.error('❌ Folder fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});

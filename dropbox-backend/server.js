// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json()); // Add JSON body parsing middleware

let accessToken = null;

// 🔁 Refresh Dropbox access token
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

// 📁 GET /api/dropbox/folders
app.get('/api/dropbox/folders', async (req, res) => {
  console.log('📩 Request received at /api/dropbox/folders');
  console.log('🔐 Access token:', accessToken);

  try {
    const topLevelResponse = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      { path: '/Website Photos' },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const subfolders = topLevelResponse.data.entries.filter(item => item[".tag"] === "folder");

    const results = await Promise.all(
      subfolders.map(async folder => {
        let thumbnail = '/placeholder.jpg';
        try {
          const filesResponse = await axios.post(
            'https://api.dropboxapi.com/2/files/list_folder',
            { path: folder.path_lower },
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const firstImage = filesResponse.data.entries.find(f => f.name.match(/\.(jpe?g|png|gif)$/i));

          if (firstImage) {
            const linkResponse = await axios.post(
              'https://api.dropboxapi.com/2/files/get_temporary_link',
              { path: firstImage.path_lower },
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            thumbnail = linkResponse.data.link;
          }
        } catch (err) {
          console.warn(`⚠️ Could not get link for files in ${folder.name}:`, err.response?.data || err.message);
        }

        return {
          id: folder.id,
          name: folder.name,
          path: folder.path_display,
          thumbnail,
        };
      })
    );

    res.json(results);
  } catch (err) {
    console.error('❌ Failed to fetch folders:', err.response?.data || err.message || err);
    res.status(500).json({ error: 'Unable to fetch folders' });
  }
});

// Import the dropbox routes
const dropboxRoutes = require('./dropboxRoutes');

// Use the dropbox routes
app.use('/api/dropbox', dropboxRoutes);

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

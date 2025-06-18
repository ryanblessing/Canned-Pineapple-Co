const express = require('express');
const axios = require('axios');
require('dotenv').config();


let accessToken = null;

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

const router = express.Router();

router.get('/folders', async (req, res) => {
  try {
    const response = await axios.post(
  'https://api.dropboxapi.com/2/files/list_folder',
  { path: '/Website Photos' }, 

      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const folders = response.data.entries.filter(item => item[".tag"] === "folder");

    const result = await Promise.all(
      folders.map(async folder => {
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
          console.warn(`📁 Could not get thumbnail for ${folder.name}:`, err.message);
        }

        return {
          id: folder.id,
          name: folder.name,
          path: folder.path_display,
          thumbnail,
        };
      })
    );

    res.json(result);
  } catch (err) {
    console.error('❌ Failed to fetch folders:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch folders' });
  }
});

module.exports = router;

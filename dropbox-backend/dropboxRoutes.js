const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

let accessToken = null;

// Refresh token
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

// Folders endpoint
router.get('/folders', async (req, res) => {
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

    const folders = response.data.entries.filter(item => item[".tag"] === "folder");

    const result = await Promise.all(
      folders.map(async folder => {
        let thumbnail = '/placeholder.jpg'; // fallback
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

// Get files from a specific folder
router.get('/files', async (req, res) => {
  try {
    const { path: folderPath = '' } = req.query;
    
    // List files in the specified folder
    const response = await axios.post(
      'https://api.dropboxapi.com/2/files/list_folder',
      { 
        path: folderPath,
        recursive: false
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    // Filter for image files
    const isImage = name => /\.(jpe?g|png|gif|webp)$/i.test(name);
    const imageFiles = response.data.entries.filter(
      entry => entry['.tag'] === 'file' && isImage(entry.name)
    );
    
    // Get temporary links for each image
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
            client_modified: file.client_modified
          };
        } catch (error) {
          console.error('Error getting link for file:', file.name, error.response?.data || error.message);
          return null;
        }
      })
    );
    
    // Filter out any failed requests and return
    const validImages = imageUrls.filter(img => img !== null);
    res.json(validImages);
    
  } catch (err) {
    console.error('❌ Failed to fetch files:', err.response?.data || err.message);
    res.status(500).json({ error: 'Unable to fetch files', details: err.message });
  }
});

module.exports = router;

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

// 📁 GET /api/dropbox/website-photos
router.get('/website-photos', async (req, res) => {
  try {
    // 1. First, get the list of folders in the root
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

    // 2. Find the Website Photos folder
    const websitePhotosFolder = rootResponse.data.entries.find(
      entry => entry.name === 'Website Photos' && entry['.tag'] === 'folder'
    );

    if (!websitePhotosFolder) {
      return res.status(404).json({ error: 'Website Photos folder not found' });
    }

    console.log('📂 Found Website Photos folder');

    // 3. Get all folders inside Website Photos
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

    // 4. Process each project folder to find _metadata.json
    const projects = await Promise.all(
      projectFolders.map(async (folder) => {
        try {
          // Get contents of the project folder
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

          // Find _metadata.json in this folder
          const metadataFile = folderResponse.data.entries.find(
            entry => entry.name === '_metadata.json' && entry['.tag'] === 'file'
          );

          let metadata = null;
          if (metadataFile) {
            try {
              const metadataResponse = await axios.post(
                'https://content.dropboxapi.com/2/files/download',
                '',
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Dropbox-API-Arg': JSON.stringify({ path: metadataFile.path_lower }),
                    'Content-Type': 'text/plain'
                  },
                  responseType: 'text'
                }
              );
              metadata = JSON.parse(metadataResponse.data);
              console.log(`✅ Found metadata for ${folder.name}:`, metadata);
            } catch (err) {
              console.warn(`⚠️ Could not parse metadata for ${folder.name}:`, err.message);
            }
          } else {
            console.warn(`ℹ️ No _metadata.json found in ${folder.name}`);
          }

          // Find the first image for thumbnail
          const imageFile = folderResponse.data.entries.find(
            entry => entry['.tag'] === 'file' && /\.(jpe?g|png|gif|webp)$/i.test(entry.name)
          );

          let thumbnail = null;
          if (imageFile) {
            try {
              const linkResponse = await axios.post(
                'https://api.dropboxapi.com/2/files/get_temporary_link',
                { path: imageFile.path_lower },
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              thumbnail = linkResponse.data.link;
            } catch (err) {
              console.warn(`⚠️ Could not get thumbnail for ${folder.name}:`, err.message);
            }
          }

          return {
            id: folder.id,
            name: folder.name,
            path: folder.path_display,
            thumbnail,
            metadata: metadata 
          };
        } catch (err) {
          console.error(`❌ Error processing folder ${folder.name}:`, err.message);
          return null;
        }
      })
    );

    // Filter out any failed folders
    const validProjects = projects.filter(project => project !== null);
    
    res.json(validProjects);
  } catch (err) {
    console.error('❌ Failed to fetch website photos:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Unable to fetch website photos', 
      details: err.message 
    });
  }
});

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

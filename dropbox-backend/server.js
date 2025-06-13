const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const { 
    getAccessToken, 
    getAuthUrl, 
    getTokensFromCode,
    isAuthenticated,
    refreshAccessToken
} = require('./dropbox');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.get('/auth/dropbox', (req, res) => {
    res.redirect(getAuthUrl());
});

app.get('/auth/dropbox/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }

        const tokens = await getTokensFromCode(code);
        
        // Redirect back to frontend with tokens in query params
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        res.redirect(`${frontendUrl}/?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`);
    } catch (error) {
        console.error('Error in OAuth callback:', error);
        res.status(500).json({ error: 'Failed to authenticate with Dropbox' });
    }
});

// Check if user is authenticated
app.get('/auth/check', async (req, res) => {
    try {
        const authenticated = isAuthenticated();
        res.json({ authenticated });
    } catch (error) {
        console.error('Error checking auth status:', error);
        res.status(500).json({ error: 'Failed to check authentication status' });
    }
});

// List only folders
app.get('/api/folders', async (req, res) => {
    try {
        const { path = '' } = req.query;
        const accessToken = await getAccessToken();
        
        const response = await axios.post(
            'https://api.dropboxapi.com/2/files/list_folder',
            { 
                path: path,
                recursive: false,
                include_media_info: false,
                include_mounted_folders: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Filter to only return folders
        const folders = response.data.entries.filter(entry => entry['.tag'] === 'folder');
        console.log('folders: ', folders)
        res.json(folders);
    } catch (error) {
        console.error('Error fetching folders:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        res.status(500).json({ 
            error: 'Failed to fetch folders',
            details: error.message 
        });
    }
});

// List folder contents
app.get('/api/files', async (req, res) => {
    try {
        const { path = '' } = req.query;
        const accessToken = await getAccessToken();
        
        const response = await axios.post(
            'https://api.dropboxapi.com/2/files/list_folder',
            { 
                path: path,
                recursive: false,
                include_media_info: true,
                include_mounted_folders: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching files:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        res.status(500).json({ 
            error: 'Failed to fetch files',
            details: error.message 
        });
    }
});

// Get a temporary link for a file
app.get('/api/get-link', async (req, res) => {
    try {
        let { path } = req.query;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }

        // Ensure the path starts with a forward slash
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        // Replace any URL-encoded spaces with actual spaces
        path = path.replace(/\+/g, ' ');
        
        console.log('Requesting link for path:', path);
        const accessToken = await getAccessToken();
        
        // Get the temporary link for the file
        const response = await axios.post(
            'https://api.dropboxapi.com/2/files/get_temporary_link',
            { path },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json({ 
            link: response.data.link,
            metadata: response.data.metadata
        });
    } catch (error) {
        console.error('Error getting file link:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            // Try refreshing the token once if we get a 401
            try {
                const tokens = await refreshAccessToken();
                // Retry the request with the new token
                const retryResponse = await axios.post(
                    'https://api.dropboxapi.com/2/files/get_temporary_link',
                    { path: req.query.path },
                    {
                        headers: {
                            'Authorization': `Bearer ${tokens.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                return res.json({
                    link: retryResponse.data.link,
                    metadata: retryResponse.data.metadata
                });
            } catch (retryError) {
                console.error('Retry failed:', retryError.response?.data || retryError.message);
                return res.status(401).json({ error: 'Unauthorized after refresh' });
            }
        }
        res.status(500).json({ 
            error: 'Failed to get file link',
            details: error.message,
            path: req.query.path
        });
    }
});

// Get the first image in a folder
app.get('/api/first-image', async (req, res) => {
    try {
        console.log('req: ', req)
        console.log('res: ', res)
        const { path } = req.query;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }

        const accessToken = await getAccessToken();
        
        // First, list the folder contents
        const listResponse = await axios.post(
            'https://api.dropboxapi.com/2/files/list_folder',
            { 
                path: path,
                recursive: false,
                include_media_info: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Find the first image file
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const firstImage = listResponse.data.entries.find(entry => 
            entry['.tag'] === 'file' && 
            imageExtensions.some(ext => entry.name.toLowerCase().endsWith(ext))
        );

        if (!firstImage) {
            return res.json({ url: null, message: 'No images found in folder' });
        }

        // Get the temporary link for the first image
        const linkResponse = await axios.post(
            'https://api.dropboxapi.com/2/files/get_temporary_link',
            { path: firstImage.path_lower },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json({ 
            url: linkResponse.data.link,
            name: firstImage.name,
            path: firstImage.path_display
        });
    } catch (error) {
        console.error('Error getting first image:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        res.status(500).json({ 
            error: 'Failed to get first image',
            details: error.message 
        });
    }
});

// Get a temporary link for a file
app.get('/api/get-link', async (req, res) => {
    try {
        const { path } = req.query;
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }

        const accessToken = await getAccessToken();
        
        const response = await axios.post(
            'https://api.dropboxapi.com/2/files/get_temporary_link',
            { path },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('Error getting file link:', error.response?.data || error.message);
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        res.status(500).json({ 
            error: 'Failed to get file link',
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;

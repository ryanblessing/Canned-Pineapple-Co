const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const { 
    getAccessToken, 
    getAuthUrl, 
    getTokensFromCode,
    isAuthenticated
} = require('./dropbox');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
app.use(express.json());

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

const axios = require('axios');
const qs = require('querystring');

// Load environment variables
require('dotenv').config();

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI || 'http://localhost:3001/auth/dropbox/callback';

// In-memory token store (in production, use a database)
const tokenStore = {
    accessToken: null,
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN || null,
    expiresAt: null
};

/**
 * Get a valid access token, refreshing if necessary
 */
async function getAccessToken() {
    // If we have a valid access token, return it
    if (tokenStore.accessToken && tokenStore.expiresAt > Date.now()) {
        return tokenStore.accessToken;
    }

    // Otherwise, refresh the token
    if (tokenStore.refreshToken) {
        try {
            const tokens = await refreshAccessToken();
            return tokens.accessToken;
        } catch (error) {
            console.error('Failed to refresh access token:', error);
            throw new Error('Failed to refresh access token');
        }
    }

    throw new Error('No refresh token available');
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken() {
    try {
        const response = await axios.post(
            'https://api.dropboxapi.com/oauth2/token',
            qs.stringify({
                grant_type: 'refresh_token',
                refresh_token: tokenStore.refreshToken,
                client_id: DROPBOX_APP_KEY,
                client_secret: DROPBOX_APP_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, expires_in, refresh_token } = response.data;
        
        // Update token store
        tokenStore.accessToken = access_token;
        if (refresh_token) {
            tokenStore.refreshToken = refresh_token;
            // In a real app, you'd want to save this new refresh token to your database
        }
        tokenStore.expiresAt = Date.now() + (expires_in * 1000);

        return {
            accessToken: access_token,
            refreshToken: refresh_token || tokenStore.refreshToken,
            expiresIn: expires_in
        };
    } catch (error) {
        console.error('Error refreshing access token:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Exchange an authorization code for tokens
 */
async function getTokensFromCode(code) {
    try {
        const response = await axios.post(
            'https://api.dropboxapi.com/oauth2/token',
            qs.stringify({
                code,
                grant_type: 'authorization_code',
                redirect_uri: DROPBOX_REDIRECT_URI,
                client_id: DROPBOX_APP_KEY,
                client_secret: DROPBOX_APP_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const { access_token, refresh_token, expires_in } = response.data;
        
        // Update token store
        tokenStore.accessToken = access_token;
        tokenStore.refreshToken = refresh_token;
        tokenStore.expiresAt = Date.now() + (expires_in * 1000);

        return {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in
        };
    } catch (error) {
        console.error('Error getting tokens from code:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    getAccessToken,
    refreshAccessToken,
    getTokensFromCode,
    getAuthUrl: () => {
        return `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&response_type=code&redirect_uri=${encodeURIComponent(DROPBOX_REDIRECT_URI)}`;
    },
    isAuthenticated: () => {
        return !!tokenStore.refreshToken;
    }
};

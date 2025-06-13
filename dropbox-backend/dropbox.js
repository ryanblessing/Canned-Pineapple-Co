const axios = require('axios');
const qs = require('querystring');

// Load environment variables
require('dotenv').config();

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI || 'http://localhost:3001/auth/dropbox/callback';

// In-memory token store (in production, use a database)
const tokenStore = {
    accessToken: process.env.DROPBOX_ACCESS_TOKEN || null,
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN || null,
    expiresAt: process.env.DROPBOX_ACCESS_TOKEN ? Date.now() + 14400000 : null // 4 hours from now if we have an access token
};

// Log initial token state
console.log('Initial token store state:', {
    hasAccessToken: !!tokenStore.accessToken,
    hasRefreshToken: !!tokenStore.refreshToken,
    expiresAt: tokenStore.expiresAt ? new Date(tokenStore.expiresAt).toISOString() : null
});

/**
 * Get a valid access token, refreshing if necessary
 */
async function getAccessToken() {
    console.log('Getting access token...');
    
    // If we have a valid access token, return it
    if (tokenStore.accessToken && tokenStore.expiresAt && tokenStore.expiresAt > Date.now()) {
        console.log('Using existing access token');
        return tokenStore.accessToken;
    }

    // Otherwise, refresh the token
    if (tokenStore.refreshToken) {
        console.log('Refreshing access token...');
        try {
            const tokens = await refreshAccessToken();
            console.log('Successfully refreshed access token');
            return tokens.accessToken;
        } catch (error) {
            console.error('Failed to refresh access token:', error.response?.data || error.message);
            // Clear invalid tokens
            tokenStore.accessToken = null;
            tokenStore.refreshToken = null;
            tokenStore.expiresAt = null;
            throw new Error('Failed to refresh access token. Please re-authenticate.');
        }
    }

    console.error('No refresh token available');
    throw new Error('No refresh token available. Please authenticate with Dropbox.');
}

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken() {
    console.log('Refreshing access token...');
    try {
        const response = await axios.post(
            'https://api.dropbox.com/oauth2/token',
            qs.stringify({
                grant_type: 'refresh_token',
                refresh_token: tokenStore.refreshToken,
                client_id: DROPBOX_APP_KEY,
                client_secret: DROPBOX_APP_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000 // 10 second timeout
            }
        );

        console.log('Token refresh response:', {
            status: response.status,
            data: {
                ...response.data,
                access_token: response.data.access_token ? '***' : 'none',
                refresh_token: response.data.refresh_token ? '***' : 'none'
            }
        });

        const { access_token, expires_in, refresh_token } = response.data;
        
        if (!access_token) {
            throw new Error('No access token in response');
        }
        
        // Update token store
        tokenStore.accessToken = access_token;
        if (refresh_token) {
            tokenStore.refreshToken = refresh_token;
            console.log('Received new refresh token');
        }
        
        const expiresAt = Date.now() + (expires_in * 1000);
        tokenStore.expiresAt = expiresAt;
        
        console.log('Token refresh successful. Expires at:', new Date(expiresAt).toISOString());

        return {
            accessToken: access_token,
            refreshToken: refresh_token || tokenStore.refreshToken,
            expiresIn: expires_in
        };
    } catch (error) {
        console.error('Error refreshing access token:', {
            message: error.message,
            response: error.response ? {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            } : 'No response',
            stack: error.stack
        });
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

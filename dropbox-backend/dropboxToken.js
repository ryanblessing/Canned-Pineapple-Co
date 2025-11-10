// dropboxToken.js
const axios = require('axios');
require('dotenv').config({ override: true });

let accessToken = null;
let expiresAt = 0;
let refreshing = null;

const now = () => Date.now();

// Sanitize the env var (strip quotes/whitespace/CR)
function readRefreshToken() {
  const raw = process.env.DROPBOX_REFRESH_TOKEN || '';
  // strip BOM, quotes, and whitespace
  const cleaned = raw.replace(/^\uFEFF/, '').replace(/^['"`]+|['"`]+$/g, '').trim();
  return cleaned;
}
// Simple validator — Dropbox refresh tokens are long and usually alnum with - _ .
function looksLikeRefreshToken(tok) {
  return tok.length > 40 && /^[A-Za-z0-9._-]+$/.test(tok);
}

async function refresh() {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const refreshToken = readRefreshToken();

      if (!looksLikeRefreshToken(refreshToken)) {
        console.error('❌ DROPBOX_REFRESH_TOKEN looks malformed. length=', refreshToken.length,
          ' sample=', refreshToken ? (refreshToken.slice(0, 6) + '…' + refreshToken.slice(-6)) : '(empty)');
        throw new Error('Malformed or empty DROPBOX_REFRESH_TOKEN. Re-mint and paste cleanly into .env');
      }

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.DROPBOX_CLIENT_ID,
        client_secret: process.env.DROPBOX_CLIENT_SECRET
      }).toString();

      const { data } = await axios.post(
        'https://api.dropboxapi.com/oauth2/token',
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      accessToken = data.access_token;
      expiresAt = now() + (data.expires_in || 7200) * 1000;
      console.log('🔁 Dropbox access token refreshed');
      return accessToken;

    } catch (e) {
      console.error('❌ Token refresh failed RAW:', e?.response?.status, e?.response?.data || e.message);
      throw e;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

async function getAccessToken() {
  if (!accessToken || now() > (expiresAt - 60_000)) {
    await refresh();
  }
  return accessToken;
}

module.exports = { getAccessToken, refresh };

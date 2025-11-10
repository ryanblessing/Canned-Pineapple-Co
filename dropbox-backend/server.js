// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Force .env to override any existing shell/host envs
require('dotenv').config({ override: true });

const dropboxRoutes = require('./dropboxRoutes');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ---- DEBUG: verify what env the process is actually using
app.get('/auth/debug', (_req, res) => {
  const mask = v => (v ? v.slice(0, 4) + '…' + v.slice(-4) : '(empty)');
  res.json({
    cwd: process.cwd(),
    DROPBOX_CLIENT_ID: mask(process.env.DROPBOX_CLIENT_ID),
    DROPBOX_CLIENT_SECRET: mask(process.env.DROPBOX_CLIENT_SECRET),
    DROPBOX_REDIRECT_URI: process.env.DROPBOX_REDIRECT_URI || '(empty)',
    DROPBOX_REFRESH_TOKEN_len: (process.env.DROPBOX_REFRESH_TOKEN || '').length
  });
});

// ---- TEMP: OAuth helper to mint a NEW refresh token
app.get('/auth/start', (req, res) => {
  const u = new URL('https://www.dropbox.com/oauth2/authorize');
  u.searchParams.set('client_id', process.env.DROPBOX_CLIENT_ID);
  u.searchParams.set('redirect_uri', process.env.DROPBOX_REDIRECT_URI); // must exactly match in Dropbox console
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('token_access_type', 'offline'); // get refresh_token
  u.searchParams.set('scope', 'files.metadata.read files.content.read'); // add more if needed
  res.redirect(u.toString());
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing ?code');

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.DROPBOX_CLIENT_ID,
      client_secret: process.env.DROPBOX_CLIENT_SECRET,
      redirect_uri: process.env.DROPBOX_REDIRECT_URI
    }).toString();

    const { data } = await axios.post(
      'https://api.dropboxapi.com/oauth2/token',
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const refreshToken = (data.refresh_token || '').trim();

    // Print to console for logs
    console.log('\n✅ COPY THIS into dropbox-backend/.env:');
    console.log('DROPBOX_REFRESH_TOKEN=' + refreshToken + '\n');

    // Also render on the page for clean copy
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`
      <h2>Refresh token generated ✅</h2>
      <p>Copy this exact line into <code>dropbox-backend/.env</code> (no quotes, no extra spaces):</p>
      <pre style="padding:12px;background:#f6f8fa;border:1px solid #ddd;white-space:pre-wrap;word-break:break-all;">
      DROPBOX_REFRESH_TOKEN=${refreshToken}
      </pre>
      <p>Then restart your server (<code>node server.js</code>).</p>
    `);
  } catch (e) {
    res.status(500).send(JSON.stringify(e?.response?.data || e.message));
  }
});


// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Mount your main Dropbox router
app.use('/api/dropbox', dropboxRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// callback.js (root)
const { AuthorizationCode } = require('simple-oauth2');
const generateScript = require('./login_script.js'); // already in your repo

const config = {
  client: {
    id: process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID,
    secret: process.env.OAUTH_CLIENT_SECRET || process.env.CLIENT_SECRET,
  },
  auth: {
    tokenHost: 'https://github.com',
    tokenPath: '/login/oauth/access_token',
    authorizePath: '/login/oauth/authorize',
  },
};

const client = new AuthorizationCode(config);

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const code  = url.searchParams.get('code');
    const state = url.searchParams.get('state') || ''; // site_id passed by CMS

    const base = process.env.BASE_URL || `https://${req.headers.host}`;
    const redirectUri = `${base}/api/callback`; // MUST match your GitHub OAuth App

    const tokenParams = { code, redirect_uri: redirectUri };
    const result = await client.getToken(tokenParams);

    // CMS expects the *access token string*, not the full object
    const accessToken = result.token.access_token;

    // This generates: authorization:github:success:{"token":"..."}
    const script = generateScript('github', 'success', { token: accessToken, state });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(script);
  } catch (error) {
    console.error('OAuth callback error', error);
    const script = generateScript('github', 'error', JSON.stringify(error));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end(script);
  }
};

// OAuth "authorize" endpoint (root handler)
const { AuthorizationCode } = require('simple-oauth2');

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

// Create client once
const client = new AuthorizationCode(config);

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const siteId = url.searchParams.get('site_id') || url.searchParams.get('site') || '';
    const scope  = url.searchParams.get('scope') || 'repo';

    const base = process.env.BASE_URL || `https://${req.headers.host}`;
    const redirectUri = `${base}/api/callback`; // must match GitHub OAuth App callback

    const authorizationUri = client.authorizeURL({
      redirect_uri: redirectUri, // NOTE: snake_case
      scope,
      state: siteId,
    });

    res.statusCode = 302;
    res.setHeader('Location', authorizationUri);
    res.end();
  } catch (err) {
    console.error('auth error', err);
    res.statusCode = 500;
    res.end('OAuth auth error');
  }
};

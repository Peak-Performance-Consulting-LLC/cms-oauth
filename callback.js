// OAuth "callback" endpoint (root handler)
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

const client = new AuthorizationCode(config);

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const code  = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '';

    const base = process.env.BASE_URL || `https://${req.headers.host}`;
    const redirectUri = `${base}/api/callback`;

    const tokenParams = { code, redirect_uri: redirectUri };

    const result = await client.getToken(tokenParams);
    const token  = result.token; // { access_token, token_type, scope, ... }

    // Post token back to CMS opener window (Decap listens for this)
    const html = `
      <html><body>
        <script>
          (function() {
            const data = ${JSON.stringify({ token, provider: 'github', state })};
            if (window.opener) window.opener.postMessage(data, '*');
            window.close();
          })();
        </script>
      </body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch (err) {
    console.error('callback error', err);
    res.statusCode = 500;
    res.end('OAuth callback error');
  }
};

// login_script.js

// (optional, kept for future validation)
const REQUIRED_ORIGIN_PATTERN =
  /^((\*|([\w_-]{2,}))\.)*(([\w_-]{2,})\.)+(\w{2,})(\,((\*|([\w_-]{2,}))\.)*(([\w_-]{2,})\.)+(\w{2,}))*$/;

// --- Robust ORIGINS parsing: allow one-or-many, trim spaces, support fallbacks ---
const raw =
  (process.env.ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    process.env.ORIGIN ||
    '').trim();

const ORIGINS = raw
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (ORIGINS.length === 0) {
  throw new Error(
    'ORIGINS missing – set ORIGINS to comma-separated origins, e.g. ' +
      'https://www.bookyourcarrental.com,https://bookyourcarrental.com'
  );
}

// Back-compat alias (older code referenced `origins`)
const origins = ORIGINS;

// Debug (optional)
console.log('login_script ORIGINS parsed =', origins);

/**
 * Build the tiny HTML page that the OAuth callback returns.
 * It posts the token to the opener immediately in the exact format Decap expects:
 *   "authorization:github:success:{\"token\":\"...\"}"
 * and then closes the popup.
 */
module.exports = (oauthProvider, message, content) => `
<!doctype html>
<meta charset="utf-8">
<script>
(function () {
  function toHost(origin) {
    try {
      var u = new URL(origin);
      return u.hostname + (u.port ? (':' + u.port) : '');
    } catch (e) {
      return origin.replace(/^https?:\\/\\//, '');
    }
  }

  // Allowed origins injected from server
  var allowedFull = ${JSON.stringify(origins)};
  var allowed = allowedFull.map(function (o) { return { full: o, host: toHost(o) }; });

  function postToAllowed(msg) {
    var posted = false;

    // Try posting to each full origin (scheme + host [+port])
    for (var i = 0; i < allowed.length; i++) {
      try {
        if (window.opener) {
          window.opener.postMessage(msg, allowed[i].full);
          posted = true;
        }
      } catch (e) {}
    }

    // Also send one permissive postMessage as a fallback (some setups accept '*')
    try {
      if (window.opener) {
        window.opener.postMessage(msg, '*');
        posted = true;
      }
    } catch (e) {}

    return posted;
  }

  // Construct Decap message payload (exact string format required)
  var payload = 'authorization:${oauthProvider}:${message}:${JSON.stringify(content)}';

  // Proactively send the token/message to the opener
  postToAllowed(payload);

  // Give the opener a moment to process, then close this popup
  setTimeout(function () {
    try { window.close(); } catch (e) {}
  }, 150);
})();
</script>`;

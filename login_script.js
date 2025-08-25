const REQUIRED_ORIGIN_PATTERN = 
  /^((\*|([\w_-]{2,}))\.)*(([\w_-]{2,})\.)+(\w{2,})(\,((\*|([\w_-]{2,}))\.)*(([\w_-]{2,})\.)+(\w{2,}))*$/

// Robust ORIGINS parsing: allow one-or-many, trim spaces, support fallbacks
const raw =
  (process.env.ORIGINS ||
   process.env.ALLOWED_ORIGINS ||
   process.env.ORIGIN ||
   '').trim();

const ORIGINS = raw
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// If nothing parsed, fail with a helpful message
if (ORIGINS.length === 0) {
  throw new Error(
    'ORIGINS missing – set ORIGINS to comma-separated origins, e.g. ' +
    'https://www.bookyourcarrental.com,https://bookyourcarrental.com'
  );
}

// (optional) debug
console.log('login_script ORIGINS parsed =', ORIGINS);



module.exports = (oauthProvider, message, content) => `
<script>
(function() {
  function contains(arr, elem) {
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].indexOf('*') >= 0) {
        const regex = new RegExp(arr[i].replaceAll('.', '\\\\.').replaceAll('*', '[\\\\w_-]+'))
        console.log(regex)
        if (elem.match(regex) !== null) {
          return true;
        }
      } else {
        if (arr[i] === elem) {
          return true;
        }
      }
    }
    return false;
  }
  function recieveMessage(e) {
    console.log("recieveMessage %o", e)
    if (!contains(${JSON.stringify(origins)}, e.origin.replace('https://', 'http://').replace('http://', ''))) {
      console.log('Invalid origin: %s', e.origin);
      return;
    }
    // send message to main window with da app
    window.opener.postMessage(
      'authorization:${oauthProvider}:${message}:${JSON.stringify(content)}',
      e.origin
    )
  }
  window.addEventListener("message", recieveMessage, false)
  // Start handshare with parent
  console.log("Sending message: %o", "${oauthProvider}")
  window.opener.postMessage("authorizing:${oauthProvider}", "*")
})()
</script>`

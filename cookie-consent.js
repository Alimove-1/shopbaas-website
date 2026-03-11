// Cookie consent banner + TikTok Pixel (GDPR compliant)
// Only loads TikTok pixel after user explicitly accepts cookies
(function() {
  var CONSENT_KEY = 'shopbaas_cookie_consent';
  var PIXEL_ID = 'D6NC09BC77UBTM3F3TU0';

  function loadTikTokPixel() {
    if (window._ttqLoaded) return;
    window._ttqLoaded = true;
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
      var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
      ttq.load(PIXEL_ID);
      ttq.page();
    }(window, document, 'ttq');
  }

  // Check existing consent
  var consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'accepted') {
    loadTikTokPixel();
    return; // No banner needed
  }
  if (consent === 'declined') {
    return; // No banner, no pixel
  }

  // Build banner
  var banner = document.createElement('div');
  banner.id = 'cookie-banner';
  banner.innerHTML =
    '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
      '<p style="flex:1;min-width:200px;margin:0;font-size:13px;line-height:1.5;color:#9ba3c2">' +
        'We gebruiken cookies voor analyse (TikTok Pixel) om onze website te verbeteren. ' +
        '<a href="/privacy.html" style="color:#a29bfe;text-decoration:underline">Privacybeleid</a>' +
      '</p>' +
      '<div style="display:flex;gap:8px;flex-shrink:0">' +
        '<button id="cookie-decline" style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#9ba3c2;font-size:13px;font-weight:600;cursor:pointer">Weigeren</button>' +
        '<button id="cookie-accept" style="padding:8px 16px;border-radius:8px;border:none;background:#6c5ce7;color:#fff;font-size:13px;font-weight:600;cursor:pointer">Accepteren</button>' +
      '</div>' +
    '</div>';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:rgba(14,17,23,.97);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.06);padding:16px 24px;';

  document.body.appendChild(banner);

  document.getElementById('cookie-accept').addEventListener('click', function() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    banner.remove();
    loadTikTokPixel();
  });

  document.getElementById('cookie-decline').addEventListener('click', function() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    banner.remove();
  });
})();

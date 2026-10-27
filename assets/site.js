/* درع الصفا — site.js: menu, reveal, forms → WhatsApp, conversion tracking */
(function () {
  var C = window.DIRA_CONFIG || {};

  /* ---------- tracking: loads only the pixels that have an ID in config.js ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  if (C.ga4) {
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + C.ga4; document.head.appendChild(s);
    gtag('js', new Date()); gtag('config', C.ga4, { send_page_view: true });
  }
  if (C.metaPixel) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.metaPixel); fbq('track', 'PageView');
  }
  if (C.snapPixel) {
    (function (e, t, n) { if (e.snaptr) return; var a = e.snaptr = function () { a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments) }; a.queue = []; var s = 'script'; var r = t.createElement(s); r.async = !0; r.src = n; var u = t.getElementsByTagName(s)[0]; u.parentNode.insertBefore(r, u); })(window, document, 'https://sc-static.net/scevent.min.js');
    snaptr('init', C.snapPixel, {}); snaptr('track', 'PAGE_VIEW');
  }
  if (C.tiktokPixel) {
    !function (w, d, t) { w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"]; ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]); ttq.load = function (e) { var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i; ttq._t = ttq._t || {}; ttq._t[e] = +new Date; ttq._o = ttq._o || {}; ttq._o[e] = {}; var n = d.createElement("script"); n.type = "text/javascript"; n.async = !0; n.src = i + "?sdkid=" + e + "&lib=" + t; var o = d.getElementsByTagName("script")[0]; o.parentNode.insertBefore(n, o) }; ttq.load(C.tiktokPixel); ttq.page(); }(window, document, 'ttq');
  }
  function track(name, params) {
    params = params || {};
    try { dataLayer.push(Object.assign({ event: name }, params)); } catch (e) {}
    try { if (window.gtag && C.ga4) gtag('event', name, params); } catch (e) {}
    try { if (window.fbq) fbq('trackCustom', name, params); if (window.fbq && name === 'lead') fbq('track', 'Lead', params); } catch (e) {}
    try { if (window.snaptr) snaptr('track', name === 'lead' ? 'SIGN_UP' : 'CUSTOM_EVENT_1', params); } catch (e) {}
    try { if (window.ttq) ttq.track(name === 'lead' ? 'SubmitForm' : 'ClickButton', params); } catch (e) {}
    if (C.debug) console.log('[track]', name, params);
  }
  window.diraTrack = track;

  /* every WhatsApp link + data-ev element reports a click */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a,button'); if (!a) return;
    var ev = a.getAttribute('data-ev');
    if (!ev && a.href && a.href.indexOf('wa.me') > -1) ev = 'whatsapp_click';
    if (ev) track(ev, { label: a.getAttribute('data-label') || a.textContent.trim().slice(0, 60), page: location.pathname });
  });

  /* ---------- header ---------- */
  var h = document.querySelector('header'), m = document.querySelector('.menu');
  if (m) m.addEventListener('click', function () { var o = h.classList.toggle('open'); m.setAttribute('aria-expanded', o); });
  if (h) h.querySelectorAll('nav.main a').forEach(function (a) { a.addEventListener('click', function () { h.classList.remove('open'); }); });

  /* ---------- one soft reveal per section ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { threshold: .08 });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  } else { document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- forms → WhatsApp (no backend, nothing stored) ---------- */
  document.querySelectorAll('form[data-wa]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var lines = [f.dataset.greet, ''];
      new FormData(f).forEach(function (v, k) { if (String(v).trim()) lines.push(k + ': ' + v); });
      lines.push('', '— ' + location.hostname);
      track('lead', { form: f.id || 'form', page: location.pathname });
      window.open('https://wa.me/' + f.dataset.wa + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
    });
  });

  var mb = document.querySelector('.mbar');
  if (mb) { var onS = function () { mb.classList.toggle('show', window.scrollY > 560); }; window.addEventListener('scroll', onS, { passive: true }); onS(); }

  document.querySelectorAll('.yr').forEach(function (e) { e.textContent = new Date().getFullYear(); });
})();

/* درع الصفا — quotation core: crypto, encoding, tafqeet, document rendering. Shared by the admin page and the verify page. */
window.DQ = (function () {
  const PUBLIC_JWK = {"key_ops":["verify"],"ext":true,"kty":"EC","x":"gCi_sJ_zpg1tqUuy_NQ8yswJcl3LxQrXCETPmG40nQw","y":"Yw8GVHNMh0lQBBisPC1gbd7QnUi8X3YfHTefj7TFNo0","crv":"P-256"};
  const BASE = 'https://dirasafa.com';
  const CO = { ar: 'مؤسسة درع الصفا للتجارة', en: 'DIRA ALSAFA ESTABLISHMENT FOR TRADING', addr: 'الحلقة، حي الصفا، جدة — المملكة العربية السعودية', cr: '7026646336', phone: '+966 50 210 9719', wa: '966502109719', email: 'info@dirasafa.com', web: 'dirasafa.com', agent: 'وكلاء شركة ناسوس للصادرات الكينية في السعودية' };

  /* ---------- base64url ---------- */
  const enc = new TextEncoder(), dec = new TextDecoder();
  function b64u(bytes) { let s = ''; bytes = new Uint8Array(bytes); for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

  /* ---------- payload ---------- */
  function payloadOf(q) { return { n: q.number, d: q.date, c: q.client.company || q.client.name, t: money(grand(q)), v: q.valid, i: q.items.filter(it => it.name).length }; }
  function encodePayload(p) { return b64u(enc.encode(JSON.stringify(p))); }
  function decodePayload(s) { return JSON.parse(dec.decode(unb64u(s))); }
  async function sign(privKey, payloadB64) { const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, enc.encode(payloadB64)); return b64u(sig); }
  async function verify(payloadB64, sigB64) {
    const key = await crypto.subtle.importKey('jwk', PUBLIC_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, unb64u(sigB64), enc.encode(payloadB64));
  }
  function verifyUrl(payloadB64, sigB64) { return BASE + '/q/#' + payloadB64 + '.' + sigB64; }

  /* ---------- PIN-wrapped private key ---------- */
  async function deriveKey(pin, salt) {
    const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function wrapPrivate(jwk, pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const k = await deriveKey(pin, salt);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(jwk)));
    return { salt: b64u(salt), iv: b64u(iv), ct: b64u(ct), pub: { x: jwk.x, y: jwk.y } };
  }
  async function unwrapPrivate(blob, pin) {
    const k = await deriveKey(pin, unb64u(blob.salt));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(blob.iv) }, k, unb64u(blob.ct));
    const jwk = JSON.parse(dec.decode(pt));
    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  }

  /* ---------- money + tafqeet ---------- */
  function num(x) { const n = parseFloat(String(x).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; }
  function money(n) { return (Math.round(num(n) * 100) / 100).toFixed(2); }
  function fmt(n) { const [a, b] = money(n).split('.'); return a.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + b; }
  function subtotal(q) { return q.items.reduce((s, it) => s + num(it.qty) * num(it.price), 0); }
  function vatAmt(q) { return q.vat && q.vat.on ? (subtotal(q) + num(q.delivery)) * num(q.vat.rate) / 100 : 0; }
  function grand(q) { return subtotal(q) + num(q.delivery) + vatAmt(q); }
  const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const HUNS = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];
  function under1000(n) {
    const parts = []; const h = Math.floor(n / 100), r = n % 100;
    if (h) parts.push(HUNS[h]);
    if (r) { if (r < 20) parts.push(ONES[r]); else { const o = r % 10, t = Math.floor(r / 10); parts.push(o ? ONES[o] + ' و' + TENS[t] : TENS[t]); } }
    return parts.join(' و');
  }
  function group(n, forms) { // forms: [singular, dual, plural(3-10), singular(>10)]
    if (n === 0) return ''; if (n === 1) return forms[0]; if (n === 2) return forms[1];
    const w = under1000(n); if (n >= 3 && n <= 10) return w + ' ' + forms[2]; return w + ' ' + forms[3];
  }
  function tafqeet(amount) {
    const whole = Math.floor(num(amount) + 1e-9), hal = Math.round((num(amount) - whole) * 100);
    if (whole === 0 && hal === 0) return 'فقط صفر ريال سعودي لا غير';
    const parts = [];
    const m = Math.floor(whole / 1e6), k = Math.floor((whole % 1e6) / 1000), u = whole % 1000;
    if (m) parts.push(group(m, ['مليون', 'مليونان', 'ملايين', 'مليون']));
    if (k) parts.push(group(k, ['ألف', 'ألفان', 'آلاف', 'ألف']));
    if (u) parts.push(under1000(u));
    let s = 'فقط ' + parts.join(' و') + ' ريال سعودي';
    if (hal) s += ' و' + under1000(hal) + ' هللة';
    return s + ' لا غير';
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function dateAr(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; }
  function qrSvg(text, mm) {
    if (typeof qrcode !== 'function') return '';
    const q = qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(); let p = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><rect width="${n}" height="${n}" fill="#fff"/><path d="${p}" fill="#15231B"/></svg>`;
  }

  /* ---------- document ---------- */
  const ROWS = 10;
  function renderSheet(q, opts) {
    opts = opts || {};
    const items = q.items.filter(it => it.name || it.qty || it.price);
    const rows = [];
    for (let i = 0; i < Math.max(ROWS, items.length); i++) {
      const it = items[i];
      rows.push(it ? `<tr><td class="n">${i + 1}</td><td>${esc(it.name)}</td><td class="spec">${esc(it.spec)}</td><td class="num">${esc(it.qty)}</td><td class="c">${esc(it.unit)}</td><td class="num">${fmt(it.price)}</td><td class="amt">${fmt(num(it.qty) * num(it.price))}</td></tr>`
                    : `<tr><td class="n">${i + 1}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`);
    }
    const sub = subtotal(q), del = num(q.delivery), vat = vatAmt(q), tot = grand(q);
    const settings = q.settings || {};
    const signer = settings.signer || { name: 'سامي الشريف', title: 'المدير العام · General Director' };
    const vurl = q.sig ? verifyUrl(q.payload, q.sig) : '';
    const qr = vurl ? qrSvg(vurl, 26) : '<div style="width:100%;height:100%;border:1px dashed #bbb"></div>';
    const bank = settings.bank && settings.bank.iban ? `${settings.bank.name || ''} · IBAN ${settings.bank.iban}${settings.bank.beneficiary ? ' · ' + settings.bank.beneficiary : ''}` : '';
    return `<div class="sheet${opts.copy ? ' copy' : ''}">
  <div class="perf" data-label="${opts.copy ? 'COPY — نسخة' : 'ORIGINAL — نسخة العميل'}"></div>
  <img class="lattice" src="/assets/mark-mono-gold.svg" alt="">
  <div class="hdr">
    <div class="logo"><img src="/assets/horizontal-colour-transparent.svg" alt="درع الصفا"></div>
    <div class="co"><b>${CO.ar}</b><span class="en">${CO.en}</span><br>${CO.addr}<br>سجل تجاري ${CO.cr}${settings.vatNo ? ' · الرقم الضريبي ' + esc(settings.vatNo) : ''}<br><span dir="ltr">${CO.phone} · ${CO.email} · ${CO.web}</span></div>
    <div class="title"><div class="t">عرض سعر<small>QUOTATION</small></div><div class="no"><small>No.</small>${esc(q.number)}</div></div>
  </div>
  <div class="meta">
    <div><b>التاريخ · Date</b><span>${dateAr(q.date)}</span></div>
    <div><b>صالح حتى · Valid until</b><span>${dateAr(q.valid)}</span></div>
    <div><b>المرجع · Ref.</b><span>${esc(q.ref) || '—'}</span></div>
  </div>
  <div class="to">
    <div><b>السادة · To</b><div class="v">${esc(q.client.company || q.client.name)}</div>${q.client.company && q.client.name ? '<div>' + esc(q.client.name) + '</div>' : ''}</div>
    <div><b>الهاتف · Phone</b><span class="ltr v">${esc(q.client.phone) || '—'}</span>${q.client.vat ? '<b>الرقم الضريبي · VAT</b><span class="ltr">' + esc(q.client.vat) + '</span>' : ''}</div>
    <div><b>المدينة · City</b><div class="v">${esc(q.client.city) || '—'}</div><b>التسليم · Delivery</b><div>${esc(q.deliveryMode)}</div></div>
  </div>
  <table class="lines"><colgroup><col style="width:7mm"><col style="width:46mm"><col><col style="width:16mm"><col style="width:17mm"><col style="width:22mm"><col style="width:25mm"></colgroup>
    <thead><tr><th>#</th><th>الصنف<small>Item</small></th><th>المواصفات<small>Specification</small></th><th>الكمية<small>Qty</small></th><th>الوحدة<small>Unit</small></th><th>سعر الوحدة<small>Unit price · SAR</small></th><th>الإجمالي<small>Amount · SAR</small></th></tr></thead>
    <tbody>${rows.join('')}</tbody></table>
  <div class="after">
    <div class="terms">
      <div><b>شروط الدفع · Payment</b>${esc(q.payment)}</div>
      <div><b>التسليم · Delivery</b>${esc(q.deliveryTerms)}</div>
      <div><b>الصلاحية · Validity</b>هذا العرض صالح حتى ${dateAr(q.valid)}؛ الأسعار بالريال السعودي وتخضع لتوفر الكميات عند التأكيد.<span class="en">Valid until ${esc(q.valid)}. Prices in SAR, subject to availability at confirmation.</span></div>
      ${q.notes ? '<div><b>ملاحظات · Notes</b>' + esc(q.notes).replace(/\n/g, '<br>') + '</div>' : ''}
    </div>
    <div>
      <div class="totals">
        <div><span>المجموع · Subtotal</span><span>${fmt(sub)}</span></div>
        ${del ? `<div><span>التوصيل · Delivery</span><span>${fmt(del)}</span></div>` : ''}
        ${q.vat && q.vat.on ? `<div><span>ضريبة القيمة المضافة ${esc(q.vat.rate)}٪ · VAT</span><span>${fmt(vat)}</span></div>` : ''}
        <div class="g"><span>الإجمالي · Total (SAR)</span><span>${fmt(tot)}</span></div>
      </div>
      <div class="words"><b>المبلغ كتابةً · Amount in words</b>${tafqeet(tot)}</div>
    </div>
  </div>
  <div class="foot">
    <div class="sig">
      <div class="sigbox"><div class="for">عن مؤسسة درع الصفا للتجارة · For Dira alSafa Est. for Trading</div>
        <div class="stamp"><img src="/assets/stamp.png" alt="ختم"></div>
        <div class="nm">${esc(signer.name)}<small>${esc(signer.title)}</small></div></div>
      <div class="qrbox"><div class="qr">${qr}</div><b>امسح للتحقق</b>Scan to verify · ${CO.web}/q</div>
    </div>
    <div class="fine"><span>${CO.agent} · عرض السعر هذا ليس فاتورة ضريبية. This quotation is not a tax invoice.</span>${bank ? '<span class="bank">' + esc(bank) + '</span>' : ''}</div>
  </div>
  ${q.sig ? '' : '<div class="wm-draft"><span>مسودة · DRAFT</span></div>'}
</div>`;
  }

  return { PUBLIC_JWK, BASE, CO, b64u, unb64u, payloadOf, encodePayload, decodePayload, sign, verify, verifyUrl, wrapPrivate, unwrapPrivate, num, money, fmt, subtotal, vatAmt, grand, tafqeet, esc, dateAr, qrSvg, renderSheet };
})();

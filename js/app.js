/* Kana to N1 — แอปหน้าเดียว ไม่ต้อง build เปิดจากไฟล์หรือ GitHub Pages ได้ทันที
   ความคืบหน้าเก็บใน localStorage ของเบราว์เซอร์ */
(function () {
  'use strict';

  var EJ = window.EJ;
  var view = document.getElementById('view');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ================= utils ================= */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a, n) { return shuffle(a).slice(0, n); }
  function uniqBy(a, f) { var seen = {}; return a.filter(function (x) { var k = f(x); if (seen[k]) return false; seen[k] = 1; return true; }); }
  function lvVars(lv) { return '--c:var(--line-' + lv.id + ');--on:var(--on-' + lv.id + ')'; }
  function lvChip(lv, text) { return '<span class="chip" style="' + lvVars(lv) + '">' + esc(text == null ? lv.code : text) + '</span>'; }
  function icon(id, cls) { return '<svg class="i ' + (cls || '') + '"><use href="#i-' + id + '"/></svg>'; }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }
  var hasKanji = function (s) { return /[㐀-䶿一-鿿々]/.test(s); };

  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function dayNum(k) { var p = (k || dayKey()).split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5); }
  function keyOf(n) { var d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  var TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function thDate(k) { var p = k.split('-').map(Number); return p[2] + ' ' + TH_MONTH[p[1] - 1] + ' ' + (p[0] + 543); }

  /* ================= kana → romaji ================= */
  var ROMA = {};
  (function () {
    var k = EJ.kana.hira;
    k.basic.concat(k.voiced).forEach(function (row) { row.forEach(function (c) { if (c) ROMA[c[0]] = c[1]; }); });
    k.yoon.forEach(function (c) { ROMA[c[0]] = c[1]; });
    EJ.kana.kata.extra.forEach(function (c) { ROMA[toHira(c[0])] = c[1]; });
    ROMA['ぁ'] = 'a'; ROMA['ぃ'] = 'i'; ROMA['ぅ'] = 'u'; ROMA['ぇ'] = 'e'; ROMA['ぉ'] = 'o'; ROMA['ゔ'] = 'vu'; ROMA['ゎ'] = 'wa';
  })();
  function toHira(s) { return s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }); }
  function tokRoma(t) {
    t = toHira(t); var out = '';
    for (var i = 0; i < t.length; i++) {
      var two = t.substr(i, 2);
      if (two.length === 2 && ROMA[two] && /[ゃゅょぁぃぅぇぉ]/.test(two[1])) { out += ROMA[two]; i++; continue; }
      var c = t[i];
      if (c === 'っ') {
        var nx = t.substr(i + 1, 2), nr = (nx.length === 2 && ROMA[nx]) || ROMA[t[i + 1]] || '';
        out += nr ? (nr.indexOf('ch') === 0 ? 't' : nr[0]) : ''; continue;
      }
      if (c === 'ー') { var m = out.match(/[aeiou]$/); out += m ? m[0] : ''; continue; }
      if (c === 'ん') { out += 'n'; if (t[i + 1] && /[あいうえおやゆよ]/.test(t[i + 1])) out += "'"; continue; }
      out += ROMA[c] !== undefined ? ROMA[c] : (/[、。？！?!]/.test(c) ? '' : c);
    }
    return out;
  }
  function romaji(s) {
    if (!s) return '';
    return s.split(/\s+/).map(function (tok) {
      if (tok === 'は') return 'wa'; if (tok === 'へ') return 'e'; if (tok === 'を') return 'o';
      return tokRoma(tok);
    }).join(' ').trim();
  }

  /* ฟูริงานะ: วางคำอ่านเฉพาะส่วนที่เป็นคันจิ */
  function furi(w, r) {
    if (!hasKanji(w) || !r) return esc(w);
    var a = 0, b = 0;
    while (a < w.length && a < r.length && w[a] === r[a] && !hasKanji(w[a])) a++;
    while (b < w.length - a && b < r.length - a && w[w.length - 1 - b] === r[r.length - 1 - b] && !hasKanji(w[w.length - 1 - b])) b++;
    var mid = w.slice(a, w.length - b), midR = r.slice(a, r.length - b);
    return esc(w.slice(0, a)) + '<ruby>' + esc(mid) + '<rt>' + esc(midR) + '</rt></ruby>' + esc(w.slice(w.length - b));
  }

  /* ================= data index ================= */
  var LEVELS = EJ.levels;
  var STATIONS = [], SID = {}, CARD = {}, VOCAB = [], KANJI = [], GRAMMAR = [], KANA_ALL = [];

  LEVELS.forEach(function (lv, li) {
    lv.index = li; lv.stations = [];
    var num = 0;
    function add(st) { num++; st.level = lv; st.num = num; st.code = lv.code + '-' + pad2(num); lv.stations.push(st); STATIONS.push(st); SID[st.id] = st; }
    lv.lessons.forEach(function (ls) {
      add({ id: ls.id, kind: ls.kind === 'kana' ? 'kana' : 'lesson', lesson: ls, title: ls.title, jp: ls.jp });
      (ls.vocab || []).forEach(function (v) {
        var c = { id: 'v:' + v[0] + '|' + v[1], type: 'v', w: v[0], r: v[1], m: v[2], level: lv, lesson: ls };
        VOCAB.push(c); if (!CARD[c.id]) CARD[c.id] = c;
      });
      (ls.kanji || []).forEach(function (k) {
        var c = { id: 'k:' + k[0], type: 'k', k: k[0], on: k[1], kun: k[2], m: k[3], exw: k[4], exr: k[5], exm: k[6], level: lv, lesson: ls };
        if (!CARD[c.id]) { CARD[c.id] = c; KANJI.push(c); }
      });
      (ls.grammar || []).forEach(function (g, gi) { var c = Object.assign({ level: lv, lesson: ls, id: 'g:' + ls.id + ':' + gi, type: 'g' }, g); GRAMMAR.push(c); CARD[c.id] = c; });
      (ls.kana || []).forEach(function (k) { KANA_ALL.push({ ch: k[0], ro: k[1], lesson: ls }); });
    });
    add({ id: lv.id + '-read', kind: 'reading', title: 'บทอ่าน: ' + lv.reading.title, jp: lv.id === 'kana' ? '看板' : '読解' });
    add({ id: lv.id + '-exam', kind: 'exam', title: 'สอบท้าย' + lv.title, jp: '試験' });
  });
  /* คลังไวยากรณ์เพิ่มเติม (data/gx-a.js, gx-b.js) ไม่ผูกกับสถานีบนแผนที่ */
  LEVELS.forEach(function (lv) {
    var arr = (window.EJ_GX || {})[lv.id]; if (!arr) return;
    var ls = { id: 'gx-' + lv.id, title: 'คลังไวยากรณ์เพิ่มเติม', extra: true };
    arr.forEach(function (x, i) { var c = { level: lv, lesson: ls, id: 'g:' + ls.id + ':' + i, type: 'g', p: x[0], m: x[1], ex: x[2], th: x[3], note: x[4] || '', extra: true }; GRAMMAR.push(c); CARD[c.id] = c; });
  });


  /* ================= bank: คลังคำศัพท์และคันจิ JLPT (data/bank.js) ================= */
  var BANK = window.EJ_BANK || { words: {}, kanji: [] }, BLV = ['n5', 'n4', 'n3', 'n2', 'n1'];
  var LVID = {}; LEVELS.forEach(function (l) { LVID[l.id] = l; });
  var BW = {}, BK = {}, BW_ALL = [], BK_ALL = [];
  var BANK_W = { title: 'คลังคำศัพท์' }, BANK_K = { title: 'คลังคันจิ' };
  BLV.forEach(function (lid) {
    var lv = LVID[lid]; BW[lid] = []; BK[lid] = [];
    (BANK.words[lid] || []).forEach(function (r) {
      var id = 'v:' + r[0] + '|' + r[1], c = CARD[id];
      if (!c) { c = { id: id, type: 'v', w: r[0], r: r[1], m: r[2] || r[3], en: !r[2], level: lv, lesson: BANK_W, bank: true }; CARD[id] = c; }
      c.gloss = r[3]; c.blv = lv;
      BW[lid].push(c); BW_ALL.push(c);
    });
  });
  BANK.kanji.forEach(function (r) {
    var lid = 'n' + r[1], lv = LVID[lid], id = 'k:' + r[0], c = CARD[id];
    if (!lv) return;
    if (!c) {
      c = { id: id, type: 'k', k: r[0], on: r[3], kun: r[4], m: r[5] || r[6], en: !r[5], exw: r[7], exr: r[8], exm: r[9], level: lv, lesson: BANK_K, bank: true };
      CARD[id] = c;
    }
    c.strokes = r[2]; c.gloss = r[6]; c.blv = lv; c.bon = r[3]; c.bkun = r[4];
    BK[lid].push(c); BK_ALL.push(c);
  });
  var SET_N = 20;
  function setsOf(list) { var o = []; for (var i = 0; i < list.length; i += SET_N) o.push(list.slice(i, i + SET_N)); return o; }
  function meanHTML(c) { return esc(c.m) + (c.en ? ' <span class="en-tag" title="ยังไม่มีคำแปลไทย">EN</span>' : ''); }
  function wordRoma(c) { if (c.ro === undefined) c.ro = romaji(c.r).replace(/[\s']/g, ''); return c.ro; }

  /* ================= accounts =================
     บัญชีออนไลน์: ชื่อผู้ใช้ + รหัสผ่าน ไม่ใช้อีเมล เก็บที่ Firebase (Auth + Firestore) ผ่าน REST
     เครื่องที่เคยเข้าแล้วจำบัญชีไว้ในรายการ ACC พร้อมโทเค็น ความคืบหน้าเก็บในเครื่องก่อนแล้วซิงก์ตามไป
     PIN เป็นแฮชในเครื่อง ใช้ล็อกตอนสลับบัญชีบนเครื่องเดียวกัน ส่วนรหัสผ่านใช้ตอนเข้าเครื่องใหม่ */
  var ACC_KEY = 'epicjapanese:accounts', GUEST_KEY = 'epicjapanese:v1', GUEST_FLAG = 'epicjapanese:guest';
  var AVA_N = 4;
  function accLoad() {
    try { var a = JSON.parse(localStorage.getItem(ACC_KEY)); if (a && Array.isArray(a.list)) return a; } catch (e) { /* storage unavailable */ }
    return { list: [], current: null };
  }
  var ACC = accLoad();
  function accSave() { try { localStorage.setItem(ACC_KEY, JSON.stringify(ACC)); } catch (e) { /* ignore */ } }
  function profile(id) { return ACC.list.filter(function (p) { return p.id === id; })[0] || null; }
  function me() { return profile(ACC.current); }
  function isCloud(p) { return !!(p && p.user); }
  var guest = false;
  try { guest = sessionStorage.getItem(GUEST_FLAG) === '1'; } catch (e) { /* ignore */ }
  function setGuest(on) { guest = on; try { if (on) sessionStorage.setItem(GUEST_FLAG, '1'); else sessionStorage.removeItem(GUEST_FLAG); } catch (e) { /* ignore */ } }
  function dataKey(id) { return id ? 'epicjapanese:p:' + id : GUEST_KEY; }
  function newId() { var s = ''; while (s.length < 10) s += Math.random().toString(36).slice(2); return s.slice(0, 10); }
  function firstGlyph(name) {
    var g = [];
    if (window.Intl && Intl.Segmenter) { var it = new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(name); for (var x of it) { g.push(x.segment); if (g.length > 1) break; } }
    else g = Array.from(name).slice(0, 2);
    if (!g.length) return '?';
    return /^[เแโใไ]$/.test(g[0]) && g[1] ? g[0] + g[1] : g[0].toUpperCase();
  }
  function ava(p, cls) {
    var c = p ? (p.color || 0) % AVA_N : 3;
    return '<span class="ava ava-c' + c + ' ' + (cls || '') + '" aria-hidden="true">' + esc(p ? firstGlyph(p.name) : '?') + '</span>';
  }
  function hexOf(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
  function hashPin(pin, salt) {
    var txt = salt + ':' + pin;
    if (window.crypto && crypto.subtle && window.TextEncoder) return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(hexOf);
    var h = 2166136261; for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return Promise.resolve('f' + h.toString(16));
  }
  function guestHasProgress() {
    try { var g = JSON.parse(localStorage.getItem(GUEST_KEY)); return !!(g && (Object.keys(g.done || {}).length || Object.keys(g.days || {}).length || Object.keys(g.srs || {}).length)); }
    catch (e) { return false; }
  }
  function useProfile(id) {
    ACC.current = id; accSave(); setGuest(false);
    KEY = dataKey(id); S = load(); LG = { mode: null, id: null, err: '' };
    SYNC.state = 'idle'; SYNC.at = null;
    safeRoute();
    if (isCloud(me())) pull(true);
  }
  function signOutView() {
    ACC.current = null; accSave(); setGuest(false);
    KEY = GUEST_KEY; S = load();
    location.hash = '#/'; safeRoute();
  }
  function forget(p) {
    try { localStorage.removeItem(dataKey(p.id)); } catch (e) { /* ignore */ }
    ACC.list = ACC.list.filter(function (x) { return x !== p; }); accSave();
  }
  function fmtRecovery(c) { return String(c || '').replace(/(.{4})(?=.)/g, '$1-'); }

  /* ---------- cloud ---------- */
  var ERR = {
    bad_username: 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, 0-9 และ _ ยาว 3 ถึง 20 ตัว',
    short_password: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว',
    taken: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว ลองชื่ออื่น',
    bad_login: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    bad_recover: 'ชื่อผู้ใช้หรือรหัสกู้คืนไม่ถูกต้อง',
    locked: 'ใส่ผิดหลายครั้ง บัญชีถูกพักไว้ 15 นาที',
    too_big: 'ข้อมูลใหญ่เกินกว่าจะบันทึกได้',
    mismatch: 'รหัสผ่านสองช่องไม่ตรงกัน',
    network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่'
  };
  /* ---------- Firebase (REST, no SDK) ----------
     ชื่อผู้ใช้ถูกแปลงเป็นที่อยู่ภายใน <ชื่อ>@users.epicjapanese.local ให้ Firebase Auth ไม่มีการส่งอีเมลใดๆ
     ความคืบหน้าเก็บที่ Firestore progress/{uid} เป็นสตริง JSON ช่องเดียว กฎใน firestore.rules ให้อ่าน/เขียนได้เฉพาะเจ้าของ */
  var FB = window.EJ_FIREBASE || null;
  var USER_DOMAIN = '@users.epicjapanese.local';
  var IDC = {};
  var FB_ERR = { EMAIL_EXISTS: 'taken', INVALID_LOGIN_CREDENTIALS: 'bad_login', INVALID_PASSWORD: 'bad_login', EMAIL_NOT_FOUND: 'bad_login',
    WEAK_PASSWORD: 'short_password', TOO_MANY_ATTEMPTS_TRY_LATER: 'locked', INVALID_EMAIL: 'bad_username', MISSING_PASSWORD: 'short_password',
    TOKEN_EXPIRED: 'bad_session', INVALID_REFRESH_TOKEN: 'bad_session', USER_NOT_FOUND: 'bad_session', USER_DISABLED: 'bad_session',
    INVALID_ID_TOKEN: 'bad_session', CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'bad_login' };
  function fbPost(url, body, form) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' }, body: form ? body : JSON.stringify(body) })
      .then(function (r) {
        return r.json().then(function (j) {
          if (r.ok) return j;
          var m = String(j && j.error && j.error.message || '').split(/[ :]/)[0];
          if (FB_ERR[m]) return { __err: FB_ERR[m] };
          throw new Error('http ' + r.status + ' ' + JSON.stringify(j).slice(0, 180));
        });
      });
  }
  function authCall(op, body) { return fbPost('https://identitytoolkit.googleapis.com/v1/accounts:' + op + '?key=' + FB.apiKey, body); }
  function keepId(uid, tok, exp) { IDC[uid] = { tok: tok, exp: Date.now() + (+exp || 3600) * 1000 - 60000 }; }
  function idToken(sess) {
    var c = IDC[sess.uid];
    if (c && c.exp > Date.now()) return Promise.resolve(c.tok);
    return fbPost('https://securetoken.googleapis.com/v1/token?key=' + FB.apiKey, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(sess.rt), true)
      .then(function (j) {
        if (j.__err) return null;
        sess.rt = j.refresh_token; accSave(); keepId(sess.uid, j.id_token, j.expires_in);
        return j.id_token;
      });
  }
  function docUrl(uid) { return 'https://firestore.googleapis.com/v1/projects/' + FB.projectId + '/databases/(default)/documents/progress/' + uid; }
  function fsFail(r) { return r.text().then(function (x) { throw new Error('http ' + r.status + ' ' + x.slice(0, 180)); }); }
  function fsGet(sess) {
    return idToken(sess).then(function (t) {
      if (!t) return { error: 'bad_session' };
      return fetch(docUrl(sess.uid), { headers: { Authorization: 'Bearer ' + t } }).then(function (r) {
        if (r.status === 404) return { data: {}, updated_at: null };
        if (r.status === 401) return { error: 'bad_session' };
        if (!r.ok) return fsFail(r);
        return r.json().then(function (d) {
          var s = d.fields && d.fields.json && d.fields.json.stringValue, data = {};
          try { data = JSON.parse(s || '{}'); } catch (e) { /* keep empty */ }
          return { data: data, updated_at: d.updateTime };
        });
      });
    });
  }
  function fsPut(sess, data, base, keepalive) {
    return idToken(sess).then(function (t) {
      if (!t) return { error: 'bad_session' };
      var q = '?updateMask.fieldPaths=json&updateMask.fieldPaths=at&' + (base ? 'currentDocument.updateTime=' + encodeURIComponent(base) : 'currentDocument.exists=false');
      return fetch(docUrl(sess.uid) + q, {
        method: 'PATCH', keepalive: !!keepalive,
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(data) }, at: { timestampValue: new Date().toISOString() } } })
      }).then(function (r) {
        if (r.ok) return r.json().then(function (d) { return { updated_at: d.updateTime }; });
        if (r.status === 401) return { error: 'bad_session' };
        if (r.status === 400 || r.status === 404 || r.status === 409) {
          return r.text().then(function (x) {
            if (!/FAILED_PRECONDITION|ALREADY_EXISTS|NOT_FOUND/.test(x)) throw new Error('http ' + r.status + ' ' + x.slice(0, 180));
            return fsGet(sess).then(function (g) { return g.error ? g : { error: 'conflict', data: g.data, updated_at: g.updated_at }; });
          });
        }
        return fsFail(r);
      });
    });
  }
  function normUser(u) { return String(u || '').trim().toLowerCase(); }
  function reauth(user, pass) {
    return authCall('signInWithPassword', { email: user + USER_DOMAIN, password: pass || '', returnSecureToken: true });
  }
  /* คืนค่ารูปแบบเดียวกับ ej_* เดิม: {error} หรือ {username, token, data, updated_at} โดย token คือ {uid, rt} */
  function rpc(fn, a, keepalive) {
    if (!FB) return Promise.reject(new Error('no_cloud'));
    var u, R = function (o) { return Promise.resolve(o); };
    if (fn === 'ej_signup') {
      u = normUser(a.p_username);
      if (!/^[a-z0-9_]{3,20}$/.test(u)) return R({ error: 'bad_username' });
      if (String(a.p_password || '').length < 6) return R({ error: 'short_password' });
      return authCall('signUp', { email: u + USER_DOMAIN, password: a.p_password, returnSecureToken: true }).then(function (j) {
        if (j.__err) return { error: j.__err };
        keepId(j.localId, j.idToken, j.expiresIn);
        var sess = { uid: j.localId, rt: j.refreshToken };
        return fsPut(sess, a.p_data || {}, null).then(function (w) {
          if (w.error === 'conflict') return { username: u, token: sess, data: w.data, updated_at: w.updated_at };
          if (w.error) return w;
          return { username: u, token: sess, data: a.p_data || {}, updated_at: w.updated_at };
        });
      });
    }
    if (fn === 'ej_login') {
      u = normUser(a.p_username);
      if (!/^[a-z0-9_]{3,20}$/.test(u)) return R({ error: 'bad_login' });
      return reauth(u, a.p_password).then(function (j) {
        if (j.__err) return { error: j.__err };
        keepId(j.localId, j.idToken, j.expiresIn);
        var sess = { uid: j.localId, rt: j.refreshToken };
        return fsGet(sess).then(function (g) { return g.error ? g : { username: u, token: sess, data: g.data, updated_at: g.updated_at }; });
      });
    }
    if (fn === 'ej_load') return fsGet(a.p_token);
    if (fn === 'ej_save') return fsPut(a.p_token, a.p_data, a.p_base, keepalive);
    if (fn === 'ej_logout') { delete IDC[a.p_token.uid]; return R({ ok: true }); }
    if (fn === 'ej_change_password') {
      if (String(a.p_new || '').length < 6) return R({ error: 'short_password' });
      return reauth(a.p_user, a.p_old).then(function (j) {
        if (j.__err) return { error: j.__err === 'locked' ? 'locked' : 'bad_login' };
        return authCall('update', { idToken: j.idToken, password: a.p_new, returnSecureToken: true }).then(function (k) {
          if (k.__err) return { error: k.__err };
          a.p_token.rt = k.refreshToken; keepId(a.p_token.uid, k.idToken, k.expiresIn); accSave();
          return { ok: true };
        });
      });
    }
    if (fn === 'ej_delete') {
      return reauth(a.p_user, a.p_password).then(function (j) {
        if (j.__err) return { error: j.__err === 'locked' ? 'locked' : 'bad_login' };
        return fetch(docUrl(j.localId), { method: 'DELETE', headers: { Authorization: 'Bearer ' + j.idToken } }).then(function () {
          return authCall('delete', { idToken: j.idToken });
        }).then(function (k) { return k.__err ? { error: k.__err } : { ok: true }; });
      });
    }
    return Promise.reject(new Error('unknown ' + fn));
  }
  var SYNC = { state: 'idle', at: null }, pushT = 0, pushing = false;
  function syncText() {
    var s = SYNC.state;
    if (s === 'saving') return 'กำลังซิงก์';
    if (s === 'offline') return 'ออฟไลน์ ข้อมูลอยู่ในเครื่อง จะซิงก์เมื่อต่อเน็ต';
    if (s === 'error') return 'ซิงก์ไม่สำเร็จ จะลองใหม่อัตโนมัติ';
    if (s === 'signedout') return 'หมดเวลาเข้าสู่ระบบ ใส่รหัสผ่านอีกครั้งเพื่อซิงก์';
    if (SYNC.at) return 'ซิงก์แล้ว ' + pad2(SYNC.at.getHours()) + ':' + pad2(SYNC.at.getMinutes());
    return 'บัญชีออนไลน์';
  }
  function setSync(s) {
    SYNC.state = s; if (s === 'ok') SYNC.at = new Date();
    var el = $('#syncLine'); if (el) { el.textContent = syncText(); el.className = 'sync sync-' + s; }
  }
  function busy() { return !!($('#quizBox') || $('#revBox') || $('.gate')); }
  function mergeData(a, b) {
    var o = normData(JSON.parse(JSON.stringify(a))), y = normData(b);
    Object.keys(y.done).forEach(function (k) { var p = o.done[k], q = y.done[k]; if (!p || (q.score || 0) > (p.score || 0)) o.done[k] = q; });
    Object.keys(y.srs).forEach(function (k) {
      var p = o.srs[k], q = y.srs[k];
      if (!p) { o.srs[k] = q; return; }
      var np = (p.reps || 0) + (p.lapses || 0), nq = (q.reps || 0) + (q.lapses || 0);
      if (nq > np || (nq === np && (q.due || 0) > (p.due || 0))) o.srs[k] = q;
    });
    Object.keys(y.days).forEach(function (k) { o.days[k] = Math.max(o.days[k] || 0, y.days[k] || 0); });
    Object.keys(y.stats).forEach(function (k) { o.stats[k] = Math.max(o.stats[k] || 0, y.stats[k] || 0); });
    Object.keys(y.drill || {}).forEach(function (k) { o.drill[k] = Math.max(o.drill[k] || 0, y.drill[k] || 0); });
    if (y.created && (!o.created || y.created < o.created)) o.created = y.created;
    return o;
  }
  function storeLocal() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function markDirty() {
    var p = me(); if (!isCloud(p)) return;
    if (!p.dirty) { p.dirty = true; accSave(); }
    clearTimeout(pushT); pushT = setTimeout(push, 1500);
  }
  function push() {
    var p = me();
    if (!isCloud(p) || !p.token || !p.dirty) return Promise.resolve();
    if (pushing) { clearTimeout(pushT); pushT = setTimeout(push, 1500); return Promise.resolve(); }
    if (navigator.onLine === false) { setSync('offline'); return Promise.resolve(); }
    pushing = true; setSync('saving');
    var snap = JSON.stringify(S);
    return rpc('ej_save', { p_token: p.token, p_data: S, p_base: p.base || null }).then(function (r) {
      pushing = false;
      if (me() !== p) return;
      if (r.error === 'conflict') { S = mergeData(S, r.data); p.base = r.updated_at; storeLocal(); accSave(); chrome(); return push(); }
      if (r.error === 'bad_session') { p.token = null; accSave(); setSync('signedout'); return; }
      if (r.error) { setSync('error'); return; }
      p.base = r.updated_at;
      if (JSON.stringify(S) === snap) p.dirty = false;
      accSave(); setSync('ok');
      if (p.dirty) { clearTimeout(pushT); pushT = setTimeout(push, 1500); }
    }).catch(function () {
      pushing = false; setSync(navigator.onLine === false ? 'offline' : 'error');
      clearTimeout(pushT); pushT = setTimeout(push, 20000);
    });
  }
  function pull(rerender) {
    var p = me();
    if (!isCloud(p) || !p.token) { if (isCloud(p)) setSync('signedout'); return Promise.resolve(); }
    setSync('saving');
    return rpc('ej_load', { p_token: p.token }).then(function (r) {
      if (me() !== p) return;
      if (r.error === 'bad_session') { p.token = null; accSave(); setSync('signedout'); if (rerender && !busy()) safeRoute(); return; }
      if (r.error) { setSync('error'); return; }
      if (r.updated_at !== p.base) {
        var server = normData(r.data);
        S = p.dirty ? mergeData(S, server) : server;
        p.base = r.updated_at; storeLocal(); accSave();
        if (rerender && !busy()) safeRoute(); else chrome();
      }
      setSync('ok');
      if (p.dirty) return push();
    }).catch(function () { setSync(navigator.onLine === false ? 'offline' : 'error'); });
  }
  /* ส่งข้อมูลที่ยังไม่ซิงก์ของบัญชีใดก็ได้ในเครื่องขึ้นก่อนเอาบัญชีออก (ชนกันก็รวมแล้วส่งอีกครั้ง) */
  function syncProfileNow(p) {
    if (!isCloud(p) || !p.token || !p.dirty) return Promise.resolve();
    var d; try { d = normData(JSON.parse(localStorage.getItem(dataKey(p.id)))); } catch (e) { return Promise.resolve(); }
    return rpc('ej_save', { p_token: p.token, p_data: d, p_base: p.base || null }).then(function (r) {
      if (r.error === 'conflict') return rpc('ej_save', { p_token: p.token, p_data: mergeData(d, r.data), p_base: r.updated_at });
    });
  }
  function flush() {
    var p = me();
    if (!isCloud(p) || !p.token || !p.dirty || pushing) return;
    var body = { p_token: p.token, p_data: S, p_base: p.base || null };
    if (JSON.stringify(body).length < 60000) rpc('ej_save', body, true).catch(function () { /* next visit retries */ });
  }
  /* เข้าระบบสำเร็จ: เพิ่ม/อัปเดตบัญชีในรายการของเครื่องนี้ เก็บข้อมูล แล้วเปิดบัญชีนั้น */
  function adoptCloud(r, color, data, dirty) {
    var id = 'u:' + r.username, p = profile(id);
    if (!p) { p = { id: id, user: r.username, name: r.username, color: color || 0, salt: newId(), created: dayKey() }; ACC.list.push(p); }
    if (color != null) p.color = color;
    p.token = r.token; p.base = r.updated_at; p.dirty = !!dirty;
    try { localStorage.setItem(dataKey(id), JSON.stringify(normData(data || {}))); } catch (e) { /* ignore */ }
    accSave();
    useProfile(id);
    if (dirty) markDirty();
    return p;
  }
  function formErr(form, code, fallback) {
    var msg = ERR[code] || fallback || code;
    var e = $('.form-err', form);
    if (!e) { e = document.createElement('p'); e.className = 'form-err'; e.setAttribute('role', 'alert'); var b = $('button[type=submit]', form); b.parentNode.insertBefore(e, b.closest('.row-actions') || b); }
    e.textContent = msg;
    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
    formBusy(form, false);
  }
  function formBusy(form, on, label) {
    var b = $('button[type=submit]', form); if (!b) return;
    if (on) { b.dataset.label = b.textContent; b.textContent = label || 'กำลังส่ง…'; b.disabled = true; }
    else if (b.dataset.label) { b.textContent = b.dataset.label; b.disabled = false; }
  }

  /* ================= store ================= */
  var KEY = dataKey(me() ? ACC.current : null);
  var LG = { mode: null, id: null, err: '' };
  function defaults() {
    return { v: 1, created: dayKey(), done: {}, srs: {}, days: {}, stats: { answered: 0, correct: 0, written: 0, reviews: 0 }, drill: {},
      settings: { goal: 30, rate: 0.9, romaji: true, furigana: true, pitch: true, voice: '' } };
  }
  function normData(s) {
    var d = defaults();
    if (s && s.v === 1) {
      Object.keys(d).forEach(function (k) {
        if (s[k] === undefined || s[k] === null) return;
        d[k] = (typeof d[k] === 'object' && !Array.isArray(d[k])) ? Object.assign(d[k], s[k]) : s[k];
      });
    }
    return d;
  }
  function load() {
    try { return normData(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return defaults(); }
  }
  var S = load();
  function save() { storeLocal(); markDirty(); }

  function xpToday() { return S.days[dayKey()] || 0; }
  function addXP(n) { var k = dayKey(); S.days[k] = (S.days[k] || 0) + n; save(); chrome(); }
  function streak() {
    var d = dayNum(), n = 0;
    if (!S.days[keyOf(d)]) d--;
    while (S.days[keyOf(d)] > 0) { n++; d--; }
    return n;
  }
  function isDone(id) { return !!S.done[id]; }
  function markDone(id, score) {
    var prev = S.done[id];
    if (!prev || (score || 0) > (prev.score || 0)) S.done[id] = { at: dayKey(), score: score || 0 };
    save();
  }
  function current() { for (var i = 0; i < STATIONS.length; i++) if (!isDone(STATIONS[i].id)) return STATIONS[i]; return null; }
  function levelDone(lv) { return lv.stations.every(function (s) { return isDone(s.id); }); }
  function levelCount(lv) { return lv.stations.filter(function (s) { return isDone(s.id); }).length; }
  function doneCount() { return STATIONS.filter(function (s) { return isDone(s.id); }).length; }

  /* ---------- SRS ---------- */
  function addCards(ids) {
    var t = dayNum(), n = 0;
    ids.forEach(function (id) { if (CARD[id] && !S.srs[id]) { S.srs[id] = { ivl: 0, ease: 2.5, due: t, reps: 0, lapses: 0 }; n++; } });
    save(); chrome(); return n;
  }
  function lessonCardIds(ls) {
    return (ls.vocab || []).map(function (v) { return 'v:' + v[0] + '|' + v[1]; }).concat((ls.kanji || []).map(function (k) { return 'k:' + k[0]; })).concat((ls.grammar || []).map(function (g, gi) { return 'g:' + ls.id + ':' + gi; }));
  }
  function dueIds() { var t = dayNum(); return Object.keys(S.srs).filter(function (id) { return CARD[id] && S.srs[id].due <= t; }); }
  function schedule(c, g) {
    var t = dayNum(); c = Object.assign({}, c);
    if (g === 1) { c.reps = 0; c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = 0; c.due = t; return c; }
    if (g === 2) { c.ivl = Math.max(1, Math.round((c.ivl || 1) * 1.2)); c.ease = Math.max(1.3, c.ease - 0.15); }
    else if (g === 3) { c.ivl = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.ivl * c.ease); }
    else { c.ivl = c.reps === 0 ? 4 : Math.round(Math.max(c.ivl, 1) * c.ease * 1.3); c.ease += 0.15; }
    c.reps++; c.due = t + c.ivl; return c;
  }
  function ivlLabel(c, g) { if (g === 1) return '< 1 นาที'; var n = schedule(c, g).ivl; return n < 30 ? n + ' วัน' : Math.round(n / 30) + ' เดือน'; }

  /* ================= speech ================= */
  var VOICES = [];
  function loadVoices() { if (!('speechSynthesis' in window)) return; VOICES = speechSynthesis.getVoices().filter(function (v) { return /^ja/i.test(v.lang); }); }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  function speak(text, opt) {
    opt = opt || {};
    if (!('speechSynthesis' in window)) { toast('เบราว์เซอร์นี้ไม่รองรับเสียงอ่าน'); if (opt.onend) setTimeout(opt.onend, 800); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ''));
    u.lang = 'ja-JP'; u.rate = S.settings.rate * (opt.slow ? 0.7 : 1);
    if (opt.onend) { var fired = false; u.onend = u.onerror = function () { if (!fired) { fired = true; opt.onend(); } }; }
    var v = VOICES.filter(function (x) { return x.name === S.settings.voice; })[0] || VOICES[0];
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  function sayBtn(text, label) { return '<button class="icon-btn" data-say="' + esc(text) + '" aria-label="' + esc(label || 'ฟังเสียง') + '">' + icon('sound') + '</button>'; }

  /* ================= chrome ================= */
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200); }
  function chrome() {
    var p = me();
    $$('[data-me]').forEach(function (el) {
      el.innerHTML = ava(p, el.getAttribute('data-me') === 'top' ? 'ava-sm' : 'ava-xs') + (el.getAttribute('data-me') === 'side' ? '<span>' + (p ? esc(p.name) : 'บัญชี') + '</span>' : '');
      el.setAttribute('aria-label', p ? 'บัญชี ' + p.name : 'บัญชี');
    });
    var due = dueIds().length, dc = $('#dueCount');
    dc.textContent = due ? due : '';
    dc.classList.toggle('due', due > 0);
    var x = xpToday(), g = S.settings.goal;
    $('#sideToday').innerHTML =
      '<div class="row"><span>วันนี้</span><span class="num">' + x + ' / ' + g + ' XP</span></div>' +
      '<div class="bar red"><i style="transform:scaleX(' + Math.min(1, x / g) + ')"></i></div>' +
      '<div class="row" style="margin-top:8px"><span>ต่อเนื่อง</span><span class="num">' + streak() + ' วัน</span></div>';
  }
  function setNav(name) { $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === name); }); }
  function openSheet(html) {
    var w = $('#sheet'); w.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>'; w.hidden = false;
    var f = $('.sheet button, .sheet a', w); if (f) f.focus();
  }
  function closeSheet() { var w = $('#sheet'); w.hidden = true; w.innerHTML = ''; }

  /* ================= router ================= */
  function themePref() { try { return localStorage.getItem('epicjapanese:theme') || 'auto'; } catch (e) { return 'auto'; } }
  function applyTheme() {
    var t = themePref(), root = document.documentElement;
    if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
    var dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#1f1b16' : '#f4efe6');
  }
  function setTheme(t) { try { localStorage.setItem('epicjapanese:theme', t); } catch (e) {} applyTheme(); }
  applyTheme();
  if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', applyTheme); }
  var mounted = null, lastBase = '';
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    var a = parts[0] || '', r;
    if (mounted && mounted.destroy) mounted.destroy();
    closeSheet();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    var gated = !me() && !guest;
    document.body.classList.toggle('gated', gated);
    if (gated) a = '__login';
    switch (a) {
      case '__login': r = viewLogin(); setNav(''); break;
      case 'account': r = viewAccount(); setNav('account'); break;
      case '': r = viewMap(); setNav('map'); break;
      case 'lesson': r = SID[parts[1]] ? viewLesson(SID[parts[1]], parts[2] || 'intro') : viewMissing(); setNav('map'); break;
      case 'read': r = SID[parts[1] + '-read'] ? viewReading(SID[parts[1] + '-read']) : viewMissing(); setNav('map'); break;
      case 'quiz': r = SID[parts[1]] ? viewQuiz(SID[parts[1]]) : viewMissing(); setNav('map'); break;
      case 'review': r = viewReview(); setNav('review'); break;
      case 'words': r = viewWords(parts[1]); setNav('words'); break;
      case 'practice':
        if (parts[1] === 'kana' && parts[2]) r = viewPracticeQuiz('kana', parts[2]);
        else if ((parts[1] === 'w' || parts[1] === 'k') && parts[3] && parts[4]) r = viewPracticeQuiz(parts[1], parts[2], parts[3], parts[4]);
        else if ((parts[1] === 'w' || parts[1] === 'k') && parts[3]) r = viewSet(parts[1], parts[2], +parts[3]);
        else r = viewPractice(parts[1], parts[2]);
        setNav('practice'); break;
      case 'speak':
        if (parts[1] === 'd') r = TID[parts[2]] ? viewDialog(TID[parts[2]]) : viewMissing();
        else if (parts[1] === 'shadow' || parts[1] === 'say') r = viewSpDrill(parts[1], parts[2]);
        else if (parts[1] === 'listen') r = viewPracticeQuiz('listen', BW[parts[2]] ? parts[2] : 'n5');
        else r = viewSpeak(parts[1]);
        setNav('speak'); break;
      case 'kana': r = viewKana(parts[1] || 'hira'); setNav('kana'); break;
      case 'drill': r = viewDrill(parts[1] || 'hira'); setNav('kana'); break;
      case 'kanji': r = viewKanji(parts[1]); setNav('kanji'); break;
      case 'grammar': r = viewGrammar(parts[1]); setNav('grammar'); break;
      case 'write': r = viewWrite(parts[1] || 'hira', parts[2]); setNav('write'); break;
      case 'stats': r = viewStats(); setNav('stats'); break;
      case 'settings': r = viewSettings(); setNav('settings'); break;
      case 'search': r = viewSearch(parts.slice(1).join('/')); setNav(''); break;
      case 'more': r = viewMore(); setNav('more'); break;
      default: r = viewMissing(); setNav('');
    }
    if (typeof r === 'string') r = { html: r };
    view.innerHTML = r.html;
    mounted = r;
    try { if (r.mount) r.mount(); } catch (err) { showError(err); }
    var hs = $('.heat-scroll'); if (hs) hs.scrollLeft = hs.scrollWidth;
    var base = a + '/' + (parts[1] || '');
    if (base !== lastBase) { window.scrollTo(0, 0); lastBase = base; }
    chrome();
  }
  function showError(err) {
    view.insertAdjacentHTML('afterbegin', '<div class="card pad" style="margin-bottom:16px"><div class="h3">เกิดข้อผิดพลาด</div><p class="soft num" style="font-size:12px;margin-top:4px">' + esc(err && (err.message || err)) + '</p><p class="soft" style="font-size:13px;margin-top:8px">ลองกด Ctrl+F5 เพื่อโหลดหน้าใหม่ ถ้ายังไม่หายส่งข้อความนี้ให้ผู้ดูแลเว็บ</p></div>');
  }
  function safeRoute() { try { route(); } catch (err) { console.error(err); showError(err); } }
  window.addEventListener('hashchange', safeRoute);

  function viewMissing() {
    return '<div class="page page-narrow"><div class="card empty"><div class="h2">ไม่พบหน้านี้</div><p>ลิงก์อาจเปลี่ยนไปแล้ว</p><div class="row-actions"><a class="btn primary" href="#/">กลับแผนที่</a></div></div></div>';
  }

  /* ================= map (home) ================= */
  function stationHref(st) {
    if (st.kind === 'reading') return '#/read/' + st.level.id;
    if (st.kind === 'exam') return '#/quiz/' + st.id;
    return '#/lesson/' + st.id;
  }
  function viewMap() {
    var cur = current(), total = STATIONS.length, dc = doneCount();
    var due = dueIds().length, x = xpToday(), g = S.settings.goal;
    var stamps = LEVELS.map(function (lv) {
      return levelDone(lv) ? '<span class="hanko sm" style="' + lvVars(lv) + '" title="จบ' + esc(lv.title) + '">' + esc(lv.code === 'K' ? 'かな' : lv.code) + '</span>'
        : '<span class="slot">' + esc(lv.code === 'K' ? 'かな' : lv.code) + '</span>';
    }).join('');
    var where = cur ? ('<b>' + esc(cur.level.title) + '</b> สถานี ' + cur.code + ' ' + esc(cur.title)) : '<b>ถึงสถานีปลายทาง N1 แล้ว</b>';

    var html =
      '<div class="page">' +
        '<h1 class="title">แผนที่การเรียน</h1>' +
        '<p class="lead">จากศูนย์ถึง N1 ใน ' + LEVELS.length + ' สาย ' + total + ' สถานี สอบท้ายบทผ่าน 80% รับตราประทับ</p>' +

        '<div class="split">' +
          '<div class="ticket">' +
            '<div class="ticket-top"><span class="jp">乗車券</span><span>ตั๋วเรียน Kana to N1</span></div>' +
            '<div class="ticket-route"><div class="stn">ゼロ<small>เริ่มจากศูนย์</small></div><div class="arrow" aria-hidden="true"></div><div class="stn">N1<small>สถานีปลายทาง</small></div></div>' +
            '<div class="ticket-now">ตอนนี้อยู่ ' + where + '</div>' +
            '<div class="ticket-stamps">' + stamps + '</div>' +
            '<div class="ticket-meta"><span>ผ่านแล้ว <b class="num">' + dc + ' / ' + total + '</b> สถานี</span><span>ออกตั๋ว <span class="num">' + S.created + '</span></span></div>' +
          '</div>' +

          '<div class="card pad today">' +
            '<div class="today-row">' +
              '<div><div class="stat-label">XP วันนี้</div><div class="big-num">' + x + '<small>/ ' + g + '</small></div></div>' +
              '<div><div class="stat-label">ต่อเนื่อง</div><div class="big-num">' + streak() + '<small>วัน</small></div></div>' +
              '<div><div class="stat-label">การ์ดถึงกำหนด</div><div class="big-num">' + due + '<small>ใบ</small></div></div>' +
            '</div>' +
            '<div class="bar"><i style="transform:scaleX(' + Math.min(1, x / g) + ')"></i></div>' +
            (cur ?
              '<div class="next-stop"><span class="line-chip" style="' + lvVars(cur.level) + '"><span>' + pad2(cur.num) + '</span></span>' +
              '<div class="txt"><div class="stat-label">สถานีถัดไป <span class="num">' + cur.code + '</span></div><div class="h3">' + esc(cur.title) + '</div></div>' +
              '<a class="btn primary" href="' + stationHref(cur) + '">เรียนต่อ' + icon('arrow', 'i-sm') + '</a></div>'
              : '<div class="next-stop"><div class="txt"><div class="h3">ครบทุกสถานีแล้ว</div><div class="stat-label">ทบทวนการ์ดทุกวันเพื่อรักษาความจำ</div></div></div>') +
            (due ? '<a class="btn" href="#/review">' + icon('layers', 'i-sm') + 'ทบทวน ' + due + ' ใบ</a>' : '') +
          '</div>' +
        '</div>' +

        '<section class="card mapcard"><div class="map" id="map"></div>' +
          '<div class="map-legend"><span><i class="lg-pin"></i>ยังไม่ผ่าน</span><span><i class="lg-pin f"></i>ผ่านแล้ว</span><span><i class="lg-pin x"></i>สอบท้ายสาย</span><span><span class="here-tag sample">現在地</span>อยู่ที่นี่</span></div>' +
        '</section>' +

        '<section class="section"><div class="section-head"><h2 class="h2">ทุกสาย</h2><span class="muted">ขอบเขตอ้างอิงจากข้อมูลทั่วไปของ JLPT ไม่ใช่รายการทางการ</span></div>' +
          '<div class="card">' + LEVELS.map(function (lv) {
            var c = levelCount(lv), n = lv.stations.length;
            return '<a class="list-row" href="' + stationHref(lv.stations.filter(function (s) { return !isDone(s.id); })[0] || lv.stations[0]) + '">' +
              '<span class="line-chip" style="' + lvVars(lv) + '"><span>' + esc(lv.code) + '</span></span>' +
              '<div class="grow"><div class="h3">' + esc(lv.title) + '</div><div class="row-sub">' + esc(lv.desc) + '</div><div class="row-sub">' + esc(lv.scope) + '</div></div>' +
              '<span class="meta num">' + c + '/' + n + '</span>' + icon('right', 'muted') + '</a>';
          }).join('') + '</div></section>' +
      '</div>';

    var onR;
    return {
      html: html,
      mount: function () {
        var el = $('#map'), lastW = -1;
        drawMap(); lastW = el.clientWidth;
        if ('ResizeObserver' in window) {
          onR = new ResizeObserver(function () { var w = el.clientWidth; if (w !== lastW) { lastW = w; drawMap(); } });
          onR.observe(el);
        } else {
          onR = function () { drawMap(); }; window.addEventListener('resize', onR);
        }
      },
      destroy: function () { if (onR && onR.disconnect) onR.disconnect(); else window.removeEventListener('resize', onR); }
    };
  }

  function pinInner(st) { return isDone(st.id) ? icon('check') : ''; }
  function drawMap() {
    var el = $('#map'); if (!el) return;
    var W = el.clientWidth, cur = current();
    if (W < 680) { el.innerHTML = vmapHTML(cur); el.style.height = 'auto'; return; }
    var padX = 48, top = 56, rowH = 128, R = rowH / 2;
    var svg = [], nodes = [];
    // สายที่ยาวเกินความกว้างจอจะถูกแบ่งเป็นหลายแถว แล้ววิ่งต่อแบบงูเลื้อย
    var maxPer = Math.max(6, Math.floor((W - padX * 2) / 96) + 1), rows = [];
    LEVELS.forEach(function (lv) {
      var n = lv.stations.length, nr = Math.ceil(n / maxPer), per = Math.ceil(n / nr);
      for (var r = 0; r < nr; r++) rows.push({ lv: lv, st: lv.stations.slice(r * per, (r + 1) * per), first: r === 0 });
    });
    var pts = rows.map(function (row, i) {
      var n = row.st.length, step = (W - padX * 2) / Math.max(1, n - 1), y = top + i * rowH, rtl = i % 2 === 1;
      return row.st.map(function (st, j) { return { st: st, x: rtl ? W - padX - j * step : padX + j * step, y: y, step: step }; });
    });
    pts.forEach(function (row, i) {
      var lv = rows[i].lv;
      var d = 'M' + row[0].x + ' ' + row[0].y + ' L' + row[row.length - 1].x + ' ' + row[row.length - 1].y;
      svg.push('<path class="track-case" d="' + d + '"/><path class="track" style="stroke:var(--line-' + lv.id + ')" d="' + d + '"/>');
      if (i < pts.length - 1) {
        var a = row[row.length - 1], b = pts[i + 1][0], out = (i % 2 === 0) ? 1 : -1, ox = a.x + out * R * 0.75;
        var cd = 'M' + a.x + ' ' + a.y + ' C' + ox + ' ' + a.y + ' ' + ox + ' ' + b.y + ' ' + b.x + ' ' + b.y;
        svg.unshift('<path class="track-case" d="' + cd + '"/><path class="track" style="stroke:var(--line-' + rows[i + 1].lv.id + ')" d="' + cd + '"/>');
      }
      var first = row[0], rtl = i % 2 === 1, c = levelCount(lv);
      if (rows[i].first) nodes.push('<div class="line-name' + (rtl ? ' rtl' : '') + '" style="top:' + (first.y - 46) + 'px;' + (rtl ? 'right:' + (W - first.x - 10) + 'px' : 'left:' + (first.x - 10) + 'px') + '">' +
        lvChip(lv) + '<b>' + esc(lv.title) + '</b><span class="pc num">' + c + '/' + lv.stations.length + '</span></div>');
      row.forEach(function (p) {
        var st = p.st, here = cur && cur.id === st.id, w = Math.max(72, Math.min(112, p.step - 8));
        var edge = Math.abs(p.x - (W - padX)) < 1 ? ' edge-r' : Math.abs(p.x - padX) < 1 ? ' edge-l' : '';
        if (edge) w = Math.min(w, Math.round(p.step - w / 2 + 4));
        nodes.push('<a class="stop ' + st.kind + edge + (isDone(st.id) ? ' done' : '') + (here ? ' here' : '') + '" href="' + stationHref(st) + '" style="left:' + p.x + 'px;top:' + p.y + 'px;' + lvVars(lv) + ';--w:' + w + 'px" aria-label="' + esc(st.code + ' ' + st.title + (isDone(st.id) ? ' ผ่านแล้ว' : '')) + '">' +
          (here ? '<span class="here-tag">現在地</span>' + trainHTML(row, p) : '') + '<span class="code num">' + st.code + '</span><span class="pin">' + pinInner(st) + '</span><span class="name">' + esc(st.kind === 'exam' ? 'สอบท้ายสาย' : st.title) + '</span></a>');
      });
    });
    var H = top + (rows.length - 1) * rowH + 60;
    el.style.height = H + 'px';
    el.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + svg.join('') + '</svg>' + nodes.join('');
  }
  function trainHTML(row, p) {
    var j = row.indexOf(p), prev = row[j - 1];
    var fx = prev ? Math.round(prev.x - p.x) : (row[j + 1] ? Math.round(p.x - row[j + 1].x) : -48);
    return '<span class="train' + (fx > 0 ? ' rtl' : '') + '" aria-hidden="true" style="--fx:' + fx + 'px"><i></i><i></i><i></i></span>';
  }
  function vmapHTML(cur) {
    return '<div class="vmap">' + LEVELS.map(function (lv) {
      var n = lv.stations.length;
      return '<div class="vline-head"><span class="line-chip" style="' + lvVars(lv) + '"><span>' + esc(lv.code) + '</span></span><div class="t"><b>' + esc(lv.title) + '</b><small><span class="num">' + levelCount(lv) + '/' + n + '</span> สถานี</small></div></div>' +
        lv.stations.map(function (st, j) {
          var here = cur && cur.id === st.id;
          return '<a class="vstop ' + st.kind + (isDone(st.id) ? ' done' : '') + (here ? ' here' : '') + (j === 0 ? ' first' : '') + (j === n - 1 ? ' last' : '') + '" href="' + stationHref(st) + '" style="' + lvVars(lv) + '">' +
            '<span class="pin">' + pinInner(st) + '</span><span class="txt"><b>' + esc(st.title) + '</b><small><span class="num">' + st.code + '</span><span class="jp">' + esc(st.jp) + '</span></small></span>' + (here ? '<span class="here-tag">現在地</span>' : '') + '</a>';
        }).join('');
    }).join('') + '</div>';
  }

  /* ================= lesson ================= */
  function stationHead(st, extra) {
    var lv = st.level, d = S.done[st.id];
    return '<nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/">แผนที่</a>' + icon('right', 'i-sm') + '<span>' + esc(lv.title) + '</span>' + icon('right', 'i-sm') + '<span class="num">' + st.code + '</span></nav>' +
      '<div class="lesson-head" style="' + lvVars(lv) + '">' +
        '<span class="badge' + (st.kind === 'exam' ? ' exam' : '') + '">' + pad2(st.num) + '</span>' +
        '<div class="grow"><h1 class="title">' + esc(st.title) + '</h1><p class="title-jp">' + esc(st.jp) + '</p>' + (extra || '') + '</div>' +
        (d ? '<span class="hanko" title="ผ่านเมื่อ ' + thDate(d.at) + '">合格</span>' : '') +
      '</div>';
  }
  function nextOf(st) { var i = STATIONS.indexOf(st); return STATIONS[i + 1] || null; }

  function viewLesson(st, tab) {
    if (st.kind === 'reading') return viewReading(st);
    if (st.kind === 'exam') return viewQuiz(st);
    var ls = st.lesson, lv = st.level, isKana = st.kind === 'kana';
    var tabs = isKana
      ? [['intro', 'อธิบาย'], ['kana', 'ตัวอักษร', ls.kana.length], ['vocab', 'คำฝึกอ่าน', ls.vocab.length], ['quiz', 'แบบทดสอบ']]
      : [['intro', 'อธิบาย'], ['vocab', 'คำศัพท์', ls.vocab.length], ['grammar', 'ไวยากรณ์', ls.grammar.length], ['kanji', 'คันจิ', ls.kanji.length], ['quiz', 'แบบทดสอบ']];
    if (!tabs.some(function (t) { return t[0] === tab; })) tab = 'intro';
    if (tab === 'quiz') { location.replace('#/quiz/' + st.id); return ''; }

    var body = '';
    if (tab === 'intro') {
      body = '<p class="prose">' + esc(ls.intro) + '</p>' +
        (ls.tips ? '<ul class="tips" style="' + lvVars(lv) + '">' + ls.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
        '<div class="steps">' + tabs.slice(1).map(function (t, i) {
          return '<a href="#/lesson/' + st.id + '/' + t[0] + '"><div class="n">' + (i + 1) + '</div><div class="t">' + t[1] + '</div><div class="s">' +
            (t[0] === 'quiz' ? '10 ข้อ ผ่านที่ 80%' : t[2] + ' รายการ') + '</div></a>';
        }).join('') + '</div>';
    } else if (tab === 'kana') {
      body = '<div class="vhead"><p class="soft">แตะตัวอักษรเพื่อฟังเสียง</p><div class="row-actions"><a class="btn sm" href="#/write/' + (ls.id === 'k-05' || ls.id === 'k-06' ? 'kata' : 'hira') + '">' + icon('pen', 'i-sm') + 'ฝึกเขียน</a></div></div>' +
        '<div class="ktiles">' + ls.kana.map(function (k) { return '<button class="ktile" data-say="' + esc(k[0]) + '"><span class="ch">' + esc(k[0]) + '</span><span class="rm">' + esc(k[1]) + '</span></button>'; }).join('') + '</div>';
    } else if (tab === 'vocab') {
      body = vocabTable(ls.vocab, st);
    } else if (tab === 'grammar') {
      body = ls.grammar.map(function (g) { return grammarCard(g); }).join('');
    } else if (tab === 'kanji') {
      body = '<div class="vhead"><p class="soft">แตะเพื่อดูคำอ่านและตัวอย่าง จุดสีแดงคือตัวที่อยู่ในกองทบทวนแล้ว</p></div>' + kanjiTiles(ls.kanji.map(function (k) { return CARD['k:' + k[0]]; }));
    }

    var nx = tabs[tabs.map(function (t) { return t[0]; }).indexOf(tab) + 1];
    var html = '<div class="page page-narrow">' + stationHead(st) +
      '<nav class="tabs">' + tabs.map(function (t) {
        return '<a href="#/lesson/' + st.id + '/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + (t[2] ? ' <span class="num">' + t[2] + '</span>' : '') + '</a>';
      }).join('') + '</nav>' + body +
      (nx ? '<div class="row-actions" style="margin-top:32px;justify-content:flex-end"><a class="btn primary" href="#/lesson/' + st.id + '/' + nx[0] + '">ต่อไป ' + nx[1] + icon('arrow', 'i-sm') + '</a></div>' : '') +
      '</div>';
    return html;
  }

  function vocabTable(list, st) {
    var ro = S.settings.romaji, fu = S.settings.furigana;
    var ids = list.map(function (v) { return 'v:' + v[0] + '|' + v[1]; });
    var inDeck = ids.filter(function (id) { return S.srs[id]; }).length;
    return '<div class="vhead">' +
      '<div class="row-actions"><label class="toggle"><input type="checkbox" data-set="furigana"' + (fu ? ' checked' : '') + '>คำอ่าน</label>' +
      '<label class="toggle"><input type="checkbox" data-set="romaji"' + (ro ? ' checked' : '') + '>โรมาจิ</label></div>' +
      (st ? '<button class="btn sm" data-add-lesson="' + st.id + '"' + (inDeck === ids.length ? ' disabled' : '') + '>' + icon('plus', 'i-sm') + (inDeck === ids.length ? 'อยู่ในกองทบทวนแล้ว' : 'เพิ่มเข้ากองทบทวน') + '</button>' : '') +
      '</div><div class="card vlist' + (fu ? '' : ' no-furi') + '">' + list.map(function (v) {
        return '<div class="vrow"><span class="w">' + furi(v[0], v[1]) + '</span><span class="ro' + (ro ? '' : ' hide') + '">' + esc(romaji(v[1])) + '</span><span class="me">' + esc(v[2]) + '</span>' + sayBtn(v[1]) + '</div>';
      }).join('') + '</div>';
  }
  function grammarCard(g, showLevel) {
    var ro = S.settings.romaji;
    var rRow = g.r ? '<div class="r">' + esc(g.r.replace(/\s+/g, ' ')) + '</div>' + (ro ? '<div class="ro">' + esc(romaji(g.r)) + '</div>' : '') : '';
    return '<div class="card gcard">' +
      ((showLevel || g.id) ? '<div class="where">' + (showLevel ? lvChip(g.level) + '<span>' + esc(g.lesson.title) + '</span>' : '') + (g.id ? '<span class="gadd">' + addBtn(g) + '</span>' : '') + '</div>' : '') +
      '<div class="pat">' + esc(g.p) + '</div><div class="mean">' + esc(g.m) + '</div>' +
      '<div class="ex">' + sayBtn(g.ex, 'ฟังประโยค') + '<div class="body"><div class="s">' + esc(g.ex) + '</div>' + rRow + '<div class="th">' + esc(g.th) + '</div></div></div>' +
      (g.note ? '<div class="note">' + esc(g.note) + '</div>' : '') + '</div>';
  }
  function kanjiTiles(list) {
    return '<div class="ktiles">' + list.map(function (c) {
      return '<button class="ktile' + (S.srs[c.id] ? ' learned' : '') + '" data-kanji="' + esc(c.k) + '"><span class="ch">' + esc(c.k) + '</span><span class="mn">' + esc(c.m) + '</span></button>';
    }).join('') + '</div>';
  }
  /* ================= ลำดับขีด (KanjiVG) ================= */
  var STROKES = {}, STK_WAIT = {}, KLV = null;
  function strokeLv(ch) {
    if (/^[ぁ-ヺ]$/.test(ch)) return 'kana';
    if (!KLV) { KLV = {}; ((window.EJ_BANK || {}).kanji || []).forEach(function (k) { KLV[k[0]] = 'n' + k[1]; }); }
    return KLV[ch] || null;
  }
  function loadStrokes(ch, cb) {
    var lv = strokeLv(ch); if (!lv) return cb(null);
    if (STROKES[lv]) return cb(STROKES[lv][ch] || null);
    if (STK_WAIT[lv]) { STK_WAIT[lv].push(function () { cb((STROKES[lv] || {})[ch] || null); }); return; }
    STK_WAIT[lv] = [function () { cb((STROKES[lv] || {})[ch] || null); }];
    fetch('data/strokes/' + lv + '.json?v=1').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }).then(function (d) {
      STROKES[lv] = d; var w = STK_WAIT[lv]; STK_WAIT[lv] = null; w.forEach(function (f) { f(); });
    });
  }
  function strokeSVG(d, nums) {
    return '<svg class="ksvg' + (nums ? ' nums' : '') + '" viewBox="0 0 109 109" aria-hidden="true">' +
      d[0].map(function (p, i) { return '<path class="st" d="' + p + '"/>'; }).join('') +
      (nums ? '<g class="sn">' + d[1].map(function (n, i) { return '<text x="' + n[0] + '" y="' + n[1] + '">' + (i + 1) + '</text>'; }).join('') + '</g>' : '') + '</svg>';
  }
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animStrokes(svg) {
    if (!svg) return;
    var ps = Array.prototype.slice.call(svg.querySelectorAll('.st')), t = 0;
    svg.classList.add('anim');
    ps.forEach(function (p) {
      if (p._a) p._a.cancel();
      var len = p.getTotalLength ? p.getTotalLength() : 100, dur = Math.max(260, len * 9);
      p.style.strokeDasharray = len + ' ' + len;
      if (REDUCED || !p.animate) { p.style.strokeDashoffset = 0; return; }
      p.style.strokeDashoffset = len;
      p._a = p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, delay: t, fill: 'forwards', easing: 'ease-in-out' });
      t += dur + 140;
    });
  }

  function kanjiSheet(ch) {
    var c = CARD['k:' + ch]; if (!c) return;
    openSheet('<div class="sheet-head"><span class="where">' + lvChip(c.level) + '<span>' + esc(c.lesson.title) + '</span></span><button class="icon-btn" data-close aria-label="ปิด">' + icon('x') + '</button></div>' +
      '<div class="kdetail"><div><button class="kbox" id="kbox" aria-label="ดูลำดับขีดของ ' + esc(c.k) + '">' + esc(c.k) + '</button><div class="muted small kbox-hint">แตะเพื่อดูลำดับขีด</div></div><div>' +
        '<div class="h2">' + meanHTML(c) + '</div>' + (c.gloss && !c.en ? '<div class="muted" style="font-size:13px">' + esc(c.gloss) + '</div>' : '') +
        '<dl class="dl" style="margin-top:16px"><dt>อง</dt><dd class="jp">' + esc(c.on || '–') + '</dd><dt>คุน</dt><dd class="jp">' + esc(c.kun || '–') + '</dd>' + (c.strokes ? '<dt>จำนวนขีด</dt><dd class="num">' + c.strokes + '</dd>' : '') +
          (c.exw ? '<dt>ตัวอย่าง</dt><dd><span class="jp" style="font-size:18px">' + furi(c.exw, c.exr) + '</span> <span class="muted">' + esc(c.exm) + '</span></dd>' : '') + '</dl>' +
        '<div class="row-actions" style="margin-top:20px">' + (c.exr ? sayBtn(c.exr, 'ฟังคำตัวอย่าง') : '') +
          '<a class="btn sm" href="#/write/kanji/' + encodeURIComponent(c.k) + '">' + icon('pen', 'i-sm') + 'ฝึกเขียน</a>' +
          (S.srs[c.id] ? '<span class="tag">อยู่ในกองทบทวน</span>' : '<button class="btn sm" data-add-card="' + esc(c.id) + '">' + icon('plus', 'i-sm') + 'เพิ่มเข้ากองทบทวน</button>') +
        '</div></div></div>');
    loadStrokes(c.k, function (d) {
      var b = $('#kbox'); if (!b || !d) { var h = $('.kbox-hint'); if (h) h.remove(); return; }
      b.innerHTML = strokeSVG(d, true); b.onclick = function () { animStrokes($('svg', b)); }; animStrokes($('svg', b));
    });
  }

  /* ================= reading ================= */
  function viewReading(st) {
    var lv = st.level, rd = lv.reading, ro = S.settings.romaji;
    var all = rd.lines.map(function (l) { return l[0]; }).join('');
    return '<div class="page page-narrow">' + stationHead(st, '<p class="lead">อ่านเองก่อนหนึ่งรอบ แล้วค่อยเปิดคำแปล</p>') +
      '<div class="row-actions" style="margin:32px 0 16px"><button class="btn sm" data-say="' + esc(all) + '">' + icon('play', 'i-sm') + 'ฟังทั้งหมด</button>' +
        '<label class="toggle"><input type="checkbox" id="rdTh">คำแปล</label>' +
        (rd.lines[0][2] ? '<label class="toggle"><input type="checkbox" id="rdR" checked>คำอ่าน</label>' : '') + '</div>' +
      '<div class="card pad" id="rdBox">' + rd.lines.map(function (l, i) {
        return '<div class="rline"><span class="n">' + (i + 1) + '</span><div class="body"><div class="s">' + esc(l[0]) + '</div>' +
          (l[2] ? '<div class="r rd-r">' + esc(l[2]) + '</div>' + (ro ? '<div class="ro rd-r">' + esc(romaji(l[2])) + '</div>' : '') : '') +
          '<div class="th rd-th hide">' + esc(l[1]) + '</div></div>' + sayBtn(l[0]) + '</div>';
      }).join('') + '</div>' +
      '<div class="row-actions" style="margin-top:24px;justify-content:flex-end">' +
        (isDone(st.id) ? '<a class="btn primary" href="' + stationHref(nextOf(st)) + '">สถานีถัดไป' + icon('arrow', 'i-sm') + '</a>'
          : '<button class="btn primary" data-read-done="' + st.id + '">อ่านจบแล้ว รับตราประทับ</button>') +
      '</div></div>';
  }

  /* ================= quiz ================= */
  var Q = null;
  function optHTML(text, jp) { return { html: jp ? '<span class="jp">' + esc(text) + '</span>' : esc(text), key: text }; }
  function choiceQ(kind, prompt, pcls, right, pool, jpOpts, say, cardId) {
    var wrong = pick(uniqBy(pool.filter(function (x) { return x !== right; }), function (x) { return x; }), 3);
    var opts = shuffle([right].concat(wrong)).map(function (o) { var h = optHTML(o, jpOpts); h.correct = o === right; return h; });
    return { type: 'choice', kind: kind, prompt: prompt, pcls: pcls, opts: opts, answer: right, say: say, cardId: cardId };
  }
  var ALT = { shi: ['si'], chi: ['ti'], tsu: ['tu'], fu: ['hu'], ji: ['zi', 'di'], zu: ['du'], o: ['wo'], n: ['nn'], sha: ['sya'], shu: ['syu'], sho: ['syo'], cha: ['tya', 'cya'], chu: ['tyu', 'cyu'], cho: ['tyo', 'cyo'], ja: ['zya', 'jya'], ju: ['zyu', 'jyu'], jo: ['zyo', 'jyo'] };

  function buildQuestions(st) {
    var lv = st.level, lessons = st.kind === 'exam' ? lv.lessons : [st.lesson], n = st.kind === 'exam' ? 20 : 10, qs = [];
    if (lv.id === 'kana') {
      var chars = []; lessons.forEach(function (l) { chars = chars.concat(l.kana); });
      pick(chars, n).forEach(function (c, i) {
        var pool = chars.filter(function (x) { return x[1] !== c[1]; }).map(function (x) { return x[0]; });
        if (i % 2 === 0) qs.push({ type: 'type', kind: 'พิมพ์เสียงอ่านเป็นโรมาจิ', prompt: c[0], pcls: 'hand', answer: c[1], accept: [c[1]].concat(ALT[c[1]] || []), say: c[0] });
        else qs.push(choiceQ('ตัวไหนอ่านว่า "' + c[1] + '"', c[1], 'th', c[0], pool, true, c[0]));
      });
      return qs;
    }
    var levelVocab = VOCAB.filter(function (v) { return v.level === lv; }), levelKanji = KANJI.filter(function (k) { return k.level === lv; }), levelGr = GRAMMAR.filter(function (g) { return g.level === lv; });
    var buckets = { v: [], r: [], k: [], g: [] };
    lessons.forEach(function (ls) {
      ls.vocab.forEach(function (v) {
        var id = 'v:' + v[0] + '|' + v[1];
        if (Math.random() < 0.5) buckets.v.push(choiceQ('คำนี้แปลว่าอะไร', v[0], '', v[2], levelVocab.map(function (x) { return x.m; }), false, v[1], id));
        else buckets.v.push(choiceQ('คำไหนแปลว่า', v[2], 'th', v[0], levelVocab.map(function (x) { return x.w; }), true, v[1], id));
        if (hasKanji(v[0])) buckets.r.push(choiceQ('อ่านคำนี้ว่าอย่างไร', v[0], '', v[1], levelVocab.filter(function (x) { return hasKanji(x.w); }).map(function (x) { return x.r; }), true, v[1], id));
      });
      ls.kanji.forEach(function (k) {
        var id = 'k:' + k[0];
        buckets.k.push(Math.random() < 0.5
          ? choiceQ('คันจินี้มีความหมายว่า', k[0], 'hand', k[3], levelKanji.map(function (x) { return x.m; }), false, k[5], id)
          : choiceQ('อ่านคำนี้ว่าอย่างไร', k[4], '', k[5], levelKanji.map(function (x) { return x.exr; }), true, k[5], id));
      });
      ls.grammar.forEach(function (g) {
        buckets.g.push(Math.random() < 0.5
          ? choiceQ('รูปประโยคนี้หมายถึง', g.p, '', g.m, levelGr.map(function (x) { return x.m; }), false, null)
          : choiceQ('ประโยคนี้แปลว่าอะไร', g.ex, 'sentence', g.th, levelGr.map(function (x) { return x.th; }), false, g.ex));
      });
    });
    Object.keys(buckets).forEach(function (k) { buckets[k] = shuffle(buckets[k]); });
    var order = ['v', 'g', 'k', 'r'], i = 0, guard = 0;
    while (qs.length < n && guard < 200) { var b = buckets[order[i % 4]]; if (b.length) qs.push(b.pop()); i++; guard++; }
    return shuffle(qs);
  }

  function viewQuiz(st) {
    Q = { st: st, qs: buildQuestions(st), i: 0, right: 0, miss: [], locked: false };
    var html = '<div class="page"><div class="quiz">' +
      '<nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/">แผนที่</a>' + icon('right', 'i-sm') + '<span>' + esc(st.level.title) + '</span>' + icon('right', 'i-sm') + '<a href="' + (st.kind === 'exam' ? '#/' : '#/lesson/' + st.id) + '" class="num">' + st.code + '</a></nav>' +
      '<h1 class="title title-s">' + (st.kind === 'exam' ? esc(st.title) : 'แบบทดสอบ: ' + esc(st.title)) + '</h1>' +
      '<div id="quizBox"></div></div></div>';
    return { html: html, mount: renderQ, destroy: function () { Q = null; } };
  }
  function renderQ() {
    var box = $('#quizBox'); if (!box || !Q) return;
    if (Q.i >= Q.qs.length) return renderResult();
    var q = Q.qs[Q.i], n = Q.qs.length;
    Q.locked = false;
    var opts = q.type === 'choice'
      ? '<div class="qopts" id="qopts">' + q.opts.map(function (o, i) { return '<button class="qopt" data-opt="' + i + '"><span class="key">' + (i + 1) + '</span><span>' + o.html + '</span></button>'; }).join('') + '</div>'
      : '<form class="qtype" id="qtype" autocomplete="off"><input class="input" id="qin" placeholder="' + esc(q.ph || 'เช่น ka') + '" autocapitalize="off" spellcheck="false" aria-label="คำตอบ"><button class="btn primary lg">ตรวจ</button></form>';
    box.innerHTML =
      '<div class="quiz-top" style="margin-top:20px"><div class="bar"><i style="transform:scaleX(' + (Q.i / n) + ')"></i></div><span class="num muted" style="font-size:12px">' + (Q.i + 1) + ' / ' + n + '</span></div>' +
      '<div class="card qcard"><div class="qkind">' + esc(q.kind) + '</div>' +
        (q.listen ? '<div class="qlisten"><button class="btn lg" data-say="' + esc(q.say) + '">' + icon('sound') + 'ฟังอีกครั้ง</button></div>'
          : '<div class="qprompt ' + (q.pcls === 'th' ? 'th' : q.pcls === 'hand' ? 'hand' : q.pcls === 'sentence' ? 'sentence' : '') + '">' + esc(q.prompt) + '</div>' +
            (q.sub ? '<div class="qsub">' + esc(q.sub) + '</div>' : '') +
            (q.say && q.pcls !== 'th' ? '<div>' + sayBtn(q.say) + '</div>' : '')) +
        opts + '<div class="qfeed" id="qfeed"></div></div>';
    var inp = $('#qin'); if (inp) inp.focus();
    if (q.listen) setTimeout(function () { speak(q.say); }, 150);
  }
  function answerQ(correct, shown) {
    if (!Q || Q.locked) return; Q.locked = true;
    var q = Q.qs[Q.i];
    S.stats.answered++;
    if (correct) { Q.right++; S.stats.correct++; addXP(1); }
    else {
      Q.miss.push(q);
      if (q.cardId && S.srs[q.cardId]) { S.srs[q.cardId].due = dayNum(); }
    }
    save();
    if (q.say && q.pcls !== 'th' && correct) speak(q.say);
    var last = Q.i === Q.qs.length - 1;
    $('#qfeed').innerHTML = '<div class="msg ' + (correct ? 'ok' : 'bad') + '"><b>' + (correct ? 'ถูกต้อง' : 'ยังไม่ใช่') + '</b>' + (correct ? '' : ' คำตอบคือ <span class="jp">' + esc(q.answer) + '</span>') + (q.reveal ? '<div class="soft jp" style="margin-top:4px">' + esc(q.reveal) + '</div>' : '') + '</div>' +
      '<button class="btn primary" id="qnext">' + (last ? 'ดูผล' : 'ข้อต่อไป') + ' <span class="key key-inv">↵</span></button>';
    $('#qnext').focus();
  }
  function renderResult() {
    if (Q.practice) return practiceResult();
    var st = Q.st, n = Q.qs.length, sc = Q.right / n, pass = sc >= 0.8, nx = nextOf(st), pct = Math.round(sc * 100);
    var first = !isDone(st.id), added = 0;
    if (pass) {
      markDone(st.id, pct);
      if (first) addXP(st.kind === 'exam' ? 80 : 30);
      if (st.lesson) added = addCards(lessonCardIds(st.lesson));
    }
    var stampText = st.kind === 'exam' ? (st.level.code === 'K' ? 'かな' : st.level.code) : '合格';
    $('#quizBox').innerHTML = '<div class="card result" style="margin-top:24px">' +
      (pass ? '<span class="hanko lg stamp-in" style="' + lvVars(st.level) + '">' + esc(stampText) + '<small>' + st.code + '</small></span>' : '') +
      '<div class="score">' + Q.right + '<span class="muted" style="font-size:24px"> / ' + n + '</span></div>' +
      '<p class="lead" style="margin:12px auto 0">' + (pass
        ? (st.kind === 'exam' ? 'ผ่าน' + esc(st.level.title) + 'แล้ว ได้ตราประทับประจำสายบนตั๋ว' : 'ผ่านสถานีนี้แล้ว') + (added ? ' เพิ่มการ์ด ' + added + ' ใบเข้ากองทบทวน' : '')
        : 'ได้ ' + pct + '% ต้องได้ 80% ขึ้นไปจึงจะผ่าน ลองทบทวนข้อที่พลาดแล้วทำใหม่') + '</p>' +
      '<div class="row-actions" style="justify-content:center;margin-top:24px">' +
        (pass && nx ? '<a class="btn primary" href="' + stationHref(nx) + '">สถานีถัดไป: ' + esc(nx.title) + icon('arrow', 'i-sm') + '</a>' : '') +
        '<button class="btn" data-retry>' + icon('redo', 'i-sm') + 'ทำอีกครั้ง</button>' +
        (st.kind !== 'exam' ? '<a class="btn ghost" href="#/lesson/' + st.id + '">กลับไปทบทวนบท</a>' : '<a class="btn ghost" href="#/">กลับแผนที่</a>') +
      '</div>' +
      (Q.miss.length ? '<div class="miss"><div class="h3">ข้อที่พลาด</div><ul style="list-style:none;padding:0;margin:8px 0 0">' + Q.miss.map(function (q) {
        return '<li><span class="jp">' + esc(q.prompt) + '</span><span class="soft jp">' + esc(q.answer) + '</span></li>';
      }).join('') + '</ul></div>' : '') +
    '</div>';
  }

  /* ================= speaking: ฝึกพูด ฟัง และเสียงสูงต่ำ ================= */
  var TALK = window.EJ_TALK || [], TID = {}, SENT = {}, PITCH = window.EJ_PITCH || {};
  BLV.forEach(function (l) { SENT[l] = []; });
  (function () {
    var seen = {};
    function add(l, jp, r, th) { if (!SENT[l] || !jp || !th || seen[jp]) return; seen[jp] = 1; SENT[l].push({ jp: jp, r: r || '', th: th }); }
    TALK.forEach(function (t) { TID[t.id] = t; t.lines.forEach(function (x) { add(t.lv, x[1], x[2], x[3]); }); });
    GRAMMAR.forEach(function (g) { add(g.level.id, g.ex, g.r, g.th); });
    LEVELS.forEach(function (lv) { ((lv.reading || {}).lines || []).forEach(function (x) { add(lv.id, x[0], x[2], x[1]); }); });
  })();
  var SP_N = 10;

  /* pitch accent: n คือโมระที่เสียงตกหลังจากนั้น 0 คือไม่ตก */
  var SMALLK = 'ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ';
  function morae(r) { var m = []; Array.from(String(r).replace(/\s/g, '')).forEach(function (ch) { if (SMALLK.indexOf(ch) > -1 && m.length) m[m.length - 1] += ch; else m.push(ch); }); return m; }
  function pitchOf(c) { if (S.settings.pitch === false || !c || c.type !== 'v') return null; var p = PITCH[c.w + '|' + c.r]; return p == null ? null : parseInt(p, 10); }
  function pitchHTML(r, n) {
    var m = morae(r); if (!m.length || isNaN(n)) return esc(r);
    var label = n === 0 ? 'เสียงเรียบ ไม่ตก' : 'เสียงตกหลังโมระที่ ' + n;
    return '<span class="pm" title="' + label + '" aria-label="' + esc(r) + ' ' + label + '">' + m.map(function (x, i) {
      var hi = n === 1 ? i === 0 : (i > 0 && (n === 0 || i < n));
      return '<span class="' + (hi ? 'h' : 'l') + (n > 0 && i === n - 1 ? ' d' : '') + '">' + esc(x) + '</span>';
    }).join('') + '</span>';
  }

  /* speech recognition */
  var SRC = window.SpeechRecognition || window.webkitSpeechRecognition, REC = null;
  function stopRec() { if (REC) { var r = REC; REC = null; try { r.abort(); } catch (e) {} } }
  function listenJa(done) {
    if (!SRC) { done(null, 'unsupported'); return; }
    stopRec(); if ('speechSynthesis' in window) speechSynthesis.cancel();
    var r = new SRC(), fin = false; REC = r;
    r.lang = 'ja-JP'; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    function end(a, err) { if (fin) return; fin = true; if (REC === r) REC = null; done(a, err); }
    r.onresult = function (e) { var a = [], res = e.results[0]; for (var i = 0; i < res.length; i++) a.push(res[i].transcript); end(a); };
    r.onerror = function (e) { end(null, e.error); };
    r.onend = function () { end(null, 'no-speech'); };
    try { r.start(); } catch (e) { end(null, 'start'); }
  }
  function normJ(s) { return toHira(String(s || '').normalize('NFKC')).toLowerCase().replace(/[\s、。,.!?？！「」『』（）()・…~〜～"'”“]/g, ''); }
  function lev(a, b) {
    a = Array.from(a); b = Array.from(b);
    var prev = [], cur, i, j; for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) { cur = [i]; for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[b.length];
  }
  function simJ(a, b) { a = normJ(a); b = normJ(b); if (!a || !b) return 0; return Math.max(0, 1 - lev(a, b) / Math.max(Array.from(a).length, Array.from(b).length)); }
  function scoreAlts(alts, item) {
    var top = 0, heard = alts[0] || '';
    alts.forEach(function (t) { var s = Math.max(simJ(t, item.jp), simJ(t, item.r)); if (s > top) { top = s; heard = t; } });
    return { pct: Math.round(top * 100), heard: heard };
  }
  function scoreTyped(t, item) {
    t = String(t || '').trim(); if (!t) return { pct: 0, heard: '' };
    var s = Math.max(simJ(t, item.jp), simJ(t, item.r));
    if (/^[a-z\s'-]+$/i.test(t)) { var a = t.toLowerCase().replace(/[\s'-]/g, ''), b = romaji(item.r).replace(/[\s'-]/g, ''); s = Math.max(s, 1 - lev(a, b) / Math.max(a.length, b.length)); }
    return { pct: Math.round(Math.max(0, s) * 100), heard: t };
  }
  var MIC_ERR = { unsupported: 'เบราว์เซอร์นี้ตรวจเสียงพูดไม่ได้ ลองเปิดเว็บด้วย Chrome หรือ Edge', 'not-allowed': 'ยังไม่ได้อนุญาตไมโครโฟน กดอนุญาตที่ไอคอนข้างช่องที่อยู่เว็บแล้วลองใหม่', 'service-not-allowed': 'เบราว์เซอร์ไม่อนุญาตให้ตรวจเสียง ลองใช้ Chrome', 'no-speech': 'ไม่ได้ยินเสียง ลองพูดดังขึ้นใกล้ไมค์', 'audio-capture': 'ไม่พบไมโครโฟน', network: 'การตรวจเสียงต้องต่ออินเทอร์เน็ต' };
  function micErr(err) { return '<div class="spres bad">' + esc(MIC_ERR[err] || 'ตรวจเสียงไม่สำเร็จ ลองอีกครั้ง') + '</div>'; }
  function scoreHTML(sc, typed) {
    var cls = sc.pct >= 80 ? 'ok' : sc.pct >= 60 ? 'mid' : 'bad';
    var word = sc.pct >= 80 ? 'ตรงมาก' : sc.pct >= 60 ? 'ใกล้แล้ว ลองอีกครั้ง' : 'ยังไม่ตรง ฟังแล้วลองใหม่';
    return '<div class="spres ' + cls + '"><b class="num">' + sc.pct + '%</b> ' + word + (sc.heard ? '<div class="heard">' + (typed ? 'คุณพิมพ์ ' : 'ได้ยินว่า ') + '<span class="jp">' + esc(sc.heard) + '</span></div>' : '') + '</div>';
  }
  function micBtn(attr, label) { return '<button class="btn sm mic" ' + attr + '>' + icon('mic', 'i-sm') + '<span>' + esc(label || 'พูด') + '</span></button>'; }
  function slowBtn(text) { return '<button class="btn sm ghost" data-say-slow="' + esc(text) + '">' + icon('sound', 'i-sm') + 'ช้าลง</button>'; }
  function micOn(btn, on) { if (!btn) return; btn.classList.toggle('rec', on); var s = $('span', btn); if (s) { if (on) { btn.dataset.lbl = s.textContent; s.textContent = 'กำลังฟัง…'; } else if (btn.dataset.lbl) s.textContent = btn.dataset.lbl; } }
  function readLine(r) { return '<div class="tr">' + esc(String(r).replace(/\s+/g, ' ')) + '</div>' + (S.settings.romaji ? '<div class="tro">' + esc(romaji(r)) + '</div>' : ''); }
  function spBest(key, pct) { var prev = best(key); if (pct > prev) { S.drill[key] = pct; } addXP(Math.max(2, Math.round(pct / 20))); save(); return prev; }
  function spResult(key, pct, again, back, note) {
    var prev = spBest(key, pct), pass = pct >= 80;
    return '<div class="card result" style="margin-top:24px">' + (pass ? '<span class="hanko lg stamp-in" style="' + lvVars(LVID[key.split(':').pop()] || LVID.n5) + '">合格<small>' + pct + '%</small></span>' : '') +
      '<div class="score">' + pct + '<span class="muted" style="font-size:24px">%</span></div>' +
      '<p class="lead" style="margin:12px auto 0">' + (note || (pass ? 'ผ่านแล้ว พูดได้คล่องขึ้นทุกรอบ' : 'ทำอีกรอบให้ถึง 80%')) + (pct > prev && prev ? ' ดีกว่าครั้งก่อนที่ ' + prev + '%' : '') + '</p>' +
      '<div class="row-actions" style="justify-content:center;margin-top:24px"><a class="btn primary" href="' + again + '" data-reload>' + icon('redo', 'i-sm') + 'ฝึกอีกรอบ</a><a class="btn" href="' + back + '">กลับหน้าฝึกพูด</a></div></div>';
  }

  /* อัดเสียงตัวเองแล้วฟังเทียบ */
  var MREC = null;
  function recStop() { if (MREC) { try { if (MREC.r.state !== 'inactive') MREC.r.stop(); } catch (e) {} MREC.stream.getTracks().forEach(function (t) { t.stop(); }); MREC = null; } }
  function recToggle(btn, out) {
    if (MREC) { recStop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { out.innerHTML = '<div class="spres bad">เบราว์เซอร์นี้อัดเสียงไม่ได้</div>'; return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var r = new MediaRecorder(stream), chunks = [];
      MREC = { r: r, stream: stream };
      r.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      r.onstop = function () {
        btn.classList.remove('rec'); $('span', btn).textContent = 'อัดเสียงตัวเอง';
        var url = URL.createObjectURL(new Blob(chunks, { type: r.mimeType || 'audio/webm' }));
        out.innerHTML = '<div class="myvoice"><span class="muted">เสียงของคุณ</span><audio controls src="' + url + '"></audio></div>';
      };
      r.start(); btn.classList.add('rec'); $('span', btn).textContent = 'หยุดอัด';
      setTimeout(function () { if (MREC && MREC.r === r) recStop(); }, 15000);
    }).catch(function () { out.innerHTML = micErr('not-allowed'); });
  }
  function spDestroy() { stopRec(); recStop(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  function noSrNote() { return SRC ? '' : '<div class="card spnote"><b>เบราว์เซอร์นี้ตรวจเสียงพูดไม่ได้</b> ยังฟังเสียงและฝึกพูดตามได้ตามปกติ แต่ต้องให้คะแนนตัวเอง ถ้าอยากให้เว็บตรวจเสียง เปิดด้วย Chrome หรือ Edge บนคอมพิวเตอร์ Chrome บน Android หรือ Safari บน iPhone</div>'; }

  function viewSpeak(lid) {
    lid = BW[lid] ? lid : 'n5';
    var counts = {}; BLV.forEach(function (l) { counts[l] = TALK.filter(function (t) { return t.lv === l; }).length; });
    var modes = [['shadow', 'พูดตาม', 'シャドーイング', 'ฟังแล้วพูดตามทันที ฝึกจังหวะและสำเนียง'], ['say', 'แปลแล้วพูด', '瞬間作文', 'เห็นภาษาไทย พูดเป็นญี่ปุ่นให้ทัน'], ['listen', 'ฟังจับใจความ', '聴解', 'ฟังประโยค เลือกความหมาย']];
    var talks = TALK.filter(function (t) { return t.lv === lid; });
    return '<div class="page"><h1 class="title">ฝึกพูด</h1>' +
      '<p class="lead">บทสนทนาจริงและประโยคจากทุกบทเรียน เว็บอ่านให้ฟัง แล้วฟังคุณพูดเพื่อให้คะแนน</p>' + noSrNote() +
      '<div class="row-actions" style="margin-top:24px">' + lvSeg('speak', lid, counts) + '</div>' +
      '<section class="section"><div class="section-head"><h2 class="h2 with-chip">' + lvChip(LVID[lid]) + 'ฝึกประโยค</h2><span class="muted num">' + fmt(SENT[lid].length) + ' ประโยค</span></div>' +
        '<div class="pcards">' + modes.map(function (m) {
          return '<a class="card pcard" href="#/speak/' + m[0] + '/' + lid + '"><span class="pj jp">' + m[2] + '</span><span class="pt">' + m[1] + '</span><span class="pd">' + m[3] + '</span>' + bestBadge('sp:' + m[0] + ':' + lid) + '</a>';
        }).join('') + '</div></section>' +
      '<section class="section"><div class="section-head"><h2 class="h2">บทสนทนา</h2><span class="muted num">' + talks.length + ' บท</span></div>' +
        '<div class="pcards">' + talks.map(function (t) {
          return '<a class="card pcard" href="#/speak/d/' + t.id + '"><span class="pj jp">' + esc(t.jp) + '</span><span class="pt">' + esc(t.title) + '</span><span class="pd">' + esc(t.a) + ' กับ' + esc(t.b) + ', ' + t.lines.length + ' ประโยค</span>' + bestBadge('sp:d:' + t.id) + '</a>';
        }).join('') + '</div></section>' +
      '<section class="section"><div class="section-head"><h2 class="h2">เสียงสูงต่ำ</h2></div><div class="card spinfo">' +
        '<p>คำญี่ปุ่นมีระดับเสียงสูงต่ำ คำเดียวกันออกเสียงต่างกันได้ความหมายต่างกัน เส้นด้านบนคือเสียงสูง เส้นตั้งคือจุดที่เสียงตก</p>' +
        '<div class="pmex">' + [['箸', 'はし', 1, 'ตะเกียบ'], ['橋', 'はし', 2, 'สะพาน'], ['雨', 'あめ', 1, 'ฝน'], ['飴', 'あめ', 0, 'ลูกอม']].map(function (x) {
          return '<div><span class="jp w">' + x[0] + '</span>' + pitchHTML(x[1], x[2]) + '<span class="muted">' + x[3] + '</span>' + sayBtn(x[1] === 'はし' && x[2] === 2 ? '橋' : x[0]) + '</div>';
        }).join('') + '</div>' +
        '<p class="muted small">ทุกคำในคลังคำศัพท์ที่มีข้อมูลจะแสดงเส้นนี้ ปิดได้ในหน้าตั้งค่า ข้อมูลเสียงสูงต่ำจาก <a href="https://github.com/mifunetoshiro/kanjium" target="_blank" rel="noopener">Kanjium</a> โดย Uros O. ใบอนุญาต CC BY-SA 4.0</p></div></section>' +
      '<section class="section"><div class="section-head"><h2 class="h2">ฝึกให้พูดคล่อง</h2></div><ol class="card sptips">' +
        '<li><b>ฟังก่อนอ่าน</b> เปิดเสียงฟังโดยยังไม่ดูตัวหนังสือ แล้วค่อยเปิดดู</li>' +
        '<li><b>พูดตามออกเสียงจริง</b> พูดให้ดังทุกครั้ง การท่องในใจไม่ช่วยเรื่องพูด</li>' +
        '<li><b>อัดเสียงตัวเองแล้วฟังเทียบ</b> จะได้ยินจุดที่ต่างจากต้นฉบับชัดกว่า</li>' +
        '<li><b>สวมบทในบทสนทนา</b> ตอบให้ทันโดยไม่ดูประโยค เหมือนคุยจริง</li>' +
        '<li><b>คุยกับคนจริง</b> พอถึง N4 ลองหาเพื่อนคุยหรือครูออนไลน์ แล้วใช้หน้านี้ซ้อมก่อนคุย</li></ol></section></div>';
  }

  var D = null;
  function viewDialog(t) {
    var lv = LVID[t.lv];
    D = { t: t, role: null, i: -1, scores: [], tok: 0, busy: false };
    var html = '<div class="page page-narrow"><nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/speak/' + t.lv + '">ฝึกพูด ' + esc(lv.code) + '</a></nav>' +
      '<h1 class="title title-s">' + esc(t.title) + '</h1><p class="lead jp">' + esc(t.jp) + '</p>' + noSrNote() +
      '<div class="card dctl"><div class="row-actions"><button class="btn" id="dPlay">' + icon('play', 'i-sm') + 'ฟังทั้งบท</button>' +
        '<button class="btn primary" data-role="a">' + icon('mic', 'i-sm') + 'สวมบท' + esc(t.a) + '</button><button class="btn primary" data-role="b">' + icon('mic', 'i-sm') + 'สวมบท' + esc(t.b) + '</button></div>' +
        '<div class="row-actions" style="gap:24px;margin-top:12px"><label class="toggle"><input type="checkbox" id="dHide">ซ่อนประโยคญี่ปุ่น</label><label class="toggle"><input type="checkbox" id="dTh" checked>แสดงคำแปล</label></div>' +
        '<p class="muted small" style="margin-top:8px">สวมบท: เว็บพูดบทของอีกฝ่าย พอถึงตาคุณจะเห็นแค่คำแปล ให้พูดเป็นภาษาญี่ปุ่นทันที</p></div>' +
      '<div id="dLines" class="tlines">' + t.lines.map(function (x, i) {
        return '<div class="tline ' + x[0] + '" id="tl' + i + '"><div class="who">' + esc(x[0] === 'a' ? t.a : t.b) + '</div><div class="bub">' +
          '<div class="tj jp">' + esc(x[1]) + '</div>' + readLine(x[2]) + '<div class="tt">' + esc(x[3]) + '</div>' +
          '<div class="tacts">' + sayBtn(x[1]) + slowBtn(x[1]) + micBtn('data-mic="' + i + '"', 'พูดประโยคนี้') + '</div><div class="tres" id="tres' + i + '"></div></div></div>';
      }).join('') + '</div><div id="dEnd"></div></div>';
    return { html: html, mount: dMount, destroy: function () { spDestroy(); D = null; } };
  }
  function dItem(i) { var x = D.t.lines[i]; return { jp: x[1], r: x[2], th: x[3] }; }
  function dMark(i) { $$('.tline').forEach(function (el, k) { el.classList.toggle('on', k === i); }); var el = $('#tl' + i); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  function dStop() { D.tok++; D.role = null; D.i = -1; stopRec(); if ('speechSynthesis' in window) speechSynthesis.cancel(); $$('.tline').forEach(function (el) { el.classList.remove('on', 'mine'); }); }
  function dPlayAll() {
    dStop(); var tok = D.tok;
    (function next(i) {
      if (!D || D.tok !== tok) return;
      if (i >= D.t.lines.length) { dMark(-1); return; }
      dMark(i); speak(D.t.lines[i][1], { onend: function () { setTimeout(function () { next(i + 1); }, 350); } });
    })(0);
  }
  function dRole(role) {
    dStop(); D.role = role; D.scores = []; $('#dEnd').innerHTML = ''; var tok = D.tok;
    $$('.tres').forEach(function (el) { el.innerHTML = ''; });
    (function next(i) {
      if (!D || D.tok !== tok) return;
      if (i >= D.t.lines.length) {
        var n = D.scores.length, pct = n ? Math.round(D.scores.reduce(function (a, b) { return a + b; }, 0) / n) : 0;
        dMark(-1); $$('.tline').forEach(function (el) { el.classList.remove('mine'); }); D.role = null;
        $('#dEnd').innerHTML = spResult('sp:d:' + D.t.id, pct, '#/speak/d/' + D.t.id, '#/speak/' + D.t.lv, pct >= 80 ? 'สวมบทจบแล้ว พูดได้ดีมาก ลองสลับไปเล่นอีกบทหนึ่ง' : null);
        return;
      }
      var x = D.t.lines[i], el = $('#tl' + i); dMark(i);
      if (x[0] !== role) { speak(x[1], { onend: function () { setTimeout(function () { next(i + 1); }, 300); } }); return; }
      el.classList.add('mine'); var out = $('#tres' + i);
      if (!SRC) {
        out.innerHTML = '<div class="spres mid">ถึงตาคุณ พูดออกเสียงแล้วกดให้คะแนนตัวเอง</div><div class="row-actions"><button class="btn sm" data-self="100">พูดได้</button><button class="btn sm" data-self="50">พอได้</button><button class="btn sm" data-self="0">ยังไม่ได้</button></div>';
        D.wait = function (v) { el.classList.remove('mine'); D.scores.push(v); out.innerHTML = ''; speak(x[1], { onend: function () { next(i + 1); } }); };
        return;
      }
      out.innerHTML = '<div class="spres mid">ถึงตาคุณ พูดเป็นภาษาญี่ปุ่นได้เลย</div>';
      var btn = $('[data-mic="' + i + '"]'); micOn(btn, true);
      listenJa(function (alts, err) {
        micOn(btn, false); if (!D || D.tok !== tok) return;
        var sc = alts ? scoreAlts(alts, dItem(i)) : { pct: 0, heard: '' };
        D.scores.push(sc.pct); el.classList.remove('mine');
        out.innerHTML = alts ? scoreHTML(sc) : micErr(err);
        if (err === 'not-allowed' || err === 'unsupported' || err === 'audio-capture') { dStop(); return; }
        setTimeout(function () { speak(x[1], { onend: function () { setTimeout(function () { next(i + 1); }, 400); } }); }, 500);
      });
    })(0);
  }
  function micCheck(btn, item, out) {
    if (REC) { stopRec(); micOn(btn, false); return; }
    micOn(btn, true);
    listenJa(function (alts, err) { micOn(btn, false); out.innerHTML = alts ? scoreHTML(scoreAlts(alts, item)) : micErr(err); if (alts && H) { var s = scoreAlts(alts, item).pct; H.sc[H.i] = Math.max(H.sc[H.i] || 0, s); } });
  }
  function dMount() {
    var root = $('.page');
    root.addEventListener('click', function (e) {
      var t = e.target.closest('#dPlay,[data-role],[data-mic],[data-say-slow],[data-self]'); if (!t || !D) return;
      if (t.id === 'dPlay') return dPlayAll();
      if (t.hasAttribute('data-role')) return dRole(t.getAttribute('data-role'));
      if (t.hasAttribute('data-say-slow')) { dStop(); return speak(t.getAttribute('data-say-slow'), { slow: true }); }
      if (t.hasAttribute('data-self')) { if (D.wait) { var f = D.wait; D.wait = null; f(+t.getAttribute('data-self')); } return; }
      var i = +t.getAttribute('data-mic'); if (D.role) return; micCheck(t, dItem(i), $('#tres' + i));
    });
    root.addEventListener('change', function (e) {
      if (e.target.id === 'dHide') $('#dLines').classList.toggle('hidejp', e.target.checked);
      if (e.target.id === 'dTh') $('#dLines').classList.toggle('hideth', !e.target.checked);
    });
  }

  /* พูดตาม (shadowing) และแปลแล้วพูด */
  var H = null;
  function viewSpDrill(kind, lid) {
    lid = BW[lid] ? lid : 'n5';
    var pool = SENT[lid]; if (!pool || !pool.length) return viewMissing();
    H = { kind: kind, lid: lid, items: pick(pool, SP_N), i: 0, sc: [], shown: [] };
    var title = (kind === 'shadow' ? 'พูดตาม ' : 'แปลแล้วพูด ') + LVID[lid].code;
    return {
      html: '<div class="page"><div class="quiz"><nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/speak/' + lid + '">ฝึกพูด ' + esc(LVID[lid].code) + '</a></nav>' +
        '<h1 class="title title-s">' + esc(title) + '</h1>' +
        '<p class="lead">' + (kind === 'shadow' ? 'ฟังแล้วพูดตามทันทีให้จังหวะตรงกับเสียงต้นฉบับ พูดซ้ำได้หลายครั้ง ระบบเก็บคะแนนที่ดีที่สุด' : 'อ่านภาษาไทยแล้วพูดเป็นภาษาญี่ปุ่น จะพูดหรือพิมพ์ก็ได้ ไม่ต้องตรงทุกคำ ขอให้สื่อความหมายเดียวกัน') + '</p>' + noSrNote() +
        (kind === 'shadow' ? '<div class="row-actions" style="gap:24px;margin-top:16px"><label class="toggle"><input type="checkbox" id="hHide">ฟังอย่างเดียว ซ่อนตัวหนังสือ</label></div>' : '') +
        '<div id="spBox"></div></div></div>',
      mount: hMount, destroy: function () { spDestroy(); H = null; }
    };
  }
  function hRender() {
    var box = $('#spBox'); if (!box || !H) return;
    if (H.i >= H.items.length) {
      var pct = Math.round(H.sc.reduce(function (a, b) { return a + (b || 0); }, 0) / H.items.length);
      box.innerHTML = spResult('sp:' + H.kind + ':' + H.lid, pct, '#/speak/' + H.kind + '/' + H.lid, '#/speak/' + H.lid) +
        '<div class="card vlist" style="margin-top:24px">' + H.items.map(function (it, k) { return '<div class="vrow"><span class="w jp">' + esc(it.jp) + '</span><span class="me">' + esc(it.th) + ' <span class="num muted">' + (H.sc[k] || 0) + '%</span></span>' + sayBtn(it.jp) + '</div>'; }).join('') + '</div>';
      return;
    }
    var it = H.items[H.i], sh = H.kind === 'shadow', open = sh || H.shown[H.i];
    var hide = sh && $('#hHide') && $('#hHide').checked;
    box.innerHTML = '<div class="quiz-top" style="margin-top:24px"><div class="bar"><i style="transform:scaleX(' + (H.i / H.items.length) + ')"></i></div><span class="num muted" style="font-size:12px">' + (H.i + 1) + ' / ' + H.items.length + '</span></div>' +
      '<div class="card spcard">' +
        (sh ? '' : '<div class="kind">พูดประโยคนี้เป็นภาษาญี่ปุ่น</div><div class="spth">' + esc(it.th) + '</div>') +
        '<div class="spans' + (open ? '' : ' closed') + (hide ? ' blur' : '') + '"><div class="spjp jp">' + esc(it.jp) + '</div>' + readLine(it.r) + (sh ? '<div class="tt">' + esc(it.th) + '</div>' : '') + '</div>' +
        '<div class="row-actions spacts">' +
          (open ? sayBtn(it.jp, 'ฟังประโยค') + slowBtn(it.jp) : '') +
          micBtn('id="hMic"', sh ? 'พูดตาม' : 'พูดคำตอบ') +
          (sh ? '<button class="btn sm ghost" id="hRec">' + icon('mic', 'i-sm') + '<span>อัดเสียงตัวเอง</span></button>' : '<button class="btn sm ghost" id="hShow">' + icon('eye', 'i-sm') + 'ดูเฉลย</button>') +
        '</div>' +
        (sh ? '' : '<div class="sptype"><input class="input" id="hType" placeholder="หรือพิมพ์คำตอบ เป็นคานะหรือโรมาจิ" autocomplete="off" lang="ja"><button class="btn sm" id="hCheck">ตรวจ</button></div>') +
        '<div id="hRes">' + (H.sc[H.i] != null ? scoreHTML({ pct: H.sc[H.i], heard: '' }) : '') + '</div><div id="hVoice"></div>' +
        (!SRC || (!sh && open && H.sc[H.i] == null) ? '<div class="row-actions selfg"><span class="muted">ให้คะแนนตัวเอง</span><button class="btn sm" data-hself="100">พูดได้</button><button class="btn sm" data-hself="50">พอได้</button><button class="btn sm" data-hself="0">ยังไม่ได้</button></div>' : '') +
      '</div>' +
      '<div class="row-actions" style="justify-content:space-between;margin-top:16px"><button class="btn ghost" id="hPrev"' + (H.i ? '' : ' disabled') + '>' + icon('left', 'i-sm') + 'ก่อนหน้า</button><button class="btn primary" id="hNext">' + (H.i === H.items.length - 1 ? 'ดูผล' : 'ถัดไป') + icon('arrow', 'i-sm') + '</button></div>';
    if (sh) setTimeout(function () { if (H && H.items[H.i] === it) speak(it.jp); }, 200);
  }
  function hReveal(sc, typed) {
    var it = H.items[H.i]; H.shown[H.i] = true;
    if (sc) H.sc[H.i] = Math.max(H.sc[H.i] || 0, sc.pct);
    hRender(); if (sc) $('#hRes').innerHTML = scoreHTML(sc, typed);
    speak(it.jp);
  }
  function hMount() {
    var root = $('.page'); hRender();
    root.addEventListener('click', function (e) {
      var t = e.target.closest('#hMic,#hRec,#hShow,#hCheck,#hPrev,#hNext,[data-say-slow],[data-hself]'); if (!t || !H) return;
      var it = H.items[H.i];
      if (t.hasAttribute('data-say-slow')) return speak(t.getAttribute('data-say-slow'), { slow: true });
      if (t.id === 'hPrev') { stopRec(); recStop(); H.i = Math.max(0, H.i - 1); return hRender(); }
      if (t.id === 'hNext') { stopRec(); recStop(); H.i++; return hRender(); }
      if (t.id === 'hRec') return recToggle(t, $('#hVoice'));
      if (t.hasAttribute('data-hself')) { H.sc[H.i] = +t.getAttribute('data-hself'); H.shown[H.i] = true; H.i++; return hRender(); }
      if (t.id === 'hShow') { H.shown[H.i] = true; hRender(); return speak(it.jp); }
      if (t.id === 'hCheck') { var v = $('#hType').value; if (!v.trim()) return; return hReveal(scoreTyped(v, it), true); }
      if (t.id === 'hMic') {
        if (REC) { stopRec(); micOn(t, false); return; }
        micOn(t, true);
        listenJa(function (alts, err) {
          micOn(t, false); if (!H || H.items[H.i] !== it) return;
          if (!alts) { $('#hRes').innerHTML = micErr(err); return; }
          var sc = scoreAlts(alts, it);
          if (H.kind === 'shadow') { H.sc[H.i] = Math.max(H.sc[H.i] || 0, sc.pct); $('#hRes').innerHTML = scoreHTML(sc); }
          else hReveal(sc);
        });
      }
    });
    root.addEventListener('keydown', function (e) { if (e.target.id === 'hType' && e.key === 'Enter') { e.preventDefault(); $('#hCheck').click(); } });
    root.addEventListener('change', function (e) { if (e.target.id === 'hHide') { var a = $('.spans'); if (a) a.classList.toggle('blur', e.target.checked); } });
  }

  /* ================= review (SRS) ================= */
  var R = null;
  function viewReview() {
    var ids = shuffle(dueIds()), total = Object.keys(S.srs).length;
    R = { ids: ids, i: 0, flipped: false, done: 0, n: ids.length };
    var html = '<div class="page"><div class="quiz">' +
      '<h1 class="title">ทบทวน</h1>' +
      '<p class="lead">ทุกใบจะกลับมาก่อนที่คุณจะลืม ตอบตามจริงว่าจำได้แค่ไหน ระบบจะเลื่อนรอบถัดไปให้เอง</p>' +
      '<div id="revBox"></div></div></div>';
    return { html: html, mount: function () { renderCard(total); }, destroy: function () { R = null; } };
  }
  function cardFront(c) { return c.type === 'k' ? c.k : c.type === 'g' ? c.p : c.w; }
  function renderCard(total) {
    var box = $('#revBox'); if (!box || !R) return;
    if (R.i >= R.ids.length) {
      var t = dayNum(), upcoming = Object.keys(S.srs).map(function (id) { return S.srs[id].due; }).filter(function (d) { return d > t; }).sort(function (a, b) { return a - b; });
      var nextTxt = upcoming.length ? 'รอบถัดไป ' + thDate(keyOf(upcoming[0])) + ' จำนวน ' + upcoming.filter(function (d) { return d === upcoming[0]; }).length + ' ใบ' : '';
      var cur = current();
      box.innerHTML = '<div class="card empty" style="margin-top:24px">' +
        (R.done ? '<div class="h2">ทบทวนครบ ' + R.done + ' ใบแล้ว</div>' : '<div class="h2">' + ((total || Object.keys(S.srs).length) ? 'ยังไม่มีการ์ดถึงกำหนด' : 'กองทบทวนยังว่างอยู่') + '</div>') +
        '<p>' + ((total || Object.keys(S.srs).length) ? esc(nextTxt) : 'ผ่านแบบทดสอบบทเรียนแล้วคำศัพท์และคันจิของบทนั้นจะเข้ามาที่นี่อัตโนมัติ') + '</p>' +
        '<div class="row-actions">' + (cur ? '<a class="btn primary" href="' + stationHref(cur) + '">เรียนสถานีถัดไป</a>' : '') + '<a class="btn" href="#/">กลับแผนที่</a></div></div>';
      return;
    }
    var id = R.ids[R.i], c = CARD[id], s = S.srs[id], f = cardFront(c), ro = S.settings.romaji;
    var pv = pitchOf(c);
    var back = c.type === 'g'
      ? '<div class="me">' + esc(c.m) + '</div><div class="ex"><span class="jp">' + esc(c.ex) + '</span><div class="exr">' + esc(String(c.r || '').replace(/\s+/g, ' ')) + '</div>' + esc(c.th) + '</div>'
      : c.type === 'k'
      ? '<div class="me">' + meanHTML(c) + '</div><div class="rd">' + esc(c.on) + '</div><div class="rd">' + esc(c.kun) + '</div>' + (c.exw ? '<div class="ex"><span class="jp">' + esc(c.exw) + '（' + esc(c.exr) + '）</span> ' + esc(c.exm) + '</div>' : '')
      : '<div class="rd">' + (pv != null ? pitchHTML(c.r, pv) : esc(c.r)) + '</div>' + (ro ? '<div class="ro">' + esc(romaji(c.r)) + '</div>' : '') + '<div class="me">' + meanHTML(c) + '</div>';
    box.innerHTML =
      '<div class="quiz-top" style="margin-top:24px"><div class="bar"><i style="transform:scaleX(' + (R.done / Math.max(1, R.n)) + ')"></i></div><span class="num muted" style="font-size:12px">เหลือ ' + (R.ids.length - R.i) + '</span></div>' +
      '<div class="card flash' + (R.flipped ? ' flipped' : '') + '" id="flash" role="button" tabindex="0" aria-label="พลิกการ์ด"><div class="front' + (c.type === 'g' ? ' gram' : f.length > 3 ? ' long' : '') + '">' + esc(f) + '</div>' +
        (R.flipped ? '<div class="back">' + back + '<div style="margin-top:8px">' + sayBtn(c.type === 'k' ? (c.exr || c.k) : c.type === 'g' ? c.ex : c.r) + '</div></div>'
          : '<div class="hint">แตะการ์ดหรือกด <kbd>Space</kbd> เพื่อดูคำตอบ</div>') +
        '<div class="hint where">' + lvChip(c.level) + '<span>' + esc(c.lesson.title) + '</span></div>' +
      '</div>' +
      (R.flipped ? '<div class="grades">' + [[1, 'ลืม', 'again'], [2, 'ยาก', ''], [3, 'จำได้', ''], [4, 'ง่าย', '']].map(function (g) {
        return '<button class="btn ' + g[2] + '" data-grade="' + g[0] + '">' + g[1] + '<small>' + ivlLabel(s, g[0]) + '</small></button>';
      }).join('') + '</div>' : '');
    if (R.flipped) speak(c.type === 'k' ? (c.exr || c.k) : c.type === 'g' ? c.ex : c.r);
  }
  function grade(g) {
    if (!R || !R.flipped) return;
    var id = R.ids[R.i];
    S.srs[id] = schedule(S.srs[id], g);
    S.stats.reviews++;
    if (g === 1) R.ids.push(id); else R.done++;
    R.i++; R.flipped = false; addXP(g === 1 ? 0 : 2); save();
    renderCard();
  }

  /* ================= kana chart ================= */
  function kanaGrid(rows, cols) {
    return '<div class="' + (cols === 3 ? 'kgrid3' : 'kgrid5') + '">' + rows.map(function (row) {
      return row.map(function (c) { return c ? '<button class="ktile" data-say="' + esc(c[0]) + '"><span class="ch">' + esc(c[0]) + '</span><span class="rm">' + esc(c[1]) + '</span></button>' : '<span class="ktile blank"></span>'; }).join('');
    }).join('') + '</div>';
  }
  function chunk(a, n) { var o = []; for (var i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }
  function viewKana(set) {
    var K = set === 'kata' ? EJ.kana.kata : EJ.kana.hira;
    var html = '<div class="page">' +
      '<h1 class="title">ตารางคานะ</h1>' +
      '<p class="lead">แตะตัวอักษรเพื่อฟังเสียง เรียงตามลำดับ あいうえお แบบที่คนญี่ปุ่นใช้เรียงพจนานุกรม</p>' +
      '<div class="row-actions" style="margin-top:24px"><div class="seg"><button data-go="#/kana/hira" class="' + (set !== 'kata' ? 'on' : '') + '">ひらがな ฮิรางานะ</button><button data-go="#/kana/kata" class="' + (set === 'kata' ? 'on' : '') + '">カタカナ คาตาคานะ</button></div>' +
        '<a class="btn sm" href="#/drill/' + (set === 'kata' ? 'kata' : 'hira') + '">' + icon('play', 'i-sm') + 'ทดสอบด่วน 20 ข้อ</a>' +
        '<a class="btn sm ghost" href="#/write/' + (set === 'kata' ? 'kata' : 'hira') + '">' + icon('pen', 'i-sm') + 'ฝึกเขียน</a></div>' +
      '<div class="kana-cols" style="margin-top:32px"><div><div class="section-head"><h2 class="h2">เสียงพื้นฐาน</h2><span class="muted num">46</span></div>' + kanaGrid(K.basic, 5) + '</div>' +
        '<div><div class="section-head"><h2 class="h2">เสียงขุ่น</h2><span class="muted num">25</span></div>' + kanaGrid(K.voiced, 5) +
        '<div class="section-head" style="margin-top:32px"><h2 class="h2">เสียงควบ</h2><span class="muted num">33</span></div>' + kanaGrid(chunk(K.yoon, 3), 3) +
        (set === 'kata' ? '<div class="section-head" style="margin-top:32px"><h2 class="h2">เสียงพิเศษสำหรับคำต่างประเทศ</h2><span class="muted num">' + K.extra.length + '</span></div>' + kanaGrid(chunk(K.extra, 3), 3) : '') +
      '</div></div></div>';
    return html;
  }
  function viewDrill(set) {
    var K = set === 'kata' ? EJ.kana.kata : EJ.kana.hira, all = [];
    K.basic.concat(K.voiced).forEach(function (r) { r.forEach(function (c) { if (c) all.push(c); }); });
    var fake = { id: 'drill-' + set, kind: 'drill', code: set === 'kata' ? 'カタカナ' : 'ひらがな', title: 'ทดสอบด่วน ' + (set === 'kata' ? 'คาตาคานะ' : 'ฮิรางานะ'), level: LEVELS[0], num: 0 };
    var qs = pick(all, 20).map(function (c, i) {
      return i % 3 === 2 ? choiceQ('ตัวไหนอ่านว่า "' + c[1] + '"', c[1], 'th', c[0], all.filter(function (x) { return x[1] !== c[1]; }).map(function (x) { return x[0]; }), true, c[0])
        : { type: 'type', kind: 'พิมพ์เสียงอ่านเป็นโรมาจิ', prompt: c[0], pcls: 'hand', answer: c[1], accept: [c[1]].concat(ALT[c[1]] || []), say: c[0] };
    });
    Q = { st: fake, qs: qs, i: 0, right: 0, miss: [], locked: false, drill: true };
    return {
      html: '<div class="page"><div class="quiz"><nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/kana/' + set + '">ตารางคานะ</a></nav><h1 class="title title-s">' + esc(fake.title) + '</h1><div id="quizBox"></div></div></div>',
      mount: renderQ, destroy: function () { Q = null; }
    };
  }

  /* ================= kanji & grammar libraries ================= */
  function levelFilter(base, cur, counts) {
    return '<div class="seg" style="flex-wrap:wrap">' + ['all'].concat(LEVELS.filter(function (l) { return counts[l.id]; }).map(function (l) { return l.id; })).map(function (id) {
      var lv = LEVELS.filter(function (l) { return l.id === id; })[0];
      return '<button data-go="#/' + base + (id === 'all' ? '' : '/' + id) + '" class="' + ((cur || 'all') === id ? 'on' : '') + '">' + (lv ? esc(lv.code) : 'ทั้งหมด') + '</button>';
    }).join('') + '</div>';
  }
  function viewKanji(lid) {
    lid = BK[lid] ? lid : 'n5';
    var counts = {}; BLV.forEach(function (l) { counts[l] = BK[l].length; });
    var learned = BK_ALL.filter(function (k) { return S.srs[k.id]; }).length;
    return '<div class="page"><h1 class="title">คันจิ</h1>' +
      '<p class="lead">คันจิ JLPT ' + fmt(BK_ALL.length) + ' ตัว อยู่ในกองทบทวนแล้ว ' + fmt(learned) + ' ตัว แตะตัวคันจิเพื่อดูคำอ่านและคำตัวอย่าง</p>' +
      '<div class="row-actions" style="margin-top:24px">' + lvSeg('kanji', lid, counts) +
        '<a class="btn sm" href="#/practice/k/' + lid + '">' + icon('target', 'i-sm') + 'ฝึก ' + esc(LVID[lid].code) + ' เป็นชุด</a></div>' +
      '<section class="section">' + kanjiTiles(BK[lid]) + '</section></div>';
  }
  function viewGrammar(lid) {
    var counts = {}; GRAMMAR.forEach(function (g) { counts[g.level.id] = (counts[g.level.id] || 0) + 1; });
    var list = GRAMMAR.filter(function (g) { return !lid || g.level.id === lid; });
    var html = '<div class="page page-narrow"><h1 class="title">ไวยากรณ์</h1>' +
      '<p class="lead">' + GRAMMAR.length + ' รูปประโยค จากบทเรียนบนแผนที่และคลังเพิ่มเติม พร้อมตัวอย่าง คำแปล และเสียงอ่าน</p>' +
      '<div class="row-actions" style="margin:24px 0 16px">' + levelFilter('grammar', lid, counts) +
        (function () { var ids = list.filter(function (g) { return !S.srs[g.id]; }).map(function (g) { return g.id; }); return ids.length ? '<button class="btn sm" data-add-set="' + esc(ids.join(',')) + '">' + icon('plus', 'i-sm') + 'เพิ่ม ' + ids.length + ' รูปประโยคเข้ากองทบทวน</button>' : '<span class="tag">อยู่ในกองทบทวนครบแล้ว</span>'; })() + '</div>' +
      '<input class="input" id="gq" type="search" placeholder="ค้นรูปประโยค ความหมาย หรือตัวอย่าง" style="width:100%;margin-bottom:16px" autocomplete="off">' +
      '<div id="glist">' + list.map(function (g) { return grammarCard(g, true); }).join('') + '</div><p class="muted" id="gnone" hidden>ไม่พบรูปประโยคที่ค้น</p></div>';
    return { html: html, mount: function () {
      var cards = $$('#glist .gcard'), txt = cards.map(function (c) { return c.textContent.toLowerCase(); });
      $('#gq').addEventListener('input', function () {
        var q = this.value.trim().toLowerCase(), n = 0;
        cards.forEach(function (c, i) { var on = !q || txt[i].indexOf(q) > -1; c.hidden = !on; if (on) n++; });
        $('#gnone').hidden = n > 0;
      });
    } };
  }

  /* ================= search ================= */
  function searchResults(q) {
    q = q.trim().toLowerCase(); if (!q) return '<div class="card empty"><p>พิมพ์คำไทย ญี่ปุ่น หรือโรมาจิ เช่น "กิน" "たべる" "taberu"</p></div>';
    var hq = toHira(q);
    var v = VOCAB.filter(function (x) { return x.w.indexOf(q) > -1 || x.r.indexOf(hq) > -1 || x.m.toLowerCase().indexOf(q) > -1 || romaji(x.r).replace(/\s/g, '').indexOf(q.replace(/\s/g, '')) > -1; });
    var seenV = {}; v.forEach(function (x) { seenV[x.id] = 1; });
    v = v.concat((wordMatches(q) || []).filter(function (x) { return !seenV[x.id]; })).slice(0, 40);
    var k = BK_ALL.concat(KANJI.filter(function (x) { return !x.blv; })).filter(function (x) { return x.k === q || x.m.indexOf(q) > -1 || x.on.indexOf(EJ.kana.toKata(hq)) > -1 || x.kun.indexOf(hq) > -1; }).slice(0, 24);
    var g = GRAMMAR.filter(function (x) { return x.p.indexOf(q) > -1 || x.m.indexOf(q) > -1 || x.ex.indexOf(q) > -1; }).slice(0, 20);
    if (!v.length && !k.length && !g.length) return '<div class="card empty"><div class="h2">ไม่พบ "' + esc(q) + '"</div><p>ลองคำสั้นลง หรือพิมพ์เป็นคานะ</p></div>';
    return (v.length ? '<section class="section" style="margin-top:24px"><div class="section-head"><h2 class="h2">คำศัพท์</h2><span class="muted num">' + v.length + '</span></div><div class="card vlist">' + v.map(function (x) {
      return '<div class="vrow"><span class="w">' + furi(x.w, x.r) + '</span><span class="ro">' + esc(romaji(x.r)) + '</span><span class="me">' + meanHTML(x) + ' ' + (x.lesson.id && SID[x.lesson.id] ? '<a class="muted num" style="font-size:11px" href="#/lesson/' + x.lesson.id + '/vocab">' + esc(SID[x.lesson.id].code) + '</a>' : lvChip(x.blv || x.level)) + '</span>' + sayBtn(x.r) + '</div>';
    }).join('') + '</div></section>' : '') +
      (k.length ? '<section class="section"><div class="section-head"><h2 class="h2">คันจิ</h2><span class="muted num">' + k.length + '</span></div>' + kanjiTiles(k) + '</section>' : '') +
      (g.length ? '<section class="section"><div class="section-head"><h2 class="h2">ไวยากรณ์</h2><span class="muted num">' + g.length + '</span></div>' + g.map(function (x) { return grammarCard(x, true); }).join('') + '</section>' : '');
  }
  function viewSearch(q) {
    return {
      html: '<div class="page page-narrow"><h1 class="title">ค้นหา</h1>' +
        '<input class="input" id="pageSearch" type="search" placeholder="คำไทย ญี่ปุ่น หรือโรมาจิ" value="' + esc(q) + '" style="width:100%;margin-top:20px;height:48px;font-size:16px" autocomplete="off">' +
        '<div id="searchOut" style="margin-top:16px">' + searchResults(q) + '</div></div>',
      mount: function () {
        var inp = $('#pageSearch'), side = $('#sideSearch');
        if (side && document.activeElement !== side) side.value = q;
        if (document.activeElement !== side) { inp.focus(); inp.setSelectionRange(q.length, q.length); }
        inp.addEventListener('input', function () { $('#searchOut').innerHTML = searchResults(inp.value); history.replaceState(null, '', '#/search/' + encodeURIComponent(inp.value)); });
      }
    };
  }

  /* ================= write ================= */
  function writeSet(set) {
    if (set === 'kata' || set === 'hira') { var K = EJ.kana[set], a = []; K.basic.forEach(function (r) { r.forEach(function (c) { if (c) a.push({ ch: c[0], sub: c[1], say: c[0] }); }); }); return a; }
    var ks = KANJI.filter(function (k) { return S.srs[k.id]; });
    if (!ks.length) ks = KANJI.filter(function (k) { return k.level.id === 'n5'; });
    return ks.map(function (k) { return { ch: k.k, sub: k.m, say: k.exr }; });
  }
  function viewWrite(set, ch) {
    var list = writeSet(set), idx = Math.max(0, list.map(function (x) { return x.ch; }).indexOf(ch)), item = list[idx];
    var html = '<div class="page"><h1 class="title">ฝึกเขียน</h1>' +
      '<p class="lead">เขียนทับตัวแบบจาง ๆ ด้วยนิ้วหรือเมาส์ ตัวเลขบอกลำดับขีด กดดูลำดับขีดเพื่อดูการเขียนทีละเส้น</p>' +
      '<div class="row-actions" style="margin:24px 0"><div class="seg">' + [['hira', 'ひらがな'], ['kata', 'カタカナ'], ['kanji', 'คันจิ']].map(function (s) {
        return '<button data-go="#/write/' + s[0] + '" class="' + (set === s[0] ? 'on' : '') + '">' + s[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div class="write-wrap"><div><div class="paper" id="paper"><span class="gx"></span><span class="gy"></span><span class="guide" id="guide">' + esc(item.ch) + '</span><div class="kv" id="kv"></div><canvas id="cv"></canvas></div>' +
        '<div class="row-actions" style="margin-top:12px;justify-content:space-between">' +
          '<div class="row-actions"><button class="btn sm" id="wClear">' + icon('eraser', 'i-sm') + 'ล้าง</button><button class="btn sm ghost" id="wGuide">' + icon('eye', 'i-sm') + 'ซ่อนตัวแบบ</button><button class="btn sm ghost" id="wAnim" hidden>' + icon('play', 'i-sm') + 'ดูลำดับขีด</button></div>' +
          '<div class="row-actions"><button class="icon-btn" id="wPrev" aria-label="ตัวก่อนหน้า">' + icon('left') + '</button><button class="btn sm primary" id="wNext">เขียนแล้ว ตัวถัดไป</button></div></div></div>' +
        '<div class="write-info"><div class="card pad"><div class="row-actions" style="justify-content:space-between"><div><div class="ch">' + esc(item.ch) + '</div><div class="soft">' + esc(item.sub) + '</div></div>' + sayBtn(item.say) + '</div>' +
          '<div class="muted num" style="font-size:12px;margin-top:16px">' + (idx + 1) + ' / ' + list.length + (set === 'kanji' && !KANJI.some(function (k) { return S.srs[k.id]; }) ? '<br>ยังไม่มีคันจิในกองทบทวน จึงแสดงชุด N5' : '') + '</div>' +
          '<div class="chip-row">' + list.map(function (x, i) { return '<button data-go="#/write/' + set + '/' + encodeURIComponent(x.ch) + '" class="' + (i === idx ? 'on' : '') + '" aria-label="' + esc(x.ch) + '">' + esc(x.ch) + '</button>'; }).join('') + '</div>' +
        '</div><p class="muted" style="font-size:13px;margin-top:12px">เขียนไปแล้วทั้งหมด ' + fmt(S.stats.written) + ' ตัว</p><p class="muted small" style="margin-top:4px">ข้อมูลลำดับขีดจาก <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a> โดย Ulrich Apel ใบอนุญาต CC BY-SA 3.0</p></div></div></div>';

    function go(d) { var n = list[(idx + d + list.length) % list.length]; location.hash = '#/write/' + set + '/' + encodeURIComponent(n.ch); }
    return {
      html: html,
      mount: function () {
        var paper = $('#paper'), cv = $('#cv'), ctx = cv.getContext('2d'), drawing = false, last = null, inked = false;
        var ink = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim() || '#1f1b16';
        loadStrokes(item.ch, function (d) {
          var kv = $('#kv'); if (!kv || !d) return;
          kv.innerHTML = strokeSVG(d, true); paper.classList.add('has-kv');
          var b = $('#wAnim'); b.hidden = false; b.onclick = function () { animStrokes($('svg', kv)); };
        });
        function size() {
          var r = paper.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
          cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(6, r.width / 32);
          paper.style.setProperty('--s', r.width + 'px');
        }
        size();
        function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
        cv.addEventListener('pointerdown', function (e) { drawing = true; inked = true; last = pos(e); cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last.x, last.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill(); });
        cv.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { cv.addEventListener(t, function () { drawing = false; }); });
        $('#wClear').onclick = function () { ctx.clearRect(0, 0, cv.width, cv.height); inked = false; };
        $('#wGuide').onclick = function () { var g = $('#guide'), off = g.style.opacity === '0'; g.style.opacity = off ? '1' : '0'; $('#kv').style.opacity = off ? '1' : '0'; this.innerHTML = icon('eye', 'i-sm') + (off ? 'ซ่อนตัวแบบ' : 'แสดงตัวแบบ'); };
        $('#wPrev').onclick = function () { go(-1); };
        $('#wNext').onclick = function () { if (inked) { S.stats.written++; addXP(1); } go(1); };
      }
    };
  }

  /* ================= stats ================= */
  function viewStats() {
    var t = dayNum(), weeks = 52, cols = [], months = [], g = S.settings.goal;
    var start = t - (weeks * 7 - 1);
    var startDow = new Date(start * 864e5).getUTCDay();
    start -= startDow; // เริ่มวันอาทิตย์
    var totalXP = 0, activeDays = 0;
    Object.keys(S.days).forEach(function (k) { totalXP += S.days[k]; if (S.days[k] > 0) activeDays++; });
    for (var w = 0; w * 7 + start <= t; w++) {
      var cells = '', d0 = start + w * 7, mk = keyOf(d0).split('-');
      var lab = (w === 0 && mk[2] <= '21') || (w > 0 && mk[2] <= '07');
      months.push('<span>' + (lab ? TH_MONTH[+mk[1] - 1] : '') + '</span>');
      for (var d = 0; d < 7; d++) {
        var dn = d0 + d, k = keyOf(dn), x = S.days[k] || 0;
        var lvl = x <= 0 ? 0 : x >= g ? 4 : x >= g * .5 ? 3 : x >= g * .25 ? 2 : 1;
        cells += dn > t ? '<span class="c future"></span>' : '<span class="c h' + lvl + '" title="' + thDate(k) + ': ' + x + ' XP"></span>';
      }
      cols.push('<div class="col">' + cells + '</div>');
    }
    var acc = S.stats.answered ? Math.round(S.stats.correct / S.stats.answered * 100) : 0;
    var html = '<div class="page"><h1 class="title">สถิติ</h1>' +
      '<div class="stats4" style="margin-top:32px">' +
        '<div class="card stat"><div class="stat-label">สถานีที่ผ่าน</div><div class="v">' + doneCount() + '<small> / ' + STATIONS.length + '</small></div><div class="d">' + Math.round(doneCount() / STATIONS.length * 100) + '% ของเส้นทาง</div></div>' +
        '<div class="card stat"><div class="stat-label">การ์ดในกองทบทวน</div><div class="v">' + fmt(Object.keys(S.srs).length) + '</div><div class="d">ถึงกำหนดวันนี้ ' + dueIds().length + ' ใบ</div></div>' +
        '<div class="card stat"><div class="stat-label">ความแม่นยำ</div><div class="v">' + acc + '<small>%</small></div><div class="d">จาก ' + fmt(S.stats.answered) + ' ข้อที่ตอบ</div></div>' +
        '<div class="card stat"><div class="stat-label">XP สะสม</div><div class="v">' + fmt(totalXP) + '</div><div class="d">เรียน ' + activeDays + ' วัน ต่อเนื่อง ' + streak() + ' วัน</div></div>' +
      '</div>' +
      '<div class="card pad" style="margin-top:16px"><div class="section-head"><h2 class="h2">12 เดือนที่ผ่านมา</h2><span class="muted">สีเข้มเมื่อถึงเป้า ' + g + ' XP</span></div>' +
        '<div class="heat-scroll" tabindex="0" aria-label="ปฏิทินกิจกรรม เลื่อนซ้ายขวาได้"><div class="heat-months">' + months.join('') + '</div><div class="heat">' + cols.join('') + '</div></div>' +
        '<div class="heat-legend">น้อย<span class="c h0"></span><span class="c h1"></span><span class="c h2"></span><span class="c h3"></span><span class="c h4"></span>ถึงเป้า</div></div>' +
      '<div class="card pad" style="margin-top:16px"><div class="section-head"><h2 class="h2">รายสาย</h2></div>' + LEVELS.map(function (lv) {
        var c = levelCount(lv), n = lv.stations.length;
        return '<div class="lp-row" style="' + lvVars(lv) + '"><span>' + esc(lv.title) + '</span><div class="bar"><i style="transform:scaleX(' + (c / n) + ')"></i></div><span class="num">' + c + ' / ' + n + '</span></div>';
      }).join('') + '</div></div>';
    return html;
  }

  /* ================= word bank ================= */
  var WB = null;
  function lvSeg(base, cur, counts) {
    return '<div class="seg" style="flex-wrap:wrap">' + BLV.map(function (id) {
      return '<button data-go="#/' + base + '/' + id + '" class="' + (cur === id ? 'on' : '') + '">' + esc(LVID[id].code) + (counts ? ' <span class="num seg-n">' + fmt(counts[id]) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function addBtn(c) {
    return S.srs[c.id] ? '<span class="icon-btn in-srs" title="อยู่ในกองทบทวนแล้ว" aria-label="อยู่ในกองทบทวนแล้ว">' + icon('check') + '</span>'
      : '<button class="icon-btn" data-add-word="' + esc(c.id) + '" aria-label="เพิ่มเข้ากองทบทวน" title="เพิ่มเข้ากองทบทวน">' + icon('plus') + '</button>';
  }
  function wordRow(c, showLv) {
    var ro = S.settings.romaji;
    return '<div class="vrow bank"><span class="w">' + furi(c.w, c.r) + '</span><span class="ro">' + (pitchOf(c) != null ? pitchHTML(c.r, pitchOf(c)) + (ro ? ' <small>' + esc(romaji(c.r)) + '</small>' : '') : ro ? esc(romaji(c.r)) : esc(c.r)) + '</span>' +
      '<span class="me">' + (showLv ? lvChip(c.blv || c.level) + ' ' : '') + meanHTML(c) + '</span><span class="vacts">' + sayBtn(c.r) + addBtn(c) + '</span></div>';
  }
  function wordMatches(q) {
    q = q.trim().toLowerCase(); if (!q) return null;
    var hq = toHira(q), rq = q.replace(/[\s']/g, ''), ascii = /^[a-z][a-z\s'-]*$/.test(q);
    var enRe = ascii ? new RegExp('(^|[^a-z])' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : null;
    return BW_ALL.filter(function (c) {
      if (ascii) return enRe.test(c.gloss ? c.gloss.toLowerCase() : c.m.toLowerCase()) || wordRoma(c).indexOf(rq) === 0;
      return c.w.indexOf(q) > -1 || c.r.indexOf(hq) > -1 || c.m.toLowerCase().indexOf(q) > -1;
    });
  }
  function renderWordList() {
    if (!WB) return;
    var list = WB.q ? wordMatches(WB.q) : BW[WB.lid];
    if (WB.todo) list = list.filter(function (c) { return !S.srs[c.id]; });
    var box = $('#wlist'); if (!box) return;
    var shown = list.slice(0, WB.limit);
    $('#wcount').textContent = WB.q ? 'พบ ' + fmt(list.length) + ' คำ' : fmt(list.length) + ' คำ';
    box.innerHTML = list.length
      ? '<div class="card vlist">' + shown.map(function (c) { return wordRow(c, !!WB.q); }).join('') + '</div>' +
        (list.length > shown.length ? '<div class="row-actions" style="justify-content:center;margin-top:16px"><button class="btn" id="wmore">แสดงเพิ่มอีก ' + Math.min(100, list.length - shown.length) + ' คำ <span class="muted num">(เหลือ ' + fmt(list.length - shown.length) + ')</span></button></div>' : '')
      : '<div class="card empty"><div class="h2">' + (WB.q ? 'ไม่พบ "' + esc(WB.q) + '"' : 'เพิ่มครบทุกคำแล้ว') + '</div><p>' + (WB.q ? 'ลองพิมพ์เป็นคานะ โรมาจิ หรือคำไทยสั้นๆ' : 'ทุกคำในระดับนี้อยู่ในกองทบทวนแล้ว') + '</p></div>';
  }
  function viewWords(lid) {
    lid = BW[lid] ? lid : 'n5';
    var counts = {}; BLV.forEach(function (l) { counts[l] = BW[l].length; });
    var inSrs = BW_ALL.filter(function (c) { return S.srs[c.id]; }).length;
    WB = { lid: lid, q: '', limit: 100, todo: false };
    return {
      html: '<div class="page"><h1 class="title">คลังคำศัพท์</h1>' +
        '<p class="lead">คำศัพท์ JLPT ' + fmt(BW_ALL.length) + ' คำ อยู่ในกองทบทวนแล้ว ' + fmt(inSrs) + ' คำ</p>' +
        '<div class="row-actions" style="margin-top:24px">' + lvSeg('words', lid, counts) +
          '<a class="btn sm" href="#/practice/w/' + lid + '">' + icon('target', 'i-sm') + 'ฝึก ' + esc(LVID[lid].code) + ' เป็นชุด</a></div>' +
        '<div class="wtools"><input class="input" id="wq" type="search" placeholder="ค้นทุกระดับ: คำไทย อังกฤษ ญี่ปุ่น หรือโรมาจิ" autocomplete="off">' +
          '<label class="toggle"><input type="checkbox" id="wtodo">เฉพาะคำที่ยังไม่ได้เพิ่ม</label><span class="muted num" id="wcount"></span></div>' +
        '<div id="wlist" style="margin-top:16px"></div></div>',
      mount: function () {
        renderWordList();
        var inp = $('#wq'), t = 0;
        inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { WB.q = inp.value; WB.limit = 100; renderWordList(); }, 160); });
        $('#wtodo').addEventListener('change', function (e) { WB.todo = e.target.checked; WB.limit = 100; renderWordList(); });
      },
      destroy: function () { WB = null; }
    };
  }

  /* ================= practice: แบบฝึกหัด ================= */
  var KANA_DRILLS = [
    { key: 'h-basic', title: 'ฮิรางานะ เสียงพื้นฐาน', jp: 'あいうえお', set: 'hira', groups: ['basic'] },
    { key: 'h-voiced', title: 'ฮิรางานะ เสียงขุ่นและเสียงควบ', jp: 'がぎゃ', set: 'hira', groups: ['voiced', 'yoon'] },
    { key: 'k-basic', title: 'คาตาคานะ เสียงพื้นฐาน', jp: 'アイウエオ', set: 'kata', groups: ['basic'] },
    { key: 'k-voiced', title: 'คาตาคานะ เสียงขุ่น เสียงควบ และเสียงพิเศษ', jp: 'ガギャファ', set: 'kata', groups: ['voiced', 'yoon', 'extra'] },
    { key: 'hk', title: 'จับคู่ ฮิรางานะ กับ คาตาคานะ', jp: 'あ＝ア', set: 'both', groups: ['basic'] },
    { key: 'listen', title: 'ฟังเสียงแล้วเลือกตัวอักษร', jp: '聞く', set: 'hira', groups: ['basic', 'voiced', 'yoon'], listen: true }
  ];
  function kanaChars(set, groups) {
    var K = EJ.kana[set], out = [];
    groups.forEach(function (g) { (K[g] || []).forEach(function (row) { (Array.isArray(row[0]) || row[0] === null ? row : [row]).forEach(function (c) { if (c) out.push(c); }); }); });
    return out;
  }
  function best(key) { return (S.drill || {})[key] || 0; }
  function bestBadge(key) {
    var b = best(key);
    return b ? '<span class="pbest' + (b >= 80 ? ' pass' : '') + '">' + b + '%</span>' : '<span class="pbest none">ยังไม่ทำ</span>';
  }
  function setTiles(kind, lid, sets) {
    return '<div class="ptiles">' + sets.map(function (s, i) {
      var key = kind + ':' + lid + ':' + (i + 1), b = best(key);
      return '<a class="ptile' + (b >= 80 ? ' pass' : '') + '" href="#/practice/' + kind + '/' + lid + '/' + (i + 1) + '">' +
        '<span class="pn num">' + (i + 1) + '</span><span class="pw jp">' + esc(s.slice(0, 3).map(function (c) { return kind === 'k' ? c.k : c.w; }).join('・')) + '</span>' + bestBadge(key) + '</a>';
    }).join('') + '</div>';
  }
  function viewPractice(kind, lid) {
    kind = kind === 'k' ? 'k' : kind === 'w' ? 'w' : '';
    lid = BW[lid] ? lid : 'n5';
    var html = '<div class="page"><h1 class="title">แบบฝึกหัด</h1>' +
      '<p class="lead">ฝึกตั้งแต่ตัวอักษรตัวแรกจนถึงคำศัพท์และคันจิ N1 ทีละชุด ชุดละ ' + SET_N + ' ข้อ ได้ 80% ขึ้นไปถือว่าผ่าน</p>';
    if (!kind) {
      html += '<section class="section"><a class="card pcard wide spgo" href="#/speak">' + icon('mic') + '<span class="pt">ฝึกพูดและฟัง</span><span class="pd">บทสนทนา ' + TALK.length + ' บท พูดตาม แปลแล้วพูด ฟังจับใจความ เว็บฟังเสียงแล้วให้คะแนน</span></a></section>';
      html += '<section class="section"><div class="section-head"><h2 class="h2">เริ่มจากศูนย์: คานะ</h2><a class="btn sm ghost" href="#/write">' + icon('pen', 'i-sm') + 'ฝึกเขียน</a></div>' +
        '<div class="pcards">' + KANA_DRILLS.map(function (d) {
          return '<a class="card pcard" href="#/practice/kana/' + d.key + '"><span class="pj jp">' + esc(d.jp) + '</span><span class="pt">' + esc(d.title) + '</span>' + bestBadge('kana:' + d.key) + '</a>';
        }).join('') + '</div></section>';
      html += BLV.map(function (l) {
        var ws = setsOf(BW[l]), ks = setsOf(BK[l]);
        var wp = ws.filter(function (s, i) { return best('w:' + l + ':' + (i + 1)) >= 80; }).length, kp = ks.filter(function (s, i) { return best('k:' + l + ':' + (i + 1)) >= 80; }).length;
        return '<section class="section"><div class="section-head"><h2 class="h2 with-chip">' + lvChip(LVID[l]) + esc(LVID[l].title) + '</h2></div><div class="plv">' +
          '<a class="card pcard wide" href="#/practice/w/' + l + '"><span class="pt">คำศัพท์ ' + fmt(BW[l].length) + ' คำ</span><span class="pbar"><i style="transform:scaleX(' + (wp / Math.max(1, ws.length)) + ')"></i></span><span class="muted num">ผ่าน ' + wp + ' / ' + ws.length + ' ชุด</span></a>' +
          '<a class="card pcard wide" href="#/practice/k/' + l + '"><span class="pt">คันจิ ' + fmt(BK[l].length) + ' ตัว</span><span class="pbar"><i style="transform:scaleX(' + (kp / Math.max(1, ks.length)) + ')"></i></span><span class="muted num">ผ่าน ' + kp + ' / ' + ks.length + ' ชุด</span></a>' +
          '</div></section>';
      }).join('');
      return html + '</div>';
    }
    var list = kind === 'w' ? BW[lid] : BK[lid], sets = setsOf(list);
    var counts = {}; BLV.forEach(function (l) { counts[l] = setsOf(kind === 'w' ? BW[l] : BK[l]).length; });
    return html.replace('<h1 class="title">แบบฝึกหัด</h1>', '<nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/practice">แบบฝึกหัด</a></nav><h1 class="title">' + (kind === 'w' ? 'ฝึกคำศัพท์' : 'ฝึกคันจิ') + '</h1>') +
      '<div class="row-actions" style="margin-top:24px">' + lvSeg('practice/' + kind, lid) +
        '<a class="btn sm" href="#/practice/' + kind + '/' + lid + '/all/mix">' + icon('play', 'i-sm') + 'สุ่มรวมทั้ง ' + esc(LVID[lid].code) + '</a></div>' +
      '<p class="muted" style="margin-top:12px">' + sets.length + ' ชุด แตะชุดเพื่อดูรายการแล้วเลือกวิธีฝึก</p>' +
      setTiles(kind, lid, sets) + '</div>';
  }
  var W_MODES = [['mean', 'ดูคำ เลือกความหมาย'], ['word', 'ดูความหมาย เลือกคำ'], ['read', 'ดูคันจิ เลือกคำอ่าน'], ['listen', 'ฟังเสียง เลือกคำ'], ['type', 'พิมพ์คำอ่าน'], ['mix', 'ผสมทุกแบบ']];
  var K_MODES = [['mean', 'ดูคันจิ เลือกความหมาย'], ['on', 'เลือกเสียงอง'], ['kun', 'เลือกเสียงคุน'], ['ex', 'อ่านคำตัวอย่าง'], ['mix', 'ผสมทุกแบบ']];
  function viewSet(kind, lid, n) {
    var list = (kind === 'w' ? BW : BK)[lid]; if (!list) return viewMissing();
    var sets = setsOf(list), items = sets[n - 1]; if (!items) return viewMissing();
    var key = kind + ':' + lid + ':' + n, modes = kind === 'w' ? W_MODES : K_MODES;
    var body = kind === 'w'
      ? '<div class="card vlist">' + items.map(function (c) { return wordRow(c); }).join('') + '</div>'
      : kanjiTiles(items);
    return '<div class="page"><nav class="crumbs" aria-label="ตำแหน่ง"><a href="#/practice">แบบฝึกหัด</a>' + icon('right', 'i-sm') + '<a href="#/practice/' + kind + '/' + lid + '">' + (kind === 'w' ? 'คำศัพท์' : 'คันจิ') + ' ' + esc(LVID[lid].code) + '</a></nav>' +
      '<h1 class="title title-s">' + (kind === 'w' ? 'คำศัพท์' : 'คันจิ') + ' ' + esc(LVID[lid].code) + ' ชุดที่ ' + n + ' <span class="muted num" style="font-size:16px">จาก ' + sets.length + '</span></h1>' +
      '<div class="row-actions" style="margin-top:12px">' + bestBadge(key) + '</div>' +
      '<div class="pmodes">' + modes.map(function (m) { return '<a class="btn' + (m[0] === 'mix' ? ' primary' : '') + '" href="#/practice/' + kind + '/' + lid + '/' + n + '/' + m[0] + '">' + esc(m[1]) + '</a>'; }).join('') + '</div>' +
      '<div class="section-head" style="margin-top:32px"><h2 class="h2">อ่านทำความรู้จักก่อน</h2><button class="btn sm" data-add-set="' + esc(items.map(function (c) { return c.id; }).join(',')) + '">' + icon('plus', 'i-sm') + 'เพิ่มทั้งชุดเข้ากองทบทวน</button></div>' +
      body +
      '<div class="row-actions" style="margin-top:24px">' + (n > 1 ? '<a class="btn ghost" href="#/practice/' + kind + '/' + lid + '/' + (n - 1) + '">' + icon('left', 'i-sm') + 'ชุดก่อนหน้า</a>' : '') +
        (n < sets.length ? '<a class="btn ghost" href="#/practice/' + kind + '/' + lid + '/' + (n + 1) + '">ชุดถัดไป' + icon('right', 'i-sm') + '</a>' : '') + '</div></div>';
  }
  function samePool(list, c, f) {
    var p = list.filter(function (x) { return x !== c && !!x.en === !!c.en; }).map(f);
    return p.length >= 3 ? p : list.filter(function (x) { return x !== c; }).map(f);
  }
  function readingAccept(r) {
    var h = toHira(r).replace(/[～〜\s]/g, ''), ro = romaji(h).replace(/[\s']/g, '');
    return [h, ro, ro.replace(/ou/g, 'o').replace(/uu/g, 'u'), ro.replace(/n'/g, 'n')];
  }
  function wordQ(mode, c, pool) {
    var id = c.id;
    if (mode === 'mean') return choiceQ('คำนี้แปลว่าอะไร', c.w, '', c.m, samePool(pool, c, function (x) { return x.m; }), false, c.r, id);
    if (mode === 'word') return choiceQ('คำไหนแปลว่า', c.m, 'th', c.w, pool.map(function (x) { return x.w; }), true, c.r, id);
    if (mode === 'read' && hasKanji(c.w)) return choiceQ('อ่านคำนี้ว่าอย่างไร', c.w, '', c.r, pool.filter(function (x) { return x.r !== c.r; }).map(function (x) { return x.r; }), true, c.r, id);
    if (mode === 'listen') { var q = choiceQ('ฟังแล้วเลือกคำที่ได้ยิน', '', '', c.w, pool.filter(function (x) { return x.r !== c.r; }).map(function (x) { return x.w; }), true, c.r, id); q.listen = true; q.reveal = c.w + '（' + c.r + '）' + c.m; return q; }
    if (mode === 'type') return { type: 'type', kind: 'พิมพ์คำอ่าน เป็นคานะหรือโรมาจิ', prompt: c.w, sub: c.m, pcls: '', answer: c.r, accept: readingAccept(c.r), say: c.r, cardId: id, ph: 'เช่น ' + (wordRoma(c) || 'taberu') };
    return wordQ('mean', c, pool);
  }
  function kanjiQ(mode, c, pool) {
    var id = c.id, ex = c.exr || c.k;
    if (mode === 'mean') return choiceQ('คันจินี้มีความหมายว่า', c.k, 'hand', c.m, samePool(pool, c, function (x) { return x.m; }), false, ex, id);
    if (mode === 'on' && c.on) return choiceQ('เสียงองของคันจินี้', c.k, 'hand', c.on, pool.filter(function (x) { return x.on && x.on !== c.on; }).map(function (x) { return x.on; }), true, ex, id);
    if (mode === 'kun' && c.kun) return choiceQ('เสียงคุนของคันจินี้', c.k, 'hand', c.kun, pool.filter(function (x) { return x.kun && x.kun !== c.kun; }).map(function (x) { return x.kun; }), true, ex, id);
    if (mode === 'ex' && c.exw && c.exr) return choiceQ('อ่านคำนี้ว่าอย่างไร', c.exw, '', c.exr, pool.filter(function (x) { return x.exr && x.exr !== c.exr; }).map(function (x) { return x.exr; }), true, c.exr, id);
    return kanjiQ('mean', c, pool);
  }
  function viewPracticeQuiz(kind, lid, n, mode) {
    var title, qs = [], key, back, crumb = '<a href="#/practice">แบบฝึกหัด</a>';
    if (kind === 'listen') {
      var pool = SENT[lid] || [], ths = pool.map(function (x) { return x.th; });
      key = 'sp:listen:' + lid; title = 'ฟังจับใจความ ' + LVID[lid].code; back = '#/speak/' + lid; crumb = '<a href="#/speak/' + lid + '">ฝึกพูด ' + esc(LVID[lid].code) + '</a>';
      qs = pick(pool, SP_N).map(function (x) { var q = choiceQ('ฟังแล้วเลือกความหมาย', '', '', x.th, ths, false, x.jp); q.listen = true; q.reveal = x.jp + '（' + String(x.r).replace(/\s+/g, '') + '）'; return q; });
    } else if (kind === 'kana') {
      var d = KANA_DRILLS.filter(function (x) { return x.key === lid; })[0]; if (!d) return viewMissing();
      key = 'kana:' + d.key; title = d.title; back = '#/practice';
      if (d.set === 'both') {
        var hs = kanaChars('hira', ['basic']), ks = kanaChars('kata', ['basic']);
        qs = pick(hs.map(function (h, i) { return [h, ks[i]]; }), SET_N).map(function (p, i) {
          return i % 2 ? choiceQ('ฮิรางานะของตัวนี้คือ', p[1][0], 'hand', p[0][0], hs.map(function (x) { return x[0]; }), true, p[0][0])
            : choiceQ('คาตาคานะของตัวนี้คือ', p[0][0], 'hand', p[1][0], ks.map(function (x) { return x[0]; }), true, p[0][0]);
        });
      } else {
        var chars = kanaChars(d.set, d.groups), glyphs = chars.map(function (x) { return x[0]; });
        qs = pick(chars, SET_N).map(function (c, i) {
          if (d.listen) { var q = choiceQ('ฟังแล้วเลือกตัวอักษร', '', '', c[0], glyphs, true, c[0]); q.listen = true; q.reveal = c[0] + ' ' + c[1]; return q; }
          return i % 2 ? choiceQ('ตัวไหนอ่านว่า "' + c[1] + '"', c[1], 'th', c[0], glyphs, true, c[0])
            : { type: 'type', kind: 'พิมพ์เสียงอ่านเป็นโรมาจิ', prompt: c[0], pcls: 'hand', answer: c[1], accept: [c[1]].concat(ALT[c[1]] || []), say: c[0] };
        });
      }
    } else {
      var all = (kind === 'w' ? BW : BK)[lid]; if (!all) return viewMissing();
      var items, sets = setsOf(all);
      if (n === 'all') { items = pick(all, SET_N); key = null; title = (kind === 'w' ? 'คำศัพท์ ' : 'คันจิ ') + LVID[lid].code + ' สุ่มรวม'; back = '#/practice/' + kind + '/' + lid; }
      else { n = +n; items = sets[n - 1]; if (!items) return viewMissing(); key = kind + ':' + lid + ':' + n; title = (kind === 'w' ? 'คำศัพท์ ' : 'คันจิ ') + LVID[lid].code + ' ชุดที่ ' + n; back = '#/practice/' + kind + '/' + lid + '/' + n; }
      var modes = (kind === 'w' ? W_MODES : K_MODES).map(function (m) { return m[0]; }).filter(function (m) { return m !== 'mix'; });
      if (kind === 'w' && mode === 'read') items = items.filter(function (c) { return hasKanji(c.w); });
      if (!items.length) items = (sets[n - 1] || all).slice();
      qs = shuffle(items).map(function (c, i) {
        var m = mode === 'mix' || !mode ? modes[i % modes.length] : mode;
        return kind === 'w' ? wordQ(m, c, all) : kanjiQ(m, c, all);
      });
    }
    var fake = { id: 'practice', kind: 'drill', code: '', title: title, level: LEVELS[0], num: 0 };
    Q = { st: fake, qs: qs, i: 0, right: 0, miss: [], locked: false, drill: true, practice: { key: key, back: back, kind: kind, lid: lid, n: n, mode: mode } };
    return {
      html: '<div class="page"><div class="quiz"><nav class="crumbs" aria-label="ตำแหน่ง">' + crumb + (kind === 'listen' ? '' : icon('right', 'i-sm') + '<a href="' + back + '">' + esc(title) + '</a>') + '</nav>' +
        '<h1 class="title title-s">' + esc(title) + '</h1><div id="quizBox"></div></div></div>',
      mount: renderQ, destroy: function () { Q = null; }
    };
  }
  function practiceResult() {
    var P = Q.practice, n = Q.qs.length, pct = Math.round(Q.right / n * 100), pass = pct >= 80, prev = P.key ? best(P.key) : 0;
    if (P.key && pct > prev) { S.drill[P.key] = pct; save(); }
    var sets = P.kind === 'w' || P.kind === 'k' ? setsOf((P.kind === 'w' ? BW : BK)[P.lid]).length : 0;
    var next = typeof P.n === 'number' && P.n < sets ? '#/practice/' + P.kind + '/' + P.lid + '/' + (P.n + 1) : null;
    var missIds = Q.miss.map(function (q) { return q.cardId; }).filter(function (id) { return id && CARD[id] && !S.srs[id]; });
    $('#quizBox').innerHTML = '<div class="card result" style="margin-top:24px">' +
      (pass ? '<span class="hanko lg stamp-in" style="' + lvVars(P.kind === 'kana' ? LEVELS[0] : LVID[P.lid]) + '">合格<small>' + pct + '%</small></span>' : '') +
      '<div class="score">' + Q.right + '<span class="muted" style="font-size:24px"> / ' + n + '</span></div>' +
      '<p class="lead" style="margin:12px auto 0">' + (pass ? 'ผ่านชุดนี้แล้ว' : 'ได้ ' + pct + '% ทำอีกรอบให้ถึง 80%') + (P.key && pct > prev && prev ? ' ทำลายสถิติเดิม ' + prev + '%' : '') + '</p>' +
      '<div class="row-actions" style="justify-content:center;margin-top:24px">' +
        (pass && next ? '<a class="btn primary" href="' + next + '">ชุดถัดไป' + icon('arrow', 'i-sm') + '</a>' : '') +
        '<button class="btn" data-retry>' + icon('redo', 'i-sm') + 'ทำอีกครั้ง</button>' +
        (missIds.length ? '<button class="btn" data-add-set="' + esc(missIds.join(',')) + '">' + icon('plus', 'i-sm') + 'เพิ่ม ' + missIds.length + ' ข้อที่พลาดเข้ากองทบทวน</button>' : '') +
        '<a class="btn ghost" href="' + P.back + '">กลับ</a>' +
      '</div>' +
      (Q.miss.length ? '<div class="miss"><div class="h3">ข้อที่พลาด</div><ul style="list-style:none;padding:0;margin:8px 0 0">' + Q.miss.map(function (q) {
        return '<li><span class="jp">' + esc(q.reveal || q.prompt) + '</span><span class="soft jp">' + esc(q.answer) + '</span></li>';
      }).join('') + '</ul></div>' : '') +
    '</div>';
  }

  /* ================= login / account ================= */
  function gateLinks(m) {
    var L = [];
    if (ACC.list.length && m !== 'list') L.push('<button class="link-btn" data-lg="list">' + icon('left', 'i-sm') + 'บัญชีในเครื่องนี้</button>');
    if (m !== 'login') L.push('<button class="link-btn" data-lg="login">เข้าสู่ระบบ</button>');
    if (m !== 'signup') L.push('<button class="link-btn" data-lg="signup">สมัครบัญชีใหม่</button>');
    L.push('<button class="link-btn" id="guestGo">ลองเรียนโดยไม่สร้างบัญชี</button>');
    return '<div class="gate-links">' + L.join('') + '</div>';
  }
  function colorPick(sel) {
    var names = ['ชมพู', 'เขียวมะนาว', 'ดำ', 'ขาว'];
    return '<div class="ava-pick" role="radiogroup" aria-label="สีโปรไฟล์">' + names.map(function (n, i) {
      return '<label class="ava-opt"><input type="radio" name="color" value="' + i + '"' + (i === sel ? ' checked' : '') + '><span class="ava ava-c' + i + '" title="' + n + '"></span><span class="sr">' + n + '</span></label>';
    }).join('') + '</div>';
  }
  function userField(id, val) {
    return '<div class="field"><label for="' + id + '">ชื่อผู้ใช้</label><input class="input" id="' + id + '" value="' + esc(val || '') + '" maxlength="20" autocomplete="username" autocapitalize="none" spellcheck="false" required pattern="[A-Za-z0-9_]{3,20}" placeholder="เช่น nuy_jp"></div>';
  }
  function passField(id, label, auto) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" type="password" minlength="6" autocomplete="' + (auto || 'current-password') + '" required></div>';
  }
  function signupFields(withColor) {
    return userField('suUser') + '<p class="hint">ภาษาอังกฤษตัวเล็ก ตัวเลข หรือ _ ยาว 3 ถึง 20 ตัว ใช้เข้าสู่ระบบจากเครื่องอื่น</p>' +
      passField('suPass', 'รหัสผ่าน อย่างน้อย 6 ตัว (ลืมแล้วกู้คืนไม่ได้ จดไว้ให้ดี)', 'new-password') + passField('suPass2', 'ใส่รหัสผ่านอีกครั้ง', 'new-password') +
      (withColor ? '<div class="field"><label>สีโปรไฟล์</label>' + colorPick(ACC.list.length % AVA_N) + '</div>' : '');
  }
  function viewLogin() {
    var list = ACC.list, m = LG.mode || (list.length ? 'list' : 'signup'), body = '';
    if (m === 'list') {
      body = '<h1 class="title">ใครกำลังเรียน</h1><p class="lead">บัญชีที่เคยเข้าในเครื่องนี้</p>' +
        '<div class="who">' + list.map(function (p) {
          var meta = isCloud(p) ? (p.token ? (p.pin ? 'ใส่ PIN' : 'เข้าได้เลย') : 'ใส่รหัสผ่าน') : 'ในเครื่องเท่านั้น';
          var armed = LG.edit && LG.arm === p.id;
          if (armed) meta = isCloud(p) ? 'กด × อีกครั้งเพื่อเอาออก ข้อมูลยังอยู่ในบัญชี' : 'ไม่มีบัญชีออนไลน์ ข้อมูลจะหายถาวร กด × อีกครั้ง';
          return '<div class="who-item' + (armed ? ' armed' : '') + '"><button class="who-btn" data-login="' + esc(p.id) + '"' + (LG.edit ? ' disabled' : '') + '>' + ava(p, 'ava-xl') + '<span class="who-name">' + esc(p.name) + '</span><span class="who-meta">' + meta + '</span></button>' +
            (LG.edit ? '<button class="who-x" data-forget="' + esc(p.id) + '" aria-label="เอา ' + esc(p.name) + ' ออกจากเครื่องนี้">' + icon('x', 'i-sm') + '</button>' : '') + '</div>';
        }).join('') +
        (LG.edit ? '' : '<div class="who-item"><button class="who-btn" data-lg="login"><span class="ava ava-xl ava-add" aria-hidden="true">+</span><span class="who-name">บัญชีอื่น</span><span class="who-meta">เข้าสู่ระบบหรือสมัคร</span></button></div>') + '</div>' +
        '<div class="gate-links"><button class="link-btn" data-lg-edit>' + (LG.edit ? 'เสร็จแล้ว' : 'เอาบัญชีออกจากเครื่องนี้') + '</button></div>' + (LG.edit ? '' : gateLinks(m));
    } else if (m === 'pin') {
      var p = profile(LG.id);
      if (!p) { LG.mode = 'list'; return viewLogin(); }
      body = '<form class="card pad gate-form" id="lgPin">' +
        '<div class="gate-who">' + ava(p, 'ava-lg') + '<div><div class="h2">' + esc(p.name) + '</div><div class="muted">ใส่ PIN ของบัญชีนี้</div></div></div>' +
        '<div class="field"><label for="pinIn">PIN</label><input class="input pin-in" id="pinIn" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" required></div>' +
        '<button class="btn primary" type="submit">เข้าเรียน</button></form>' + gateLinks(m);
    } else if (m === 'login') {
      body = '<h1 class="title">เข้าสู่ระบบ</h1><p class="lead">ใส่ชื่อผู้ใช้กับรหัสผ่าน ความคืบหน้าของบัญชีจะตามมาทุกเครื่อง</p>' +
        '<form class="card pad gate-form" id="lgLogin">' + userField('liUser', LG.user) + passField('liPass', 'รหัสผ่าน') +
        '<button class="btn primary" type="submit">เข้าสู่ระบบ</button></form>' + gateLinks(m);
    } else if (m === 'signup') {
      var mig = guestHasProgress();
      body = '<h1 class="title">สมัครบัญชี</h1><p class="lead">ไม่ต้องใช้อีเมล ใช้ชื่อผู้ใช้กับรหัสผ่านเข้าเรียนได้ทุกเครื่อง</p>' +
        '<form class="card pad gate-form" id="lgSignup">' + signupFields(true) +
          (mig ? '<label class="toggle"><input type="checkbox" id="migIn" checked>เอาความคืบหน้าที่เรียนไว้ในเครื่องนี้เข้าบัญชีด้วย</label>' : '') +
          '<button class="btn primary" type="submit">สมัครบัญชี</button></form>' + gateLinks(m);
    }
    return { html: '<div class="gate"><div class="gate-head"><img class="logo" src="assets/mark.svg?v=15" alt="" width="40" height="40"><span class="brand-name">Kana to N1</span></div>' + body + '</div>',
      mount: function () { var f = $('.gate input:not([type=radio]):not([type=checkbox]):placeholder-shown, .gate input[type=password]') || $('.gate input:not([type=radio]):not([type=checkbox])'); if (f && m !== 'list') f.focus(); } };
  }

  function pinCard(p) {
    return '<form class="card pad acc-form" id="accPin" style="margin-top:16px"><div class="h3">PIN</div><p class="soft" style="font-size:14px">' +
      (isCloud(p) ? 'ล็อกบัญชีนี้ในเครื่องนี้ตอนสลับบัญชี เข้าเครื่องใหม่ใช้รหัสผ่านตามปกติ' : 'กันคนอื่นที่ใช้เครื่องเดียวกันกดเข้าโปรไฟล์นี้') + '</p>' +
      '<div class="field"><label for="accPinIn">PIN ใหม่ 4 ถึง 6 หลัก</label><input class="input pin-in" id="accPinIn" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="off" required></div>' +
      '<div class="row-actions"><button class="btn sm" type="submit">' + (p.pin ? 'เปลี่ยน PIN' : 'ตั้ง PIN') + '</button>' + (p.pin ? '<button class="btn sm ghost" type="button" id="pinOff">เอา PIN ออก</button>' : '') + '</div></form>';
  }
  function viewAccount() {
    var p = me();
    if (!p) {
      return '<div class="page page-narrow"><h1 class="title">บัญชี</h1><div class="card empty" style="margin-top:32px"><div class="h2">ตอนนี้เรียนแบบไม่มีบัญชี</div>' +
        '<p>ความคืบหน้าเก็บในเบราว์เซอร์นี้เท่านั้น สมัครบัญชีเพื่อเรียนต่อได้ทุกเครื่อง ของที่เรียนไว้เอาเข้าบัญชีได้ตอนสมัคร</p>' +
        '<div class="row-actions"><button class="btn primary" data-lg-go="signup">สมัครบัญชี</button><button class="btn" data-lg-go="login">เข้าสู่ระบบ</button></div></div></div>';
    }
    var head = '<div class="card pad acc-head" style="margin-top:32px">' + ava(p, 'ava-lg') + '<div class="grow"><div class="h2">' + esc(p.name) + '</div>' +
      (isCloud(p) ? '<div class="sync sync-' + SYNC.state + '" id="syncLine">' + esc(syncText()) + '</div>' : '<div class="muted">โปรไฟล์ในเครื่องนี้ ยังไม่มีบัญชีออนไลน์</div>') + '</div>' +
      '<div class="row-actions">' + (isCloud(p) && p.token ? '<button class="btn sm" id="syncNow">' + icon('redo', 'i-sm') + 'ซิงก์ตอนนี้</button>' : '') +
      '<button class="btn sm" id="switchAcc">' + icon('swap', 'i-sm') + 'เปลี่ยนบัญชี</button></div></div>';
    var html = '<div class="page page-narrow"><h1 class="title">บัญชี</h1>' + head;
    if (isCloud(p) && !p.token) {
      html += '<form class="card pad acc-form" id="accRelogin" style="margin-top:16px"><div class="h3">เข้าสู่ระบบอีกครั้ง</div><p class="soft" style="font-size:14px">เครื่องนี้ออกจากระบบไปแล้ว อาจเพราะเปลี่ยนรหัสผ่านจากเครื่องอื่น ใส่รหัสผ่านเพื่อซิงก์ต่อ ของที่เรียนในเครื่องนี้ไม่หาย</p>' +
        passField('rePass', 'รหัสผ่าน') + '<div><button class="btn sm primary" type="submit">เข้าสู่ระบบ</button></div></form>';
    }
    if (!isCloud(p)) {
      html += '<form class="card pad acc-form" id="accUpgrade" style="margin-top:16px"><div class="h3">สร้างบัญชีออนไลน์จากโปรไฟล์นี้</div><p class="soft" style="font-size:14px">ความคืบหน้าของโปรไฟล์นี้จะขึ้นไปอยู่ในบัญชี แล้วเข้าเรียนจากเครื่องไหนก็ได้</p>' +
        signupFields(false) + '<div><button class="btn sm primary" type="submit">สร้างบัญชี</button></div></form>';
    }
    html += '<form class="card pad acc-form" id="accName" style="margin-top:16px"><div class="h3">' + (isCloud(p) ? 'สีโปรไฟล์' : 'ชื่อและสี') + '</div>' +
      (isCloud(p) ? '' : '<div class="field"><label for="accNm">ชื่อที่ใช้ในเว็บ</label><input class="input" id="accNm" maxlength="20" required value="' + esc(p.name) + '"></div>') +
      colorPick(p.color || 0) + '<div><button class="btn sm" type="submit">บันทึก</button></div></form>' + pinCard(p);
    if (isCloud(p) && p.token) {
      html += '<form class="card pad acc-form" id="accPass" style="margin-top:16px"><div class="h3">เปลี่ยนรหัสผ่าน</div>' +
        passField('cpOld', 'รหัสผ่านเดิม') + passField('cpNew', 'รหัสผ่านใหม่ อย่างน้อย 6 ตัว', 'new-password') +
        '<p class="hint">เครื่องอื่นที่เข้าบัญชีนี้ไว้จะต้องเข้าสู่ระบบใหม่ ไม่มีอีเมลไว้กู้รหัสผ่าน จำรหัสใหม่ให้ดี</p><div><button class="btn sm" type="submit">เปลี่ยนรหัสผ่าน</button></div></form>';
    }
    if (isCloud(p)) {
      html += '<div class="card pad" style="margin-top:16px"><div class="h3">ออกจากระบบเครื่องนี้</div><p class="soft" style="font-size:14px;margin-top:4px">ลบบัญชีนี้ออกจากรายการในเครื่องนี้ ข้อมูลบนเซิร์ฟเวอร์ยังอยู่ เข้าใหม่ได้ด้วยรหัสผ่าน</p>' +
        '<div class="row-actions" style="margin-top:16px"><button class="btn sm" id="logout">ออกจากระบบ</button></div></div>';
      if (p.token) html += '<form class="card pad acc-form" id="accDelete" style="margin-top:16px"><div class="h3">ลบบัญชี</div><p class="soft" style="font-size:14px">ลบบัญชีและความคืบหน้าทั้งหมดออกจากเซิร์ฟเวอร์ ย้อนกลับไม่ได้</p>' +
        passField('delPass', 'ใส่รหัสผ่านเพื่อยืนยัน') + '<div><button class="btn sm ghost" type="submit">ลบบัญชีถาวร</button></div></form>';
    } else {
      html += '<div class="card pad" style="margin-top:16px"><div class="h3">ลบโปรไฟล์</div><p class="soft" style="font-size:14px;margin-top:4px">ลบชื่อและความคืบหน้าของโปรไฟล์นี้ออกจากเครื่องนี้ ย้อนกลับไม่ได้</p>' +
        '<div class="row-actions" style="margin-top:16px"><button class="btn sm ghost" id="delMe">ลบโปรไฟล์นี้</button></div></div>';
    }
    return html + '</div>';
  }

  /* ================= settings ================= */
  function viewSettings() {
    var st = S.settings;
    var voices = VOICES.length ? '<select class="input" data-set="voice"><option value="">ค่าเริ่มต้นของเครื่อง</option>' + VOICES.map(function (v) { return '<option' + (v.name === st.voice ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('') + '</select>'
      : '<p class="muted" style="font-size:13px">ไม่พบเสียงภาษาญี่ปุ่นในเครื่องนี้ ติดตั้งเสียงภาษาญี่ปุ่นในการตั้งค่าระบบแล้วโหลดหน้าใหม่</p>';
    return '<div class="page page-narrow"><h1 class="title">ตั้งค่า</h1>' +
      '<div class="card pad" style="margin-top:32px;display:flex;flex-direction:column;gap:24px">' +
        '<div class="field"><label>ธีม</label><div class="seg">' + [['auto', 'ตามเครื่อง'], ['light', 'สว่าง'], ['dark', 'มืด']].map(function (x) { return '<button data-theme-set="' + x[0] + '" class="' + (themePref() === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label>เป้า XP ต่อวัน</label><div class="seg">' + [20, 30, 50, 100].map(function (g) { return '<button data-goal="' + g + '" class="' + (st.goal === g ? 'on' : '') + '">' + g + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label>ความเร็วเสียงอ่าน <span class="num" id="rateV">' + st.rate.toFixed(2) + '×</span></label><input type="range" min="0.6" max="1.2" step="0.05" value="' + st.rate + '" data-set="rate" class="range"></div>' +
        '<div class="field"><label>เสียงภาษาญี่ปุ่น</label>' + voices + '<div><button class="btn sm" data-say="こんにちは。にほんごを べんきょうしましょう。">' + icon('sound', 'i-sm') + 'ทดลองฟัง</button></div></div>' +
        '<div class="row-actions" style="gap:24px"><label class="toggle"><input type="checkbox" data-set="romaji"' + (st.romaji ? ' checked' : '') + '>แสดงโรมาจิ</label><label class="toggle"><input type="checkbox" data-set="furigana"' + (st.furigana ? ' checked' : '') + '>แสดงคำอ่านบนคันจิ</label><label class="toggle"><input type="checkbox" data-set="pitch"' + (st.pitch !== false ? ' checked' : '') + '>แสดงเสียงสูงต่ำ</label></div>' +
      '</div>' +
      '<div class="card pad" style="margin-top:16px"><div class="h3">สำรองความคืบหน้า</div><p class="soft" style="font-size:14px;margin-top:4px">ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์นี้เท่านั้น ส่งออกเป็นไฟล์ไว้ย้ายเครื่องหรือกันข้อมูลหาย</p>' +
        '<div class="row-actions" style="margin-top:16px"><button class="btn sm" id="exp">' + icon('download', 'i-sm') + 'ส่งออก</button><label class="btn sm">' + icon('upload', 'i-sm') + 'นำเข้า<input type="file" id="imp" accept="application/json" hidden></label>' +
        '<button class="btn sm ghost" id="reset">ล้างความคืบหน้าทั้งหมด</button></div></div>' +
      '<p class="muted" style="font-size:12px;margin-top:24px">เนื้อหาเป็นชุดเริ่มต้นสำหรับแต่ละระดับ ใช้คู่กับหนังสือเรียนและข้อสอบเก่าจะได้ผลดีที่สุด ไอคอนจาก Lucide</p></div>';
  }
  function viewMore() {
    var items = [['#/account', 'user', 'บัญชี'], ['#/words', 'words', 'คลังคำศัพท์'], ['#/practice', 'target', 'แบบฝึกหัด'], ['#/speak', 'mic', 'ฝึกพูด'], ['#/kana', 'grid', 'ตารางคานะ'], ['#/kanji', 'type', 'คันจิ'], ['#/grammar', 'book', 'ไวยากรณ์'], ['#/write', 'pen', 'ฝึกเขียน'], ['#/stats', 'chart', 'สถิติ'], ['#/settings', 'sliders', 'ตั้งค่า'], ['#/search/', 'search', 'ค้นหา']];
    return '<div class="page page-narrow"><h1 class="title">เมนู</h1><div class="card" style="margin-top:24px">' + items.map(function (x) {
      return '<a class="list-row" href="' + x[0] + '">' + icon(x[1], 'muted') + '<span class="grow">' + x[2] + '</span>' + icon('right', 'muted') + '</a>';
    }).join('') + '</div></div>';
  }

  /* ================= events ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-say],[data-kanji],[data-close],[data-go],[data-opt],#qnext,[data-retry],[data-grade],#flash,[data-add-lesson],[data-add-card],[data-read-done],[data-goal],#exp,#reset,[data-login],[data-lg],[data-lg-go],#guestGo,#logout,#delMe,#pinOff,#switchAcc,#syncNow,[data-copy],[data-forget],[data-lg-edit],[data-add-word],[data-add-set],#wmore,[data-theme-set]');
    if (!t) { if (e.target.id === 'sheet') closeSheet(); return; }
    if (t.hasAttribute('data-say')) {
      e.preventDefault(); speak(t.getAttribute('data-say'));
      if (t.classList.contains('ktile')) { t.classList.remove('hop'); void t.offsetWidth; t.classList.add('hop'); } if (t.id !== 'flash') return; }
    if (t.hasAttribute('data-login')) {
      var lp = profile(t.getAttribute('data-login'));
      if (!lp) return;
      if (isCloud(lp) && !lp.token) { LG = { mode: 'login', user: lp.user }; return route(); }
      if (!lp.pin) return useProfile(lp.id);
      LG = { mode: 'pin', id: lp.id }; return route();
    }
    if (t.hasAttribute('data-lg-edit')) { LG = { mode: 'list', edit: !LG.edit }; return route(); }
    if (t.hasAttribute('data-forget')) {
      var fp = profile(t.getAttribute('data-forget'));
      if (!fp) return;
      if (LG.arm !== fp.id) { LG.arm = fp.id; return route(); }
      t.disabled = true;
      var finish = function () {
        if (fp.token) rpc('ej_logout', { p_token: fp.token }).catch(function () { /* ignore */ });
        forget(fp); toast('เอา ' + fp.name + ' ออกจากเครื่องนี้แล้ว');
        LG = ACC.list.length ? { mode: 'list', edit: true } : { mode: null };
        route();
      };
      syncProfileNow(fp).then(finish, finish);
      return;
    }
    if (t.hasAttribute('data-lg')) { LG = { mode: t.getAttribute('data-lg') }; return route(); }
    if (t.hasAttribute('data-lg-go')) { LG = { mode: t.getAttribute('data-lg-go') }; return signOutView(); }
    if (t.id === 'guestGo') { setGuest(true); ACC.current = null; accSave(); KEY = GUEST_KEY; S = load(); toast('เรียนแบบไม่มีบัญชี สมัครทีหลังได้ที่หน้าบัญชี'); return route(); }
    if (t.id === 'switchAcc') { flush(); LG = { mode: 'list' }; return signOutView(); }
    if (t.id === 'syncNow') { var sp = me(); if (sp) { sp.dirty = true; accSave(); } push().then(function () { return pull(false); }); return; }
    if (t.id === 'logout') {
      var op = me(), tok = op.token;
      var done = function () { if (tok) rpc('ej_logout', { p_token: tok }).catch(function () { /* ignore */ }); forget(op); toast('ออกจากระบบแล้ว'); LG = { mode: null }; signOutView(); };
      if (op.dirty && op.token) { t.disabled = true; t.textContent = 'กำลังบันทึกก่อนออก…'; push().then(done, done); } else done();
      return;
    }
    if (t.id === 'pinOff') { var pp = me(); delete pp.pin; accSave(); toast('เอา PIN ออกแล้ว'); return route(); }
    if (t.hasAttribute('data-copy')) {
      var txt = t.getAttribute('data-copy'), ok = function () { toast('คัดลอกแล้ว'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { toast(txt); });
      else toast(txt);
      return;
    }
    if (t.id === 'delMe') {
      if (t.dataset.armed) { var dp = me(); forget(dp); toast('ลบโปรไฟล์ ' + dp.name + ' แล้ว'); LG = { mode: null }; return signOutView(); }
      t.dataset.armed = '1'; t.textContent = 'กดอีกครั้งเพื่อลบถาวร'; setTimeout(function () { if (t.isConnected) { delete t.dataset.armed; t.textContent = 'ลบโปรไฟล์นี้'; } }, 4000);
      return;
    }
    if (t.hasAttribute('data-kanji')) return kanjiSheet(t.getAttribute('data-kanji'));
    if (t.hasAttribute('data-close')) return closeSheet();
    if (t.hasAttribute('data-go')) { location.hash = t.getAttribute('data-go'); return; }
    if (t.hasAttribute('data-opt') && Q) {
      var q = Q.qs[Q.i], o = q.opts[+t.getAttribute('data-opt')];
      if (Q.locked) return;
      $$('.qopt').forEach(function (b, i) { var oo = q.opts[i]; b.classList.add(oo.correct ? 'ok' : (b === t ? 'bad' : 'dim')); });
      $('#qopts').classList.add('locked');
      return answerQ(o.correct);
    }
    if (t.id === 'qnext' && Q) { Q.i++; return renderQ(); }
    if (t.hasAttribute('data-retry')) { if (Q && Q.drill) return route(); return route(); }
    if (t.hasAttribute('data-grade')) return grade(+t.getAttribute('data-grade'));
    if (t.id === 'flash' && R && !R.flipped) { R.flipped = true; return renderCard(); }
    if (t.hasAttribute('data-add-lesson')) { var n = addCards(lessonCardIds(SID[t.getAttribute('data-add-lesson')].lesson)); toast(n ? 'เพิ่ม ' + n + ' ใบเข้ากองทบทวนแล้ว' : 'อยู่ในกองทบทวนครบแล้ว'); return route(); }
    if (t.hasAttribute('data-add-word')) {
      addCards([t.getAttribute('data-add-word')]);
      var sp = document.createElement('span'); sp.className = 'icon-btn in-srs'; sp.title = 'อยู่ในกองทบทวนแล้ว'; sp.innerHTML = icon('check'); t.replaceWith(sp);
      toast('เพิ่มเข้ากองทบทวนแล้ว'); return;
    }
    if (t.hasAttribute('data-add-set')) {
      var nn = addCards(t.getAttribute('data-add-set').split(','));
      toast(nn ? 'เพิ่ม ' + nn + ' ใบเข้ากองทบทวนแล้ว' : 'อยู่ในกองทบทวนครบแล้ว');
      t.disabled = true; if (!$('#quizBox')) route(); return;
    }
    if (t.id === 'wmore') { if (WB) { WB.limit += 100; renderWordList(); } return; }
    if (t.hasAttribute('data-add-card')) { addCards([t.getAttribute('data-add-card')]); toast('เพิ่มเข้ากองทบทวนแล้ว'); var ch = t.getAttribute('data-add-card').slice(2); kanjiSheet(ch); var tile = $('[data-kanji="' + ch + '"]'); if (tile) tile.classList.add('learned'); return; }
    if (t.hasAttribute('data-read-done')) { var id = t.getAttribute('data-read-done'); if (!isDone(id)) { markDone(id, 100); addXP(15); } toast('ได้ตราประทับสถานีอ่านแล้ว'); return route(); }
    if (t.hasAttribute('data-theme-set')) { setTheme(t.getAttribute('data-theme-set')); return route(); }
    if (t.hasAttribute('data-goal')) { S.settings.goal = +t.getAttribute('data-goal'); save(); return route(); }
    if (t.id === 'exp') {
      var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'epicjapanese-' + dayKey() + '.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); return;
    }
    if (t.id === 'reset') {
      if (t.dataset.armed) { S = defaults(); save(); toast('ล้างความคืบหน้าแล้ว'); location.hash = '#/'; return; }
      t.dataset.armed = '1'; t.textContent = 'กดอีกครั้งเพื่อยืนยัน'; setTimeout(function () { if (t.isConnected) { delete t.dataset.armed; t.textContent = 'ล้างความคืบหน้าทั้งหมด'; } }, 4000);
    }
  });

  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-reload]'); if (a && location.hash === a.getAttribute('href')) { e.preventDefault(); route(); } });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-set')) {
      var k = t.getAttribute('data-set');
      S.settings[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; save();
      if (t.type === 'range') return;
      if (k === 'romaji' || k === 'furigana' || k === 'pitch') return route();
      return;
    }
    if (t.id === 'rdTh') $$('.rd-th').forEach(function (x) { x.classList.toggle('hide', !t.checked); });
    if (t.id === 'rdR') $$('.rd-r').forEach(function (x) { x.classList.toggle('hide', !t.checked); });
    if (t.id === 'imp' && t.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try { var d = JSON.parse(fr.result); if (d.v !== 1) throw 0; S = normData(d); save(); toast('นำเข้าความคืบหน้าแล้ว'); route(); }
        catch (err) { toast('ไฟล์ไม่ถูกต้อง'); }
      };
      fr.readAsText(t.files[0]);
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.type === 'range' && t.getAttribute('data-set') === 'rate') { S.settings.rate = +t.value; $('#rateV').textContent = (+t.value).toFixed(2) + '×'; save(); }
  });
  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
  function colorOf(f, dflt) { var c = $('input[name=color]:checked', f); return c ? +c.value : dflt; }
  function onNet(f) {
    return function (err) {
      console.error(err);
      var m = String(err && err.message || err), code = (/"code"\s*:\s*"([^"]+)"/.exec(m) || [])[1];
      var why = /Failed to fetch|NetworkError|Load failed/i.test(m) ? 'network' : (/PERMISSION_DENIED/.test(m) ? 'ฐานข้อมูลไม่อนุญาต ตรวจกฎใน Firestore Rules' : null);
      formErr(f, why || 'network');
      if (why !== 'network') { var e = $('.form-err', f); e.textContent += ' · รายละเอียด: ' + m.slice(0, 180); }
    };
  }
  document.addEventListener('submit', function (e) {
    var f = e.target;
    var ids = ['lgPin', 'lgLogin', 'lgSignup', 'accRelogin', 'accUpgrade', 'accName', 'accPin', 'accPass', 'accDelete'];
    if (ids.indexOf(f.id) < 0) return;
    e.preventDefault();
    var p = me();
    if (f.id === 'lgPin') {
      var pp = profile(LG.id);
      hashPin(val('pinIn').trim(), pp.salt).then(function (h) {
        if (h === pp.pin) return useProfile(pp.id);
        $('#pinIn').value = ''; formErr(f, 'PIN ไม่ถูกต้อง ลองอีกครั้ง');
      });
      return;
    }
    if (f.id === 'lgLogin') {
      formBusy(f, true, 'กำลังเข้าสู่ระบบ…');
      rpc('ej_login', { p_username: val('liUser'), p_password: val('liPass') }).then(function (r) {
        if (r.error) return formErr(f, r.error);
        var known = profile('u:' + r.username), local = known ? (function () { try { return JSON.parse(localStorage.getItem(dataKey(known.id))); } catch (x) { return null; } })() : null;
        var server = normData(r.data);
        var dirtyLocal = !!(known && known.dirty && local);
        adoptCloud(r, null, dirtyLocal ? mergeData(local, server) : server, dirtyLocal);
        toast('ยินดีต้อนรับ ' + r.username);
      }, onNet(f));
      return;
    }
    if (f.id === 'lgSignup' || f.id === 'accUpgrade') {
      if (val('suPass') !== val('suPass2')) return formErr(f, 'mismatch');
      var data;
      if (f.id === 'accUpgrade') data = S;
      else if ($('#migIn') && $('#migIn').checked) { try { data = normData(JSON.parse(localStorage.getItem(GUEST_KEY))); } catch (x) { data = defaults(); } }
      else data = defaults();
      var color = f.id === 'accUpgrade' ? (p.color || 0) : colorOf(f, 0), oldLocal = f.id === 'accUpgrade' ? p : null, pinMeta = oldLocal && oldLocal.pin ? { pin: oldLocal.pin, salt: oldLocal.salt } : null;
      formBusy(f, true, 'กำลังสมัคร…');
      rpc('ej_signup', { p_username: val('suUser'), p_password: val('suPass'), p_data: data }).then(function (r) {
        if (r.error) return formErr(f, r.error);
        if (f.id === 'lgSignup' && $('#migIn') && $('#migIn').checked) { try { localStorage.removeItem(GUEST_KEY); } catch (x) { /* ignore */ } }
        if (oldLocal) forget(oldLocal);
        var np = adoptCloud(r, color, data, false);
        if (pinMeta) { np.pin = pinMeta.pin; np.salt = pinMeta.salt; accSave(); }
        toast('สมัครบัญชีแล้ว จำชื่อผู้ใช้กับรหัสผ่านไว้ใช้เข้าเครื่องอื่น');
      }, onNet(f));
      return;
    }
    if (f.id === 'accRelogin') {
      formBusy(f, true, 'กำลังเข้าสู่ระบบ…');
      rpc('ej_login', { p_username: p.user, p_password: val('rePass') }).then(function (r) {
        if (r.error) return formErr(f, r.error);
        p.token = r.token; p.base = r.updated_at;
        S = mergeData(S, r.data); p.dirty = true; storeLocal(); accSave();
        toast('เข้าสู่ระบบแล้ว'); route(); push();
      }, onNet(f));
      return;
    }
    if (f.id === 'accName') {
      if (!isCloud(p)) { var nm = val('accNm').trim().slice(0, 20); if (!nm) return; p.name = nm; }
      p.color = colorOf(f, p.color || 0); accSave(); toast('บันทึกแล้ว'); return route();
    }
    if (f.id === 'accPin') {
      var np2 = val('accPinIn').trim();
      if (!/^[0-9]{4,6}$/.test(np2)) return formErr(f, 'PIN ต้องเป็นตัวเลข 4 ถึง 6 หลัก');
      if (!p.salt) p.salt = newId();
      hashPin(np2, p.salt).then(function (h) { p.pin = h; accSave(); toast('ตั้ง PIN แล้ว'); route(); });
      return;
    }
    if (f.id === 'accPass') {
      formBusy(f, true, 'กำลังเปลี่ยน…');
      rpc('ej_change_password', { p_token: p.token, p_user: p.user, p_old: val('cpOld'), p_new: val('cpNew') }).then(function (r) {
        if (r.error === 'bad_login') return formErr(f, 'รหัสผ่านเดิมไม่ถูกต้อง');
        if (r.error) return formErr(f, r.error);
        toast('เปลี่ยนรหัสผ่านแล้ว'); route();
      }, onNet(f));
      return;
    }
    if (f.id === 'accDelete') {
      formBusy(f, true, 'กำลังลบ…');
      rpc('ej_delete', { p_token: p.token, p_user: p.user, p_password: val('delPass') }).then(function (r) {
        if (r.error === 'bad_login') return formErr(f, 'รหัสผ่านไม่ถูกต้อง');
        if (r.error) return formErr(f, r.error);
        forget(p); toast('ลบบัญชี ' + p.name + ' แล้ว'); LG = { mode: null }; signOutView();
      }, onNet(f));
    }
  });
  window.addEventListener('online', function () { push(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); else pull(true); });
  window.addEventListener('pagehide', flush);
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'qtype' || !Q) return;
    e.preventDefault();
    if (Q.locked) { Q.i++; return renderQ(); }
    var q = Q.qs[Q.i], inp = $('#qin'), v = inp.value.trim().toLowerCase();
    if (!v) return;
    var v2 = toHira(v).replace(/[\s'～〜]/g, ''), ok = q.accept.indexOf(v) > -1 || q.accept.indexOf(v2) > -1 || q.accept.indexOf(v.replace(/[\s'-]/g, '')) > -1;
    inp.classList.add(ok ? 'ok' : 'bad'); inp.readOnly = true; e.target.classList.add('done');
    answerQ(ok);
  });

  var sideT;
  $('#sideSearch').addEventListener('input', function (e) {
    var v = e.target.value; clearTimeout(sideT);
    sideT = setTimeout(function () {
      if (location.hash.indexOf('#/search') === 0 && $('#searchOut')) { $('#pageSearch').value = v; $('#searchOut').innerHTML = searchResults(v); history.replaceState(null, '', '#/search/' + encodeURIComponent(v)); }
      else location.hash = '#/search/' + encodeURIComponent(v);
    }, 160);
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (e.key === 'Escape') { closeSheet(); if (typing) e.target.blur(); return; }
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); var s = $('#sideSearch'); if (s.offsetParent) s.focus(); else location.hash = '#/search/'; return; }
    if (Q && $('#quizBox')) {
      if (/^[1-4]$/.test(e.key) && !Q.locked) { var b = $('[data-opt="' + (+e.key - 1) + '"]'); if (b) b.click(); }
      else if (e.key === 'Enter' && Q.locked) { var nb = $('#qnext'); if (nb && document.activeElement !== nb) { e.preventDefault(); nb.click(); } }
    }
    if (R && $('#revBox')) {
      if ((e.key === ' ' || e.key === 'Enter') && !R.flipped) { e.preventDefault(); R.flipped = true; renderCard(); }
      else if (/^[1-4]$/.test(e.key) && R.flipped) grade(+e.key);
    }
  });

  safeRoute();
  window.__ejReady = true;
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();

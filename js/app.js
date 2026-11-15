/* Epic Japanese — แอปหน้าเดียว ไม่ต้อง build เปิดจากไฟล์หรือ GitHub Pages ได้ทันที
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
      (ls.grammar || []).forEach(function (g) { GRAMMAR.push(Object.assign({ level: lv, lesson: ls }, g)); });
      (ls.kana || []).forEach(function (k) { KANA_ALL.push({ ch: k[0], ro: k[1], lesson: ls }); });
    });
    add({ id: lv.id + '-read', kind: 'reading', title: 'อ่าน · ' + lv.reading.title, jp: lv.id === 'kana' ? '看板' : '読解' });
    add({ id: lv.id + '-exam', kind: 'exam', title: 'สอบท้าย' + lv.title, jp: '試験' });
  });

  /* ================= store ================= */
  var KEY = 'epicjapanese:v1';
  function defaults() {
    return { v: 1, created: dayKey(), done: {}, srs: {}, days: {}, stats: { answered: 0, correct: 0, written: 0, reviews: 0 },
      settings: { goal: 30, rate: 0.9, romaji: true, furigana: true, voice: '' } };
  }
  function load() {
    var d = defaults();
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) {
        Object.keys(d).forEach(function (k) {
          if (s[k] === undefined) return;
          d[k] = (typeof d[k] === 'object' && !Array.isArray(d[k])) ? Object.assign(d[k], s[k]) : s[k];
        });
      }
    } catch (e) { /* storage unavailable */ }
    return d;
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

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
    return (ls.vocab || []).map(function (v) { return 'v:' + v[0] + '|' + v[1]; }).concat((ls.kanji || []).map(function (k) { return 'k:' + k[0]; }));
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
  function speak(text) {
    if (!('speechSynthesis' in window)) { toast('เบราว์เซอร์นี้ไม่รองรับเสียงอ่าน'); return; }
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(String(text).replace(/\s+/g, ''));
    u.lang = 'ja-JP'; u.rate = S.settings.rate;
    var v = VOICES.filter(function (x) { return x.name === S.settings.voice; })[0] || VOICES[0];
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  function sayBtn(text, label) { return '<button class="icon-btn" data-say="' + esc(text) + '" aria-label="' + esc(label || 'ฟังเสียง') + '">' + icon('sound') + '</button>'; }

  /* ================= chrome ================= */
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 2200); }
  function chrome() {
    var due = dueIds().length, dc = $('#dueCount');
    dc.textContent = due ? due : '';
    dc.classList.toggle('due', due > 0);
    var x = xpToday(), g = S.settings.goal;
    $('#sideToday').innerHTML =
      '<div class="row"><span>วันนี้</span><span class="mono">' + x + ' / ' + g + ' XP</span></div>' +
      '<div class="bar red"><i style="transform:scaleX(' + Math.min(1, x / g) + ')"></i></div>' +
      '<div class="row" style="margin-top:8px"><span>ต่อเนื่อง</span><span class="mono">' + streak() + ' วัน</span></div>';
  }
  function setNav(name) { $$('[data-nav]').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === name); }); }
  function openSheet(html) {
    var w = $('#sheet'); w.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>'; w.hidden = false;
    var f = $('.sheet button, .sheet a', w); if (f) f.focus();
  }
  function closeSheet() { var w = $('#sheet'); w.hidden = true; w.innerHTML = ''; }

  /* ================= router ================= */
  var mounted = null, lastBase = '';
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/').map(function (p) { try { return decodeURIComponent(p); } catch (e) { return p; } });
    var a = parts[0] || '', r;
    if (mounted && mounted.destroy) mounted.destroy();
    closeSheet();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    switch (a) {
      case '': r = viewMap(); setNav('map'); break;
      case 'lesson': r = SID[parts[1]] ? viewLesson(SID[parts[1]], parts[2] || 'intro') : viewMissing(); setNav('map'); break;
      case 'read': r = SID[parts[1] + '-read'] ? viewReading(SID[parts[1] + '-read']) : viewMissing(); setNav('map'); break;
      case 'quiz': r = SID[parts[1]] ? viewQuiz(SID[parts[1]]) : viewMissing(); setNav('map'); break;
      case 'review': r = viewReview(); setNav('review'); break;
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
    var base = a + '/' + (parts[1] || '');
    if (base !== lastBase) { window.scrollTo(0, 0); lastBase = base; }
    chrome();
  }
  function showError(err) {
    view.insertAdjacentHTML('afterbegin', '<div class="card pad" style="margin-bottom:16px;border-color:var(--neg)"><div class="h3">เกิดข้อผิดพลาด</div><p class="soft mono" style="font-size:12px;margin-top:4px">' + esc(err && (err.message || err)) + '</p><p class="soft" style="font-size:13px;margin-top:8px">ลองกด Ctrl+F5 เพื่อโหลดหน้าใหม่ ถ้ายังไม่หายส่งข้อความนี้ให้ผู้ดูแลเว็บ</p></div>');
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
      return levelDone(lv) ? '<span class="hanko" style="width:40px;height:40px" title="จบ' + esc(lv.title) + '">' + esc(lv.code === 'K' ? 'かな' : lv.code) + '</span>'
        : '<span class="slot">' + esc(lv.code === 'K' ? 'かな' : lv.code) + '</span>';
    }).join('');
    var where = cur ? ('<b>' + esc(cur.level.title) + '</b> · สถานี ' + cur.code + ' ' + esc(cur.title)) : '<b>ถึงสถานีปลายทาง N1 แล้ว</b>';

    var html =
      '<div class="page">' +
        '<div class="eyebrow">ศูนย์ ถึง N1 · ' + LEVELS.length + ' สาย ' + total + ' สถานี</div>' +
        '<h1 class="title">แผนที่การเรียน</h1>' +
        '<p class="lead">นั่งไปทีละสถานี ผ่านแบบทดสอบท้ายบทได้ 80% ขึ้นไปจะได้ตราประทับ ครบทุกสถานีในสายแล้วค่อยต่อสายถัดไป</p>' +

        '<div class="split" style="margin-top:32px">' +
          '<div class="ticket">' +
            '<div class="ticket-top"><span class="jp">乗車券</span><span>Epic Japanese</span></div>' +
            '<div class="ticket-route"><div class="stn">ゼロ<small>เริ่มจากศูนย์</small></div><div class="arrow"></div><div class="stn">N1<small>สถานีปลายทาง</small></div></div>' +
            '<div class="ticket-now">ตอนนี้อยู่ ' + where + '</div>' +
            '<div class="ticket-stamps">' + stamps + '</div>' +
            '<div class="ticket-meta"><span>ผ่านแล้ว ' + dc + ' / ' + total + ' สถานี</span><span>ออกตั๋ว ' + S.created + '</span></div>' +
          '</div>' +

          '<div class="card pad today">' +
            '<div class="today-row">' +
              '<div><div class="stat-label">XP วันนี้</div><div class="big-num">' + x + '<small>/ ' + g + '</small></div></div>' +
              '<div><div class="stat-label">ต่อเนื่อง</div><div class="big-num">' + streak() + '<small>วัน</small></div></div>' +
              '<div><div class="stat-label">การ์ดถึงกำหนด</div><div class="big-num">' + due + '<small>ใบ</small></div></div>' +
            '</div>' +
            '<div class="bar red"><i style="transform:scaleX(' + Math.min(1, x / g) + ')"></i></div>' +
            '<div class="hr" style="margin:0"></div>' +
            (cur ?
              '<div class="next-stop"><span class="line-chip" style="color:' + cur.level.color + '"><span>' + pad2(cur.num) + '</span></span>' +
              '<div class="txt"><div class="muted" style="font-size:13px">สถานีถัดไป · ' + cur.code + '</div><div class="h3">' + esc(cur.title) + '</div></div>' +
              '<a class="btn primary" href="' + stationHref(cur) + '">เรียนต่อ' + icon('arrow', 'i-sm') + '</a></div>'
              : '<div class="next-stop"><div class="txt"><div class="h3">ครบทุกสถานีแล้ว</div><div class="muted" style="font-size:13px">ทบทวนการ์ดทุกวันเพื่อรักษาความจำ</div></div></div>') +
            (due ? '<a class="btn" href="#/review">' + icon('layers', 'i-sm') + 'ทบทวน ' + due + ' ใบ</a>' : '') +
          '</div>' +
        '</div>' +

        '<section class="card mapcard"><div class="map" id="map"></div>' +
          '<div class="map-legend"><span><i class="lg-pin"></i>ยังไม่ผ่าน</span><span><i class="lg-pin f"></i>ผ่านแล้ว</span><span><i class="lg-pin x"></i>สอบท้ายสาย</span><span><span class="here-tag" style="font:500 11px/1 var(--jp);color:#fff;background:var(--accent);padding:3px 5px;border-radius:4px">現在地</span>อยู่ที่นี่</span></div>' +
        '</section>' +

        '<section class="section"><div class="section-head"><h2 class="h2">ทุกสาย</h2><span class="muted">ขอบเขตอ้างอิงจากข้อมูลทั่วไปของ JLPT ไม่ใช่รายการทางการ</span></div>' +
          '<div class="card">' + LEVELS.map(function (lv) {
            var c = levelCount(lv), n = lv.stations.length;
            return '<a class="list-row" href="' + stationHref(lv.stations.filter(function (s) { return !isDone(s.id); })[0] || lv.stations[0]) + '">' +
              '<span class="line-chip" style="color:' + lv.color + '"><span>' + esc(lv.code) + '</span></span>' +
              '<div class="grow"><div class="h3">' + esc(lv.title) + '</div><div class="muted" style="font-size:13px">' + esc(lv.desc) + '</div><div class="muted" style="font-size:12px;margin-top:2px">' + esc(lv.scope) + '</div></div>' +
              '<span class="meta">' + c + '/' + n + '</span>' + icon('right', 'muted') + '</a>';
          }).join('') + '</div></section>' +
      '</div>';

    var onR;
    return {
      html: html,
      mount: function () { drawMap(); var t; onR = function () { clearTimeout(t); t = setTimeout(drawMap, 120); }; window.addEventListener('resize', onR); },
      destroy: function () { window.removeEventListener('resize', onR); }
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
      svg.push('<path class="track" stroke="' + lv.color + '" d="' + d + '"/>');
      if (i < pts.length - 1) {
        var a = row[row.length - 1], b = pts[i + 1][0], out = (i % 2 === 0) ? 1 : -1, ox = a.x + out * R * 0.75;
        svg.push('<path class="track" stroke="' + rows[i + 1].lv.color + '" d="M' + a.x + ' ' + a.y + ' C' + ox + ' ' + a.y + ' ' + ox + ' ' + b.y + ' ' + b.x + ' ' + b.y + '"/>');
      }
      var first = row[0], rtl = i % 2 === 1, c = levelCount(lv);
      if (rows[i].first) nodes.push('<div class="line-name' + (rtl ? ' rtl' : '') + '" style="top:' + (first.y - 46) + 'px;' + (rtl ? 'right:' + (W - first.x - 10) + 'px' : 'left:' + (first.x - 10) + 'px') + '">' +
        '<span class="dot" style="background:' + lv.color + '"></span><b>' + esc(lv.title) + '</b><span class="pc">' + c + '/' + lv.stations.length + '</span></div>');
      row.forEach(function (p) {
        var st = p.st, here = cur && cur.id === st.id, w = Math.max(72, Math.min(112, p.step - 8));
        var edge = Math.abs(p.x - (W - padX)) < 1 ? ' edge-r' : Math.abs(p.x - padX) < 1 ? ' edge-l' : '';
        if (edge) w = Math.min(w, Math.round(p.step - w / 2 + 4));
        nodes.push('<a class="stop ' + st.kind + edge + (isDone(st.id) ? ' done' : '') + (here ? ' here' : '') + '" href="' + stationHref(st) + '" style="left:' + p.x + 'px;top:' + p.y + 'px;--c:' + lv.color + ';--w:' + w + 'px" aria-label="' + esc(st.code + ' ' + st.title + (isDone(st.id) ? ' ผ่านแล้ว' : '')) + '">' +
          (here ? '<span class="here-tag">現在地</span>' : '') + '<span class="code">' + st.code + '</span><span class="pin">' + pinInner(st) + '</span><span class="name">' + esc(st.kind === 'exam' ? 'สอบท้ายสาย' : st.title) + '</span></a>');
      });
    });
    var H = top + (rows.length - 1) * rowH + 60;
    el.style.height = H + 'px';
    el.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' + svg.join('') + '</svg>' + nodes.join('');
  }
  function vmapHTML(cur) {
    return '<div class="vmap">' + LEVELS.map(function (lv) {
      var n = lv.stations.length;
      return '<div class="vline-head"><span class="line-chip" style="color:' + lv.color + '"><span>' + esc(lv.code) + '</span></span><div class="t"><b>' + esc(lv.title) + '</b><small>' + levelCount(lv) + '/' + n + ' สถานี</small></div></div>' +
        lv.stations.map(function (st, j) {
          var here = cur && cur.id === st.id;
          return '<a class="vstop ' + st.kind + (isDone(st.id) ? ' done' : '') + (here ? ' here' : '') + (j === 0 ? ' first' : '') + (j === n - 1 ? ' last' : '') + '" href="' + stationHref(st) + '" style="--c:' + lv.color + '">' +
            '<span class="pin">' + pinInner(st) + '</span><span class="txt"><b>' + esc(st.title) + '</b><small>' + st.code + ' · ' + esc(st.jp) + '</small></span>' + (here ? '<span class="here-tag">現在地</span>' : '') + '</a>';
        }).join('');
    }).join('') + '</div>';
  }

  /* ================= lesson ================= */
  function stationHead(st, extra) {
    var lv = st.level, d = S.done[st.id];
    return '<div class="eyebrow"><a href="#/">แผนที่</a>' + icon('right', 'i-sm') + '<span>' + esc(lv.title) + '</span>' + icon('right', 'i-sm') + '<span class="mono">' + st.code + '</span></div>' +
      '<div class="lesson-head" style="margin-top:16px;--c:' + lv.color + '">' +
        '<span class="badge' + (st.kind === 'exam' ? ' exam' : '') + '">' + pad2(st.num) + '</span>' +
        '<div class="grow"><h1 class="title" style="margin:0">' + esc(st.title) + '<span class="jp">' + esc(st.jp) + '</span></h1>' + (extra || '') + '</div>' +
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
        (ls.tips ? '<ul class="tips" style="--c:' + lv.color + '">' + ls.tips.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +
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
        return '<a href="#/lesson/' + st.id + '/' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + (t[2] ? ' <span class="mono">' + t[2] + '</span>' : '') + '</a>';
      }).join('') + '</nav>' + body +
      (nx ? '<div class="row-actions" style="margin-top:32px;justify-content:flex-end"><a class="btn primary" href="#/lesson/' + st.id + '/' + nx[0] + '">ต่อไป · ' + nx[1] + icon('arrow', 'i-sm') + '</a></div>' : '') +
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
      (showLevel ? '<div class="muted mono" style="font-size:12px;margin-bottom:4px"><span class="dot" style="background:' + g.level.color + ';margin-right:8px"></span>' + esc(g.level.code) + ' · ' + esc(g.lesson.title) + '</div>' : '') +
      '<div class="pat">' + esc(g.p) + '</div><div class="mean">' + esc(g.m) + '</div>' +
      '<div class="ex">' + sayBtn(g.ex, 'ฟังประโยค') + '<div class="body"><div class="s">' + esc(g.ex) + '</div>' + rRow + '<div class="th">' + esc(g.th) + '</div></div></div>' +
      (g.note ? '<div class="note">' + esc(g.note) + '</div>' : '') + '</div>';
  }
  function kanjiTiles(list) {
    return '<div class="ktiles">' + list.map(function (c) {
      return '<button class="ktile' + (S.srs[c.id] ? ' learned' : '') + '" data-kanji="' + esc(c.k) + '"><span class="ch">' + esc(c.k) + '</span><span class="mn">' + esc(c.m) + '</span></button>';
    }).join('') + '</div>';
  }
  function kanjiSheet(ch) {
    var c = CARD['k:' + ch]; if (!c) return;
    openSheet('<div class="sheet-head"><span class="muted mono" style="font-size:12px"><span class="dot" style="background:' + c.level.color + ';margin-right:8px"></span>' + esc(c.level.code) + ' · ' + esc(c.lesson.title) + '</span><button class="icon-btn" data-close aria-label="ปิด">' + icon('x') + '</button></div>' +
      '<div class="kdetail"><div class="kbox">' + esc(c.k) + '</div><div>' +
        '<div class="h2">' + esc(c.m) + '</div>' +
        '<dl class="dl" style="margin-top:16px"><dt>อง</dt><dd class="jp">' + esc(c.on) + '</dd><dt>คุน</dt><dd class="jp">' + esc(c.kun) + '</dd><dt>ตัวอย่าง</dt><dd><span class="jp" style="font-size:18px">' + furi(c.exw, c.exr) + '</span> <span class="muted">' + esc(c.exm) + '</span></dd></dl>' +
        '<div class="row-actions" style="margin-top:20px">' + sayBtn(c.exr, 'ฟังคำตัวอย่าง') +
          '<a class="btn sm" href="#/write/kanji/' + encodeURIComponent(c.k) + '">' + icon('pen', 'i-sm') + 'ฝึกเขียน</a>' +
          (S.srs[c.id] ? '<span class="tag">อยู่ในกองทบทวน</span>' : '<button class="btn sm" data-add-card="' + esc(c.id) + '">' + icon('plus', 'i-sm') + 'เพิ่มเข้ากองทบทวน</button>') +
        '</div></div></div>');
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
          (l[2] ? '<div class="r rd-r">' + esc(l[2]) + (ro ? ' · <span class="mono">' + esc(romaji(l[2])) + '</span>' : '') + '</div>' : '') +
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
      '<div class="eyebrow"><a href="#/">แผนที่</a>' + icon('right', 'i-sm') + '<span>' + esc(st.level.title) + '</span>' + icon('right', 'i-sm') + '<a href="' + (st.kind === 'exam' ? '#/' : '#/lesson/' + st.id) + '" class="mono">' + st.code + '</a></div>' +
      '<h1 class="title" style="font-size:24px">' + (st.kind === 'exam' ? esc(st.title) : 'แบบทดสอบ · ' + esc(st.title)) + '</h1>' +
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
      : '<form class="qtype" id="qtype" autocomplete="off"><input class="input" id="qin" placeholder="เช่น ka" autocapitalize="off" spellcheck="false" aria-label="คำตอบ"><button class="btn primary lg">ตรวจ</button></form>';
    box.innerHTML =
      '<div class="quiz-top" style="margin-top:20px"><div class="bar"><i style="transform:scaleX(' + (Q.i / n) + ')"></i></div><span class="mono muted" style="font-size:12px">' + (Q.i + 1) + ' / ' + n + '</span></div>' +
      '<div class="card qcard"><div class="qkind">' + esc(q.kind) + '</div>' +
        '<div class="qprompt ' + (q.pcls === 'th' ? 'th' : q.pcls === 'hand' ? 'hand' : q.pcls === 'sentence' ? 'sentence' : '') + '">' + esc(q.prompt) + '</div>' +
        (q.say && q.pcls !== 'th' ? '<div>' + sayBtn(q.say) + '</div>' : '') +
        opts + '<div class="qfeed" id="qfeed"></div></div>';
    var inp = $('#qin'); if (inp) inp.focus();
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
    $('#qfeed').innerHTML = '<div class="msg ' + (correct ? 'ok' : 'bad') + '"><b>' + (correct ? 'ถูกต้อง' : 'ยังไม่ใช่') + '</b>' + (correct ? '' : ' · คำตอบคือ <span class="jp">' + esc(q.answer) + '</span>') + '</div>' +
      '<button class="btn primary" id="qnext">' + (last ? 'ดูผล' : 'ข้อต่อไป') + ' <span class="key" style="background:transparent;color:inherit;border-color:rgba(253,251,247,.35)">↵</span></button>';
    $('#qnext').focus();
  }
  function renderResult() {
    var st = Q.st, n = Q.qs.length, sc = Q.right / n, pass = sc >= 0.8, nx = nextOf(st), pct = Math.round(sc * 100);
    var first = !isDone(st.id), added = 0;
    if (pass) {
      markDone(st.id, pct);
      if (first) addXP(st.kind === 'exam' ? 80 : 30);
      if (st.lesson) added = addCards(lessonCardIds(st.lesson));
    }
    var stampText = st.kind === 'exam' ? (st.level.code === 'K' ? 'かな' : st.level.code) : '合格';
    $('#quizBox').innerHTML = '<div class="card result" style="margin-top:24px">' +
      (pass ? '<span class="hanko lg stamp-in">' + esc(stampText) + '<small>' + st.code + '</small></span>' : '') +
      '<div class="score">' + Q.right + '<span class="muted" style="font-size:24px"> / ' + n + '</span></div>' +
      '<p class="lead" style="margin:12px auto 0">' + (pass
        ? (st.kind === 'exam' ? 'ผ่าน' + esc(st.level.title) + 'แล้ว ได้ตราประทับประจำสายบนตั๋ว' : 'ผ่านสถานีนี้แล้ว') + (added ? ' เพิ่มการ์ด ' + added + ' ใบเข้ากองทบทวน' : '')
        : 'ได้ ' + pct + '% ต้องได้ 80% ขึ้นไปจึงจะผ่าน ลองทบทวนข้อที่พลาดแล้วทำใหม่') + '</p>' +
      '<div class="row-actions" style="justify-content:center;margin-top:24px">' +
        (pass && nx ? '<a class="btn primary" href="' + stationHref(nx) + '">สถานีถัดไป · ' + esc(nx.title) + icon('arrow', 'i-sm') + '</a>' : '') +
        '<button class="btn" data-retry>' + icon('redo', 'i-sm') + 'ทำอีกครั้ง</button>' +
        (st.kind !== 'exam' ? '<a class="btn ghost" href="#/lesson/' + st.id + '">กลับไปทบทวนบท</a>' : '<a class="btn ghost" href="#/">กลับแผนที่</a>') +
      '</div>' +
      (Q.miss.length ? '<div class="miss"><div class="h3">ข้อที่พลาด</div><ul style="list-style:none;padding:0;margin:8px 0 0">' + Q.miss.map(function (q) {
        return '<li><span class="jp">' + esc(q.prompt) + '</span><span class="soft jp">' + esc(q.answer) + '</span></li>';
      }).join('') + '</ul></div>' : '') +
    '</div>';
  }

  /* ================= review (SRS) ================= */
  var R = null;
  function viewReview() {
    var ids = shuffle(dueIds()), total = Object.keys(S.srs).length;
    R = { ids: ids, i: 0, flipped: false, done: 0, n: ids.length };
    var html = '<div class="page"><div class="quiz">' +
      '<div class="eyebrow">ทบทวนแบบเว้นระยะ</div><h1 class="title">ทบทวน</h1>' +
      '<p class="lead">ทุกใบจะกลับมาก่อนที่คุณจะลืม ตอบตามจริงว่าจำได้แค่ไหน ระบบจะเลื่อนรอบถัดไปให้เอง</p>' +
      '<div id="revBox"></div></div></div>';
    return { html: html, mount: function () { renderCard(total); }, destroy: function () { R = null; } };
  }
  function cardFront(c) { return c.type === 'k' ? c.k : c.w; }
  function renderCard(total) {
    var box = $('#revBox'); if (!box || !R) return;
    if (R.i >= R.ids.length) {
      var t = dayNum(), upcoming = Object.keys(S.srs).map(function (id) { return S.srs[id].due; }).filter(function (d) { return d > t; }).sort(function (a, b) { return a - b; });
      var nextTxt = upcoming.length ? 'รอบถัดไป ' + thDate(keyOf(upcoming[0])) + ' · ' + upcoming.filter(function (d) { return d === upcoming[0]; }).length + ' ใบ' : '';
      var cur = current();
      box.innerHTML = '<div class="card empty" style="margin-top:24px">' +
        (R.done ? '<div class="h2">ทบทวนครบ ' + R.done + ' ใบแล้ว</div>' : '<div class="h2">' + ((total || Object.keys(S.srs).length) ? 'ยังไม่มีการ์ดถึงกำหนด' : 'กองทบทวนยังว่างอยู่') + '</div>') +
        '<p>' + ((total || Object.keys(S.srs).length) ? esc(nextTxt) : 'ผ่านแบบทดสอบบทเรียนแล้วคำศัพท์และคันจิของบทนั้นจะเข้ามาที่นี่อัตโนมัติ') + '</p>' +
        '<div class="row-actions">' + (cur ? '<a class="btn primary" href="' + stationHref(cur) + '">เรียนสถานีถัดไป</a>' : '') + '<a class="btn" href="#/">กลับแผนที่</a></div></div>';
      return;
    }
    var id = R.ids[R.i], c = CARD[id], s = S.srs[id], f = cardFront(c), ro = S.settings.romaji;
    var back = c.type === 'k'
      ? '<div class="me">' + esc(c.m) + '</div><div class="rd">' + esc(c.on) + ' · ' + esc(c.kun) + '</div><div class="ex"><span class="jp">' + esc(c.exw) + '（' + esc(c.exr) + '）</span> ' + esc(c.exm) + '</div>'
      : '<div class="rd">' + esc(c.r) + '</div>' + (ro ? '<div class="ro">' + esc(romaji(c.r)) + '</div>' : '') + '<div class="me">' + esc(c.m) + '</div>';
    box.innerHTML =
      '<div class="quiz-top" style="margin-top:24px"><div class="bar"><i style="transform:scaleX(' + (R.done / Math.max(1, R.n)) + ')"></i></div><span class="mono muted" style="font-size:12px">เหลือ ' + (R.ids.length - R.i) + '</span></div>' +
      '<div class="card flash" id="flash" role="button" tabindex="0" aria-label="พลิกการ์ด"><div class="front' + (f.length > 3 ? ' long' : '') + '">' + esc(f) + '</div>' +
        (R.flipped ? '<div class="back">' + back + '<div style="margin-top:8px">' + sayBtn(c.type === 'k' ? c.exr : c.r) + '</div></div>'
          : '<div class="hint">แตะการ์ดหรือกด <kbd>Space</kbd> เพื่อดูคำตอบ</div>') +
        '<div class="hint" style="margin-top:16px"><span class="dot" style="background:' + c.level.color + '"></span>' + esc(c.level.code) + ' · ' + esc(c.lesson.title) + '</div>' +
      '</div>' +
      (R.flipped ? '<div class="grades">' + [[1, 'ลืม', 'again'], [2, 'ยาก', ''], [3, 'จำได้', ''], [4, 'ง่าย', '']].map(function (g) {
        return '<button class="btn ' + g[2] + '" data-grade="' + g[0] + '">' + g[1] + '<small>' + ivlLabel(s, g[0]) + '</small></button>';
      }).join('') + '</div>' : '');
    if (R.flipped) speak(c.type === 'k' ? c.exr : c.r);
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
      '<div class="eyebrow">ตารางอ้างอิง</div><h1 class="title">ตารางคานะ</h1>' +
      '<p class="lead">แตะตัวอักษรเพื่อฟังเสียง เรียงตามลำดับ あいうえお แบบที่คนญี่ปุ่นใช้เรียงพจนานุกรม</p>' +
      '<div class="row-actions" style="margin-top:24px"><div class="seg"><button data-go="#/kana/hira" class="' + (set !== 'kata' ? 'on' : '') + '">ひらがな ฮิรางานะ</button><button data-go="#/kana/kata" class="' + (set === 'kata' ? 'on' : '') + '">カタカナ คาตาคานะ</button></div>' +
        '<a class="btn sm" href="#/drill/' + (set === 'kata' ? 'kata' : 'hira') + '">' + icon('play', 'i-sm') + 'ทดสอบด่วน 20 ข้อ</a>' +
        '<a class="btn sm ghost" href="#/write/' + (set === 'kata' ? 'kata' : 'hira') + '">' + icon('pen', 'i-sm') + 'ฝึกเขียน</a></div>' +
      '<div class="kana-cols" style="margin-top:32px"><div><div class="section-head"><h2 class="h2">เสียงพื้นฐาน</h2><span class="muted mono">46</span></div>' + kanaGrid(K.basic, 5) + '</div>' +
        '<div><div class="section-head"><h2 class="h2">เสียงขุ่น</h2><span class="muted mono">25</span></div>' + kanaGrid(K.voiced, 5) +
        '<div class="section-head" style="margin-top:32px"><h2 class="h2">เสียงควบ</h2><span class="muted mono">33</span></div>' + kanaGrid(chunk(K.yoon, 3), 3) +
        (set === 'kata' ? '<div class="section-head" style="margin-top:32px"><h2 class="h2">เสียงพิเศษสำหรับคำต่างประเทศ</h2><span class="muted mono">' + K.extra.length + '</span></div>' + kanaGrid(chunk(K.extra, 3), 3) : '') +
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
      html: '<div class="page"><div class="quiz"><div class="eyebrow"><a href="#/kana/' + set + '">ตารางคานะ</a></div><h1 class="title" style="font-size:24px">' + esc(fake.title) + '</h1><div id="quizBox"></div></div></div>',
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
    var counts = {}; KANJI.forEach(function (k) { counts[k.level.id] = (counts[k.level.id] || 0) + 1; });
    var learned = KANJI.filter(function (k) { return S.srs[k.id]; }).length;
    var groups = LEVELS.filter(function (l) { return counts[l.id] && (!lid || l.id === lid); });
    return '<div class="page"><div class="eyebrow">คลังคันจิ</div><h1 class="title">คันจิ</h1>' +
      '<p class="lead">ชุดเริ่มต้น ' + KANJI.length + ' ตัวที่ผูกกับบทเรียน อยู่ในกองทบทวนแล้ว ' + learned + ' ตัว</p>' +
      '<div style="margin-top:24px">' + levelFilter('kanji', lid, counts) + '</div>' +
      groups.map(function (lv) {
        return '<section class="section"><div class="section-head"><h2 class="h2"><span class="dot" style="background:' + lv.color + ';margin-right:10px"></span>' + esc(lv.title) + '</h2><span class="muted mono">' + counts[lv.id] + '</span></div>' +
          kanjiTiles(KANJI.filter(function (k) { return k.level === lv; })) + '</section>';
      }).join('') + '</div>';
  }
  function viewGrammar(lid) {
    var counts = {}; GRAMMAR.forEach(function (g) { counts[g.level.id] = (counts[g.level.id] || 0) + 1; });
    var list = GRAMMAR.filter(function (g) { return !lid || g.level.id === lid; });
    return '<div class="page page-narrow"><div class="eyebrow">คลังไวยากรณ์</div><h1 class="title">ไวยากรณ์</h1>' +
      '<p class="lead">' + GRAMMAR.length + ' รูปประโยคเรียงตามสายและสถานี พร้อมตัวอย่างและคำแปล</p>' +
      '<div class="row-actions" style="margin:24px 0 16px">' + levelFilter('grammar', lid, counts) + '</div>' +
      list.map(function (g) { return grammarCard(g, true); }).join('') + '</div>';
  }

  /* ================= search ================= */
  function searchResults(q) {
    q = q.trim().toLowerCase(); if (!q) return '<div class="card empty"><p>พิมพ์คำไทย ญี่ปุ่น หรือโรมาจิ เช่น "กิน" "たべる" "taberu"</p></div>';
    var hq = toHira(q);
    var v = VOCAB.filter(function (x) { return x.w.indexOf(q) > -1 || x.r.indexOf(hq) > -1 || x.m.toLowerCase().indexOf(q) > -1 || romaji(x.r).replace(/\s/g, '').indexOf(q.replace(/\s/g, '')) > -1; }).slice(0, 40);
    var k = KANJI.filter(function (x) { return x.k === q || x.m.indexOf(q) > -1 || x.on.indexOf(EJ.kana.toKata(hq)) > -1 || x.kun.indexOf(hq) > -1; }).slice(0, 24);
    var g = GRAMMAR.filter(function (x) { return x.p.indexOf(q) > -1 || x.m.indexOf(q) > -1 || x.ex.indexOf(q) > -1; }).slice(0, 20);
    if (!v.length && !k.length && !g.length) return '<div class="card empty"><div class="h2">ไม่พบ "' + esc(q) + '"</div><p>ลองคำสั้นลง หรือพิมพ์เป็นคานะ</p></div>';
    return (v.length ? '<section class="section" style="margin-top:24px"><div class="section-head"><h2 class="h2">คำศัพท์</h2><span class="muted mono">' + v.length + '</span></div><div class="card vlist">' + v.map(function (x) {
      return '<div class="vrow"><span class="w">' + furi(x.w, x.r) + '</span><span class="ro">' + esc(romaji(x.r)) + '</span><span class="me">' + esc(x.m) + ' <a class="muted mono" style="font-size:11px" href="#/lesson/' + x.lesson.id + '/vocab">' + esc(SID[x.lesson.id].code) + '</a></span>' + sayBtn(x.r) + '</div>';
    }).join('') + '</div></section>' : '') +
      (k.length ? '<section class="section"><div class="section-head"><h2 class="h2">คันจิ</h2><span class="muted mono">' + k.length + '</span></div>' + kanjiTiles(k) + '</section>' : '') +
      (g.length ? '<section class="section"><div class="section-head"><h2 class="h2">ไวยากรณ์</h2><span class="muted mono">' + g.length + '</span></div>' + g.map(function (x) { return grammarCard(x, true); }).join('') + '</section>' : '');
  }
  function viewSearch(q) {
    return {
      html: '<div class="page page-narrow"><div class="eyebrow">ค้นหา</div><h1 class="title">ค้นหาในบทเรียน</h1>' +
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
    var html = '<div class="page"><div class="eyebrow">กระดาษเก็นโคโยชิ</div><h1 class="title">ฝึกเขียน</h1>' +
      '<p class="lead">เขียนทับตัวแบบจาง ๆ ด้วยนิ้วหรือเมาส์ ตัวแบบใช้ฟอนต์ลายมือแบบหนังสือเรียน ดูรูปทรงและสัดส่วนของเส้นได้ชัด</p>' +
      '<div class="row-actions" style="margin:24px 0"><div class="seg">' + [['hira', 'ひらがな'], ['kata', 'カタカナ'], ['kanji', 'คันจิ']].map(function (s) {
        return '<button data-go="#/write/' + s[0] + '" class="' + (set === s[0] ? 'on' : '') + '">' + s[1] + '</button>';
      }).join('') + '</div></div>' +
      '<div class="write-wrap"><div><div class="paper" id="paper"><span class="gx"></span><span class="gy"></span><span class="guide" id="guide">' + esc(item.ch) + '</span><canvas id="cv"></canvas></div>' +
        '<div class="row-actions" style="margin-top:12px;justify-content:space-between">' +
          '<div class="row-actions"><button class="btn sm" id="wClear">' + icon('eraser', 'i-sm') + 'ล้าง</button><button class="btn sm ghost" id="wGuide">' + icon('eye', 'i-sm') + 'ซ่อนตัวแบบ</button></div>' +
          '<div class="row-actions"><button class="icon-btn" id="wPrev" aria-label="ตัวก่อนหน้า">' + icon('left') + '</button><button class="btn sm primary" id="wNext">เขียนแล้ว ตัวถัดไป</button></div></div></div>' +
        '<div class="write-info"><div class="card pad"><div class="row-actions" style="justify-content:space-between"><div><div class="ch">' + esc(item.ch) + '</div><div class="soft">' + esc(item.sub) + '</div></div>' + sayBtn(item.say) + '</div>' +
          '<div class="muted mono" style="font-size:12px;margin-top:16px">' + (idx + 1) + ' / ' + list.length + (set === 'kanji' && !KANJI.some(function (k) { return S.srs[k.id]; }) ? ' · ยังไม่มีคันจิในกองทบทวน จึงแสดงชุด N5' : '') + '</div>' +
          '<div class="chip-row">' + list.map(function (x, i) { return '<button data-go="#/write/' + set + '/' + encodeURIComponent(x.ch) + '" class="' + (i === idx ? 'on' : '') + '" aria-label="' + esc(x.ch) + '">' + esc(x.ch) + '</button>'; }).join('') + '</div>' +
        '</div><p class="muted" style="font-size:13px;margin-top:12px">เขียนไปแล้วทั้งหมด ' + fmt(S.stats.written) + ' ตัว</p></div></div></div>';

    function go(d) { var n = list[(idx + d + list.length) % list.length]; location.hash = '#/write/' + set + '/' + encodeURIComponent(n.ch); }
    return {
      html: html,
      mount: function () {
        var paper = $('#paper'), cv = $('#cv'), ctx = cv.getContext('2d'), drawing = false, last = null, inked = false;
        function size() {
          var r = paper.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
          cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1f1b16'; ctx.lineWidth = Math.max(6, r.width / 32);
          paper.style.setProperty('--s', r.width + 'px');
        }
        size();
        function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
        cv.addEventListener('pointerdown', function (e) { drawing = true; inked = true; last = pos(e); cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last.x, last.y, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = '#1f1b16'; ctx.fill(); });
        cv.addEventListener('pointermove', function (e) { if (!drawing) return; var p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) { cv.addEventListener(t, function () { drawing = false; }); });
        $('#wClear').onclick = function () { ctx.clearRect(0, 0, cv.width, cv.height); inked = false; };
        $('#wGuide').onclick = function () { var g = $('#guide'), off = g.style.opacity === '0'; g.style.opacity = off ? '1' : '0'; this.innerHTML = icon('eye', 'i-sm') + (off ? 'ซ่อนตัวแบบ' : 'แสดงตัวแบบ'); };
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
        var op = x <= 0 ? 0 : x >= g ? 1 : x >= g * .5 ? .7 : x >= g * .25 ? .45 : .25;
        cells += dn > t ? '<span class="c" style="visibility:hidden"></span>' : '<span class="c" title="' + thDate(k) + ' · ' + x + ' XP" style="' + (op ? 'background:rgba(184,57,28,' + op + ')' : '') + '"></span>';
      }
      cols.push('<div class="col">' + cells + '</div>');
    }
    var acc = S.stats.answered ? Math.round(S.stats.correct / S.stats.answered * 100) : 0;
    var html = '<div class="page"><div class="eyebrow">ความคืบหน้า</div><h1 class="title">สถิติ</h1>' +
      '<div class="stats4" style="margin-top:32px">' +
        '<div class="card stat"><div class="stat-label">สถานีที่ผ่าน</div><div class="v">' + doneCount() + '<small> / ' + STATIONS.length + '</small></div><div class="d">' + Math.round(doneCount() / STATIONS.length * 100) + '% ของเส้นทาง</div></div>' +
        '<div class="card stat"><div class="stat-label">การ์ดในกองทบทวน</div><div class="v">' + fmt(Object.keys(S.srs).length) + '</div><div class="d">ถึงกำหนดวันนี้ ' + dueIds().length + ' ใบ</div></div>' +
        '<div class="card stat"><div class="stat-label">ความแม่นยำ</div><div class="v">' + acc + '<small>%</small></div><div class="d">จาก ' + fmt(S.stats.answered) + ' ข้อที่ตอบ</div></div>' +
        '<div class="card stat"><div class="stat-label">XP สะสม</div><div class="v">' + fmt(totalXP) + '</div><div class="d">เรียน ' + activeDays + ' วัน ต่อเนื่อง ' + streak() + ' วัน</div></div>' +
      '</div>' +
      '<div class="card pad" style="margin-top:16px"><div class="section-head"><h2 class="h2">12 เดือนที่ผ่านมา</h2><span class="muted">สีเข้มเมื่อถึงเป้า ' + g + ' XP</span></div>' +
        '<div style="overflow-x:auto"><div class="heat-months">' + months.join('') + '</div><div class="heat">' + cols.join('') + '</div></div>' +
        '<div class="heat-legend">น้อย<span class="c" style="background:var(--raised)"></span><span class="c" style="background:rgba(184,57,28,.25)"></span><span class="c" style="background:rgba(184,57,28,.45)"></span><span class="c" style="background:rgba(184,57,28,.7)"></span><span class="c" style="background:var(--accent)"></span>ถึงเป้า</div></div>' +
      '<div class="card pad" style="margin-top:16px"><div class="section-head"><h2 class="h2">รายสาย</h2></div>' + LEVELS.map(function (lv) {
        var c = levelCount(lv), n = lv.stations.length;
        return '<div class="lp-row" style="--c:' + lv.color + '"><span>' + esc(lv.title) + '</span><div class="bar"><i style="transform:scaleX(' + (c / n) + ')"></i></div><span class="mono">' + c + ' / ' + n + '</span></div>';
      }).join('') + '</div></div>';
    return html;
  }

  /* ================= settings ================= */
  function viewSettings() {
    var st = S.settings;
    var voices = VOICES.length ? '<select class="input" data-set="voice"><option value="">ค่าเริ่มต้นของเครื่อง</option>' + VOICES.map(function (v) { return '<option' + (v.name === st.voice ? ' selected' : '') + '>' + esc(v.name) + '</option>'; }).join('') + '</select>'
      : '<p class="muted" style="font-size:13px">ไม่พบเสียงภาษาญี่ปุ่นในเครื่องนี้ ติดตั้งเสียงภาษาญี่ปุ่นในการตั้งค่าระบบแล้วโหลดหน้าใหม่</p>';
    return '<div class="page page-narrow"><div class="eyebrow">ของฉัน</div><h1 class="title">ตั้งค่า</h1>' +
      '<div class="card pad" style="margin-top:32px;display:flex;flex-direction:column;gap:24px">' +
        '<div class="field"><label>เป้า XP ต่อวัน</label><div class="seg">' + [20, 30, 50, 100].map(function (g) { return '<button data-goal="' + g + '" class="' + (st.goal === g ? 'on' : '') + '">' + g + '</button>'; }).join('') + '</div></div>' +
        '<div class="field"><label>ความเร็วเสียงอ่าน <span class="mono" id="rateV">' + st.rate.toFixed(2) + '×</span></label><input type="range" min="0.6" max="1.2" step="0.05" value="' + st.rate + '" data-set="rate" style="max-width:320px;accent-color:#1f1b16"></div>' +
        '<div class="field"><label>เสียงภาษาญี่ปุ่น</label>' + voices + '<div><button class="btn sm" data-say="こんにちは。にほんごを べんきょうしましょう。">' + icon('sound', 'i-sm') + 'ทดลองฟัง</button></div></div>' +
        '<div class="row-actions" style="gap:24px"><label class="toggle"><input type="checkbox" data-set="romaji"' + (st.romaji ? ' checked' : '') + '>แสดงโรมาจิ</label><label class="toggle"><input type="checkbox" data-set="furigana"' + (st.furigana ? ' checked' : '') + '>แสดงคำอ่านบนคันจิ</label></div>' +
      '</div>' +
      '<div class="card pad" style="margin-top:16px"><div class="h3">สำรองความคืบหน้า</div><p class="soft" style="font-size:14px;margin-top:4px">ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์นี้เท่านั้น ส่งออกเป็นไฟล์ไว้ย้ายเครื่องหรือกันข้อมูลหาย</p>' +
        '<div class="row-actions" style="margin-top:16px"><button class="btn sm" id="exp">' + icon('download', 'i-sm') + 'ส่งออก</button><label class="btn sm">' + icon('upload', 'i-sm') + 'นำเข้า<input type="file" id="imp" accept="application/json" hidden></label>' +
        '<button class="btn sm ghost" id="reset" style="color:var(--neg)">ล้างความคืบหน้าทั้งหมด</button></div></div>' +
      '<p class="muted" style="font-size:12px;margin-top:24px">เนื้อหาเป็นชุดเริ่มต้นสำหรับแต่ละระดับ ใช้คู่กับหนังสือเรียนและข้อสอบเก่าจะได้ผลดีที่สุด · ไอคอนจาก Lucide</p></div>';
  }
  function viewMore() {
    var items = [['#/grammar', 'book', 'ไวยากรณ์'], ['#/write', 'pen', 'ฝึกเขียน'], ['#/stats', 'chart', 'สถิติ'], ['#/settings', 'sliders', 'ตั้งค่า'], ['#/search/', 'search', 'ค้นหา']];
    return '<div class="page page-narrow"><h1 class="title">เมนู</h1><div class="card" style="margin-top:24px">' + items.map(function (x) {
      return '<a class="list-row" href="' + x[0] + '">' + icon(x[1], 'muted') + '<span class="grow">' + x[2] + '</span>' + icon('right', 'muted') + '</a>';
    }).join('') + '</div></div>';
  }

  /* ================= events ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-say],[data-kanji],[data-close],[data-go],[data-opt],#qnext,[data-retry],[data-grade],#flash,[data-add-lesson],[data-add-card],[data-read-done],[data-goal],#exp,#reset');
    if (!t) { if (e.target.id === 'sheet') closeSheet(); return; }
    if (t.hasAttribute('data-say')) { e.preventDefault(); speak(t.getAttribute('data-say')); if (t.id !== 'flash') return; }
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
    if (t.hasAttribute('data-add-card')) { addCards([t.getAttribute('data-add-card')]); toast('เพิ่มเข้ากองทบทวนแล้ว'); var ch = t.getAttribute('data-add-card').slice(2); kanjiSheet(ch); var tile = $('[data-kanji="' + ch + '"]'); if (tile) tile.classList.add('learned'); return; }
    if (t.hasAttribute('data-read-done')) { var id = t.getAttribute('data-read-done'); if (!isDone(id)) { markDone(id, 100); addXP(15); } toast('ได้ตราประทับสถานีอ่านแล้ว'); return route(); }
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

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-set')) {
      var k = t.getAttribute('data-set');
      S.settings[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value; save();
      if (t.type === 'range') return;
      if (k === 'romaji' || k === 'furigana') return route();
      return;
    }
    if (t.id === 'rdTh') $$('.rd-th').forEach(function (x) { x.classList.toggle('hide', !t.checked); });
    if (t.id === 'rdR') $$('.rd-r').forEach(function (x) { x.classList.toggle('hide', !t.checked); });
    if (t.id === 'imp' && t.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try { var d = JSON.parse(fr.result); if (d.v !== 1) throw 0; localStorage.setItem(KEY, JSON.stringify(d)); S = load(); toast('นำเข้าความคืบหน้าแล้ว'); route(); }
        catch (err) { toast('ไฟล์ไม่ถูกต้อง'); }
      };
      fr.readAsText(t.files[0]);
    }
  });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.type === 'range' && t.getAttribute('data-set') === 'rate') { S.settings.rate = +t.value; $('#rateV').textContent = (+t.value).toFixed(2) + '×'; save(); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'qtype' || !Q) return;
    e.preventDefault();
    if (Q.locked) { Q.i++; return renderQ(); }
    var q = Q.qs[Q.i], inp = $('#qin'), v = inp.value.trim().toLowerCase();
    if (!v) return;
    var ok = q.accept.indexOf(v) > -1;
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
})();

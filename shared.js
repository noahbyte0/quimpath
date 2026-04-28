// ══════════ CONSTANTES COMPARTIDAS ══════════
const S   = { B: 0, H: 1, C: 2, A: 3, E: 4 };
const SN  = ['bloqueada', 'habilitada', 'cursando', 'aprobada', 'exonerada'];
const SL  = ['Bloqueada', 'Habilitada', 'Cursando', 'Aprobada', 'Exonerada'];
const META = 450;

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// ══════════ ESTADO GLOBAL ══════════
let est = {}, bOp = null, dOp = null, matIni = null, aF = new Set(), areaF = '', qr = '', cel = false;
let ingreso = 'fq';
let soundOn = true, toastsOn = !isMobile(), quimiOn = true, mascot = 'quimi';
let theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
let _prevTab = 'princ';

const gs = (id) => est[id] ?? S.B;

// ══════════ AUDIO ══════════
let AC_ = null;
function getAC() {
  if (!AC_ || AC_.state === 'closed') AC_ = new (window.AudioContext || window.webkitAudioContext)();
  return AC_;
}

async function playTone(freq, dur, vol = 1) {
  if (!soundOn) return;
  try {
    const ac = getAC();
    if (ac.state === 'suspended') await ac.resume();
    const silence = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.05), ac.sampleRate);
    const silSrc = ac.createBufferSource();
    silSrc.buffer = silence;
    silSrc.connect(ac.destination);
    silSrc.start();
    await new Promise(r => setTimeout(r, 50));
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    const o = ac.createOscillator();
    o.frequency.value = freq;
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch (e) {}
}

function sndAdvance() { playTone(440, .12, .4); setTimeout(() => playTone(550, .1, .3), 80); }
function sndBack()    { playTone(330, .15, .4); setTimeout(() => playTone(260, .12, .3), 80); }
function sndExon()    { [523, 659, 784].forEach((f, i) => setTimeout(() => playTone(f, .18, .5), i * 100)); }
function sndCarrera() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, .3, .6), i * 120)); }

// ══════════ PERSISTENCIA ══════════
function _buildFbPayload() {
  const cr = {};
  let crTotal = 0;
  for (const s of (ALL || [])) {
    const c = gcr(s.id, gs(s.id));
    if (c > 0) {
      const grp = s.grp || 'Otras';
      cr[grp] = (cr[grp] || 0) + c;
      crTotal += c;
    }
  }
  cr.total = crTotal;
  const vals = Object.values(est);
  const mat = {
    exoneradas:  vals.filter(v => v === S.E).length,
    aprobadas:   vals.filter(v => v === S.A).length,
    cursando:    vals.filter(v => v === S.C).length,
    habilitadas: vals.filter(v => v === S.H).length,
  };
  return {
    carrera: CAREER_ID,
    plan, ingreso, theme, mascot,
    ...(matIni !== null ? { matIni } : {}),
    z_cr: cr, z_mat: mat,
    pctAvance: Math.round(crTotal / META * 100),
    lastSeen: new Date().toISOString(),
    z_est: est,
  };
}

function sv() {
  const data = { est, bOp, dOp, matIni, cel, soundOn, toastsOn, quimiOn, mascot, theme, plan, ingreso };
  try { localStorage.setItem(SK, JSON.stringify(data)); } catch (e) {}
  window.fbSave?.(_buildFbPayload());
}

function ld() {
  try {
    const d = JSON.parse(localStorage.getItem(SK));
    if (!d) return;
    est     = d.z_est || d.est || {};
    bOp     = d.bOp   || null;
    dOp     = d.dOp   || null;
    matIni  = d.matIni !== undefined ? d.matIni : null;
    cel     = d.cel   || false;
    soundOn = d.soundOn  !== undefined ? d.soundOn  : true;
    toastsOn= d.toastsOn !== undefined ? d.toastsOn : !isMobile();
    quimiOn = d.quimiOn  !== undefined ? d.quimiOn  : true;
    mascot  = d.mascot   || 'quimi';
    if (d.theme)  theme  = d.theme;
    if (d.plan)   plan   = d.plan;
    if (d.ingreso) ingreso = d.ingreso;
  } catch (e) {}
}

// ══════════ QUIMI / TOASTS ══════════
let quimiTimer = null;

function quimiSay(msg, mood = 'happy', dur = 3000) {
  if (!toastsOn || !quimiOn) return;
  const bubble = document.getElementById('quimi-bubble');
  if (quimiTimer) { clearTimeout(quimiTimer); quimiTimer = null; }
  bubble.innerHTML = msg;
  bubble.dataset.mood = mood;
  bubble.classList.add('on');
  quimiSetMood(mood);
  quimiTimer = setTimeout(() => {
    bubble.classList.remove('on');
    setTimeout(() => quimiSetMood('idle'), 300);
    quimiTimer = null;
  }, dur);
}

let ftCurrent = null;
function floatToast(msg, mood, dur) {
  if (!toastsOn) return;
  const c = document.getElementById('ft-container');
  if (ftCurrent) { ftCurrent.classList.remove('on'); ftCurrent.remove(); ftCurrent = null; }
  const el = document.createElement('div');
  el.className = 'ft';
  el.dataset.mood = mood;
  el.innerHTML = msg;
  c.appendChild(el);
  void el.offsetWidth;
  el.classList.add('on');
  ftCurrent = el;
  setTimeout(() => {
    el.classList.remove('on');
    setTimeout(() => { if (ftCurrent === el) ftCurrent = null; el.remove(); }, 300);
  }, dur);
}

const MASCOT_IMGS = {
  quimi:  { idle:'quimi_estatico.png',  happy:'quimi_estatico.png',  aprobada:'quimi_estatico.png',  cursando:'quimi_estatico.png',  wip:'quimi_estatico.png',  exonerada:'quimi_celebrando.png',  celebrate:'quimi_celebrando.png'  },
  quimpi: { idle:'quimpi_estatico.png', happy:'quimpi_estatico.png', aprobada:'quimpi_estatico.png', cursando:'quimpi_estatico.png', wip:'quimpi_estatico.png', exonerada:'quimpi_celebrando.png', celebrate:'quimpi_celebrando.png' },
};

function getMascotImgs() { return MASCOT_IMGS[mascot] || MASCOT_IMGS.quimi; }

function applyMascot() {
  const el  = document.getElementById('quimi');
  const img = document.getElementById('quimi-img');
  const celImg = document.getElementById('cel-quimi-img');
  const hlp = document.querySelector('.help-quimi-col img');
  const imgs = getMascotImgs();
  if (el)  el.classList.toggle('quimpi', mascot === 'quimpi');
  if (img) { img.src = imgs[img.dataset.mood] || imgs.idle; }
  if (celImg) {
    celImg.src = mascot === 'quimpi' ? 'quimpi_celebrando.png' : 'quimi_celebrando.png';
    celImg.style.animation = mascot === 'quimpi'
      ? 'quimpi-rock .45s ease-in-out infinite alternate'
      : 'quimi-rock-f .45s ease-in-out infinite alternate';
  }
  if (hlp) {
    hlp.src = mascot === 'quimpi' ? 'quimpi_ensenando.png' : 'quimi_ensenando.png';
    hlp.classList.add('mirror');
    const col = document.querySelector('.help-quimi-col');
    if (col) {
      if (mascot === 'quimpi') {
        col.style.order = '-1';
        col.style.borderRight = '1px solid var(--bd)';
        col.style.borderLeft  = 'none';
      } else {
        col.style.order = '';
        col.style.borderLeft  = '1px solid var(--bd)';
        col.style.borderRight = 'none';
      }
    }
  }
}

function quimiSetMood(mood) {
  const img = document.getElementById('quimi-img');
  if (!img) return;
  const imgs = getMascotImgs();
  img.src = imgs[mood] || imgs.idle;
  img.dataset.mood = '';
  void img.offsetWidth;
  img.dataset.mood = mood;
}

function toast(id, st) {
  const msgs = FR[SN[st]];
  if (!msgs) return;
  const msg  = msgs[Math.floor(Math.random() * msgs.length)];
  const mood = st === S.E ? 'exonerada' : st === S.A ? 'aprobada' : 'cursando';
  const dur  = st === S.E ? 3800 : 2800;
  if (quimiOn && !isMobile()) {
    quimiSay(msg, mood, dur);
  } else {
    floatToast(msg, mood, dur);
  }
}

function toastWip() {
  const msg = `<div class="qb-subject">Optativa</div>🚧 Próximamente disponible`;
  if (quimiOn && !isMobile()) {
    quimiSay(msg, 'wip', 2800);
  } else {
    floatToast(msg, 'wip', 2800);
  }
}

// ══════════ FEEDBACK ══════════
let fbType = 'error';

function openFeedback() {
  fbType = 'error';
  document.querySelectorAll('.fb-type-btn').forEach(b => b.classList.toggle('on', b.dataset.type === 'error'));
  document.getElementById('fb-materia').value    = '';
  document.getElementById('fb-desc').value       = '';
  document.getElementById('fb-msg').textContent  = '';
  document.getElementById('fb-msg').style.color  = '';
  document.getElementById('fb-send-btn').disabled = false;
  document.getElementById('ov-fb').classList.add('op'); setModalOpen(true);
}

function closeFeedback() { document.getElementById('ov-fb').classList.remove('op'); syncModalOpen(); }

function selectFbType(btn) {
  fbType = btn.dataset.type;
  document.querySelectorAll('.fb-type-btn').forEach(b => b.classList.toggle('on', b === btn));
  document.getElementById('fb-materia-row').style.display = fbType === 'error' ? '' : 'none';
}

async function sendFeedback() {
  const desc = document.getElementById('fb-desc').value.trim();
  const msg  = document.getElementById('fb-msg');
  const btn  = document.getElementById('fb-send-btn');
  if (!desc) { msg.textContent = 'Por favor escribí una descripción.'; msg.style.color = 'var(--a3)'; return; }
  btn.disabled = true; btn.textContent = 'Enviando...';
  try {
    await window.fbSaveFeedback({
      carrera:     CAREER_ID,
      plan:        plan,
      ingreso:     ingreso,
      tipo:        fbType,
      materia:     fbType === 'error' ? document.getElementById('fb-materia').value.trim() : '',
      descripcion: desc,
      fecha:       new Date().toISOString(),
      uid:         window._fbCurrentUser?.uid   || 'anonimo',
      email:       window._fbCurrentUser?.email || 'anonimo',
    });
    msg.textContent = '✓ Reporte enviado. ¡Gracias!';
    msg.style.color = 'var(--gn)';
    setTimeout(closeFeedback, 1500);
  } catch (e) {
    msg.textContent = 'Error al enviar. Intentá de nuevo.';
    msg.style.color = 'var(--a3)';
    btn.disabled = false; btn.textContent = 'Enviar reporte';
  }
}

// ══════════ CONFIG ══════════
function openConfig() {
  ['cfg-sound','cfg-toasts','cfg-quimi'].forEach(id => {
    const on = id === 'cfg-sound' ? soundOn : id === 'cfg-toasts' ? toastsOn : quimiOn;
    document.getElementById(id).textContent = on ? '✔ On' : '✘ Off';
    document.getElementById(id).className   = 'toggle-btn ' + (on ? 'on' : 'off');
  });
  window.updateCareerCfgBtns?.();
  document.getElementById('ov-cfg').classList.add('op'); setModalOpen(true);
}

function closeConfig() { document.getElementById('ov-cfg').classList.remove('op'); syncModalOpen(); }

function _updateCfgBtn(elId, val) {
  const el = document.getElementById(elId);
  el.textContent = val ? '✔ On' : '✘ Off';
  el.className   = 'toggle-btn ' + (val ? 'on' : 'off');
}

function toggleSound() {
  soundOn = !soundOn;
  if (soundOn) sndAdvance();
  _updateCfgBtn('cfg-sound', soundOn);
  sv();
}

function toggleToasts() {
  toastsOn = !toastsOn;
  _updateCfgBtn('cfg-toasts', toastsOn);
  sv();
}

function toggleQuimi() {
  quimiOn = !quimiOn;
  _updateCfgBtn('cfg-quimi', quimiOn);
  applyQuimiVisibility();
  if (quimiOn) scheduleAmbient();
  else { clearTimeout(_ambientTimer); _ambientTimer = null; }
  sv();
}

function applyQuimiVisibility() {
  const el = document.getElementById('quimi');
  if (!el) return;
  el.style.display = quimiOn ? '' : 'none';
  if (quimiOn) quimiSetMood('idle');
}

// ══════════ AYUDA ══════════
function openHelp() {
  document.getElementById('ov-help').classList.add('op'); setModalOpen(true);
  if (isMobile()) switchHelpTab('mob');
}

function closeHelp() { document.getElementById('ov-help').classList.remove('op'); syncModalOpen(); }

function switchHelpTab(tab) {
  ['pc','mob'].forEach(t => {
    document.getElementById('help-' + t).style.display     = t === tab ? '' : 'none';
    document.getElementById('help-tab-' + t).className     = 'toggle-btn ' + (t === tab ? 'on' : 'off');
  });
}

// ══════════ TEMA ══════════
function toggleTheme() { theme = theme === 'dark' ? 'light' : 'dark'; applyTheme(); sv(); }
function applyTheme()  {
  document.body.classList.toggle('light', theme === 'light');
  document.getElementById('theme-btn').innerHTML = theme === 'dark' ? '🌙 <span class="label">Oscuro</span>' : '☀️ <span class="label">Claro</span>';
}

// ══════════ ACTUALIZACIONES ══════════
function switchUpdTab(tab) {
  UPD_TABS.forEach(t => {
    const el    = document.getElementById('upd-' + t);
    const tabEl = document.getElementById('upd-tab-' + t);
    if (el)    el.style.display = t === tab ? 'flex' : 'none';
    if (tabEl) tabEl.className  = 'toggle-btn ' + (t === tab ? 'on' : 'off');
  });
}

function closeUpd() {
  document.getElementById('ov-upd').classList.remove('op');
  syncModalOpen();
  try { localStorage.setItem(UPD_SK, UPD_VERSION); } catch(e) {}
}

function openUpd() {
  cSB();
  document.getElementById('ov-upd').classList.add('op');
  setModalOpen(true);
}

function maybeShowUpd() {
  try {
    const raw = localStorage.getItem(UPD_SK);
    if (raw === null) {
      if (!localStorage.getItem('qp_welcomed')) { localStorage.setItem(UPD_SK, UPD_VERSION); return; }
      document.getElementById('ov-upd').classList.add('op'); setModalOpen(true);
      return;
    }
    if (parseInt(raw) < UPD_VERSION) {
      document.getElementById('ov-upd').classList.add('op'); setModalOpen(true);
    }
  } catch(e) {}
}

// ══════════ RESET ══════════
function openReset()  { document.getElementById('ov-r').classList.add('op'); setModalOpen(true); }
function closeReset() { document.getElementById('ov-r').classList.remove('op'); syncModalOpen(); }

// ══════════ MODAL STATE ══════════
function setModalOpen(open) { document.body.classList.toggle('modal-open', open); }
function syncModalOpen()    { setModalOpen(!!document.querySelector('.ov.op,#splash.on,#cel.on')); }

// ══════════ FILTROS ══════════
function toggleFilterBar() {
  const fb = document.getElementById('fb-filters');
  if (!fb.classList.contains('open'))
    fb.style.top = document.getElementById('filterbar').getBoundingClientRect().bottom + 'px';
  fb.classList.toggle('open');
}

document.addEventListener('click', e => {
  const fb  = document.getElementById('fb-filters');
  const btn = document.getElementById('fb-toggle-btn');
  if (fb?.classList.contains('open') && !fb.contains(e.target) && !btn?.contains(e.target))
    fb.classList.remove('open');
});

function updateFilterBtn() {
  const btn = document.getElementById('fb-toggle-btn');
  if (!btn) return;
  btn.className   = 'fb-toggle' + (aF.size ? ' has-filter' : '');
  btn.textContent = aF.size ? `🔽 Filtros (${aF.size})` : '🔽 Filtrar';
}

function toggleF(s) {
  aF.has(s) ? aF.delete(s) : aF.add(s);
  document.querySelectorAll('.ch').forEach(c => c.classList.toggle('on', aF.has(c.dataset.s)));
  updateFilterBtn(); rAll();
}

function clearFilters() {
  aF.clear();
  document.querySelectorAll('.ch').forEach(c => c.classList.remove('on'));
  updateFilterBtn();
  document.getElementById('fb-filters').classList.remove('open');
  rAll();
}

function applyS() {
  qr = document.getElementById('sq').value;
  if (qr) {
    const cur = document.querySelector('.nb[data-tab].on')?.dataset.tab || 'princ';
    if (cur !== 'todas') _prevTab = cur;
    switchToTodas();
    rAll();
  } else {
    switchTab(_prevTab);
  }
}

// ══════════ MODAL PREVIAS ══════════
let _ppCurrentId = null;
let _ppMode = 'req';

function renderPPItem(pid, ms, indent = false) {
  const ok = gs(pid) >= ms;
  const style = indent ? ' style="margin-left:8px"' : '';
  return `<div class="pi${ok ? ' met' : ''}"${style}><span class="pn">${BI[pid]?.name || pid}</span><span class="pr ${ok ? 'ok' : SN[ms]}">${ok ? '✓' : SL[ms]}</span></div>`;
}

function renderPPOpts(opts) {
  return opts.map(opt => {
    const header = `<div class="pp-opt-label${opt.met ? ' met' : ''}">${opt.label}${opt.met ? ' ✓' : ''}</div>`;
    return header + opt.items.map(({ id: pid, ms }) => renderPPItem(pid, ms, true)).join('');
  }).join('');
}

function buildPPReqRows(id) {
  const p = PV_ACT[id];
  let creditRow = '';
  if (id === 'TALENCCRE') {
    const labels = {
      ing_proc_fis: { cr: 65,  label: 'cr. Ing. de Procesos Físicos' },
      ing_proc_qb:  { cr: 24,  label: 'cr. Ing. de Proc. Q/B' },
      act_int:      { cr: 20,  label: 'cr. Act. Integradoras' },
      basicas:      { cr: 190, label: 'cr. Materias Básicas' },
    };
    const actuals = {
      ing_proc_fis: crArea('Ing. Proc. Físicos'),
      ing_proc_qb:  crArea('Ing. Proc. Q/B'),
      act_int:      crArea('Act. Integradoras'),
      basicas:      crBasicas(),
    };
    for (const [type, { cr, label }] of Object.entries(labels)) {
      const actual = actuals[type], ok = actual >= cr;
      creditRow += `<div class="pi${ok ? ' met' : ''}"><span class="pn">${cr} ${label}</span><span class="pr ${ok ? 'ok' : 'bloqueada'}">${ok ? '✓' : actual + '/' + cr}</span></div>`;
    }
  } else if (id in CR_REQ) {
    const req = CR_REQ[id];
    const actual = req.type === 'basicas' ? crBasicas() : crTotal();
    const ok = actual >= req.cr;
    creditRow = `<div class="pi${ok ? ' met' : ''}"><span class="pn">${req.cr} ${req.label}</span><span class="pr ${ok ? 'ok' : 'bloqueada'}">${ok ? '✓' : actual + '/' + req.cr}</span></div>`;
  }
  if (id === 'TUTPAR') {
    const opts = [
      { label: 'Opción 1', met: gs('FIS1F') >= S.E, items: [{ id: 'FIS1F', ms: S.E }] },
      { label: 'Opción 2', met: gs('GEOALG1') >= S.E && gs('GEOALG2') >= S.A, items: [{ id: 'GEOALG1', ms: S.E }, { id: 'GEOALG2', ms: S.A }] },
      { label: 'Opción 3', met: gs('CALC1') >= S.E && gs('CALC2') >= S.A,     items: [{ id: 'CALC1', ms: S.E }, { id: 'CALC2', ms: S.A }] },
    ];
    return creditRow + renderPPOpts(opts);
  }
  if (id === 'FIS3F') {
    const commonRow = renderPPItem('CALC1', S.A);
    const opts = [
      { label: 'Opción 1', met: gs('FIS1F') >= S.A && gs('FIS2F') >= S.A, items: [{ id: 'FIS1F', ms: S.A }, { id: 'FIS2F', ms: S.A }] },
      { label: 'Opción 2', met: gs('FIS1F') >= S.E, items: [{ id: 'FIS1F', ms: S.E }] },
    ];
    return creditRow + commonRow + renderPPOpts(opts);
  }
  if (!p || (typeof p === 'object' && !Array.isArray(p) && Object.keys(p).length === 0))
    return creditRow || '<div class="pi"><span class="pn" style="color:var(--tm)">Sin previas requeridas.</span></div>';
  const groups = Array.isArray(p) ? p : [p];
  if (groups.length === 1)
    return creditRow + Object.entries(groups[0]).map(([pid, ms]) => renderPPItem(pid, ms)).join('');
  const opts = groups.map((g, i) => ({
    label: `Opción ${i + 1}`,
    met: Object.entries(g).every(([pid, ms]) => gs(pid) >= ms),
    items: Object.entries(g).map(([pid, ms]) => ({ id: pid, ms })),
  }));
  return creditRow + renderPPOpts(opts);
}

function buildPPRevRows(id) {
  const results = [];
  for (const s of ALL) {
    const p = PV_ACT[s.id];
    if (!p) continue;
    const groups = Array.isArray(p) ? p : [p];
    let found = false;
    for (const g of groups) { if (id in g) { found = true; break; } }
    if (found) results.push(s);
  }
  if (results.length === 0)
    return '<div class="pi"><span class="pn" style="color:var(--tm)">No es previa de ninguna materia.</span></div>';
  return results.map(s => {
    const st = gs(s.id);
    return `<div class="pi${st >= S.H ? ' met' : ''}"><span class="pn">${s.name}</span><span class="pr ${SN[st]}">${SL[st]}</span></div>`;
  }).join('');
}

function renderPPModal(id) {
  const modal = document.getElementById('pp-modal');
  const isReq = _ppMode === 'req';
  const rows = isReq ? buildPPReqRows(id) : buildPPRevRows(id);
  modal.innerHTML = `
    <h3>🔒 Previas <button class="pp-close" onclick="hidePP()">✕</button></h3>
    <div class="pp-sub">${BI[id]?.name || id}</div>
    <div style="display:flex;gap:5px;margin-bottom:8px">
      <button class="toggle-btn ${isReq ? 'on' : 'off'}" style="flex:1;font-size:.65rem;padding:4px" onclick="switchPPMode('req')">Previas requeridas</button>
      <button class="toggle-btn ${!isReq ? 'on' : 'off'}" style="flex:1;font-size:.65rem;padding:4px" onclick="switchPPMode('rev')">¿De qué es previa?</button>
    </div>
    ${rows}`;
}

function switchPPMode(mode) { _ppMode = mode; if (_ppCurrentId) renderPPModal(_ppCurrentId); }

function showPP(id) {
  const ov = document.getElementById('ov-pp');
  _ppCurrentId = id;
  _ppMode = PV_ACT[id] ? 'req' : 'rev';
  renderPPModal(id);
  ov.removeEventListener('click', ppOvClick);
  ov.classList.add('op'); setModalOpen(true);
  ov.addEventListener('click', ppOvClick);
}

function ppOvClick(e) { if (e.target === document.getElementById('ov-pp')) hidePP(); }

function hidePP() {
  const ov = document.getElementById('ov-pp');
  ov.classList.remove('op'); syncModalOpen();
  ov.removeEventListener('click', ppOvClick);
}

// ══════════ CELEBRACIÓN ══════════
function chkCel() {
  const t = cst().t;
  if (t < META) { cel = false; return; }
  if (cel) return;
  cel = true; sv(); sndCarrera();
  setTimeout(() => {
    document.getElementById('cel').classList.add('on'); setModalOpen(true);
    launchConfetti();
    quimiSetMood('celebrate');
  }, 400);
}

function closeCel() { document.getElementById('cel').classList.remove('on'); syncModalOpen(); stopConfetti(); }

let confActive = false;
const CC = ['#e63946','#f4a261','#2a9d8f','#4ea8de','#e9c46a','#c77dff','#f72585','#4cc9f0','#fff','#3fb950'];

function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas'), ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  confActive = true;
  const parts = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height * .5,
    vx: (Math.random() - .5) * 4,
    vy: Math.random() * 4 + 2,
    rot: Math.random() * 360,
    drot: (Math.random() - .5) * 10,
    color: CC[Math.floor(Math.random() * CC.length)],
    w: Math.random() * 10 + 5,
    h: Math.random() * 5 + 3,
  }));
  const t0 = Date.now();
  (function anim() {
    if (!confActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += .1; p.vx *= .99; p.rot += p.drot;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    (Date.now() - t0) / 1000 < 6 ? requestAnimationFrame(anim) : stopConfetti();
  })();
}

function stopConfetti() {
  confActive = false;
  const c = document.getElementById('confetti-canvas');
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
}

// ══════════ SIDEBAR MÓVIL ══════════
function toggleSB() {
  document.getElementById('sb').classList.toggle('op');
  document.getElementById('sbov').classList.toggle('op');
}
function cSB() {
  document.getElementById('sb').classList.remove('op');
  document.getElementById('sbov').classList.remove('op');
}
document.getElementById('sbov').onclick = cSB;

// ══════════ QUIMI — MENSAJES Y AMBIENT ══════════
const QUIMI_MSGS = [
  '¡Hola! Soy Quimi, tu compañero de carrera 🐾',
  '¡Vamos, vos podés! 💪',
  '¡Otro semestre y al título! 🎓',
  '¡La química te necesita! ⚗️',
  '¡Seguí dale que se nota el progreso! 📚',
  '¡El café y yo te bancamos! ☕',
  '¡Cada crédito cuenta! ⚖️',
  '¡No te rindás, campeón! 🏆',
  '¿Perdido? El botón ❓ del panel lateral tiene todo lo que necesitás saber 😉',
  '¿Encontraste algo raro? ¡Avisame en "Reportar error" y lo arreglamos! 🐛',
];
const QUIMPI_MSGS = [
  '¡Hola! Soy Quimπ, ¡es un gusto tenerte aquí! 🐱',
  '¡Miau! ¡Esta materia cae seguro! 🐱',
  '¡Vamos, vos podés! 💪',
  '¡Otro semestre y al título! 🎓',
  '¡La química te necesita! ⚗️',
  '¡Seguí dale que se nota el progreso! 📚',
  '¡El café y yo te bancamos! ☕',
  '¡Cada crédito cuenta! ⚖️',
  '¡No te rindás, campeón/a! 🏆',
  'Estoy segura que serás ingeniero/a algún día 🐱',
  'Lo sé, vas a llegar. Confío en vos 🌟',
  'Tengo fe en que este semestre es el tuyo 🐱',
  '¿Dudas? El botón ❓ del panel lateral tiene toda la ayuda que necesitás 😸',
  '¿Algo no funciona bien? Podés reportarlo en "Reportar error", ¡yo también quiero que todo esté perfecto! 🐱',
];
const QUIMI_AMBIENT = [
  { max: 5,  msgs: ['¡Bienvenido! Empezar es la parte más emocionante 🚀', 'El viaje de mil créditos empieza con uno 💪', '¡Todo está por venir! Esto recién arranca 🌱', 'Cada gran estudiante estuvo donde vos estás 🐾'] },
  { max: 25, msgs: ['¡Ya vas arrancando! El primer tramo siempre es el más duro 🔥', 'Poco a poco se llega lejos, seguí así 📚', '¡Los primeros créditos son los más valiosos! 🏅', 'Base sólida, carrera sólida. Vas bien 🧱'] },
  { max: 50, msgs: ['¡Ya llegaste al cuarto! La mitad está cerca 🎯', 'Este es el tramo del carácter. ¡Dale que podés! ⚗️', 'Ya no sos principiante, sos un superviviente 💡', '¡Vas por el camino correcto, no pares! 🐾'] },
  { max: 75, msgs: ['¡Más de la mitad! El título ya se huele 🎓', 'El esfuerzo se nota en cada crédito. ¡Orgullo! 🏆', 'Ya sos de los que llegaron lejos. Seguí 🚀', '¡Vos sí que sos crack! El final se acerca 🌟'] },
  { max: 100, msgs: ['¡Casi llegás! Unos pocos créditos más y es tuyo 🎓', '¡Tan cerca del título que casi lo toco! 🏅', 'La recta final. ¡No aflojes ahora! 💪', '¡Leyenda en progreso! Casi llegás 🐾'] },
];

function quimiAmbientSay() {
  if (!toastsOn || !quimiOn) return;
  const pct = Math.round(cst().t / META * 100);
  const bucket = QUIMI_AMBIENT.find(b => pct <= b.max) || QUIMI_AMBIENT[QUIMI_AMBIENT.length - 1];
  const msg = bucket.msgs[Math.floor(Math.random() * bucket.msgs.length)];
  quimiSay(msg, 'happy', 5500);
}

let _ambientTimer = null;
function scheduleAmbient() {
  if (!quimiOn) return;
  _ambientTimer = setTimeout(() => {
    if (Math.random() < 0.5) {
      quimiAmbientSay();
    } else {
      const msgs = mascot === 'quimpi' ? QUIMPI_MSGS : QUIMI_MSGS;
      quimiSay(msgs[Math.floor(Math.random() * msgs.length)], 'happy', 4000);
    }
    scheduleAmbient();
  }, (120 + Math.random() * 120) * 1000);
}
scheduleAmbient();

document.getElementById('quimi').addEventListener('click', () => {
  const msgs = mascot === 'quimpi' ? QUIMPI_MSGS : QUIMI_MSGS;
  quimiSay(msgs[Math.floor(Math.random() * msgs.length)], 'happy', 2800);
});

// ══════════ TICKER ══════════
(() => {
  let idx = Math.floor(Math.random() * TKF.length);
  const el = document.getElementById('tkt');
  el.style.transition = 'opacity .3s';
  function show() {
    el.style.opacity = '0';
    setTimeout(() => { el.textContent = TKF[idx]; el.style.opacity = '1'; idx = (idx + 1) % TKF.length; }, 300);
  }
  show();
  setInterval(show, 5 * 60 * 1000);
  document.getElementById('tk').addEventListener('click', show);
})();

// ══════════ TECLADO ══════════
document.addEventListener('keydown', e => {
  if (e.shiftKey && e.ctrlKey && !e.altKey && e.code === 'KeyE') {
    for (const s of ALL) est[s.id] = S.E;
    window.onCheatExon?.();
    rc(); rAll(); upCr(); chkCel(); sv();
    return;
  }
  if (e.shiftKey && e.ctrlKey && !e.altKey && e.code === 'KeyY') { quimiAmbientSay(); return; }
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    const sq = document.getElementById('sq');
    sq.focus(); sq.select();
    return;
  }
  if (e.key === 'Escape') {
    const modals = [
      ['ov-upd',  closeUpd],
      ['ov-pp',   hidePP],
      ['ov-cfg',  closeConfig],
      ['ov-help', closeHelp],
      ['ov-fb',   closeFeedback],
      ['ov-r',    closeReset],
      ['ov-b',    () => window.closeBio?.()],
      ['ov-d',    () => window.closeDin?.()],
      ['ov-wip',  () => { document.getElementById('ov-wip')?.classList.remove('op'); syncModalOpen(); }],
    ];
    for (const [id, fn] of modals)
      if (document.getElementById(id)?.classList.contains('op')) { fn(); return; }
    const sq = document.getElementById('sq');
    if (sq.value) { sq.value = ''; qr = ''; switchTab(_prevTab); return; }
    if (aF.size)  { clearFilters(); return; }
    if (areaF)    { setAreaF(''); return; }
  }
});

// ══════════ CLOUD SYNC ══════════
window._applyCloudData = function (d) {
  if (!d) return;
  est     = d.z_est || d.est || {};
  bOp     = d.bOp   || null;
  dOp     = d.dOp   || null;
  matIni  = d.matIni !== undefined ? d.matIni : matIni;
  cel     = d.cel   || false;
  soundOn = d.soundOn  !== undefined ? d.soundOn  : true;
  toastsOn= d.toastsOn !== undefined ? d.toastsOn : !isMobile();
  quimiOn = d.quimiOn  !== undefined ? d.quimiOn  : true;
  mascot  = d.mascot   || mascot;
  if (d.theme) theme = d.theme;
  if (d.plan && d.plan !== plan) { plan = d.plan; applyPlan(plan); rebuildAllGrids(); }
  if (d.ingreso && d.ingreso !== ingreso) { ingreso = d.ingreso; applyPlan(plan); rebuildAllGrids(); }
  for (const id of INIC_ACT) if (!est[id]) est[id] = S.H;
  rc(); rAll(); upCr(); applyTheme(); applyMascot(); applyQuimiVisibility();
  try {
    const local = JSON.parse(localStorage.getItem(SK) || '{}');
    const toSave = { est, bOp, dOp, matIni, cel, soundOn, mascot, theme, plan, ingreso,
                     quimiOn, toastsOn: local.toastsOn ?? !isMobile() };
    localStorage.setItem(SK, JSON.stringify(toSave));
  } catch (e) {}
};


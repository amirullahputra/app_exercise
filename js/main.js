// ══════════════════════════════════════════════════════════
// MAIN — Exercise Dashboard entry point
// ══════════════════════════════════════════════════════════

// Global error catcher — show ANY error visually
window.addEventListener('error', e => {
  const root = document.getElementById('panels-root');
  if(root) root.innerHTML = `<div style="padding:1.5rem;border:2px solid #EF4444;border-radius:8px;background:#FEE2E2;margin:1rem">
    <div style="font-size:14px;font-weight:800;color:#991B1B;margin-bottom:8px">🔥 JS Error (window.onerror)</div>
    <div style="font-family:monospace;font-size:11.5px;color:#1A2140;white-space:pre-wrap;background:white;padding:10px;border-radius:6px">${e.message}\n  at ${e.filename||'?'}:${e.lineno||'?'}:${e.colno||'?'}</div>
  </div>`;
});
window.addEventListener('unhandledrejection', e => {
  const root = document.getElementById('panels-root');
  if(root) root.innerHTML = `<div style="padding:1.5rem;border:2px solid #EF4444;border-radius:8px;background:#FEE2E2;margin:1rem">
    <div style="font-size:14px;font-weight:800;color:#991B1B;margin-bottom:8px">🔥 Promise Rejection</div>
    <div style="font-family:monospace;font-size:11.5px;color:#1A2140;white-space:pre-wrap;background:white;padding:10px;border-radius:6px">${e.reason?.message||e.reason||'unknown'}</div>
  </div>`;
});

import { S, weekFromDate } from './state.js';
import {
  supa, loadQuarters, loadQuarterContent, loadGymProgram, loadGymSessions,
  saveGymSession, saveGymSets, deleteGymSession,
  loadCardioLog, saveCardioEntry, deleteCardioEntry,
  loadExerciseLibrary,
  setupAuthListener, updateAuthUI, onAuthBtnClick, doLogin,
  closeAuthModal
} from './supabase.js';
import {
  GYM_TABS, CARD_TABS,
  pGymLog, pGymProgression,
  pCardioLog, pCardioWeekly,
  pMarkdownContent,
  pLibrary
} from './panels.js';

// ── RENDER ──
function renderLayerRow(){
  const layers = [
    { k:'library', l:'📚 Library' },
    { k:'gym',     l:'🏋️ Gym' },
    { k:'cardio',  l:'🏃 Cardio' },
  ];
  document.getElementById('layer-row').innerHTML = layers.map(({k,l})=>`
    <button class="layer-btn ${k}${S.layer===k?' act':''}" onclick="setLayer('${k}')">${l}</button>
  `).join('');
}

function renderQselRow(){
  const el = document.getElementById('qsel-row');
  // Library layer = lintas-quarter, sembunyikan quarter selector
  if(S.layer==='library'){ el.style.display='none'; return; }
  el.style.display='';
  el.innerHTML =
    `<span class="qsel-lbl">Quarter</span>` +
    S.quarters.map(q=>`<button class="qsel-btn${S.quarterId===q.quarter_id?' act':''}" onclick="setQuarter('${q.quarter_id}')">${q.quarter_id.replace('_',' ')}</button>`).join('');
}

function renderTabNav(){
  const el = document.getElementById('tab-nav');
  // Library = single panel, no tabs
  if(S.layer==='library'){ el.style.display='none'; return; }
  el.style.display='';
  const tabs = S.layer==='gym' ? GYM_TABS : CARD_TABS;
  el.innerHTML = tabs.map((t,i)=>
    `<button class="tab-btn${S.tab===i?' act':''}" onclick="setTab(${i})">${t}</button>`
  ).join('');
}

function getContent(docType){
  return S.contentCache[`${S.quarterId}_${docType}`] || null;
}

function renderPanel(){
  let html = '';
  if(S.layer==='library'){
    html = pLibrary();
  } else if(S.layer==='gym'){
    if(S.tab===0)      html = pMarkdownContent('GYM', getContent('GYM'));
    else if(S.tab===1) html = pGymLog();
    else               html = pGymProgression();
  } else {
    if(S.tab===0)      html = pCardioLog();
    else if(S.tab===1) html = pCardioWeekly();
    else               html = pMarkdownContent('CARDIO', getContent('CARDIO'));
  }
  document.getElementById('panels-root').innerHTML = html;
}

function render(){
  renderLayerRow();
  renderQselRow();
  renderTabNav();
  renderPanel();
}
window.render = render;

// ── ACTIONS ──
async function setLayer(l){
  S.layer = l; S.tab = 0;
  await loadContent();
  if(S.user) await refreshData();
  render();
}
window.setLayer = setLayer;

async function setQuarter(qid){
  S.quarterId = qid; S.tab = 0;
  await loadContent();
  if(S.user) await refreshData();
  render();
}
window.setQuarter = setQuarter;

function setTab(i){ S.tab=i; renderTabNav(); renderPanel(); }
window.setTab = setTab;

// ── LOAD CONTENT (public) ──
async function loadContent(){
  const key = S.quarterId;
  if(S.contentCache[`${key}_GYM`] !== undefined) return;
  const content = await loadQuarterContent(key, ['GYM','CARDIO']);
  S.contentCache[`${key}_GYM`]    = content['GYM']    || null;
  S.contentCache[`${key}_CARDIO`] = content['CARDIO'] || null;
}

// ── DATA REFRESH (requires login) ──
async function refreshData(){
  if(!S.user) return;
  S.gymProgram  = await loadGymProgram(S.quarterId);
  if(S.layer==='gym') S.gymSessions = await loadGymSessions(S.user.id, S.quarterId);
  else                S.cardioLog   = await loadCardioLog(S.user.id, S.quarterId);
}

// ── GYM DRAFT ──
window.updateGymDraftMeta = function(){
  S.gymDraft.date     = document.getElementById('gym-date')?.value||'';
  S.gymDraft.duration = parseInt(document.getElementById('gym-dur')?.value)||60;
  S.gymDraft.notes    = document.getElementById('gym-notes')?.value||'';
};

window.updateDraftSet = function(block, exercise, idx, field, val){
  let ex = S.gymDraft.sets.find(s=>s.exercise===exercise && s.set_num===idx+1);
  if(!ex){ ex={block,exercise,set_num:idx+1,reps:null,weight_kg:null,rpe:null}; S.gymDraft.sets.push(ex); }
  ex[field] = (field==='rpe'||field==='weight_kg') ? parseFloat(val)||null : parseInt(val)||null;
};

window.clearGymDraft = function(){ S.gymDraft.sets=[]; S.gymDraft.notes=''; render(); };

window.submitGymSession = async function(){
  if(!S.user){ alert('Login dulu!'); return; }
  const dateVal = document.getElementById('gym-date')?.value;
  if(!dateVal){ alert('Isi tanggal dulu'); return; }
  const wk = weekFromDate(dateVal)||1;
  const dur = parseInt(document.getElementById('gym-dur')?.value)||60;
  const notes = document.getElementById('gym-notes')?.value||'';
  try{
    const session = await saveGymSession(S.user.id, S.quarterId, dateVal, wk, dur, notes);
    const validSets = S.gymDraft.sets.filter(s=>s.reps||s.weight_kg);
    if(validSets.length) await saveGymSets(session.id, validSets);
    S.gymDraft.sets=[]; S.gymDraft.notes='';
    S.gymSessions = await loadGymSessions(S.user.id, S.quarterId);
    render();
    alert('Sesi tersimpan!');
  }catch(e){ alert('Error: '+e.message); }
};

window.deleteSession = async function(id){
  if(!confirm('Hapus sesi ini?')) return;
  await deleteGymSession(id);
  S.gymSessions = await loadGymSessions(S.user.id, S.quarterId);
  render();
};

// ── CARDIO DRAFT ──
window.updateCardioDraft = function(){
  const d = S.cardioDraft;
  d.date       = document.getElementById('c-date')?.value||'';
  d.slot       = document.getElementById('c-slot')?.value||'Z1_NEAT';
  d.cardioType = document.getElementById('c-type')?.value||'incline_walk';
  d.duration   = parseInt(document.getElementById('c-dur')?.value)||60;
  d.distance   = document.getElementById('c-dist')?.value||'';
  d.hrAvg      = document.getElementById('c-hr')?.value||'';
  d.hrMax      = document.getElementById('c-hrmax')?.value||'';
  d.incline    = document.getElementById('c-incline')?.value||'';
  d.speed      = document.getElementById('c-speed')?.value||'';
  d.zone       = document.getElementById('c-zone')?.value||'Z1';
  d.notes      = document.getElementById('c-notes')?.value||'';
};

window.submitCardioEntry = async function(){
  if(!S.user){ alert('Login dulu!'); return; }
  const dateVal = document.getElementById('c-date')?.value;
  if(!dateVal){ alert('Isi tanggal'); return; }
  const wk = weekFromDate(dateVal)||1;
  const d = S.cardioDraft;
  try{
    await saveCardioEntry(S.user.id, S.quarterId, {
      logged_date:dateVal, week_num:wk,
      slot:d.slot, cardio_type:d.cardioType,
      duration_min:parseInt(d.duration)||null,
      distance_km:parseFloat(d.distance)||null,
      hr_avg:parseInt(d.hrAvg)||null,
      hr_max:parseInt(d.hrMax)||null,
      incline_pct:parseFloat(d.incline)||null,
      speed_kmh:parseFloat(d.speed)||null,
      zone:d.zone, notes:d.notes||null
    });
    S.cardioLog = await loadCardioLog(S.user.id, S.quarterId);
    render(); alert('Log tersimpan!');
  }catch(e){ alert('Error: '+e.message); }
};

window.deleteCardio = async function(id){
  if(!confirm('Hapus log ini?')) return;
  await deleteCardioEntry(id);
  S.cardioLog = await loadCardioLog(S.user.id, S.quarterId);
  render();
};

// ── AUTH ──
window.onAuthBtnClick = onAuthBtnClick;
window.closeAuthModal = closeAuthModal;
window.doLogin = doLogin;
document.getElementById('auth-modal')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeAuthModal();});
document.getElementById('auth-pass')?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});

// ── LIBRARY FILTERS ──
window.setLibFilter = function(field, value){
  S.libFilters[field] = value;
  renderPanel();
};
window.setLibSearch = function(value){
  S.libFilters.search = value;
  renderPanel();
};
window.resetLibFilters = function(){
  S.libFilters = { search:'', category:'all', muscle:'all', equipment:'all' };
  S.libView = 'grid';
  render();
};

// ── BODY MAP ──
window.setLibView = function(view){
  S.libView = view;
  renderPanel();
};

window.selectBodyMuscle = function(slug){
  S.libFilters.muscle = slug;
  S.libView = 'grid';
  renderPanel();
};

// ── ERROR BANNER ──
function showInitError(msg){
  const root = document.getElementById('panels-root');
  if(!root) return;
  root.innerHTML = `<div class="card" style="padding:1.25rem 1.5rem;border-left:4px solid var(--warn);background:var(--warn-bg)">
    <div style="font-size:14px;font-weight:800;color:var(--warn);margin-bottom:8px">⚠️ Init Error — App tidak bisa load data</div>
    <div style="font-size:11.5px;color:var(--t1);font-family:'JetBrains Mono',monospace;white-space:pre-wrap;background:var(--bg1);padding:10px;border-radius:6px;border:1px solid var(--bdr)">${msg}</div>
    <div style="font-size:10.5px;color:var(--t3);margin-top:10px">Buka F12 → Console untuk detail. Pastikan Supabase RLS allow public read untuk tables: quarters, quarter_content, gym_program, exercise_library.</div>
  </div>`;
}

// ── INIT ──
(async()=>{
  const errs = [];
  try { S.quarters = await loadQuarters(); } catch(e){ errs.push('loadQuarters: '+(e.message||e)); S.quarters=[]; }
  if(S.quarters.length) S.quarterId = S.quarters[0].quarter_id;

  try { S.exerciseLibrary = await loadExerciseLibrary(); } catch(e){ errs.push('loadExerciseLibrary: '+(e.message||e)); S.exerciseLibrary=[]; }
  try { await loadContent(); } catch(e){ errs.push('loadContent: '+(e.message||e)); }
  try { S.gymProgram = await loadGymProgram(S.quarterId); } catch(e){ errs.push('loadGymProgram: '+(e.message||e)); S.gymProgram=[]; }

  try {
    setupAuthListener(
      async(user)=>{ S.user=user; try{ await refreshData(); }catch(e){ console.error('refreshData:',e); } render(); },
      ()=>{ S.user=null; S.gymSessions=[]; S.cardioLog=[]; render(); }
    );
  } catch(e){ errs.push('setupAuthListener: '+(e.message||e)); }

  render();
  if(errs.length) showInitError(errs.join('\n'));
})();

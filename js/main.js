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

import { S, weekFromDate } from './state.js?v=31';
window.S = S;  // debug: inspect state from console
import {
  supa, loadQuarters, loadQuarterContent, loadGymProgram, loadGymSessions, loadGymSetsForQuarter,
  saveGymSession, saveGymSets, deleteGymSession,
  loadCardioLog, saveCardioEntry, deleteCardioEntry,
  loadExerciseLibrary,
  addExerciseLibraryItem,
  loadProgramSelections, addProgramSelection, removeProgramSelection, updateProgramTarget,
  seedSelectionsFromGymProgram,
  getStravaConnection, triggerStravaSync as apiTriggerStravaSync,
  setupAuthListener, updateAuthUI, onAuthBtnClick, doLogin,
  closeAuthModal
} from './supabase.js?v=31';
import {
  pOverview, pBuilder, pPlan, pLog, pLibrary
} from './panels.js?v=31';

// TAB definitions: 0=Overview, 1=Builder, 2=Plan, 3=Log, 4=Library
const TABS = [
  { i:0, l:'📊 Overview' },
  { i:1, l:'🛒 Builder' },
  { i:2, l:'📅 Plan' },
  { i:3, l:'✏️ Log' },
  { i:4, l:'📚 Library' },
];

// ── RENDER ──
function renderQselRow(){
  const el = document.getElementById('qsel-row');
  el.className = 'qsel-grid';

  if(!S.user){
    el.innerHTML = '';
    return;
  }

  if(!S.quarters?.length){
    el.innerHTML = '<div style="color:var(--t3);font-size:11px;padding:10px;grid-column:1/-1">Loading quarters…</div>';
    return;
  }

  // Sort per-quarter chronologically: Q1_2026 < Q2_2026 < Q3_2026 ...
  const parseQ = id => { const m=(id||'').match(/Q(\d)_(\d{4})/); return m ? parseInt(m[2])*10+parseInt(m[1]) : 9999; };
  const sorted = [...S.quarters].sort((a,b) => parseQ(a.quarter_id) - parseQ(b.quarter_id));
  // Show 4 quarters starting from Q2_2026
  const startIdx = Math.max(0, sorted.findIndex(q => q.quarter_id === 'Q2_2026'));
  const visible = sorted.slice(startIdx, startIdx + 4);

  const todayStr = new Date().toISOString().slice(0,10);
  el.innerHTML = visible.map(q => {
    const sel = S.quarterId === q.quarter_id;
    const isToday = q.date_start && q.date_end && q.date_start <= todayStr && todayStr <= q.date_end;
    const exCount = (S.programSel?.[q.quarter_id] || []).length;
    const weeks = q.total_weeks || 26;
    const wRange = q.window_raw || '—';
    const cardioCount = sel ? (S.cardioLog||[]).length : '—';
    const bbTarget = (q.bb_start && q.bb_end) ? `${q.bb_start}→${q.bb_end}kg` : (q.bb_end ? `→${q.bb_end}kg` : '—');
    return `<div class="ph-card${sel?' sel-all':''}" onclick="setQuarter('${q.quarter_id}')">
      <div class="ph-tag" style="color:var(--acc)">
        <div class="ph-dot" style="background:${exCount>0?'var(--acc)':'var(--t3)'}"></div>
        ${q.quarter_id.replace('_',' ')}
        ${sel ? '<span style="font-size:9px;background:var(--acc);color:#fff;padding:1px 6px;border-radius:8px;margin-left:6px;font-weight:800">AKTIF</span>' : ''}
        ${isToday && !sel ? '<span style="font-size:9px;background:var(--f3);color:#fff;padding:1px 6px;border-radius:8px;margin-left:6px;font-weight:800" title="Quarter ini berisi tanggal hari ini">HARI INI</span>' : ''}
      </div>
      <div class="ph-name">${q.quarter_id.replace('_',' ')}</div>
      <div class="ph-desc">${weeks} minggu · ${wRange}</div>
      <div class="ph-grid" style="grid-template-columns:1fr 1fr 1fr">
        <div class="ph-stat">
          <div class="ph-stat-l">Gym</div>
          <div class="ph-stat-v" style="color:${exCount>0?'var(--acc)':'var(--t3)'}">${exCount||'—'}</div>
        </div>
        <div class="ph-stat">
          <div class="ph-stat-l">Cardio</div>
          <div class="ph-stat-v" style="color:var(--f3)">${cardioCount}</div>
        </div>
        <div class="ph-stat">
          <div class="ph-stat-l">BB</div>
          <div class="ph-stat-v" style="font-size:10.5px;color:var(--t1)">${bbTarget}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function renderTabNav(){
  const el = document.getElementById('tab-nav');
  el.style.display='';
  el.innerHTML = TABS.map(t =>
    `<button class="tab-btn${S.tab===t.i?' act':''}" onclick="setTab(${t.i})">${t.l}</button>`
  ).join('');
}

function getContent(docType){
  return S.contentCache[`${S.quarterId}_${docType}`] || null;
}

function renderPanel(){
  const root = document.getElementById('panels-root');
  if(!root) return;
  const tabName = ['Overview','Builder','Plan','Log','Library'][S.tab] || `Tab ${S.tab}`;
  try {
    let html = '';
    if(S.tab===0)      html = pOverview();
    else if(S.tab===1) html = pBuilder();
    else if(S.tab===2) html = pPlan();
    else if(S.tab===3) html = pLog();
    else               html = pLibrary();
    root.innerHTML = html;
  } catch(e){
    console.error(`renderPanel(${tabName}):`, e);
    root.innerHTML = `<div class="card" style="padding:1.25rem 1.5rem;border-left:4px solid #EF4444;background:#FEE2E2">
      <div style="font-size:14px;font-weight:800;color:#991B1B;margin-bottom:8px">🔥 Panel Error — ${tabName}</div>
      <div style="font-size:11.5px;color:#1A2140;font-family:'JetBrains Mono',monospace;white-space:pre-wrap;background:white;padding:10px;border-radius:6px;border:1px solid #FCA5A5;max-height:300px;overflow:auto">${(e.stack||e.message||e).toString().replace(/</g,'&lt;')}</div>
      <div style="font-size:10.5px;color:#6B7280;margin-top:10px">Tab lain masih bisa diklik. Refresh setelah fix.</div>
    </div>`;
  }
}

function render(){
  renderQselRow();
  renderTabNav();
  renderPanel();
}
window.render = render;
window.renderPanels = renderPanel;

// ── QUARTER SYNERGY BRIDGE ──
function semFromQ(q){ return q; }
window.VHM_QUARTER_BRIDGE = { semFromQ };

// ── ACTIONS ──
async function setQuarter(qid){
  S.quarterId = qid;
  try {
    localStorage.setItem('vhm.activeQuarter', qid);
  } catch(e){}
  render();  // immediate visual feedback (gak nunggu DB async)
  try {
    await loadContent();
    if(S.user) await refreshData();
    render();  // refresh setelah data terload
  } catch(e){
    console.error('setQuarter:', e);
  }
}
window.setQuarter = setQuarter;

// Cross-app sync: app lain ubah quarter → kita switch ke semester yg cocok
window.addEventListener('storage', e => {
  if(e.key !== 'vhm.activeQuarter' || !e.newValue) return;
  const sem = semFromQ(e.newValue);
  if(!S.quarters?.some(q => q.quarter_id === sem)) return;
  if(S.quarterId === sem) return;
  setQuarter(sem);
});

function setTab(i){ S.tab=i; renderTabNav(); renderPanel(); }
window.setTab = setTab;

window.setLogSubTab = function(t){ S.logSubTab = t; renderPanel(); };
window.setCardioFilter = function(key, val){ S.cardioFilter[key] = val; renderPanel(); };

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
  S.gymSessions = await loadGymSessions(S.user.id, S.quarterId);
  S.cardioLog   = await loadCardioLog(S.user.id, S.quarterId);
  try { S.gymSetsLog = await loadGymSetsForQuarter(S.user.id, S.quarterId); }
  catch(e){ console.error('loadGymSetsForQuarter:', e); S.gymSetsLog = []; }
  try { S.stravaConnection = await getStravaConnection(S.user.id); }
  catch(e){ console.error('getStravaConnection:', e); S.stravaConnection = null; }
  try {
    S.programSel = await loadProgramSelections(S.user.id);
    S.programLoaded = true;
  } catch(e){ console.error('loadProgramSelections:', e); }
  await maybeSeedBuilder();
}

// Pre-populate Builder dari gym_program saat user pertama kali load quarter
// (atau ganti quarter) dan programSel kosong.
async function maybeSeedBuilder(){
  if(!S.user) return;
  const qid = S.quarterId;
  const existing = S.programSel[qid] || [];
  if(existing.length > 0) return;
  if(!S.gymProgram?.length) return;
  if(!S.exerciseLibrary?.length) return;
  try {
    const { unmatched } = await seedSelectionsFromGymProgram(
      S.user.id, qid, S.gymProgram, S.exerciseLibrary
    );
    // Always reload from DB — upsert with ignoreDuplicates returns [] for existing rows
    S.programSel = await loadProgramSelections(S.user.id);
    if((S.programSel[qid]||[]).length) S.programSeededFromTemplate[qid] = true;
    if(unmatched.length && !S._seedWarnedQuarters[qid]){
      console.warn(`[seedBuilder ${qid}] no library match for:`, unmatched);
      S._seedWarnedQuarters[qid] = true;
    }
  } catch(e){ console.error('maybeSeedBuilder:', e); }
}

window.dismissSeedBanner = function(){
  delete S.programSeededFromTemplate[S.quarterId];
  renderPanel();
};

// ── PROGRAM CART (drag & drop) ──
window.onDragStart = function(ev, slug){
  ev.dataTransfer.setData('text/plain', slug);
  ev.dataTransfer.effectAllowed = 'copy';
};
window.onDragOver = function(ev){
  ev.preventDefault();
  ev.currentTarget.classList.add('drag-over');
};
window.onDragLeave = function(ev){ ev.currentTarget.classList.remove('drag-over'); };
window.onDrop = async function(ev){
  ev.preventDefault();
  ev.currentTarget.classList.remove('drag-over');
  const slug = ev.dataTransfer.getData('text/plain');
  if(slug) await window.addToProgram(slug);
};

window.addToProgram = async function(slug){
  if(!S.user){ alert('Login dulu untuk save program!'); return; }
  // Skip if already in current quarter
  const sel = S.programSel[S.quarterId] || [];
  if(sel.find(s => s.exercise_slug === slug)) return;
  try {
    const row = await addProgramSelection(S.user.id, S.quarterId, slug);
    if(row){
      if(!S.programSel[S.quarterId]) S.programSel[S.quarterId] = [];
      S.programSel[S.quarterId].push(row);
    }
    renderPanel();
  } catch(e){ alert('Error: '+(e.message||e)); }
};

window.removeFromProgram = async function(id){
  try {
    await removeProgramSelection(id);
    Object.keys(S.programSel).forEach(qid => {
      S.programSel[qid] = (S.programSel[qid]||[]).filter(s => s.id !== id);
    });
    renderPanel();
  } catch(e){ alert('Error: '+(e.message||e)); }
};

window.updateTarget = async function(id, value, unit, note){
  try {
    await updateProgramTarget(id, value, unit, note);
    Object.keys(S.programSel).forEach(qid => {
      const s = (S.programSel[qid]||[]).find(x => x.id === id);
      if(s){ s.target_value = value; s.target_unit = unit; s.target_note = note; }
    });
  } catch(e){ alert('Error: '+(e.message||e)); }
};

window.onTargetBlur = async function(id, field, value){
  const sel = Object.values(S.programSel).flat().find(s => s.id === id);
  if(!sel) return;
  const val = (field==='target_value') ? (parseFloat(value)||null) : value;
  sel[field] = val;
  await updateProgramTarget(id, sel.target_value, sel.target_unit, sel.target_note);
};

// Handler untuk training_day + start_weight (extra fields di program selection)
window.onSelFieldBlur = async function(id, field, value){
  const sel = Object.values(S.programSel).flat().find(s => s.id === id);
  if(!sel) return;
  const val = field === 'start_weight' ? (parseFloat(value)||null) : (value||null);
  sel[field] = val;
  try {
    await updateProgramTarget(id, sel.target_value, sel.target_unit, sel.target_note, { [field]: val });
  } catch(e){ console.error('onSelFieldBlur:', e); }
};

// ── GYM DRAFT ──
window.updateGymDraftMeta = function(){
  S.gymDraft.date        = document.getElementById('gym-date')?.value||'';
  S.gymDraft.duration    = parseInt(document.getElementById('gym-dur')?.value)||60;
  S.gymDraft.notes       = document.getElementById('gym-notes')?.value||'';
  S.gymDraft.trainingDay = document.getElementById('gym-training-day')?.value||'';
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
    const trainingDay = document.getElementById('gym-training-day')?.value||null;
    const session = await saveGymSession(S.user.id, S.quarterId, dateVal, wk, dur, notes, trainingDay);
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
  d.date        = document.getElementById('c-date')?.value||'';
  d.trainingDay = document.getElementById('c-training-day')?.value||'';
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
      training_day: d.trainingDay || null,
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

// ── STRAVA HANDLERS ──
window.triggerStravaSync = async function(days=7){
  if(!S.user){ alert('Login dulu'); return; }
  let conn = S.stravaConnection;
  if(!conn){
    conn = await getStravaConnection(S.user.id);
    S.stravaConnection = conn;
  }
  if(!conn){
    alert('Belum konek Strava. Klik "Connect Strava" dulu di bawah ini.');
    return;
  }
  const btn = document.getElementById('btn-strava-sync');
  if(btn){ btn.disabled = true; btn.textContent = '⏳ Syncing...'; }
  try {
    const result = await apiTriggerStravaSync(conn.athlete_id, days);
    S.cardioLog = await loadCardioLog(S.user.id, S.quarterId);
    render();
    const cnt = result?.synced ?? result?.count ?? '?';
    alert(`✅ Strava sync selesai: ${cnt} activity di-import (last ${days} hari).`);
  } catch(e){
    alert('Strava sync error: ' + (e.message || e));
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = '🔗 Sync Strava'; }
  }
};

window.forceCheckStrava = async function(){
  if(!S.user){ alert('Login dulu'); return; }
  S.stravaConnection = await getStravaConnection(S.user.id);
  if(S.stravaConnection){
    alert(`✅ Strava connected: athlete #${S.stravaConnection.athlete_id}`);
  } else {
    alert(`❌ strava_tokens row tidak ditemukan untuk user_id ${S.user.id}.\n\nKemungkinan: user_id di DB beda dengan auth user lo. Run SQL: SELECT user_id, athlete_id FROM strava_tokens; lalu compare dengan ${S.user.id}`);
  }
  render();
};

window.connectStrava = function(){
  if(!S.user){ alert('Login dulu'); return; }
  // redirect_uri HARUS match domain di Strava dashboard "Authorization Callback Domain" = amirullahputra.github.io
  const redirectUri = 'https://amirullahputra.github.io/app_exercise/';
  const url = 'https://www.strava.com/oauth/authorize?' + new URLSearchParams({
    client_id: '238438',
    response_type: 'code',
    redirect_uri: redirectUri,
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
    state: S.user.id
  });
  window.location.href = url;
};

// Handle callback dari Strava saat redirect balik dengan ?code=... di URL.
// CATATAN: state IS the user_id (passed di connectStrava URL), jadi gak butuh S.user
// yang mungkin belum populate dari auth listener saat fungsi ini jalan.
async function handleStravaCallback(){
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const scope = params.get('scope') || '';
  if(!code) return;  // bukan callback dari Strava

  // Clear URL params supaya ga re-trigger pas refresh
  history.replaceState({}, document.title, window.location.pathname);

  // Build PowerShell command pre-filled supaya tinggal paste
  const pwsh =
    '$resp = Invoke-RestMethod -Method POST -Uri "https://www.strava.com/oauth/token" -Body @{\n' +
    '  client_id = "238438"\n' +
    '  client_secret = "d1f5dbc49b9c12adc026be4be17d1dd8185766b9"\n' +
    `  code = "${code}"\n` +
    '  grant_type = "authorization_code"\n' +
    '}\n$resp | ConvertTo-Json -Depth 5';

  alert(
    `✅ Strava authorize berhasil!\n\n` +
    `Code: ${code}\n` +
    `User ID (state): ${state}\n` +
    `Scope: ${scope}\n\n` +
    `LANGKAH SELANJUTNYA:\n` +
    `1. Buka DevTools Console (F12 → Console tab)\n` +
    `2. Copy PowerShell command yang udah ke-print di sana\n` +
    `3. Paste di PowerShell terminal → enter → response JSON\n` +
    `4. Copy access_token, refresh_token, expires_at, athlete.id\n` +
    `5. Run SQL INSERT (template ada di Console juga)\n` +
    `6. Refresh app → harusnya Connected`
  );

  // Print full PowerShell command + SQL template ke console biar tinggal copy
  console.log('━━━━━━━━━━ STRAVA OAUTH CALLBACK ━━━━━━━━━━');
  console.log('Code:', code);
  console.log('State (user_id):', state);
  console.log('Scope:', scope);
  console.log('\n--- STEP 2: PowerShell command ---\n');
  console.log(pwsh);
  console.log('\n--- STEP 3: SQL template ---\n');
  console.log(`INSERT INTO strava_tokens (user_id, athlete_id, access_token, refresh_token, expires_at, scope)
VALUES (
  '${state}',                       -- user_id (langsung pakai state, ga perlu lookup)
  <ATHLETE_ID>,                     -- dari response.athlete.id
  '<ACCESS_TOKEN>',                 -- dari response.access_token
  '<REFRESH_TOKEN>',                -- dari response.refresh_token
  <EXPIRES_AT>,                     -- dari response.expires_at (epoch number)
  '${scope}'
)
ON CONFLICT (athlete_id) DO UPDATE
SET user_id=EXCLUDED.user_id, access_token=EXCLUDED.access_token,
    refresh_token=EXCLUDED.refresh_token, expires_at=EXCLUDED.expires_at,
    scope=EXCLUDED.scope, updated_at=NOW();`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

window.disconnectStrava = async function(){
  if(!S.user) return;
  if(!confirm('Disconnect Strava? Activity sync auto akan berhenti, tapi data cardio yang udah masuk tetap ada.')) return;
  try {
    // Delete token via authFetch
    const url = `${supa.supabaseUrl}/rest/v1/strava_tokens?user_id=eq.${S.user.id}`;
    const jwt = (await supa.auth.getSession())?.data?.session?.access_token;
    await fetch(url, {
      method: 'DELETE',
      headers: {
        apikey: 'sb_publishable_yu8KTS5mId2hV7kVjScvZA_-geYqKHv',
        Authorization: `Bearer ${jwt}`,
        Prefer: 'return=minimal'
      }
    });
    S.stravaConnection = null;
    render();
    alert('Strava disconnected.');
  } catch(e){ alert('Disconnect error: ' + e.message); }
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

// ── ADD LIBRARY MODAL ──
const MUSCLE_OPTIONS = [
  'chest','back','lats','quads','hamstrings','glutes',
  'shoulders','rear_delts','biceps','triceps',
  'core','abs','obliques','calves','forearms',
  'hips','adductors','rotator_cuff','thoracic_spine'
];
let _addLibSelectedMuscles = new Set();

function slugify(s){
  return (s||'').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
}

window.openAddLibModal = function(){
  if(!S.user){ alert('Login dulu untuk tambah exercise!'); return; }
  _addLibSelectedMuscles = new Set();
  document.getElementById('add-lib-modal').classList.add('open');
  document.getElementById('al-name').value = '';
  document.getElementById('al-subcategory').value = '';
  document.getElementById('al-category').value = 'compound';
  document.getElementById('al-equipment').value = '';
  document.getElementById('al-err').textContent = '';
  document.getElementById('al-slug-preview').textContent = 'slug: —';
  // Render muscle chips
  document.getElementById('al-muscles').innerHTML = MUSCLE_OPTIONS.map(m =>
    `<button class="add-lib-musc-chip" data-muscle="${m}" onclick="toggleAddLibMuscle('${m}')">${m.replace(/_/g,' ')}</button>`
  ).join('');
  setTimeout(()=>document.getElementById('al-name').focus(), 50);
};

window.closeAddLibModal = function(){
  document.getElementById('add-lib-modal').classList.remove('open');
};

window.onAddLibNameChange = function(){
  const name = document.getElementById('al-name').value;
  const slug = slugify(name);
  document.getElementById('al-slug-preview').textContent = slug ? `slug: ${slug}` : 'slug: —';
};

window.toggleAddLibMuscle = function(slug){
  const btn = document.querySelector(`.add-lib-musc-chip[data-muscle="${slug}"]`);
  if(_addLibSelectedMuscles.has(slug)){
    _addLibSelectedMuscles.delete(slug);
    btn?.classList.remove('sel');
  } else {
    _addLibSelectedMuscles.add(slug);
    btn?.classList.add('sel');
  }
};

window.submitAddLib = async function(){
  const errEl = document.getElementById('al-err');
  const btn = document.getElementById('al-submit');
  errEl.textContent = '';
  const name = document.getElementById('al-name').value.trim();
  const slug = slugify(name);
  const category = document.getElementById('al-category').value;
  const equipment = document.getElementById('al-equipment').value || null;
  const subcategory = document.getElementById('al-subcategory').value.trim() || null;
  const muscles = Array.from(_addLibSelectedMuscles);

  if(!name){ errEl.textContent = 'Nama exercise harus diisi.'; return; }
  if(!slug){ errEl.textContent = 'Nama harus mengandung huruf/angka.'; return; }
  if(!muscles.length){ errEl.textContent = 'Pilih minimal 1 primary muscle.'; return; }

  // Check duplicate slug
  if((S.exerciseLibrary||[]).find(e => e.slug === slug)){
    errEl.textContent = `Slug "${slug}" sudah ada. Ganti nama exercise.`;
    return;
  }

  btn.disabled = true; btn.textContent = '⏳ Menyimpan...';
  try {
    const newItem = await addExerciseLibraryItem({
      name, slug, category, equipment, subcategory,
      primary_muscles: muscles
    });
    // Append to local cache + re-render
    S.exerciseLibrary = [...(S.exerciseLibrary||[]), newItem]
      .sort((a,b) => (a.category||'').localeCompare(b.category||'') || (a.name||'').localeCompare(b.name||''));
    closeAddLibModal();
    render();
  } catch(e){
    errEl.textContent = 'Gagal simpan: ' + (e.message || e);
    if((e.message||'').includes('row-level security')){
      errEl.textContent += '\n→ RLS policy belum allow user write. Cek SQL.';
    }
  } finally {
    btn.disabled = false; btn.textContent = '💾 Simpan';
  }
};

document.getElementById('add-lib-modal')?.addEventListener('click', e => {
  if(e.target === e.currentTarget) closeAddLibModal();
});

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
    <div style="font-size:10.5px;color:var(--t3);margin-top:10px">Buka F12 → Console untuk detail. Pastikan Supabase RLS allow public read untuk tables: master_timeline, gym_program, exercise_library.</div>
  </div>`;
}

// ── INIT ──

// Register auth listener PALING AWAL — biar Supabase event saat localStorage session
// restored ke-catch + UI ga tampil "Login" sebentar saat reload page.
try {
  setupAuthListener(
    async(user)=>{ S.user=user; try{ await refreshData(); }catch(e){ console.error('refreshData:',e); } render(); },
    ()=>{ S.user=null; S.gymSessions=[]; S.cardioLog=[]; S.programSel={}; S.programLoaded=false; render(); }
  );
} catch(e){ console.error('setupAuthListener:', e); }

// Render skeleton SEKALI di awal — supaya UI tampil cepat meski data masih load
render();

// Handle Strava OAuth callback kalau ?code= di URL (setelah user authorize di Strava)
handleStravaCallback();

(async()=>{
  const errs = [];
  try { S.quarters = await loadQuarters(); } catch(e){ errs.push('loadQuarters: '+(e.message||e)); S.quarters=[]; }
  if(S.quarters.length){
    // Try shared cross-app key first
    let initSem = null;
    try {
      const sharedQ = localStorage.getItem('vhm.activeQuarter');
      if(sharedQ) initSem = semFromQ(sharedQ);
    } catch(e){}
    const found = initSem && S.quarters.find(q => q.quarter_id === initSem);
    // Auto-detect quarter berdasarkan tanggal hari ini (date_start <= today <= date_end)
    const todayStr = new Date().toISOString().slice(0,10);
    const currentQ = S.quarters.find(q =>
      q.date_start && q.date_end &&
      q.date_start <= todayStr && todayStr <= q.date_end
    );
    const defaultQ = currentQ || S.quarters.find(q => q.quarter_id === 'Q2_2026') || S.quarters[0];
    S.quarterId = found ? initSem : defaultQ.quarter_id;
  }
  render();  // refresh setelah quarters load

  // Public reads paralel (sudah pakai restFetch, safe)
  try { S.exerciseLibrary = await loadExerciseLibrary(); } catch(e){ errs.push('loadExerciseLibrary: '+(e.message||e)); S.exerciseLibrary=[]; }
  try { await loadContent(); } catch(e){ errs.push('loadContent: '+(e.message||e)); }
  try { S.gymProgram = await loadGymProgram(S.quarterId); } catch(e){ errs.push('loadGymProgram: '+(e.message||e)); S.gymProgram=[]; }
  render();

  // setupAuthListener udah di-register di awal — gak perlu duplicate disini

  if(errs.length) console.warn('[init errors]', errs);
})();

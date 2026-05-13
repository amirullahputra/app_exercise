// ══════════════════════════════════════════════════════════
// SUPABASE — client + auth + DB helpers
// ══════════════════════════════════════════════════════════
const SUPA_URL = 'https://guhhoqpvwzzrlwgfugsb.supabase.co';
const SUPA_KEY = 'sb_publishable_yu8KTS5mId2hV7kVjScvZA_-geYqKHv';
export const supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);

// ── REST FETCH (untuk public reads — bypass GoTrueClient hang issue) ──
// Pattern dari pep_fl: supa.from() bisa hang silent di Chrome incognito karena
// GoTrueClient acquire navigator.locks. Untuk PUBLIC tables (RLS public_read),
// pakai plain fetch ke REST endpoint biar bypass.
async function restFetch(table, query=''){
  const url = `${SUPA_URL}/rest/v1/${table}${query?'?'+query:''}`;
  const res = await fetch(url, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
  });
  if(!res.ok){
    const body = await res.text().catch(()=>'');
    throw new Error(`${table}: HTTP ${res.status} ${body.slice(0,200)}`);
  }
  return res.json();
}

// Timeout wrapper untuk async ops yang bisa hang
function withTimeout(promise, ms, label){
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout ${ms}ms`)), ms))
  ]);
}

// ── AUTH FETCH (untuk authed writes — bypass GoTrueClient juga) ──
// Pattern dari pep_fl: supa.from() with auth bisa hang karena GoTrueClient.
// Pakai plain fetch + JWT dari localStorage langsung.
let _jwt = null;
function readJwtFromStorage(){
  try {
    const projectRef = SUPA_URL.match(/https:\/\/([^.]+)/)?.[1];
    if(!projectRef) return null;
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || parsed?.[0] || null;
  } catch(_){ return null; }
}

async function authFetch(table, query='', opts={}){
  const jwt = _jwt || readJwtFromStorage();
  if(!jwt) throw new Error(`${table}: no auth session — login dulu`);
  const url = `${SUPA_URL}/rest/v1/${table}${query?'?'+query:''}`;
  const headers = {
    apikey: SUPA_KEY,
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {})
  };
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body });
  if(!res.ok){
    const body = await res.text().catch(()=>'');
    throw new Error(`${table}: HTTP ${res.status} ${body.slice(0,300)}`);
  }
  if(res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── AUTH ──
export function openAuthModal(){ document.getElementById('auth-modal').classList.add('open'); }
export function closeAuthModal(){ document.getElementById('auth-modal').classList.remove('open'); document.getElementById('auth-err').textContent=''; }

export function updateAuthUI(user){
  const lbl = document.getElementById('auth-user-label');
  const btn = document.getElementById('auth-action-btn');
  const sub = document.getElementById('topbar-sub');
  const DISPLAY_NAMES = { 'amirullahpw': 'Amirullah Putra Wijaya' };
  if(user){
    const key = user.email.split('@')[0];
    const uname = DISPLAY_NAMES[key] || key;
    lbl.textContent = '👤 ' + key;
    btn.textContent = 'Logout'; btn.classList.add('logout');
    if(sub) sub.textContent = uname + ' · VHM 2026–2029';
  } else {
    lbl.textContent = ''; btn.textContent = 'Login'; btn.classList.remove('logout');
    if(sub) sub.textContent = 'VHM 2026–2029';
  }
}

export function onAuthBtnClick(){
  const btn = document.getElementById('auth-action-btn');
  if(btn.classList.contains('logout')) supa.auth.signOut();
  else openAuthModal();
}

export async function doLogin(){
  const email = document.getElementById('auth-user').value.trim();
  const pass  = document.getElementById('auth-pass').value;
  const errEl = document.getElementById('auth-err');
  errEl.textContent = '';
  if(!email){ errEl.textContent = 'Email kosong.'; return; }
  const { error } = await supa.auth.signInWithPassword({ email, password: pass });
  if(error){ errEl.textContent = 'Email atau password salah.'; return; }
  closeAuthModal();
}

export function setupAuthListener(onLogin, onLogout){
  supa.auth.onAuthStateChange(async (event, session) => {
    if(session?.access_token) _jwt = session.access_token;
    else _jwt = null;
    updateAuthUI(session?.user || null);
    if(session?.user) await onLogin(session.user);
    else onLogout();
  });
}

export async function getCurrentUser(){
  const { data: { user } } = await supa.auth.getUser();
  return user;
}

// ── QUARTERS (per-period, individual quarters — pakai restFetch bypass) ──
let _quarters = null;
let _quartersLoaded = false;
export async function loadQuarters(){
  if(_quartersLoaded) return _quarters;
  // master_timeline ga punya kolom phase_type — pakai focus_exercise/label_short sebagai fallback display.
  const data = await restFetch('master_timeline',
    'select=period_id,date_start,date_end,week_start,week_end,bb_start_kg,bb_end_kg,bf_start_pct,bf_end_pct,focus_exercise,label_short,sort_order&order=sort_order.asc');

  const fmtD = d => { if(!d) return ''; const dt = new Date(d); return dt.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }); };
  _quarters = (data || []).filter(r => r.period_id).map(r => ({
    quarter_id:  r.period_id,
    bb_start:    r.bb_start_kg,
    bb_end:      r.bb_end_kg,
    bf_start:    r.bf_start_pct,
    bf_end:      r.bf_end_pct,
    date_start:  r.date_start,
    date_end:    r.date_end,
    // Phase display: pakai focus_exercise (e.g. "Hypertrophy") atau label_short ("Q3 2026 Bulk") sebagai fallback
    phase_type:  r.focus_exercise || r.label_short || null,
    total_weeks: (r.week_start && r.week_end) ? (r.week_end - r.week_start + 1) : 13,
    window_raw:  (r.date_start && r.date_end) ? `${fmtD(r.date_start)} → ${fmtD(r.date_end)}` : '',
  }));
  _quartersLoaded = true;
  return _quarters;
}

// ── QUARTER CONTENT (markdown dari master_timeline.content_*_md) ──
// quarterId bisa semester_id (Q3Q4_2026) atau period_id (Q3_2026); content
// duplicate antara 2 row dalam 1 semester, jadi LIMIT 1 cukup.
export async function loadQuarterContent(quarterId, docTypes=['GYM','CARDIO']){
  try {
    const rows = await restFetch('master_timeline',
      `select=content_target_md,content_peptide_md,content_gym_md,content_cardio_md,content_nutrisi_md,content_vitamin_md&or=(semester_id.eq.${quarterId},period_id.eq.${quarterId})&limit=1`);
    const data = (rows||[])[0];
    if(!data) return {};
    const result = {};
    for(const t of docTypes){
      const col = `content_${t.toLowerCase()}_md`;
      if(data[col]) result[t] = data[col];
    }
    return result;
  } catch(e){ console.error('loadQuarterContent:', e); return {}; }
}

// ── GYM PROGRAM (template per quarter — public read) ──
export async function loadGymProgram(quarterId){
  try {
    const data = await restFetch('gym_program',
      `select=block,exercise,target_sets,target_reps,target_rpe,notes,sort_order&quarter_id=eq.${quarterId}&order=sort_order.asc`);
    return data || [];
  } catch(e){ console.error('loadGymProgram:', e); return []; }
}

// ── GYM SESSIONS (authFetch — bypass GoTrueClient hang) ──
export async function loadGymSessions(userId, quarterId){
  try {
    const data = await authFetch('gym_sessions',
      `select=id,session_date,week_num,duration_min,notes,training_day&user_id=eq.${userId}&quarter_id=eq.${quarterId}&order=session_date.desc`);
    return data || [];
  } catch(e){ console.error('loadGymSessions:', e); return []; }
}

export async function loadGymSets(sessionId){
  try {
    const data = await authFetch('gym_sets',
      `select=id,block,exercise,set_num,reps,weight_kg,rpe,notes&session_id=eq.${sessionId}&order=block.asc,set_num.asc`);
    return data || [];
  } catch(e){ console.error('loadGymSets:', e); return []; }
}

// Load semua gym_sets di quarter — pakai authFetch + embedded inner join
export async function loadGymSetsForQuarter(userId, quarterId){
  try {
    const data = await authFetch('gym_sets',
      `select=exercise,weight_kg,reps,rpe,gym_sessions!inner(session_date,week_num,user_id,quarter_id)&gym_sessions.user_id=eq.${userId}&gym_sessions.quarter_id=eq.${quarterId}`);
    return (data || []).map(r => ({
      exercise: r.exercise,
      weight_kg: r.weight_kg,
      reps: r.reps,
      rpe: r.rpe,
      session_date: r.gym_sessions?.session_date,
      week_num: r.gym_sessions?.week_num,
    }));
  } catch(e){ console.error('loadGymSetsForQuarter:', e); return []; }
}

export async function saveGymSession(userId, quarterId, sessionDate, weekNum, durationMin, notes, trainingDay){
  const data = await authFetch('gym_sessions', '', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId, quarter_id: quarterId,
      session_date: sessionDate, week_num: weekNum,
      duration_min: durationMin, notes: notes || null,
      training_day: trainingDay || null,
    })
  });
  if(!Array.isArray(data) || data.length === 0) throw new Error('gym_sessions: insert returned empty (RLS?)');
  return data[0];
}

export async function saveGymSets(sessionId, sets){
  if(!sets.length) return;
  const rows = sets.map((s,i) => ({
    session_id: sessionId, block: s.block, exercise: s.exercise,
    set_num: s.set_num || i+1, reps: s.reps, weight_kg: s.weight_kg,
    rpe: s.rpe, notes: s.notes || null
  }));
  await authFetch('gym_sets', '', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(rows)
  });
}

export async function deleteGymSession(sessionId){
  await authFetch('gym_sessions', `id=eq.${sessionId}`, {
    method: 'DELETE', headers: { Prefer: 'return=minimal' }
  });
}

// ── CARDIO LOG (authFetch) ──
export async function loadCardioLog(userId, quarterId){
  try {
    const data = await authFetch('cardio_log',
      `select=id,logged_date,week_num,slot,cardio_type,duration_min,distance_km,hr_avg,hr_max,incline_pct,speed_kmh,zone,notes,training_day,strava_id&user_id=eq.${userId}&quarter_id=eq.${quarterId}&order=logged_date.desc`);
    return data || [];
  } catch(e){ console.error('loadCardioLog:', e); return []; }
}

export async function saveCardioEntry(userId, quarterId, entry){
  const data = await authFetch('cardio_log', '', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: userId, quarter_id: quarterId, ...entry })
  });
  if(!Array.isArray(data) || data.length === 0) throw new Error('cardio_log: insert returned empty (RLS?)');
  return data[0];
}

export async function deleteCardioEntry(id){
  await authFetch('cardio_log', `id=eq.${id}`, {
    method: 'DELETE', headers: { Prefer: 'return=minimal' }
  });
}

// ── EXERCISE LIBRARY (public read, restFetch bypass) ──
let _exerciseLibrary = null;
let _exerciseLibraryLoaded = false;
export async function loadExerciseLibrary(){
  if(_exerciseLibraryLoaded && _exerciseLibrary?.length) return _exerciseLibrary;
  const data = await restFetch('exercise_library',
    'select=*&order=category.asc,name.asc');
  _exerciseLibrary = data || [];
  _exerciseLibraryLoaded = true;
  return _exerciseLibrary;
}

// ── ADD EXERCISE TO LIBRARY (authFetch) ──
export async function addExerciseLibraryItem(item){
  const data = await authFetch('exercise_library', '', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(item)
  });
  if(!Array.isArray(data) || data.length === 0) throw new Error('exercise_library: insert returned empty (RLS?)');
  _exerciseLibrary = null;
  _exerciseLibraryLoaded = false;
  return data[0];
}

// ── PROGRAM SELECTIONS (authFetch) ──
export async function loadProgramSelections(userId){
  if(!userId) return {};
  try {
    const data = await authFetch('exercise_program_selections',
      `select=id,quarter_id,exercise_slug,target_value,target_unit,target_note,sort_order,training_day,start_weight&user_id=eq.${userId}&order=sort_order.asc`);
    const out = {};
    (data||[]).forEach(r => {
      if(!out[r.quarter_id]) out[r.quarter_id] = [];
      out[r.quarter_id].push(r);
    });
    return out;
  } catch(e){ console.error('loadProgramSelections:', e); return {}; }
}

export async function addProgramSelection(userId, quarterId, slug){
  try {
    const data = await authFetch('exercise_program_selections', '', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId, quarter_id: quarterId, exercise_slug: slug,
        sort_order: Date.now() % 1000000
      })
    });
    return Array.isArray(data) ? data[0] : data;
  } catch(e){
    if((e.message||'').includes('23505')) return null;  // duplicate
    console.error('addProgramSelection:', e); throw e;
  }
}

export async function removeProgramSelection(id){
  await authFetch('exercise_program_selections', `id=eq.${id}`, {
    method: 'DELETE', headers: { Prefer: 'return=minimal' }
  });
}

export async function updateProgramTarget(id, target_value, target_unit, target_note, extras={}){
  await authFetch('exercise_program_selections', `id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ target_value, target_unit, target_note, ...extras, updated_at: new Date().toISOString() })
  });
}

// Seed exercise_program_selections from gym_program template for a quarter.
// Returns array of inserted rows (matched library entries only). Skips name-mismatches.
export async function seedSelectionsFromGymProgram(userId, quarterId, gymProgramRows, exerciseLibrary){
  if(!userId || !gymProgramRows?.length) return { inserted: [], unmatched: [] };
  const unmatched = [];
  const rows = gymProgramRows.map((g, i) => {
    const name = (g.exercise || '').trim().toLowerCase();
    const lib = (exerciseLibrary || []).find(e => e.name.trim().toLowerCase() === name);
    if(!lib){ unmatched.push(g.exercise); return null; }
    return {
      user_id: userId,
      quarter_id: quarterId,
      exercise_slug: lib.slug,
      target_value: g.target_reps || null,
      target_unit: g.target_reps ? 'reps' : null,
      target_note: [g.target_sets && `${g.target_sets}×${g.target_reps||'?'}`, g.target_rpe && `RPE ${g.target_rpe}`].filter(Boolean).join(' @ ') || null,
      sort_order: g.sort_order ?? i,
    };
  }).filter(Boolean);
  if(!rows.length) return { inserted: [], unmatched };
  try {
    const data = await authFetch('exercise_program_selections', 'on_conflict=user_id,quarter_id,exercise_slug', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(rows)
    });
    return { inserted: data || [], unmatched };
  } catch(e){
    if((e.message||'').includes('23505')) return { inserted: [], unmatched };
    console.error('seedSelectionsFromGymProgram:', e);
    throw e;
  }
}

// ── STRAVA INTEGRATION ──
// Cek apakah user udah konek Strava (strava_tokens row exists)
export async function getStravaConnection(userId){
  try {
    const data = await authFetch('strava_tokens',
      `select=athlete_id,scope,expires_at,updated_at&user_id=eq.${userId}`);
    return (data || [])[0] || null;
  } catch(e){ console.error('getStravaConnection:', e); return null; }
}

// Trigger manual backfill via webhook /sync endpoint (no auth — service_role internal)
export async function triggerStravaSync(athleteId, days=7){
  const res = await fetch(`${SUPA_URL}/functions/v1/strava-webhook/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPA_KEY },
    body: JSON.stringify({ athlete_id: athleteId, days })
  });
  if(!res.ok){
    const body = await res.text().catch(()=>'');
    throw new Error(`Sync failed: HTTP ${res.status} ${body.slice(0,200)}`);
  }
  return res.json().catch(()=>({}));
}

// ── BODY COMP LOG ──
export async function loadBodyComp(userId, quarterId){
  const { data } = await supa.from('body_comp_log')
    .select('id,logged_date,week_num,weight_kg,bf_pct,lbm_kg,waist_cm,notes')
    .eq('user_id', userId).eq('quarter_id', quarterId)
    .order('logged_date', { ascending: true });
  return data || [];
}

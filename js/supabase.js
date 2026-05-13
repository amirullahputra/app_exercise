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

// ── AUTH ──
export function openAuthModal(){ document.getElementById('auth-modal').classList.add('open'); }
export function closeAuthModal(){ document.getElementById('auth-modal').classList.remove('open'); document.getElementById('auth-err').textContent=''; }

export function updateAuthUI(user){
  const lbl = document.getElementById('auth-user-label');
  const btn = document.getElementById('auth-action-btn');
  if(user){
    lbl.textContent = '👤 ' + (user.email.split('@')[0]);
    btn.textContent = 'Logout'; btn.classList.add('logout');
  } else {
    lbl.textContent = ''; btn.textContent = 'Login'; btn.classList.remove('logout');
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
  const data = await restFetch('master_timeline',
    'select=period_id,date_start,date_end,week_start,week_end,bb_start_kg,bb_end_kg,bf_start_pct,bf_end_pct,sort_order&order=sort_order.asc');

  const fmtD = d => { if(!d) return ''; const dt = new Date(d); return dt.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }); };
  _quarters = (data || []).filter(r => r.period_id).map(r => ({
    quarter_id:  r.period_id,
    bb_start:    r.bb_start_kg,
    bb_end:      r.bb_end_kg,
    bf_start:    r.bf_start_pct,
    bf_end:      r.bf_end_pct,
    date_start:  r.date_start,
    date_end:    r.date_end,
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

// ── GYM SESSIONS ──
export async function loadGymSessions(userId, quarterId){
  const { data } = await supa.from('gym_sessions')
    .select('id,session_date,week_num,duration_min,notes,training_day')
    .eq('user_id', userId).eq('quarter_id', quarterId)
    .order('session_date', { ascending: false });
  return data || [];
}

export async function loadGymSets(sessionId){
  const { data } = await supa.from('gym_sets')
    .select('id,block,exercise,set_num,reps,weight_kg,rpe,notes')
    .eq('session_id', sessionId)
    .order('block').order('set_num');
  return data || [];
}

// Load semua gym_sets dari semua sesi user di quarter ini — untuk Progress Overload diagram
export async function loadGymSetsForQuarter(userId, quarterId){
  const { data } = await supa.from('gym_sets')
    .select('exercise,weight_kg,reps,rpe,gym_sessions!inner(session_date,week_num,user_id,quarter_id)')
    .eq('gym_sessions.user_id', userId)
    .eq('gym_sessions.quarter_id', quarterId);
  // Flatten: tiap row jadi {exercise, weight_kg, reps, rpe, session_date, week_num}
  return (data || []).map(r => ({
    exercise: r.exercise,
    weight_kg: r.weight_kg,
    reps: r.reps,
    rpe: r.rpe,
    session_date: r.gym_sessions?.session_date,
    week_num: r.gym_sessions?.week_num,
  }));
}

export async function saveGymSession(userId, quarterId, sessionDate, weekNum, durationMin, notes, trainingDay){
  const { data, error } = await supa.from('gym_sessions').insert({
    user_id: userId, quarter_id: quarterId,
    session_date: sessionDate, week_num: weekNum,
    duration_min: durationMin, notes: notes || null,
    training_day: trainingDay || null,
  }).select().single();
  if(error) throw error;
  return data;
}

export async function saveGymSets(sessionId, sets){
  if(!sets.length) return;
  const rows = sets.map((s,i) => ({
    session_id: sessionId, block: s.block, exercise: s.exercise,
    set_num: s.set_num || i+1, reps: s.reps, weight_kg: s.weight_kg,
    rpe: s.rpe, notes: s.notes || null
  }));
  const { error } = await supa.from('gym_sets').insert(rows);
  if(error) throw error;
}

export async function deleteGymSession(sessionId){
  await supa.from('gym_sessions').delete().eq('id', sessionId);
}

// ── CARDIO LOG ──
export async function loadCardioLog(userId, quarterId){
  const { data } = await supa.from('cardio_log')
    .select('id,logged_date,week_num,slot,cardio_type,duration_min,distance_km,hr_avg,hr_max,incline_pct,speed_kmh,zone,notes,training_day')
    .eq('user_id', userId).eq('quarter_id', quarterId)
    .order('logged_date', { ascending: false });
  return data || [];
}

export async function saveCardioEntry(userId, quarterId, entry){
  const { data, error } = await supa.from('cardio_log').insert({
    user_id: userId, quarter_id: quarterId, ...entry
  }).select().single();
  if(error) throw error;
  return data;
}

export async function deleteCardioEntry(id){
  await supa.from('cardio_log').delete().eq('id', id);
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

// ── ADD EXERCISE TO LIBRARY (authenticated user) ──
export async function addExerciseLibraryItem(item){
  // item: { name, slug, category, primary_muscles[], equipment?, subcategory? }
  const { data, error } = await supa.from('exercise_library')
    .insert(item)
    .select()
    .single();
  if(error){ console.error('addExerciseLibraryItem:', error); throw error; }
  // Reset cache so next loadExerciseLibrary picks up new entry
  _exerciseLibrary = null;
  _exerciseLibraryLoaded = false;
  return data;
}

// ── PROGRAM SELECTIONS (cart per quarter) ──
export async function loadProgramSelections(userId){
  if(!userId) return {};
  const { data, error } = await supa.from('exercise_program_selections')
    .select('id,quarter_id,exercise_slug,target_value,target_unit,target_note,sort_order,training_day,start_weight')
    .eq('user_id', userId)
    .order('sort_order');
  if(error){ console.error('loadProgramSelections:', error); throw error; }
  // Group by quarter
  const out = {};
  (data||[]).forEach(r => {
    if(!out[r.quarter_id]) out[r.quarter_id] = [];
    out[r.quarter_id].push(r);
  });
  return out;
}

export async function addProgramSelection(userId, quarterId, slug){
  const { data, error } = await supa.from('exercise_program_selections').insert({
    user_id: userId, quarter_id: quarterId, exercise_slug: slug,
    sort_order: Date.now() % 1000000
  }).select().single();
  if(error && error.code !== '23505'){ // ignore duplicate (already in cart)
    console.error('addProgramSelection:', error); throw error;
  }
  return data;
}

export async function removeProgramSelection(id){
  const { error } = await supa.from('exercise_program_selections').delete().eq('id', id);
  if(error){ console.error('removeProgramSelection:', error); throw error; }
}

export async function updateProgramTarget(id, target_value, target_unit, target_note, extras={}){
  const { error } = await supa.from('exercise_program_selections')
    .update({ target_value, target_unit, target_note, ...extras, updated_at: new Date().toISOString() })
    .eq('id', id);
  if(error){ console.error('updateProgramTarget:', error); throw error; }
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
  const { data, error } = await supa.from('exercise_program_selections')
    .upsert(rows, { onConflict: 'user_id,quarter_id,exercise_slug', ignoreDuplicates: true })
    .select();
  if(error && error.code !== '23505'){
    console.error('seedSelectionsFromGymProgram:', error);
    throw error;
  }
  return { inserted: data || [], unmatched };
}

// ── BODY COMP LOG ──
export async function loadBodyComp(userId, quarterId){
  const { data } = await supa.from('body_comp_log')
    .select('id,logged_date,week_num,weight_kg,bf_pct,lbm_kg,waist_cm,notes')
    .eq('user_id', userId).eq('quarter_id', quarterId)
    .order('logged_date', { ascending: true });
  return data || [];
}

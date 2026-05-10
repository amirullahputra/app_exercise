// ══════════════════════════════════════════════════════════
// SUPABASE — client + auth + DB helpers
// ══════════════════════════════════════════════════════════
const SUPA_URL = 'https://guhhoqpvwzzrlwgfugsb.supabase.co';
const SUPA_KEY = 'sb_publishable_yu8KTS5mId2hV7kVjScvZA_-geYqKHv';
export const supa = window.supabase.createClient(SUPA_URL, SUPA_KEY);

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

// ── QUARTERS ──
let _quarters = null;
export async function loadQuarters(){
  if(_quarters) return _quarters;
  const { data } = await supa.from('quarters')
    .select('quarter_id,phase_type,window_raw,total_weeks,bb_start,bb_end,bf_start,bf_end')
    .order('quarter_id');
  _quarters = data || [];
  return _quarters;
}

// ── QUARTER CONTENT (markdown dari Roadmap2029) ──
export async function loadQuarterContent(quarterId, docTypes=['GYM','CARDIO']){
  const { data } = await supa.from('quarter_content')
    .select('doc_type,content_md')
    .eq('quarter_id', quarterId)
    .in('doc_type', docTypes);
  const result = {};
  if(data) data.forEach(r => { result[r.doc_type] = r.content_md; });
  return result;
}

// ── GYM PROGRAM (template per quarter) ──
export async function loadGymProgram(quarterId){
  const { data } = await supa.from('gym_program')
    .select('block,exercise,target_sets,target_reps,target_rpe,notes,sort_order')
    .eq('quarter_id', quarterId)
    .order('sort_order');
  return data || [];
}

// ── GYM SESSIONS ──
export async function loadGymSessions(userId, quarterId){
  const { data } = await supa.from('gym_sessions')
    .select('id,session_date,week_num,duration_min,notes')
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

export async function saveGymSession(userId, quarterId, sessionDate, weekNum, durationMin, notes){
  const { data, error } = await supa.from('gym_sessions').insert({
    user_id: userId, quarter_id: quarterId,
    session_date: sessionDate, week_num: weekNum,
    duration_min: durationMin, notes: notes || null
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
    .select('id,logged_date,week_num,slot,cardio_type,duration_min,distance_km,hr_avg,hr_max,incline_pct,speed_kmh,zone,notes')
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

// ── BODY COMP LOG ──
export async function loadBodyComp(userId, quarterId){
  const { data } = await supa.from('body_comp_log')
    .select('id,logged_date,week_num,weight_kg,bf_pct,lbm_kg,waist_cm,notes')
    .eq('user_id', userId).eq('quarter_id', quarterId)
    .order('logged_date', { ascending: true });
  return data || [];
}

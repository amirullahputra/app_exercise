// ══════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════
export const S = {
  layer: 'library',    // 'library' | 'gym' | 'cardio'
  tab: 0,
  quarterId: 'Q3Q4_2026',
  quarters: [],
  user: null,

  // exercise library (Phase 1)
  exerciseLibrary: [],
  libFilters: {
    search: '',
    category: 'all',   // 'all'|'compound'|'isolation'|'run'|'bike'|'swim'|'mobility'|'stability'
    muscle: 'all',
    equipment: 'all',
  },
  libView: 'grid',     // 'grid' | 'map'

  // gym
  gymProgram: [],      // template exercises from DB
  gymSessions: [],     // logged sessions
  gymDraft: {          // active session being entered
    date: '',
    weekNum: 1,
    duration: 60,
    notes: '',
    sets: [],          // [{block, exercise, set_num, reps, weight_kg, rpe}]
  },

  // content from quarter_content (markdown)
  contentCache: {},   // { 'Q3Q4_2026_GYM': '...md...', ... }

  // cardio
  cardioLog: [],
  cardioDraft: {
    date: '',
    weekNum: 1,
    slot: 'Z1_NEAT',
    cardioType: 'incline_walk',
    duration: 60,
    distance: '',
    hrAvg: '',
    hrMax: '',
    incline: '',
    speed: '',
    zone: 'Z1',
    notes: '',
  },
};

export function rpeColor(rpe){
  if(!rpe) return 'var(--t3)';
  if(rpe <= 6) return 'var(--f3)';
  if(rpe <= 8) return 'var(--f2)';
  return 'var(--warn)';
}

export function fmtDate(d){
  if(!d) return '—';
  return new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
}

export function weekFromDate(dateStr, protocolStart='2026-07-06'){
  const d = new Date(dateStr);
  const s = new Date(protocolStart);
  const diff = Math.floor((d - s) / (1000*60*60*24));
  if(diff < 0) return null;
  return Math.min(Math.floor(diff/7)+1, 56);
}

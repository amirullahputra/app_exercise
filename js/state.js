// ══════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════
export const S = {
  // Tab structure (no more layers)
  // 0=Overview, 1=Builder, 2=Plan, 3=Log, 4=Library
  tab: 0,                       // default ke Overview
  logSubTab: 'gym',             // 'gym' | 'cardio' inside Log tab
  quarterId: 'Q2_2026',
  quarters: [],
  user: null,

  // exercise library (catalog)
  exerciseLibrary: [],
  libFilters: {
    search: '',
    category: 'all',   // 'all'|'compound'|'isolation'|'run'|'bike'|'swim'|'mobility'|'stability'
    muscle: 'all',
    equipment: 'all',
  },
  libView: 'grid',     // 'grid' | 'map'

  // PROGRAM SELECTIONS — cart per quarter
  // { 'Q3Q4_2026': [ {exercise_slug, target_value, target_unit, target_note, sort_order}, ... ] }
  programSel: {},
  programLoaded: false,
  programSeededFromTemplate: {},  // { quarterId: true } — set saat builder di-seed dari gym_program

  // suppress per-quarter unmatched warnings
  _seedWarnedQuarters: {},

  // gym
  gymProgram: [],      // template exercises from DB
  gymSessions: [],     // logged sessions
  gymSetsLog: [],      // semua sets logged user di quarter ini — untuk progress overload diagram
  gymDraft: {          // active session being entered
    date: '',
    weekNum: 1,
    duration: 60,
    notes: '',
    trainingDay: '',   // e.g. 'Sen','Rab','Jum' — hari latihan
    sets: [],          // [{block, exercise, set_num, reps, weight_kg, rpe}]
  },

  // content from quarter_content (markdown)
  contentCache: {},   // { 'Q3Q4_2026_GYM': '...md...', ... }

  // cardio
  cardioLog: [],
  cardioFilter: {
    search: '',       // search by activity name
    type: 'all',      // 'all' | cardio_type values
    zone: 'all',      // 'all' | 'Z1' | 'Z2' | 'Z3' | 'Z4'
    source: 'all',    // 'all' | 'strava' | 'manual'
  },
  cardioDraft: {
    date: '',
    weekNum: 1,
    trainingDay: '',
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

export function findLibraryByName(name){
  if(!name) return null;
  const lib = S.exerciseLibrary || [];
  const n = name.trim().toLowerCase();
  return lib.find(e => e.name.trim().toLowerCase() === n) || null;
}

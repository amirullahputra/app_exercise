// ══════════════════════════════════════════════════════════
// PANELS — Library + Gym + Cardio
// ══════════════════════════════════════════════════════════
import { S, rpeColor, fmtDate } from './state.js';

export const GYM_TABS  = ['📖 Protocol','🏋️ Log Sesi','📈 Progression'];
export const CARD_TABS = ['📝 Log Harian','📊 Weekly','📖 Protocol'];

// ── LIBRARY METADATA ─────────────────────────────────────
const CAT_META = {
  compound:  { label:'Compound',  icon:'🔥', color:'f1' },
  isolation: { label:'Isolation', icon:'💪', color:'acc' },
  run:       { label:'Run',       icon:'🏃', color:'f3' },
  bike:      { label:'Bike',      icon:'🚴', color:'f3' },
  swim:      { label:'Swim',      icon:'🏊', color:'inf' },
  mobility:  { label:'Mobility',  icon:'🧘', color:'cns' },
  stability: { label:'Stability', icon:'🎯', color:'inf' },
};

const CAT_ORDER = ['all','compound','isolation','run','bike','swim','mobility','stability'];

const MUSCLE_LIST = [
  ['all','All'],
  ['chest','Chest'],['back','Back'],['lats','Lats'],
  ['quads','Quads'],['hamstrings','Hamstring'],['glutes','Glutes'],
  ['shoulders','Shoulder'],['rear_delts','Rear Delt'],
  ['biceps','Biceps'],['triceps','Triceps'],
  ['core','Core'],['abs','Abs'],['obliques','Obliques'],
  ['calves','Calves'],['forearms','Forearms'],
  ['hips','Hips'],['adductors','Adductors'],
  ['rotator_cuff','Rot. Cuff'],['thoracic_spine','T-Spine'],
];

const EQ_LIST = [
  ['all','All'],['barbell','Barbell'],['dumbbell','DB'],
  ['machine','Machine'],['cable','Cable'],['bodyweight','BW'],
  ['treadmill','Treadmill'],['bike','Bike'],['pool','Pool'],['band','Band'],
];

// ── LIBRARY PANEL ────────────────────────────────────────
export function pLibrary(){
  const all = S.exerciseLibrary || [];
  const f = S.libFilters;

  const filtered = all.filter(e => {
    if(f.category !== 'all' && e.category !== f.category) return false;
    if(f.muscle !== 'all'){
      const all = (e.primary_muscles||[]).concat(e.secondary_muscles||[]);
      if(!all.includes(f.muscle)) return false;
    }
    if(f.equipment !== 'all' && e.equipment !== f.equipment) return false;
    if(f.search){
      const q = f.search.toLowerCase();
      if(!e.name.toLowerCase().includes(q) &&
         !(e.mechanism||'').toLowerCase().includes(q) &&
         !(e.subcategory||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Count by category for chip badges
  const catCount = {};
  all.forEach(e => { catCount[e.category] = (catCount[e.category]||0) + 1; });
  catCount.all = all.length;

  const filterBar = `
    <div class="lib-filter-bar">
      <div class="lib-search">
        <input type="search" class="lib-search-inp" placeholder="🔍 Cari gerakan, otot, tipe..."
          value="${f.search}" oninput="setLibSearch(this.value)">
        ${(f.search||f.category!=='all'||f.muscle!=='all'||f.equipment!=='all') ?
          `<button class="lib-reset-btn" onclick="resetLibFilters()">✕ Reset</button>` : ''}
      </div>
      <div class="lib-chip-group">
        <span class="lib-chip-lbl">Kategori</span>
        ${CAT_ORDER.map(c=>{
          const m = c==='all' ? {label:'Semua',icon:'🌐',color:'t1'} : CAT_META[c];
          const cnt = catCount[c]||0;
          return `<button class="lib-chip${f.category===c?' act':''} chip-${m.color}" onclick="setLibFilter('category','${c}')">
            ${m.icon} ${m.label} <span class="lib-chip-cnt">${cnt}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="lib-chip-group">
        <span class="lib-chip-lbl">Otot</span>
        ${MUSCLE_LIST.map(([k,l])=>`
          <button class="lib-chip lib-chip-sm${f.muscle===k?' act':''}" onclick="setLibFilter('muscle','${k}')">${l}</button>
        `).join('')}
      </div>
      <div class="lib-chip-group">
        <span class="lib-chip-lbl">Equipment</span>
        ${EQ_LIST.map(([k,l])=>`
          <button class="lib-chip lib-chip-sm${f.equipment===k?' act':''}" onclick="setLibFilter('equipment','${k}')">${l}</button>
        `).join('')}
      </div>
      <div class="lib-result-count">${filtered.length} dari ${all.length} gerakan</div>
    </div>`;

  if(!all.length){
    return filterBar + `<div class="card"><div class="empty-state"><div class="empty-ico">📚</div><div class="empty-txt">Library belum ter-load. Pastikan SQL seed (08_insert_exercise_library.sql) sudah dijalankan di Supabase.</div></div></div>`;
  }

  if(!filtered.length){
    return filterBar + `<div class="card"><div class="empty-state"><div class="empty-ico">🔍</div><div class="empty-txt">Tidak ada gerakan cocok dengan filter.<br><button class="btn btn-ghost" style="margin-top:10px" onclick="resetLibFilters()">Reset Filter</button></div></div></div>`;
  }

  const grid = `<div class="lib-grid">${filtered.map(renderLibCard).join('')}</div>`;
  return filterBar + grid;
}

function renderLibCard(e){
  const meta = CAT_META[e.category] || { label:e.category, icon:'•', color:'t1' };
  const riskColor = e.power_risk === 'HIGH' ? 'warn' : e.power_risk === 'MED' ? 'f2' : 'f3';
  const isCardio = ['run','bike','swim'].includes(e.category);

  // Defaults block — beda format antara strength vs cardio
  let defaults = '';
  if(isCardio){
    defaults = `
      <div class="lib-defaults">
        <span class="lib-d-item"><span class="lib-d-l">Durasi</span><span class="lib-d-v">${e.default_duration_min||'—'} min</span></span>
        ${e.default_distance_km ? `<span class="lib-d-item"><span class="lib-d-l">Jarak</span><span class="lib-d-v">${e.default_distance_km} km</span></span>` : ''}
        ${e.default_zone ? `<span class="lib-d-item"><span class="lib-d-l">Zone</span><span class="bdg bdg-z${e.default_zone.slice(1)}">${e.default_zone}</span></span>` : ''}
      </div>`;
  } else {
    const setsReps = (e.default_sets && e.default_reps) ? `${e.default_sets}×${e.default_reps}` : (e.default_reps || '—');
    defaults = `
      <div class="lib-defaults">
        <span class="lib-d-item"><span class="lib-d-l">Set/Reps</span><span class="lib-d-v">${setsReps}</span></span>
        ${e.default_rpe ? `<span class="lib-d-item"><span class="lib-d-l">RPE</span><span class="lib-d-v">${e.default_rpe}</span></span>` : ''}
        ${e.default_rest_s ? `<span class="lib-d-item"><span class="lib-d-l">Rest</span><span class="lib-d-v">${e.default_rest_s}s</span></span>` : ''}
      </div>`;
  }

  const primary = (e.primary_muscles||[]).map(m=>`<span class="lib-musc lib-musc-pri">${m.replace(/_/g,' ')}</span>`).join('');
  const secondary = (e.secondary_muscles||[]).slice(0,4).map(m=>`<span class="lib-musc">+${m.replace(/_/g,' ')}</span>`).join('');

  return `
    <div class="lib-card lib-card-${meta.color}">
      <div class="lib-card-head">
        <span class="lib-cat-pill chip-${meta.color}">${meta.icon} ${meta.label.toUpperCase()}</span>
        ${e.power_risk ? `<span class="lib-risk-pill bdg bdg-${riskColor}" title="Power risk untuk DNA-power athlete">⚠ ${e.power_risk}</span>` : ''}
      </div>
      <div class="lib-card-name">${e.name}</div>
      ${e.subcategory ? `<div class="lib-card-sub">${e.subcategory}${e.equipment ? ' · '+e.equipment : ''}${e.difficulty ? ' · '+e.difficulty : ''}</div>` : ''}

      <div class="lib-musc-row">${primary}${secondary}</div>

      ${defaults}

      ${e.mechanism ? `<div class="lib-mech">${e.mechanism}</div>` : ''}
      ${e.form_cues ? `<div class="lib-cues"><b>Form:</b> ${e.form_cues}</div>` : ''}
      ${e.balance_for ? `<div class="lib-balance"><b>↔ Balance:</b> ${e.balance_for.replace(/;/g,' · ').replace(/_/g,' ')}</div>` : ''}
      ${e.contraindication ? `<div class="lib-contra"><b>⚠ Hati-hati:</b> ${e.contraindication}</div>` : ''}
    </div>`;
}

// ── MARKDOWN RENDER ──────────────────────────────────────
function renderInline(text){
  return text
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/`(.+?)`/g,'<code>$1</code>');
}

function renderMd(md){
  if(!md) return `<div class="empty-state"><div class="empty-ico">📄</div><div class="empty-txt">Belum ada konten untuk quarter ini</div></div>`;

  const lines = md.split('\n');
  let html = '';
  let i = 0;

  while(i < lines.length){
    const line = lines[i];

    // Table
    if(/^\|.+\|/.test(line)){
      let tableLines = [];
      while(i < lines.length && /^\|/.test(lines[i])){ tableLines.push(lines[i]); i++; }
      const rows = tableLines.filter(l => !/^\|[\s\-|:]+\|$/.test(l));
      if(rows.length){
        const parseRow = (r, tag) => {
          const cells = r.replace(/^\||\|$/g,'').split('|')
            .map(c=>`<${tag}>${renderInline(c.trim())}</${tag}>`).join('');
          return `<tr>${cells}</tr>`;
        };
        html += `<div class="tbl-wrap" style="margin:10px 0"><table><thead>${parseRow(rows[0],'th')}</thead><tbody>${rows.slice(1).map(r=>parseRow(r,'td')).join('')}</tbody></table></div>`;
      }
      continue;
    }
    if(/^### /.test(line)){ html += `<h3>${renderInline(line.slice(4))}</h3>`; i++; continue; }
    if(/^## /.test(line)){  html += `<h2>${renderInline(line.slice(3))}</h2>`; i++; continue; }
    if(/^# /.test(line)){   html += `<h1>${renderInline(line.slice(2))}</h1>`; i++; continue; }
    if(/^---+$/.test(line)){ html += '<hr>'; i++; continue; }
    if(/^- /.test(line)){
      let items = [];
      while(i < lines.length && /^- /.test(lines[i])){ items.push(`<li>${renderInline(lines[i].slice(2))}</li>`); i++; }
      html += `<ul>${items.join('')}</ul>`; continue;
    }
    if(/^\d+\. /.test(line)){
      let items = [];
      while(i < lines.length && /^\d+\. /.test(lines[i])){ items.push(`<li>${renderInline(lines[i].replace(/^\d+\. /,''))}</li>`); i++; }
      html += `<ol>${items.join('')}</ol>`; continue;
    }
    if(line.trim() === ''){ i++; continue; }
    let para = [];
    while(i < lines.length && lines[i].trim() !== '' && !/^[#\-|]/.test(lines[i]) && !/^\d+\. /.test(lines[i]) && !/^---/.test(lines[i])){
      para.push(lines[i]); i++;
    }
    if(para.length) html += `<p>${renderInline(para.join(' '))}</p>`;
    else i++; // fallback: skip unmatched line to prevent infinite loop
  }
  return html;
}

export function pMarkdownContent(docType, content){
  return `<div class="card"><div class="md-content">${renderMd(content)}</div></div>`;
}

// ── GYM: LOG SESI ────────────────────────────────────────
export function pGymLog(){
  const prog = S.gymProgram;
  const today = new Date().toISOString().split('T')[0];

  const blocksHtml = ['A','B','C','D'].map(b => {
    const exs = prog.filter(e => e.block === b);
    if(!exs.length) return '';
    const blockNames = {A:'Lower Body',B:'Upper Body',C:'Standing / Core',D:'Aksesori & Anti-Injury'};
    return `<div style="margin-bottom:1rem">
      <div class="card-title"><span class="bdg bdg-acc">Block ${b}</span> ${blockNames[b]}</div>
      ${exs.map(e => {
        const sets = S.gymDraft.sets.filter(s => s.exercise===e.exercise);
        const setCount = e.target_sets || 3;
        return `<div style="margin-bottom:.75rem">
          <div style="font-size:12px;font-weight:700;color:var(--t0);margin-bottom:6px">${e.exercise}
            <span style="font-size:10px;font-weight:600;color:var(--t2);margin-left:6px">${e.target_sets}×${e.target_reps} @ RPE ${e.target_rpe}</span>
          </div>
          ${Array.from({length:setCount},(_,i)=>{
            const ex = sets[i]||{};
            return `<div class="form-row" style="margin-bottom:4px">
              <div class="form-group" style="min-width:32px"><div class="form-lbl">Set</div>
                <div style="padding:7px 10px;color:var(--t3);font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700">${i+1}</div>
              </div>
              <div class="form-group" style="flex:1;min-width:60px"><div class="form-lbl">Reps</div>
                <input class="form-inp" style="width:100%" type="number" min="1" placeholder="${e.target_reps||'—'}" value="${ex.reps||''}"
                  oninput="updateDraftSet('${b}','${e.exercise}',${i},'reps',this.value)">
              </div>
              <div class="form-group" style="flex:1.5;min-width:70px"><div class="form-lbl">Beban (kg)</div>
                <input class="form-inp" style="width:100%" type="number" min="0" step="0.5" placeholder="0" value="${ex.weight_kg||''}"
                  oninput="updateDraftSet('${b}','${e.exercise}',${i},'weight_kg',this.value)">
              </div>
              <div class="form-group" style="flex:1;min-width:60px"><div class="form-lbl">RPE</div>
                <input class="form-inp" style="width:100%" type="number" min="1" max="10" step="0.5" placeholder="${e.target_rpe||7}" value="${ex.rpe||''}"
                  oninput="updateDraftSet('${b}','${e.exercise}',${i},'rpe',this.value)">
              </div>
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div>`;
  }).join('');

  return `
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">📅 Detail Sesi</div>
      <div class="form-row">
        <div class="form-group"><div class="form-lbl">Tanggal</div>
          <input class="form-inp" type="date" id="gym-date" value="${today}" oninput="updateGymDraftMeta()">
        </div>
        <div class="form-group" style="flex:1;min-width:90px"><div class="form-lbl">Durasi (min)</div>
          <input class="form-inp" style="width:100%" type="number" id="gym-dur" value="${S.gymDraft.duration}" oninput="updateGymDraftMeta()">
        </div>
        <div class="form-group" style="flex:1"><div class="form-lbl">Notes</div>
          <input class="form-inp" type="text" id="gym-notes" placeholder="Opsional..." value="${S.gymDraft.notes}" oninput="updateGymDraftMeta()">
        </div>
      </div>
    </div>
    ${prog.length ? `
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">🏋️ Sets & Reps</div>
      ${blocksHtml}
      <div style="display:flex;gap:8px;padding-top:.75rem;border-top:1px solid var(--bdr)">
        <button class="btn btn-gym" onclick="submitGymSession()">💾 Simpan Sesi</button>
        <button class="btn btn-ghost" onclick="clearGymDraft()">Reset</button>
      </div>
    </div>` : `<div class="card"><div class="empty-state"><div class="empty-ico">📋</div><div class="empty-txt">Lihat tab Protocol untuk program latihan</div></div></div>`}
    ${S.gymSessions.length ? `
    <div class="card">
      <div class="card-title">🕐 Riwayat Sesi</div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Tanggal</th><th>Week</th><th>Durasi</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            ${S.gymSessions.slice(0,10).map(s=>`<tr>
              <td style="font-weight:700">${fmtDate(s.session_date)}</td>
              <td><span class="bdg bdg-acc">W${s.week_num||'?'}</span></td>
              <td class="mono">${s.duration_min||'—'} min</td>
              <td style="color:var(--t2)">${s.notes||''}</td>
              <td><button class="btn btn-danger" style="padding:3px 8px;font-size:10px" onclick="deleteSession(${s.id})">Hapus</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}`;
}

// ── GYM: PROGRESSION ────────────────────────────────────
export function pGymProgression(){
  return `<div class="card">
    <div class="card-title">📈 Progression Tracker</div>
    <div class="empty-state"><div class="empty-ico">📈</div><div class="empty-txt">Log minimal 2 sesi untuk melihat progression per exercise</div></div>
  </div>`;
}

// ── CARDIO: LOG HARIAN ───────────────────────────────────
export function pCardioLog(){
  const today = new Date().toISOString().split('T')[0];
  const d = S.cardioDraft;
  const slotOpts = [{v:'Z1_NEAT',l:'Z1 NEAT — Slot 1 Pagi'},{v:'Z2_MITO',l:'Z2 Mitokondria — Slot 2 Pagi'},{v:'SAT_QUALITY',l:'Saturday Quality Endurance'}];
  const typeOpts = [{v:'incline_walk',l:'Incline Walk'},{v:'run_interval',l:'Run Interval'},{v:'run_long',l:'Run Long'},{v:'bike_long',l:'Bike Long'}];
  const zoneOpts = ['Z1','Z2','Z3','Z4'];

  return `
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">📝 Log Cardio Baru</div>
      <div class="form-row">
        <div class="form-group"><div class="form-lbl">Tanggal</div>
          <input class="form-inp" type="date" id="c-date" value="${today}" oninput="updateCardioDraft()">
        </div>
        <div class="form-group"><div class="form-lbl">Slot</div>
          <select class="form-sel form-inp" id="c-slot" onchange="updateCardioDraft()">
            ${slotOpts.map(o=>`<option value="${o.v}" ${d.slot===o.v?'selected':''}>${o.l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><div class="form-lbl">Tipe</div>
          <select class="form-sel form-inp" id="c-type" onchange="updateCardioDraft()">
            ${typeOpts.map(o=>`<option value="${o.v}" ${d.cardioType===o.v?'selected':''}>${o.l}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><div class="form-lbl">Zone</div>
          <select class="form-sel form-inp" id="c-zone" onchange="updateCardioDraft()">
            ${zoneOpts.map(z=>`<option value="${z}" ${d.zone===z?'selected':''}>${z}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1;min-width:80px"><div class="form-lbl">Durasi (min)</div>
          <input class="form-inp" style="width:100%" type="number" id="c-dur" value="${d.duration}" oninput="updateCardioDraft()">
        </div>
        <div class="form-group" style="flex:1;min-width:80px"><div class="form-lbl">Jarak (km)</div>
          <input class="form-inp" style="width:100%" type="number" step="0.01" id="c-dist" value="${d.distance}" placeholder="—" oninput="updateCardioDraft()">
        </div>
        <div class="form-group" style="flex:1;min-width:70px"><div class="form-lbl">HR Avg</div>
          <input class="form-inp" style="width:100%" type="number" id="c-hr" value="${d.hrAvg}" placeholder="—" oninput="updateCardioDraft()">
        </div>
        <div class="form-group" style="flex:1;min-width:70px"><div class="form-lbl">HR Max</div>
          <input class="form-inp" style="width:100%" type="number" id="c-hrmax" value="${d.hrMax}" placeholder="—" oninput="updateCardioDraft()">
        </div>
        <div class="form-group" style="flex:1;min-width:70px"><div class="form-lbl">Incline %</div>
          <input class="form-inp" style="width:100%" type="number" step="0.5" id="c-incline" value="${d.incline}" placeholder="—" oninput="updateCardioDraft()">
        </div>
        <div class="form-group" style="flex:1;min-width:80px"><div class="form-lbl">Speed km/h</div>
          <input class="form-inp" style="width:100%" type="number" step="0.1" id="c-speed" value="${d.speed}" placeholder="—" oninput="updateCardioDraft()">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1"><div class="form-lbl">Notes</div>
          <input class="form-inp" type="text" id="c-notes" value="${d.notes}" placeholder="Opsional..." oninput="updateCardioDraft()">
        </div>
      </div>
      <button class="btn btn-cardio" onclick="submitCardioEntry()">💾 Simpan Log</button>
    </div>
    ${S.cardioLog.length ? `
    <div class="card">
      <div class="card-title">🕐 Log Terakhir</div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Tanggal</th><th>Slot</th><th>Tipe</th><th>Durasi</th><th>Jarak</th><th>HR Avg</th><th>Zone</th><th></th></tr></thead>
          <tbody>
            ${S.cardioLog.slice(0,15).map(r=>`<tr>
              <td style="font-weight:700">${fmtDate(r.logged_date)}</td>
              <td style="font-size:10.5px;color:var(--t2)">${r.slot||'—'}</td>
              <td>${r.cardio_type||'—'}</td>
              <td class="mono">${r.duration_min||'—'} min</td>
              <td class="mono">${r.distance_km||'—'} km</td>
              <td class="mono">${r.hr_avg||'—'}</td>
              <td><span class="bdg bdg-z${(r.zone||'Z1').slice(1)}">${r.zone||'—'}</span></td>
              <td><button class="btn btn-danger" style="padding:3px 8px;font-size:10px" onclick="deleteCardio(${r.id})">Hapus</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}`;
}

// ── CARDIO: WEEKLY SUMMARY ───────────────────────────────
export function pCardioWeekly(){
  const log = S.cardioLog;
  if(!log.length) return `<div class="card"><div class="empty-state"><div class="empty-ico">📊</div><div class="empty-txt">Belum ada data cardio untuk quarter ini</div></div></div>`;

  const byWeek = {};
  log.forEach(r => {
    const w = r.week_num||'?';
    if(!byWeek[w]) byWeek[w]={sessions:0,totalMin:0,totalKm:0,z1:0,z2:0,z3:0,z4:0};
    byWeek[w].sessions++;
    byWeek[w].totalMin += r.duration_min||0;
    byWeek[w].totalKm  += parseFloat(r.distance_km)||0;
    if(r.zone) byWeek[w][r.zone.toLowerCase().replace('z','z')]++;
    if(r.zone==='Z1') byWeek[w].z1++;
    if(r.zone==='Z2') byWeek[w].z2++;
  });

  const weeks = Object.keys(byWeek).sort((a,b)=>Number(b)-Number(a));
  return `<div class="card">
    <div class="card-title">📊 Weekly Volume</div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Week</th><th>Sesi</th><th>Total Menit</th><th>Total Km</th><th>Z1</th><th>Z2</th></tr></thead>
        <tbody>
          ${weeks.map(w=>`<tr>
            <td><span class="bdg bdg-acc">W${w}</span></td>
            <td class="mono">${byWeek[w].sessions}</td>
            <td class="mono">${byWeek[w].totalMin} min</td>
            <td class="mono">${byWeek[w].totalKm.toFixed(1)} km</td>
            <td><span class="bdg bdg-z1">${byWeek[w].z1}</span></td>
            <td><span class="bdg bdg-z2">${byWeek[w].z2}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

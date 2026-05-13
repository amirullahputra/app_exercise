// ══════════════════════════════════════════════════════════
// PANELS — Library + Gym + Cardio
// ══════════════════════════════════════════════════════════
import { S, rpeColor, fmtDate, findLibraryByName } from './state.js?v=11';


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
// ── OVERVIEW ──────────────────────────────────────────────
export function pOverview(){
  const sel = S.programSel[S.quarterId] || [];
  const totalSel = sel.length;
  const sessionsCount = (S.gymSessions||[]).length;
  const cardioCount = (S.cardioLog||[]).length;
  const lastSession = (S.gymSessions||[])[0];
  const lastCardio = (S.cardioLog||[])[0];

  // Group selected by category
  const byCat = {};
  sel.forEach(s => {
    const ex = (S.exerciseLibrary||[]).find(e => e.slug === s.exercise_slug);
    if(!ex) return;
    if(!byCat[ex.category]) byCat[ex.category] = 0;
    byCat[ex.category]++;
  });

  if(!S.user) return `<div class="card"><div class="empty-state"><div class="empty-ico">🔐</div><div class="empty-txt">Login untuk lihat overview</div></div></div>`;

  return `
    <div class="ov-grid">
      <div class="ov-card">
        <div class="ov-l">Program Quarter Ini</div>
        <div class="ov-v">${totalSel}<span class="ov-sub"> exercises</span></div>
        <div class="ov-meta">${Object.entries(byCat).map(([k,v])=>`${k}: ${v}`).join(' · ')||'Belum ada — pilih di Builder'}</div>
      </div>
      <div class="ov-card">
        <div class="ov-l">Sesi Gym (Quarter)</div>
        <div class="ov-v">${sessionsCount}<span class="ov-sub"> sesi</span></div>
        <div class="ov-meta">${lastSession ? 'Terakhir: '+fmtDate(lastSession.session_date) : 'Belum ada'}</div>
      </div>
      <div class="ov-card">
        <div class="ov-l">Sesi Cardio (Quarter)</div>
        <div class="ov-v">${cardioCount}<span class="ov-sub"> sesi</span></div>
        <div class="ov-meta">${lastCardio ? 'Terakhir: '+fmtDate(lastCardio.logged_date) : 'Belum ada'}</div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <div style="font-size:13px;font-weight:800;color:var(--t0);margin-bottom:.75rem">🎯 Selected Exercises (Quarter ${S.quarterId.replace('_',' ')})</div>
      ${totalSel===0
        ? `<div class="empty-state"><div class="empty-ico">🛒</div><div class="empty-txt">Belum ada exercise dipilih.<br><button class="btn btn-primary" style="margin-top:10px" onclick="setTab(1)">Pilih di Builder →</button></div></div>`
        : `<div class="ov-sel-list">${sel.map(s => {
            const ex = (S.exerciseLibrary||[]).find(e => e.slug === s.exercise_slug);
            if(!ex) return '';
            return `<div class="ov-sel-item">
              <span class="ov-sel-name">${ex.name}</span>
              <span class="ov-sel-cat">${ex.category}</span>
              <span class="ov-sel-tgt">${s.target_value ? s.target_value+(s.target_unit||'') : '—'}</span>
            </div>`;
          }).join('')}</div>`
      }
    </div>`;
}

// ── BUILDER ───────────────────────────────────────────────
export function pBuilder(){
  if(!S.user){
    return `<div class="card"><div class="empty-state"><div class="empty-ico">🔐</div><div class="empty-txt">Login dulu untuk build program. Drag exercise dari Library ke kanan untuk pilih.</div></div></div>`;
  }
  const sel = S.programSel[S.quarterId] || [];
  const selSlugs = new Set(sel.map(s => s.exercise_slug));

  const all = S.exerciseLibrary || [];
  const f = S.libFilters;
  const filtered = all.filter(e => {
    if(f.category !== 'all' && e.category !== f.category) return false;
    if(f.muscle !== 'all'){
      const muscles = (e.primary_muscles||[]).concat(e.secondary_muscles||[]);
      if(!muscles.includes(f.muscle)) return false;
    }
    if(f.equipment !== 'all' && e.equipment !== f.equipment) return false;
    if(f.search){
      const q = f.search.toLowerCase();
      if(!e.name.toLowerCase().includes(q) && !(e.subcategory||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const seeded = !!S.programSeededFromTemplate[S.quarterId];
  return `
    <div class="bld-bar">
      <div class="bld-bar-l">
        <span class="bld-bar-lbl">Quarter:</span>
        <span class="bld-bar-q">${S.quarterId.replace('_',' ')}</span>
      </div>
      <div class="bld-bar-r">
        <span class="bld-bar-cnt">${sel.length} exercise dipilih</span>
      </div>
    </div>
    ${seeded ? `
    <div style="font-size:10.5px;color:var(--t2);padding:.45rem .7rem;background:rgba(50,140,255,.08);border:1px solid rgba(50,140,255,.18);border-radius:6px;margin-bottom:.6rem;display:flex;align-items:center;gap:8px">
      <span style="flex:1">💡 Auto-populated dari template Quarter ini. Edit (hapus / ganti target / tambah variasi) sesuai intensitas quarter.</span>
      <button onclick="dismissSeedBanner()" style="background:transparent;border:1px solid var(--bdr);color:var(--t2);padding:2px 8px;border-radius:4px;font-size:10px;cursor:pointer">Tutup</button>
    </div>` : ''}

    <div class="bld-2col">
      <!-- LEFT: LIBRARY -->
      <div class="bld-side">
        <div class="bld-side-hdr">
          📚 Library
          <input type="search" class="bld-search" placeholder="🔍 cari..." value="${f.search}" oninput="setLibSearch(this.value)">
        </div>
        <div class="bld-cat-row">
          ${['all','compound','isolation','run','bike','swim','mobility','stability'].map(c=>`
            <button class="bld-chip${f.category===c?' act':''}" onclick="setLibFilter('category','${c}')">${c==='all'?'Semua':c}</button>
          `).join('')}
        </div>
        <div class="bld-list">
          ${filtered.length===0 ? `<div class="empty-state"><div class="empty-txt" style="font-size:11px">Tidak ada match</div></div>` :
            filtered.map(e => `
              <div class="bld-card${selSlugs.has(e.slug)?' selected':''}"
                   draggable="true"
                   ondragstart="onDragStart(event,'${e.slug}')"
                   onclick="addToProgram('${e.slug}')"
                   title="Klik atau drag ke kanan">
                <div class="bld-card-cat ${e.category}">${e.category}</div>
                <div class="bld-card-name">${e.name}</div>
                <div class="bld-card-meta">${(e.primary_muscles||[]).slice(0,3).map(m=>m.replace(/_/g,' ')).join(' · ')}</div>
                ${selSlugs.has(e.slug) ? `<div class="bld-card-on">✓ Dipilih</div>` : ''}
              </div>
            `).join('')
          }
        </div>
      </div>

      <!-- RIGHT: SELECTED -->
      <div class="bld-side bld-drop"
           ondragover="onDragOver(event)"
           ondragleave="onDragLeave(event)"
           ondrop="onDrop(event)">
        <div class="bld-side-hdr">🛒 Selected for ${S.quarterId.replace('_',' ')}</div>
        ${sel.length === 0
          ? `<div class="empty-state" style="padding:2rem 1rem"><div class="empty-ico">📥</div><div class="empty-txt">Drag exercise ke sini.<br><span style="font-size:11px;color:var(--t3)">Atau klik card di kiri.</span></div></div>`
          : `<div class="bld-sel-list">${sel.map(s => {
              const ex = (S.exerciseLibrary||[]).find(e => e.slug === s.exercise_slug);
              if(!ex) return '';
              const isCardio = ['run','bike','swim'].includes(ex.category);
              const unitOpts = isCardio ? ['km','min','m']:['kg','reps','rpe'];
              const DAYS = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
              return `<div class="bld-sel-item">
                <div class="bld-sel-row1">
                  <span class="bld-sel-cat-pip ${ex.category}"></span>
                  <span class="bld-sel-name">${ex.name}</span>
                  <button class="bld-sel-x" onclick="removeFromProgram(${s.id})" title="Hapus">×</button>
                </div>
                <div class="bld-sel-row2">
                  <input type="number" step="0.5" placeholder="target" class="bld-tgt-val"
                         value="${s.target_value||''}"
                         onblur="onTargetBlur(${s.id},'target_value',this.value)">
                  <select class="bld-tgt-unit" onchange="onTargetBlur(${s.id},'target_unit',this.value)">
                    <option value="">—</option>
                    ${unitOpts.map(u=>`<option value="${u}"${s.target_unit===u?' selected':''}>${u}</option>`).join('')}
                  </select>
                  <input type="text" placeholder="note (e.g. 5×5 @ RPE 7)" class="bld-tgt-note"
                         value="${s.target_note||''}"
                         onblur="onTargetBlur(${s.id},'target_note',this.value)">
                </div>
                <div class="bld-sel-row2" style="margin-top:4px">
                  <select class="bld-tgt-unit" style="min-width:90px"
                          onchange="onSelFieldBlur(${s.id},'training_day',this.value)">
                    <option value="">Hari?</option>
                    ${DAYS.map(d=>`<option value="${d}"${s.training_day===d?' selected':''}>${d}</option>`).join('')}
                  </select>
                  <input type="number" step="2.5" min="0" placeholder="start kg" class="bld-tgt-val"
                         style="max-width:90px" title="Start beban (kg) untuk auto-progression di Plan"
                         value="${s.start_weight||''}"
                         onblur="onSelFieldBlur(${s.id},'start_weight',this.value)">
                  <span style="font-size:9.5px;color:var(--t3);align-self:center">start kg → target</span>
                </div>
              </div>`;
            }).join('')}</div>`
        }
      </div>
    </div>`;
}

// ── PLAN — helpers ─────────────────────────────────────────
// Hitung weekly progression: startW → targetW over totalWeeks, deload tiap week 4/8/12
function computeProgression(startW, targetW, totalWeeks){
  if(!startW || !targetW) return null;
  const deloads = new Set();
  for(let w = 4; w <= totalWeeks; w += 4) deloads.add(w);
  const workWkCount = totalWeeks - deloads.size;
  const step = workWkCount > 1 ? (targetW - startW) / (workWkCount - 1) : 0;
  const result = []; let wi = 0; let prevLoad = startW;
  for(let w = 1; w <= totalWeeks; w++){
    if(deloads.has(w)){
      result.push({ load: Math.round(prevLoad * 0.85 / 2.5) * 2.5, deload: true });
    } else {
      const load = Math.round((startW + step * wi) / 2.5) * 2.5;
      result.push({ load, deload: false });
      prevLoad = load; wi++;
    }
  }
  return result;
}

// ── PLAN ──────────────────────────────────────────────────
export function pPlan(){
  if(!S.user) return `<div class="card"><div class="empty-state"><div class="empty-ico">🔐</div><div class="empty-txt">Login dulu</div></div></div>`;
  const sel = S.programSel[S.quarterId] || [];
  if(sel.length === 0) return `<div class="card"><div class="empty-state"><div class="empty-ico">📅</div><div class="empty-txt">Belum ada program. Pilih dulu di Builder tab.</div></div></div>`;

  const q = (S.quarters||[]).find(x => x.quarter_id === S.quarterId);
  const totalWeeks = q?.total_weeks || 13;

  // Group exercises by training_day untuk legend
  const byDay = {};
  sel.forEach(s => {
    const day = s.training_day || '—';
    if(!byDay[day]) byDay[day] = [];
    byDay[day].push(s);
  });

  // Legend hari
  const dayLegend = Object.keys(byDay).filter(d => d !== '—').length > 0
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        ${Object.entries(byDay).map(([day, items]) => `
          <span style="font-size:10.5px;font-weight:700;padding:3px 10px;border-radius:6px;background:var(--bg2);border:1px solid var(--bdr)">
            ${day} · ${items.length} exercise
          </span>`).join('')}
       </div>` : '';

  // Deload week labels
  const deloads = new Set();
  for(let w = 4; w <= totalWeeks; w += 4) deloads.add(w);

  return `
    <div class="card">
      <div style="font-size:13px;font-weight:800;margin-bottom:.5rem">📅 Plan ${S.quarterId.replace('_',' ')} — ${totalWeeks} weeks</div>
      <div style="font-size:11px;color:var(--t2);margin-bottom:.75rem">
        Deload otomatis tiap W4/W8/W12 (85%). Set <b>Hari</b> + <b>Start kg</b> di Builder untuk auto-fill progression.
      </div>
      ${dayLegend}
      <div style="overflow-x:auto">
        <table class="plan-tbl">
          <thead>
            <tr>
              <th style="min-width:160px">Exercise</th>
              <th style="width:52px">Hari</th>
              <th style="width:80px">Target</th>
              ${Array.from({length:totalWeeks}, (_,i)=>{
                const w = i+1;
                const isDeload = deloads.has(w);
                return `<th style="${isDeload?'background:rgba(245,158,11,.15);color:var(--pro)':''}">W${w}${isDeload?'<br><span style="font-size:8px;font-weight:600">DL</span>':''}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${sel.map(s => {
              const ex = (S.exerciseLibrary||[]).find(e => e.slug === s.exercise_slug);
              if(!ex) return '';
              const tgt = s.target_value ? `${s.target_value}${s.target_unit||''}` : '—';
              const prog = computeProgression(s.start_weight, s.target_value, totalWeeks);
              return `<tr>
                <td>
                  <b style="font-size:12px">${ex.name}</b>
                  <br><span style="font-size:9.5px;color:var(--t3)">${ex.category}</span>
                </td>
                <td style="text-align:center">
                  <span style="font-size:11px;font-weight:800;color:var(--acc)">${s.training_day||'—'}</span>
                </td>
                <td>
                  <span style="font-size:11px;font-weight:800">${tgt}</span>
                  ${s.start_weight ? `<br><span style="font-size:9px;color:var(--t3)">${s.start_weight}→${s.target_value||'?'}kg</span>` : ''}
                </td>
                ${Array.from({length:totalWeeks}, (_,i)=>{
                  const w = i+1;
                  const isDeload = deloads.has(w);
                  if(!prog){
                    return `<td class="plan-cell" style="${isDeload?'background:rgba(245,158,11,.08)':''}">·</td>`;
                  }
                  const cell = prog[i];
                  const bg = isDeload ? 'background:rgba(245,158,11,.15)' : '';
                  const col = isDeload ? 'color:var(--pro)' : cell.load >= (s.target_value||0)*0.95 ? 'color:var(--f3)' : 'color:var(--t1)';
                  return `<td class="plan-cell" style="${bg};font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;${col}">${cell.load}</td>`;
                }).join('')}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:10px;color:var(--t3);margin-top:8px">
        💡 DL = Deload week (85% dari beban sebelumnya). Set <b>Hari</b> + <b>Start kg</b> di Builder tab untuk lihat auto-fill.
      </div>
    </div>`;
}

// ── LOG ────────────────────────────────────────────────────
export function pLog(){
  const sub = S.logSubTab || 'gym';
  const tabsHtml = `
    <div class="log-subtab-row">
      <button class="log-stab${sub==='gym'?' act':''}" onclick="setLogSubTab('gym')">🏋️ Gym</button>
      <button class="log-stab${sub==='cardio'?' act':''}" onclick="setLogSubTab('cardio')">🏃 Cardio</button>
    </div>`;
  if(sub === 'gym') return tabsHtml + pGymLog();
  return tabsHtml + pCardioLog();
}

export function pLibrary(){
  const all = S.exerciseLibrary || [];
  const f = S.libFilters;

  const filtered = all.filter(e => {
    if(f.category !== 'all' && e.category !== f.category) return false;
    if(f.muscle !== 'all'){
      const muscles = (e.primary_muscles||[]).concat(e.secondary_muscles||[]);
      if(!muscles.includes(f.muscle)) return false;
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
        <button class="lib-add-btn" onclick="openAddLibModal()" title="Tambah exercise baru ke library">➕ Tambah</button>
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

  let gridContent;
  if(!all.length){
    gridContent = `<div class="card"><div class="empty-state"><div class="empty-ico">📚</div><div class="empty-txt">Library belum ter-load. Pastikan SQL seed (08_insert_exercise_library.sql) sudah dijalankan di Supabase.</div></div></div>`;
  } else if(!filtered.length){
    gridContent = `<div class="card"><div class="empty-state"><div class="empty-ico">🔍</div><div class="empty-txt">Tidak ada gerakan cocok dengan filter.<br><button class="btn btn-ghost" style="margin-top:10px" onclick="resetLibFilters()">Reset Filter</button></div></div></div>`;
  } else {
    gridContent = `<div class="card" style="padding:0;overflow:hidden">
      <div class="tbl-wrap lib-tbl-wrap">
        <table class="lib-table">
          <thead><tr>
            <th style="width:90px">Layer</th>
            <th style="min-width:180px">Exercise</th>
            <th style="width:110px">Equipment</th>
            <th style="min-width:140px">Primary Muscles</th>
            <th style="width:90px">Difficulty</th>
            <th class="c" style="width:100px">Sets×Reps<br>/ Duration</th>
            <th class="c" style="width:70px">RPE<br>/ Zone</th>
            <th class="c" style="width:55px">Rest</th>
            <th class="c" style="width:60px">Risk</th>
            <th style="min-width:220px">Mechanism</th>
            <th style="min-width:200px">Form Cues</th>
          </tr></thead>
          <tbody>${filtered.map(renderLibRow).join('')}</tbody>
        </table>
      </div>
    </div>`;
  }

  return `
    <div class="lib-split">
      <div class="lib-split-main">
        ${filterBar}
        ${gridContent}
      </div>
      <aside class="lib-split-aside">
        ${pBodyMap()}
      </aside>
    </div>`;
}

// ── BODY MAP ─────────────────────────────────────────────
export function pBodyMap(){
  const coverage = {};
  (S.exerciseLibrary || []).forEach(e => {
    (e.primary_muscles   || []).forEach(m => { coverage[m] = (coverage[m]||0) + 2; });
    (e.secondary_muscles || []).forEach(m => { coverage[m] = (coverage[m]||0) + 1; });
  });
  const maxCov = Math.max(...Object.values(coverage), 1);

  function muscleColor(slug){
    const r = (coverage[slug]||0) / maxCov;
    if(r === 0)   return 'var(--bg3)';
    if(r < 0.20)  return '#DBEAFE';
    if(r < 0.40)  return 'var(--inf)';
    if(r < 0.65)  return 'var(--f1)';
    return 'var(--warn)';
  }

  return `
    <div class="bm-container">
      <div class="bm-view-header">
        <div class="bm-title">🫀 Body Map — Coverage Heatmap</div>
        <div class="bm-subtitle">${(S.exerciseLibrary||[]).length} exercises · Klik otot untuk filter</div>
      </div>
      <div class="bm-svgs">
        <div class="bm-svg-wrap"><div class="bm-svg-lbl">FRONT</div>${buildFrontSvg(muscleColor)}</div>
        <div class="bm-svg-wrap"><div class="bm-svg-lbl">BACK</div>${buildBackSvg(muscleColor)}</div>
      </div>
      ${buildBmLegend(coverage)}
    </div>`;
}

function buildFrontSvg(muscleColor){
  const m = (slug, shapes) => shapes.map(s =>
    `<${s.tag} class="bm-muscle" data-muscle="${slug}" onclick="selectBodyMuscle('${slug}')" style="cursor:pointer;fill:${muscleColor(slug)}" stroke="var(--bdr2)" stroke-width="1" ${s.attrs}/>`
  ).join('');

  return `<svg class="bm-svg" viewBox="0 0 120 260" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="18" r="14" fill="var(--bg3)" stroke="var(--bdr2)" stroke-width="1"/>
    <rect x="52" y="32" width="16" height="12" rx="4" fill="var(--bg3)" stroke="var(--bdr2)" stroke-width="1"/>
    ${m('chest',[{tag:'ellipse',attrs:'cx="60" cy="72" rx="26" ry="18"'}])}
    ${m('shoulders',[
      {tag:'ellipse',attrs:'cx="26" cy="64" rx="12" ry="10"'},
      {tag:'ellipse',attrs:'cx="94" cy="64" rx="12" ry="10"'}
    ])}
    ${m('biceps',[
      {tag:'ellipse',attrs:'cx="16" cy="92" rx="8" ry="16"'},
      {tag:'ellipse',attrs:'cx="104" cy="92" rx="8" ry="16"'}
    ])}
    ${m('forearms',[
      {tag:'ellipse',attrs:'cx="13" cy="122" rx="6" ry="14"'},
      {tag:'ellipse',attrs:'cx="107" cy="122" rx="6" ry="14"'}
    ])}
    ${m('abs',[{tag:'rect',attrs:'x="47" y="90" width="26" height="36" rx="6"'}])}
    ${m('obliques',[
      {tag:'polygon',attrs:'points="47,90 35,98 33,126 47,126"'},
      {tag:'polygon',attrs:'points="73,90 85,98 87,126 73,126"'}
    ])}
    ${m('adductors',[{tag:'polygon',attrs:'points="54,148 66,148 64,196 56,196"'}])}
    ${m('quads',[
      {tag:'rect',attrs:'x="40" y="148" width="22" height="50" rx="8"'},
      {tag:'rect',attrs:'x="58" y="148" width="22" height="50" rx="8"'}
    ])}
    ${m('calves',[
      {tag:'ellipse',attrs:'cx="46" cy="222" rx="9" ry="16"'},
      {tag:'ellipse',attrs:'cx="74" cy="222" rx="9" ry="16"'}
    ])}
  </svg>`;
}

function buildBackSvg(muscleColor){
  const m = (slug, shapes) => shapes.map(s =>
    `<${s.tag} class="bm-muscle" data-muscle="${slug}" onclick="selectBodyMuscle('${slug}')" style="cursor:pointer;fill:${muscleColor(slug)}" stroke="var(--bdr2)" stroke-width="1" ${s.attrs}/>`
  ).join('');

  return `<svg class="bm-svg" viewBox="0 0 120 260" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="18" r="14" fill="var(--bg3)" stroke="var(--bdr2)" stroke-width="1"/>
    <rect x="52" y="32" width="16" height="12" rx="4" fill="var(--bg3)" stroke="var(--bdr2)" stroke-width="1"/>
    ${m('rear_delts',[
      {tag:'ellipse',attrs:'cx="26" cy="64" rx="12" ry="10"'},
      {tag:'ellipse',attrs:'cx="94" cy="64" rx="12" ry="10"'}
    ])}
    ${m('back',[{tag:'ellipse',attrs:'cx="60" cy="70" rx="24" ry="22"'}])}
    ${m('lats',[
      {tag:'polygon',attrs:'points="36,72 22,84 20,122 40,130"'},
      {tag:'polygon',attrs:'points="84,72 98,84 100,122 80,130"'}
    ])}
    ${m('triceps',[
      {tag:'ellipse',attrs:'cx="16" cy="94" rx="8" ry="16"'},
      {tag:'ellipse',attrs:'cx="104" cy="94" rx="8" ry="16"'}
    ])}
    ${m('hips',[
      {tag:'ellipse',attrs:'cx="24" cy="142" rx="10" ry="12"'},
      {tag:'ellipse',attrs:'cx="96" cy="142" rx="10" ry="12"'}
    ])}
    ${m('glutes',[
      {tag:'ellipse',attrs:'cx="46" cy="148" rx="22" ry="18"'},
      {tag:'ellipse',attrs:'cx="74" cy="148" rx="22" ry="18"'}
    ])}
    ${m('hamstrings',[
      {tag:'rect',attrs:'x="38" y="164" width="22" height="44" rx="8"'},
      {tag:'rect',attrs:'x="60" y="164" width="22" height="44" rx="8"'}
    ])}
    ${m('calves',[
      {tag:'ellipse',attrs:'cx="46" cy="222" rx="9" ry="16"'},
      {tag:'ellipse',attrs:'cx="74" cy="222" rx="9" ry="16"'}
    ])}
  </svg>`;
}

function buildBmLegend(coverage){
  const scale = [
    { label:'Belum ada', color:'var(--bg3)' },
    { label:'Sedikit',   color:'#DBEAFE' },
    { label:'Sedang',    color:'var(--inf)' },
    { label:'Banyak',    color:'var(--f1)' },
    { label:'Terbanyak', color:'var(--warn)' },
  ];

  const topMuscles = Object.entries(coverage)
    .sort(([,a],[,b])=>b-a).slice(0,8)
    .map(([slug, cnt])=>
      `<button class="bm-top-muscle" onclick="selectBodyMuscle('${slug}')">${slug.replace(/_/g,' ')} <span class="bm-top-cnt">${cnt}</span></button>`
    ).join('');

  return `
    <div class="bm-legend">
      <div class="bm-legend-scale">
        ${scale.map(s=>`
          <div class="bm-legend-item">
            <span class="bm-legend-dot" style="background:${s.color}"></span>
            <span class="bm-legend-txt">${s.label}</span>
          </div>`).join('')}
      </div>
      <div class="bm-top-row">
        <span class="bm-top-lbl">Paling banyak covered:</span>
        ${topMuscles}
      </div>
    </div>`;
}

// ── ROW RENDER (list/table view) ─────────────────────────
function renderLibRow(e){
  const meta = CAT_META[e.category] || { label:e.category, icon:'•', color:'t1' };
  const riskColor = e.power_risk === 'HIGH' ? 'warn' : e.power_risk === 'MED' ? 'f2' : 'f3';
  const isCardio = ['run','bike','swim'].includes(e.category);

  // Defaults — cardio shows duration+distance, strength shows sets×reps
  const setsReps = (e.default_sets && e.default_reps) ? `${e.default_sets}×${e.default_reps}` : (e.default_reps || '—');
  const defCol = isCardio
    ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px">${e.default_duration_min||'—'}min</div>${e.default_distance_km?`<div style="font-size:9px;color:var(--t3)">${e.default_distance_km}km</div>`:''}`
    : `<div style="font-family:'JetBrains Mono',monospace;font-size:11px">${setsReps}</div>`;

  const rpeZone = isCardio
    ? (e.default_zone ? `<span class="bdg bdg-z${e.default_zone.slice(1)}">${e.default_zone}</span>` : '—')
    : (e.default_rpe ? `<span style="font-family:'JetBrains Mono',monospace;font-weight:700">${e.default_rpe}</span>` : '—');

  const rest = e.default_rest_s ? `${e.default_rest_s}s` : '—';

  const primary = (e.primary_muscles||[]).map(m=>`<span class="lib-musc lib-musc-pri" style="font-size:9px">${m.replace(/_/g,' ')}</span>`).join(' ');
  const secondaryCount = (e.secondary_muscles||[]).length;

  const mechShort = (e.mechanism||'').length > 90 ? (e.mechanism||'').slice(0,90)+'…' : (e.mechanism||'');
  const formShort = (e.form_cues||'').length > 80 ? (e.form_cues||'').slice(0,80)+'…' : (e.form_cues||'');

  return `<tr style="font-size:11px;border-bottom:1px solid var(--bdr)">
    <td><span class="lib-cat-pill chip-${meta.color}" style="font-size:9px;padding:2px 8px">${meta.icon} ${meta.label.toUpperCase()}</span></td>
    <td>
      <div style="font-weight:700;color:var(--t0);font-size:12.5px">${e.name}</div>
      ${e.subcategory ? `<div style="font-size:9.5px;color:var(--t3)">${e.subcategory}</div>` : ''}
    </td>
    <td><span style="font-size:10px;color:var(--t2)">${e.equipment||'—'}</span></td>
    <td>
      <div style="display:flex;flex-wrap:wrap;gap:3px">${primary}</div>
      ${secondaryCount>0?`<div style="font-size:9px;color:var(--t3);margin-top:2px">+${secondaryCount} secondary</div>`:''}
    </td>
    <td><span style="font-size:10px;color:var(--t2);text-transform:capitalize">${e.difficulty||'—'}</span></td>
    <td class="c">${defCol}</td>
    <td class="c">${rpeZone}</td>
    <td class="c"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--t2)">${rest}</span></td>
    <td class="c">${e.power_risk?`<span class="bdg bdg-${riskColor}" style="font-size:9px">${e.power_risk}</span>`:'—'}</td>
    <td><div style="font-size:10.5px;color:var(--t1);line-height:1.35" title="${(e.mechanism||'').replace(/"/g,'&quot;')}">${mechShort||'—'}</div></td>
    <td><div style="font-size:10.5px;color:var(--t1);line-height:1.35" title="${(e.form_cues||'').replace(/"/g,'&quot;')}">${formShort||'—'}</div></td>
  </tr>`;
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
function parseTargetNote(note){
  const m = /(\d+)\s*[×x]\s*(\d+)(?:.*RPE\s*([\d.]+))?/i.exec(note||'');
  return {
    sets: m ? parseInt(m[1]) : 3,
    reps: m ? parseInt(m[2]) : null,
    rpe:  m && m[3] ? parseFloat(m[3]) : 7
  };
}

const CAT_LABEL_ID = {
  compound:'Compound', isolation:'Isolasi',
  bike:'Sepeda', run:'Lari', swim:'Renang',
  mobility:'Mobilitas', stability:'Stabilitas',
  other:'Lainnya'
};

export function pGymLog(){
  const qid = S.quarterId;
  const sel = (S.programSel && S.programSel[qid]) || [];
  const lib = S.exerciseLibrary || [];
  const today = new Date().toISOString().split('T')[0];

  // Ambil semua training days yang terdaftar di cart (untuk selector)
  const allDays = [...new Set(sel.map(s => s.training_day).filter(Boolean))].sort();
  const dayOpts = ['', ...allDays].map(d =>
    `<option value="${d}" ${S.gymDraft.trainingDay===d?'selected':''}>${d||'— Semua hari —'}</option>`
  ).join('');

  // Detail Sesi card — selalu render (independen dari cart)
  const detailCard = `
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">📅 Detail Sesi</div>
      <div class="form-row">
        <div class="form-group"><div class="form-lbl">Tanggal</div>
          <input class="form-inp" type="date" id="gym-date" value="${today}" oninput="updateGymDraftMeta()">
        </div>
        <div class="form-group" style="flex:1;min-width:90px"><div class="form-lbl">Durasi (min)</div>
          <input class="form-inp" style="width:100%" type="number" id="gym-dur" value="${S.gymDraft.duration}" oninput="updateGymDraftMeta()">
        </div>
        ${allDays.length > 0 ? `
        <div class="form-group" style="min-width:110px"><div class="form-lbl">Training Day</div>
          <select class="form-inp" id="gym-training-day" onchange="updateGymDraftMeta(); renderPanels()">
            ${dayOpts}
          </select>
        </div>` : ''}
        <div class="form-group" style="flex:1"><div class="form-lbl">Notes</div>
          <input class="form-inp" type="text" id="gym-notes" placeholder="Opsional..." value="${S.gymDraft.notes}" oninput="updateGymDraftMeta()">
        </div>
      </div>
    </div>`;

  // Resolve sel → library entries, sort by sort_order
  // Skip cardio categories (bike/run/swim) — those belong in Cardio Log
  const CARDIO_CATS = new Set(['bike','run','swim']);
  const selectedDay = S.gymDraft.trainingDay || '';
  const resolved = sel
    .map(s => ({ s, ex: lib.find(e => e.slug === s.exercise_slug) }))
    .filter(r => r.ex && !CARDIO_CATS.has(r.ex.category))
    .filter(r => !selectedDay || r.s.training_day === selectedDay)
    .sort((a,b) => (a.s.sort_order||0) - (b.s.sort_order||0));

  // Empty state: belum ada exercise di Builder cart
  if(!resolved.length){
    const histEmpty = S.gymSessions.length ? `
      <div class="card">
        <div class="card-title">🕐 Riwayat Sesi</div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Week</th><th>Day</th><th>Durasi</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              ${S.gymSessions.slice(0,10).map(s=>`<tr>
                <td style="font-weight:700">${fmtDate(s.session_date)}</td>
                <td><span class="bdg bdg-acc">W${s.week_num||'?'}</span></td>
                <td><span style="font-size:11px;font-weight:700;color:var(--acc)">${s.training_day||'—'}</span></td>
                <td class="mono">${s.duration_min||'—'} min</td>
                <td style="color:var(--t2)">${s.notes||''}</td>
                <td><button class="btn btn-danger" style="padding:3px 8px;font-size:10px" onclick="deleteSession(${s.id})">Hapus</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : '';
    const hasCardioOnly = sel.some(s => {
      const ex = lib.find(e => e.slug === s.exercise_slug);
      return ex && CARDIO_CATS.has(ex.category);
    });
    const emptyMsg = hasCardioOnly
      ? `Cart cuma berisi cardio (bike/run/swim) — log di tab <b>Cardio</b>.<br>Tambah strength/mobility di Builder buat log di sini.`
      : `Belum ada exercise — pilih di Builder dulu.`;
    return `
      ${detailCard}
      <div class="card" style="margin-bottom:1rem">
        <div class="empty-state">
          <div class="empty-ico">🛒</div>
          <div class="empty-txt">${emptyMsg}<br>
            <button class="btn btn-primary" style="margin-top:10px" onclick="setTab(1)">Buka Builder →</button>
          </div>
        </div>
      </div>
      ${histEmpty}`;
  }

  // Group by library.category
  const byCat = {};
  resolved.forEach(r => {
    const cat = r.ex.category || 'other';
    (byCat[cat] = byCat[cat] || []).push(r);
  });

  const CAT_RENDER_ORDER = ['compound','isolation','bike','run','swim','mobility','stability','other'];
  const blocksHtml = CAT_RENDER_ORDER.filter(c => byCat[c]).map(cat => {
    const meta = CAT_META[cat] || { icon:'📋', color:'acc' };
    const labelID = CAT_LABEL_ID[cat] || cat;
    const rows = byCat[cat].map(({ s, ex }) => {
      const parsed = parseTargetNote(s.target_note);
      const repsDefault = parsed.reps || s.target_value || '';
      const targetStr = `${parsed.sets}×${parsed.reps||'?'} @ RPE ${parsed.rpe}`;
      const draftSets = S.gymDraft.sets.filter(d => d.exercise === ex.name);
      return `<div style="margin-bottom:.75rem">
        <div style="font-size:12px;font-weight:700;color:var(--t0);margin-bottom:6px">${ex.name}
          <span style="font-size:10px;font-weight:600;color:var(--t2);margin-left:6px">${targetStr}</span>
        </div>
        ${Array.from({length:parsed.sets},(_,i)=>{
          const d = draftSets[i]||{};
          return `<div class="form-row" style="margin-bottom:4px">
            <div class="form-group" style="min-width:32px"><div class="form-lbl">Set</div>
              <div style="padding:7px 10px;color:var(--t3);font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700">${i+1}</div>
            </div>
            <div class="form-group" style="flex:1;min-width:60px"><div class="form-lbl">Reps</div>
              <input class="form-inp" style="width:100%" type="number" min="1" placeholder="${repsDefault||'—'}" value="${d.reps||''}"
                oninput="updateDraftSet('${cat}','${ex.name.replace(/'/g,"\\'")}',${i},'reps',this.value)">
            </div>
            <div class="form-group" style="flex:1.5;min-width:70px"><div class="form-lbl">Beban (kg)</div>
              <input class="form-inp" style="width:100%" type="number" min="0" step="0.5" placeholder="0" value="${d.weight_kg||''}"
                oninput="updateDraftSet('${cat}','${ex.name.replace(/'/g,"\\'")}',${i},'weight_kg',this.value)">
            </div>
            <div class="form-group" style="flex:1;min-width:60px"><div class="form-lbl">RPE</div>
              <input class="form-inp" style="width:100%" type="number" min="1" max="10" step="0.5" placeholder="${parsed.rpe}" value="${d.rpe||''}"
                oninput="updateDraftSet('${cat}','${ex.name.replace(/'/g,"\\'")}',${i},'rpe',this.value)">
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
    return `<div style="margin-bottom:1rem">
      <div class="card-title"><span class="bdg bdg-${meta.color}">${meta.icon} ${labelID}</span> <span style="font-size:11px;color:var(--t2);font-weight:600">${byCat[cat].length} exercise</span></div>
      ${rows}
    </div>`;
  }).join('');

  const historyHtml = S.gymSessions.length ? `
    <div class="card">
      <div class="card-title">🕐 Riwayat Sesi</div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Tanggal</th><th>Week</th><th>Day</th><th>Durasi</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            ${S.gymSessions.slice(0,10).map(s=>`<tr>
              <td style="font-weight:700">${fmtDate(s.session_date)}</td>
              <td><span class="bdg bdg-acc">W${s.week_num||'?'}</span></td>
              <td><span style="font-size:11px;font-weight:700;color:var(--acc)">${s.training_day||'—'}</span></td>
              <td class="mono">${s.duration_min||'—'} min</td>
              <td style="color:var(--t2)">${s.notes||''}</td>
              <td><button class="btn btn-danger" style="padding:3px 8px;font-size:10px" onclick="deleteSession(${s.id})">Hapus</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : '';

  return `
    ${detailCard}
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">🏋️ Sets & Reps</div>
      ${blocksHtml}
      <div style="display:flex;gap:8px;padding-top:.75rem;border-top:1px solid var(--bdr)">
        <button class="btn btn-gym" onclick="submitGymSession()">💾 Simpan Sesi</button>
        <button class="btn btn-ghost" onclick="clearGymDraft()">Reset</button>
      </div>
    </div>
    ${historyHtml}`;
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

  // Cardio program dari Builder cart (bike/run/swim)
  const CARDIO_CATS = new Set(['bike','run','swim']);
  const sel = (S.programSel && S.programSel[S.quarterId]) || [];
  const lib = S.exerciseLibrary || [];
  const selectedDay = d.trainingDay || '';
  const cardioAll = sel
    .map(s => ({ s, ex: lib.find(e => e.slug === s.exercise_slug) }))
    .filter(r => r.ex && CARDIO_CATS.has(r.ex.category))
    .sort((a,b) => (a.s.sort_order||0) - (b.s.sort_order||0));
  const cardioProgram = cardioAll.filter(r => !selectedDay || r.s.training_day === selectedDay);

  // Training day options (unique days dari cardio cart)
  const allDays = [...new Set(cardioAll.map(r => r.s.training_day).filter(Boolean))].sort();
  const dayOpts = ['', ...allDays].map(day =>
    `<option value="${day}" ${d.trainingDay===day?'selected':''}>${day||'— Semua hari —'}</option>`
  ).join('');

  const programCard = cardioProgram.length ? `
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">🎯 Cardio Program (Quarter ${S.quarterId.replace('_',' ')})</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px">
        ${cardioProgram.map(({ s, ex }) => {
          const icon = ex.category==='bike'?'🚴':ex.category==='run'?'🏃':'🏊';
          const label = ex.category==='bike'?'Sepeda':ex.category==='run'?'Lari':'Renang';
          const target = s.target_note || (s.target_value ? `${s.target_value}${s.target_unit||''}` : '');
          return `<div style="border:1px solid var(--bdr);border-radius:6px;padding:8px 10px;background:var(--bg2)">
            <div style="font-size:11.5px;font-weight:700;color:var(--t0)">${icon} ${ex.name}</div>
            <div style="font-size:9.5px;font-weight:700;color:var(--f3);text-transform:uppercase;letter-spacing:.4px;margin-top:2px">${label}</div>
            ${target ? `<div style="font-size:10.5px;color:var(--t2);margin-top:4px">${target}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:10px;color:var(--t3);margin-top:8px;padding-top:8px;border-top:1px solid var(--bdr)">💡 Log session di form bawah. Strava auto-sync menyusul.</div>
    </div>` : '';

  return `
    ${programCard}
    <div class="card" style="margin-bottom:1rem">
      <div class="card-title">📝 Log Cardio Baru</div>
      <div class="form-row">
        <div class="form-group"><div class="form-lbl">Tanggal</div>
          <input class="form-inp" type="date" id="c-date" value="${today}" oninput="updateCardioDraft()">
        </div>
        ${allDays.length > 0 ? `
        <div class="form-group" style="min-width:110px"><div class="form-lbl">Training Day</div>
          <select class="form-sel form-inp" id="c-training-day" onchange="updateCardioDraft(); renderPanels()">
            ${dayOpts}
          </select>
        </div>` : ''}
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
          <thead><tr><th>Tanggal</th><th>Day</th><th>Slot</th><th>Tipe</th><th>Durasi</th><th>Jarak</th><th>HR Avg</th><th>Zone</th><th></th></tr></thead>
          <tbody>
            ${S.cardioLog.slice(0,15).map(r=>`<tr>
              <td style="font-weight:700">${fmtDate(r.logged_date)}</td>
              <td><span style="font-size:11px;font-weight:700;color:var(--acc)">${r.training_day||'—'}</span></td>
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

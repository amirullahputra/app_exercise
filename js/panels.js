// ══════════════════════════════════════════════════════════
// PANELS — Gym + Cardio
// ══════════════════════════════════════════════════════════
import { S, rpeColor, fmtDate } from './state.js';

export const GYM_TABS  = ['📖 Protocol','🏋️ Log Sesi','📈 Progression'];
export const CARD_TABS = ['📝 Log Harian','📊 Weekly','📖 Protocol'];

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

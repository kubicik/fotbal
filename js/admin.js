/**
 * admin.js — Admin panel logic
 * FK Nový Jičín U8 Coach App
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';
const SESSION_KEY = 'fnj_admin_session';

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

function login(username, password) {
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, '1');
    return true;
  }
  return false;
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Toast ────────────────────────────────────────────────────────────────────

let _toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast toast--${type} toast--visible`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('toast--visible'), 3200);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function openModal(title, bodyHtml, onAfterRender) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').style.display = '';
  document.body.style.overflow = 'hidden';
  if (onAfterRender) onAfterRender();
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.body.style.overflow = '';
}

// ─── Screen switching ─────────────────────────────────────────────────────────

function showLogin() {
  document.getElementById('login-screen').style.display = '';
  document.getElementById('admin-app').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = '';
  navigateSection(currentSection || 'exercises');
}

// ─── Routing / sections ───────────────────────────────────────────────────────

let currentSection = 'exercises';

function navigateSection(section) {
  currentSection = section;
  window.location.hash = section;

  document.querySelectorAll('.sidebar__link').forEach(l => {
    l.classList.toggle('sidebar__link--active', l.dataset.section === section);
  });

  const titles = { trainings: 'Tréninky', exercises: 'Cvičení', categories: 'Kategorie', users: 'Uživatelé', 'players-admin': 'Soupiska', 'testings-admin': 'Testování', concept: 'Koncepce', appsettings: 'Nastavení' };
  document.getElementById('admin-page-title').textContent = titles[section] || '';

  const actionsEl = document.getElementById('admin-header-actions');
  actionsEl.innerHTML = '';

  switch (section) {
    case 'trainings':     renderTrainingsSection();     break;
    case 'exercises':     renderExercisesSection();     break;
    case 'categories':    renderCategoriesSection();    break;
    case 'users':         renderUsersSection();         break;
    case 'players-admin':  renderPlayersAdminSection();  break;
    case 'testings-admin': renderTestingsAdminSection(); break;
    case 'concept':        renderConceptSection();       break;
    case 'appsettings':   renderAppSettingsSection();   break;
  }
}

// ─── Video helpers ────────────────────────────────────────────────────────────

function detectVideoPlatform(url) {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/facebook\.com|fb\.watch/.test(url)) return 'facebook';
  if (/instagram\.com/.test(url)) return 'instagram';
  return 'link';
}

function extractYoutubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function renderVideoPreview(url) {
  if (!url) return '';
  const platform = detectVideoPlatform(url);
  if (platform === 'youtube') {
    const id = extractYoutubeId(url);
    if (id) return `<div class="video-wrapper"><iframe src="https://www.youtube.com/embed/${esc(id)}" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
  }
  const icons = { facebook: '📘 Facebook video', instagram: '📷 Instagram video', link: '▶ Přejít na video' };
  return `<a href="${esc(url)}" target="_blank" rel="noopener" class="btn btn--outline btn--sm">${icons[platform] || '▶ Video'}</a>`;
}

// ─── Category badge ────────────────────────────────────────────────────────────

function catBadge(slug) {
  const cat = DataLayer.getCategories().find(c => c.slug === slug);
  if (!cat) return `<span class="badge">${esc(slug)}</span>`;
  return `<span class="badge" style="background:${esc(cat.color)};color:#fff;">${esc(cat.name)}</span>`;
}

// ─── TRAININGS SECTION ───────────────────────────────────────────────────────

function renderTrainingsSection() {
  const actionsEl = document.getElementById('admin-header-actions');
  actionsEl.innerHTML = `<button class="btn btn--primary" id="btn-new-training">+ Nový trénink</button>`;
  document.getElementById('btn-new-training').addEventListener('click', () => openTrainingComposer(null));

  const trainings = DataLayer.getTrainings().sort((a, b) => b.date.localeCompare(a.date));

  const html = trainings.length === 0
    ? `<div class="empty-state"><p>Žádné tréninky. Vytvořte první.</p></div>`
    : `<div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Datum</th><th>Typ</th><th>Název</th><th>Místo</th><th>Délka</th><th>Cvičení</th><th style="width:140px"></th>
          </tr></thead>
          <tbody>
            ${trainings.map(t => {
              const et = EVENT_TYPES[t.eventType] || EVENT_TYPES['trénink'];
              return `<tr>
                <td>${esc(t.date)}</td>
                <td><span class="badge" style="background:${esc(et.color)};color:#fff;">${et.icon} ${esc(et.label)}</span></td>
                <td class="td-name">${esc(t.title)}</td>
                <td>${esc(t.location || '—')}</td>
                <td>${esc(String(t.duration_total || 0))} min</td>
                <td>${(t.exercises || []).length}</td>
                <td class="td-actions">
                  <button class="btn btn--sm btn--outline" data-action="edit-tr" data-id="${esc(t.id)}">Upravit</button>
                  <button class="btn btn--sm btn--danger"  data-action="del-tr"  data-id="${esc(t.id)}">Smazat</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;

  document.getElementById('admin-content').innerHTML = html;

  document.getElementById('admin-content').addEventListener('click', e => {
    if (e.target.dataset.action === 'edit-tr') openTrainingComposer(DataLayer.getTrainingById(e.target.dataset.id));
    if (e.target.dataset.action === 'del-tr') {
      const t = DataLayer.getTrainingById(e.target.dataset.id);
      if (t && confirm(`Smazat trénink "${t.title}"?`)) {
        DataLayer.deleteTraining(e.target.dataset.id);
        showToast('Trénink smazán.');
        renderTrainingsSection();
      }
    }
  });
}

const EVENT_TYPES = {
  trénink:     { label: 'Trénink',     color: '#1e40af', icon: '⚽' },
  zapas_doma:  { label: 'Zápas doma',  color: '#16a34a', icon: '🏠' },
  zapas_venku: { label: 'Zápas venku', color: '#ea580c', icon: '🚌' },
  turnaj:      { label: 'Turnaj',      color: '#9333ea', icon: '🏆' },
  jine:        { label: 'Jiné',        color: '#6b7280', icon: '📌' }
};

// Phase category mapping for pre-populating composer
const PHASE_CATS = {
  1: ['rozcvičení'],
  2: ['technika', 'kombinace'],
  3: ['hra', 'rozehrávka', 'kondice'],
  4: ['závěr', 'zápas']
};

function categoryToPhase(slug) {
  for (const [phase, cats] of Object.entries(PHASE_CATS)) {
    if (cats.some(c => slug && slug.includes(c))) return parseInt(phase);
  }
  return 2;
}

function buildComposerHTML(training) {
  const t = training || {
    date: new Date().toISOString().split('T')[0],
    title: '', eventType: 'trénink', theme: '', location: 'Hřiště FK Nový Jičín',
    duration_total: 60, notes: '', exercises: [], published: false
  };
  const isNew = !training;

  const eventTypeOpts = Object.entries(EVENT_TYPES).map(([val, et]) =>
    `<option value="${esc(val)}" ${(t.eventType || 'trénink') === val ? 'selected' : ''}>${et.icon} ${esc(et.label)}</option>`
  ).join('');

  // Pre-populate phases from existing exercises
  const phases = { 1: [], 2: [], 3: [], 4: [] };
  const exMap = {};
  DataLayer.getExercises().forEach(e => { exMap[e.id] = e; });

  [...(t.exercises || [])].sort((a, b) => a.order - b.order).forEach(item => {
    const ex = exMap[item.exerciseId];
    const phase = ex ? categoryToPhase(ex.category) : 2;
    phases[phase].push(item);
  });

  const phaseNames = ['', '🟢 Rozcvičení', '🔵 Technika / Kombinace', '🟠 Hra / Rozehrávka', '🔴 Závěr / Zápas'];
  const phaseSugg  = ['', 15, 35, 35, 15];

  const phasesHtml = [1, 2, 3, 4].map(ph => {
    const items = phases[ph].map(item => {
      const ex = exMap[item.exerciseId];
      if (!ex) return '';
      return `<li class="comp-ex-item" data-exercise-id="${esc(ex.id)}">
        <span class="comp-ex-item__handle" title="Přesunout">⠿</span>
        ${catBadge(ex.category)}
        <span class="comp-ex-item__name">${esc(ex.name)}</span>
        <span class="comp-ex-item__dur">
          <input type="number" class="input input--sm comp-dur" min="1" max="120" value="${esc(String(item.duration || ex.duration_default))}" data-role="comp-duration">
          min
        </span>
        <input type="text" class="input input--sm comp-ex-item__notes" placeholder="Poznámka..." value="${esc(item.notes || '')}">
        <button type="button" class="btn btn--sm btn--icon-only" data-action="comp-move-up" title="Nahoru">▲</button>
        <button type="button" class="btn btn--sm btn--icon-only" data-action="comp-move-down" title="Dolů">▼</button>
        <button type="button" class="btn btn--sm btn--danger btn--icon-only" data-action="comp-remove">✕</button>
      </li>`;
    }).join('');

    return `<details class="comp-phase" open data-phase="${ph}">
      <summary>
        ${esc(phaseNames[ph])}
        <span class="comp-phase-time" data-phase-time="${ph}">0 min</span>
        <span class="comp-phase-sugg">(doporuč. ~${phaseSugg[ph]}% z celku)</span>
      </summary>
      <div class="comp-phase-body">
        <ol class="comp-phase-list" data-phase="${ph}">${items}</ol>
        <button type="button" class="btn btn--outline btn--sm comp-pick-btn" data-action="pick-for-phase" data-phase="${ph}">+ Přidat cvičení</button>
      </div>
    </details>`;
  }).join('');

  return `<div class="comp-topbar">
    <button type="button" class="btn btn--outline" id="comp-back">← Zpět</button>
    <h2 class="comp-topbar__title">${isNew ? 'Nový trénink' : 'Upravit trénink'}</h2>
    <button type="button" class="btn btn--primary" id="comp-save">💾 Uložit</button>
  </div>

  <input type="hidden" id="comp-id" value="${esc(t.id || '')}">

  <div class="comp-header-form">
    <div class="form-field">
      <label class="form-label">Datum <span class="req">*</span></label>
      <input type="date" id="comp-date" class="input" value="${esc(t.date)}" required>
    </div>
    <div class="form-field">
      <label class="form-label">Typ události</label>
      <select id="comp-eventtype" class="input">${eventTypeOpts}</select>
    </div>
    <div class="form-field" style="grid-column:span 2">
      <label class="form-label">Název <span class="req">*</span></label>
      <input type="text" id="comp-title" class="input" value="${esc(t.title)}" required placeholder="např. Trénink zaměřený na dribling">
    </div>
    <div class="form-field">
      <label class="form-label">Téma</label>
      <input type="text" id="comp-theme" class="input" value="${esc(t.theme || '')}" placeholder="např. Dribling">
    </div>
    <div class="form-field">
      <label class="form-label">Místo</label>
      <input type="text" id="comp-location" class="input" value="${esc(t.location || '')}" placeholder="Hřiště FK Nový Jičín">
    </div>
    <div class="form-field">
      <label class="form-label">Celková délka</label>
      <p class="comp-dur-display"><strong id="comp-total-dur">0</strong> min</p>
    </div>
    <div class="form-field">
      <label class="form-label form-label--checkbox">
        <input type="checkbox" id="comp-published" ${t.published ? 'checked' : ''}> Publikováno
      </label>
    </div>
  </div>

  <div class="form-field" style="margin-bottom:16px">
    <label class="form-label">Poznámky pro asistenty</label>
    <div class="md-toolbar" id="notes-md-toolbar">
      <button type="button" data-md="bold" title="Tučně"><b>B</b></button>
      <button type="button" data-md="italic" title="Kurzíva"><i>I</i></button>
      <button type="button" data-md="bullet" title="Odrážka">• Seznam</button>
      <button type="button" data-md="hr" title="Oddělovač">—</button>
      <button type="button" data-md="preview" class="md-preview-toggle">👁 Náhled</button>
    </div>
    <textarea id="comp-notes" class="input textarea" rows="3" placeholder="Poznámky, upozornění...">${esc(t.notes || '')}</textarea>
    <div id="comp-notes-preview" class="md-preview" style="display:none"></div>
  </div>

  <div id="comp-phases">${phasesHtml}</div>

  <div id="comp-picker" class="comp-picker" style="display:none">
    <div class="comp-picker__filters">
      <input type="search" id="comp-pick-search" class="input input--sm" placeholder="Hledat cvičení...">
      <select id="comp-pick-cat" class="input input--sm">
        <option value="">Všechny kategorie</option>
        ${DataLayer.getCategories().map(c => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('')}
      </select>
      <button type="button" class="btn btn--sm btn--outline" id="comp-picker-close">✕ Zavřít</button>
    </div>
    <div class="comp-picker__grid" id="comp-pick-grid">
      ${DataLayer.getExercises().map(ex => {
        const imgSrc = ex.imageData || ex.imageUrl || '';
        const thumb = imgSrc
          ? `<img src="${esc(imgSrc)}" class="comp-pick-card__thumb" alt="" loading="lazy">`
          : `<div class="comp-pick-card__thumb comp-pick-card__thumb--empty">⚽</div>`;
        return `<div class="comp-pick-card" data-exercise-id="${esc(ex.id)}" data-name="${esc(ex.name.toLowerCase())}" data-cat="${esc(ex.category)}">
          ${thumb}
          <div class="comp-pick-card__name">${esc(ex.name)}</div>
          ${catBadge(ex.category)}
          <div class="comp-pick-card__dur">⏱ ${esc(String(ex.duration_default))} min</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

let _compActivePhase = 1;

function bindComposerEvents() {
  // Back button
  document.getElementById('comp-back')?.addEventListener('click', () => {
    navigateSection('trainings');
  });

  // Save
  document.getElementById('comp-save')?.addEventListener('click', saveTrainingComposer);

  // Duration recalc on input
  document.getElementById('admin-content').addEventListener('input', e => {
    if (e.target.dataset.role === 'comp-duration') updateComposerTotals();
  });

  // Phase list actions (move/remove)
  document.getElementById('comp-phases')?.addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'pick-for-phase') {
      _compActivePhase = parseInt(e.target.dataset.phase);
      document.getElementById('comp-picker').style.display = '';
      document.getElementById('comp-pick-search').value = '';
      filterComposerPicker();
      document.getElementById('comp-picker').scrollIntoView({ behavior: 'smooth' });
    }
    if (action === 'comp-remove') {
      e.target.closest('.comp-ex-item')?.remove();
      updateComposerTotals();
    }
    if (action === 'comp-move-up') {
      const item = e.target.closest('.comp-ex-item');
      const prev = item?.previousElementSibling;
      if (prev) { item.parentNode.insertBefore(item, prev); }
    }
    if (action === 'comp-move-down') {
      const item = e.target.closest('.comp-ex-item');
      const next = item?.nextElementSibling;
      if (next) { item.parentNode.insertBefore(next, item); }
    }
  });

  // Picker search/filter
  document.getElementById('comp-pick-search')?.addEventListener('input', debounce(filterComposerPicker, 150));
  document.getElementById('comp-pick-cat')?.addEventListener('change', filterComposerPicker);

  // Picker click
  document.getElementById('comp-pick-grid')?.addEventListener('click', e => {
    const card = e.target.closest('.comp-pick-card');
    if (!card) return;
    addExerciseToComposerPhase(card.dataset.exerciseId, _compActivePhase);
  });

  // Close picker
  document.getElementById('comp-picker-close')?.addEventListener('click', () => {
    document.getElementById('comp-picker').style.display = 'none';
  });

  // Notes markdown toolbar
  document.getElementById('notes-md-toolbar')?.querySelectorAll('[data-md]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ta = document.getElementById('comp-notes');
      if (!ta) return;
      const action = btn.dataset.md;
      if (action === 'preview') {
        const preview = document.getElementById('comp-notes-preview');
        if (preview.style.display === 'none') {
          preview.innerHTML = renderMarkdown(ta.value);
          preview.style.display = '';
          ta.style.display = 'none';
          btn.textContent = '✏️ Upravit';
        } else {
          preview.style.display = 'none';
          ta.style.display = '';
          btn.textContent = '👁 Náhled';
        }
        return;
      }
      const start = ta.selectionStart, end = ta.selectionEnd;
      const sel = ta.value.slice(start, end);
      let insert = '';
      if (action === 'bold')   insert = `**${sel || 'tučný text'}**`;
      if (action === 'italic') insert = `*${sel || 'kurzíva'}*`;
      if (action === 'bullet') insert = `\n- ${sel || 'položka'}`;
      if (action === 'hr')     insert = `\n---\n`;
      ta.setRangeText(insert, start, end, 'end');
      ta.focus();
    });
  });

  updateComposerTotals();
}

function filterComposerPicker() {
  const q   = (document.getElementById('comp-pick-search')?.value || '').toLowerCase();
  const cat = document.getElementById('comp-pick-cat')?.value || '';
  document.querySelectorAll('#comp-pick-grid .comp-pick-card').forEach(card => {
    const matchQ   = !q   || (card.dataset.name || '').includes(q);
    const matchCat = !cat || card.dataset.cat === cat;
    card.style.display = matchQ && matchCat ? '' : 'none';
  });
}

function addExerciseToComposerPhase(exerciseId, phase) {
  const list = document.querySelector(`.comp-phase-list[data-phase="${phase}"]`);
  if (!list) return;

  // Check already added in this phase
  if (list.querySelector(`[data-exercise-id="${exerciseId}"]`)) {
    showToast('Toto cvičení je již v této fázi.', 'info');
    return;
  }

  const ex = DataLayer.getExerciseById(exerciseId);
  if (!ex) return;

  const li = document.createElement('li');
  li.className = 'comp-ex-item';
  li.dataset.exerciseId = exerciseId;
  li.innerHTML = `
    <span class="comp-ex-item__handle" title="Přesunout">⠿</span>
    ${catBadge(ex.category)}
    <span class="comp-ex-item__name">${esc(ex.name)}</span>
    <span class="comp-ex-item__dur">
      <input type="number" class="input input--sm comp-dur" min="1" max="120" value="${esc(String(ex.duration_default))}" data-role="comp-duration">
      min
    </span>
    <input type="text" class="input input--sm comp-ex-item__notes" placeholder="Poznámka...">
    <button type="button" class="btn btn--sm btn--icon-only" data-action="comp-move-up" title="Nahoru">▲</button>
    <button type="button" class="btn btn--sm btn--icon-only" data-action="comp-move-down" title="Dolů">▼</button>
    <button type="button" class="btn btn--sm btn--danger btn--icon-only" data-action="comp-remove">✕</button>
  `;
  list.appendChild(li);
  updateComposerTotals();
  showToast(`${ex.name} přidáno do fáze ${phase}.`, 'success');
}

function updateComposerTotals() {
  let total = 0;
  [1, 2, 3, 4].forEach(ph => {
    let phTotal = 0;
    document.querySelectorAll(`.comp-phase-list[data-phase="${ph}"] [data-role="comp-duration"]`).forEach(inp => {
      phTotal += parseInt(inp.value) || 0;
    });
    total += phTotal;
    const span = document.querySelector(`[data-phase-time="${ph}"]`);
    if (span) span.textContent = `${phTotal} min`;
  });
  const el = document.getElementById('comp-total-dur');
  if (el) el.textContent = total;
}

function saveTrainingComposer() {
  const id    = document.getElementById('comp-id')?.value || null;
  const date  = document.getElementById('comp-date')?.value || '';
  const title = document.getElementById('comp-title')?.value?.trim() || '';
  if (!date || !title) { showToast('Vyplňte datum a název.', 'error'); return; }

  const exercises = [];
  let order = 1;
  [1, 2, 3, 4].forEach(ph => {
    document.querySelectorAll(`.comp-phase-list[data-phase="${ph}"] .comp-ex-item`).forEach(item => {
      exercises.push({
        exerciseId: item.dataset.exerciseId,
        duration:   parseInt(item.querySelector('[data-role="comp-duration"]')?.value) || 10,
        order:      order++,
        notes:      item.querySelector('.comp-ex-item__notes')?.value?.trim() || ''
      });
    });
  });

  const training = {
    id:             id || undefined,
    date,
    title,
    eventType:      document.getElementById('comp-eventtype')?.value || 'trénink',
    theme:          document.getElementById('comp-theme')?.value?.trim() || '',
    location:       document.getElementById('comp-location')?.value?.trim() || '',
    duration_total: exercises.reduce((s, e) => s + e.duration, 0),
    notes:          document.getElementById('comp-notes')?.value?.trim() || '',
    exercises,
    published:      document.getElementById('comp-published')?.checked || false
  };
  if (!training.id) delete training.id;

  DataLayer.saveTraining(training);
  showToast('Trénink uložen!');
  navigateSection('trainings');
}

function openTrainingComposer(training) {
  currentSection = 'trainings';
  document.getElementById('admin-page-title').textContent = training ? 'Upravit trénink' : 'Nový trénink';
  document.getElementById('admin-header-actions').innerHTML = '';
  document.getElementById('admin-content').innerHTML = buildComposerHTML(training);
  bindComposerEvents();
  updateComposerTotals();
}

// ─── EXERCISES SECTION ────────────────────────────────────────────────────────

function renderExercisesSection() {
  const actionsEl = document.getElementById('admin-header-actions');
  actionsEl.innerHTML = `<button class="btn btn--primary" id="btn-new-exercise">+ Nové cvičení</button>`;
  document.getElementById('btn-new-exercise').addEventListener('click', () => openExerciseModal(null));

  const exercises = DataLayer.getExercises();
  const categories = DataLayer.getCategories();

  const filterHtml = `
    <div class="toolbar">
      <input type="search" id="ex-search" class="input input--sm" placeholder="Hledat...">
      <select id="ex-cat" class="input input--sm">
        <option value="">Všechny kategorie</option>
        ${categories.map(c => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('')}
      </select>
    </div>`;

  const tableHtml = exercises.length === 0
    ? `<div class="empty-state"><p>Žádná cvičení. Vytvořte první.</p></div>`
    : `<div class="table-wrap">
        <table class="data-table" id="ex-table">
          <thead><tr>
            <th style="width:60px">Obr.</th>
            <th>Název</th>
            <th>Kategorie</th>
            <th>Délka</th>
            <th style="width:120px"></th>
          </tr></thead>
          <tbody>
            ${exercises.map(ex => `
              <tr data-ex-id="${esc(ex.id)}" data-name="${esc(ex.name.toLowerCase())}" data-cat="${esc(ex.category)}">
                <td>${ex.imageData
                  ? `<img src="${esc(ex.imageData)}" class="thumb" alt="">`
                  : ex.imageUrl
                    ? `<img src="${esc(ex.imageUrl)}" class="thumb" alt="">`
                    : `<span class="thumb-placeholder">⚽</span>`}
                </td>
                <td class="td-name">${esc(ex.name)}</td>
                <td>${catBadge(ex.category)}</td>
                <td>${esc(String(ex.duration_default))} min</td>
                <td class="td-actions">
                  <button class="btn btn--sm btn--outline" data-action="edit-ex" data-id="${esc(ex.id)}">Upravit</button>
                  <button class="btn btn--sm btn--danger"  data-action="del-ex"  data-id="${esc(ex.id)}">Smazat</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  document.getElementById('admin-content').innerHTML = filterHtml + tableHtml;

  // Filter
  document.getElementById('ex-search')?.addEventListener('input', filterExerciseTable);
  document.getElementById('ex-cat')?.addEventListener('change', filterExerciseTable);

  // Actions
  document.getElementById('admin-content').addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'edit-ex') openExerciseModal(DataLayer.getExerciseById(e.target.dataset.id));
    if (action === 'del-ex') {
      const ex = DataLayer.getExerciseById(e.target.dataset.id);
      if (ex && confirm(`Smazat cvičení "${ex.name}"?`)) {
        DataLayer.deleteExercise(e.target.dataset.id);
        showToast('Cvičení smazáno.');
        renderExercisesSection();
      }
    }
  });
}

function filterExerciseTable() {
  const q   = (document.getElementById('ex-search')?.value || '').toLowerCase();
  const cat = document.getElementById('ex-cat')?.value || '';
  document.querySelectorAll('#ex-table tbody tr').forEach(row => {
    const matchName = !q   || (row.dataset.name || '').includes(q);
    const matchCat  = !cat || row.dataset.cat === cat;
    row.style.display = matchName && matchCat ? '' : 'none';
  });
}

// ── Exercise modal ─────────────────────────────────────────────────────────────

function openExerciseModal(exercise) {
  const isNew = !exercise;
  const ex = exercise || { name:'', category:'', description:'', duration_default:10, imageUrl:'', imageData:'', videoUrl:'', tags:[], equipment:[], ageGroup:'U8', players_min:4, players_max:20 };
  const categories = DataLayer.getCategories();

  const imgSrc = ex.imageData || ex.imageUrl || '';

  const body = `
    <form id="ex-form" class="modal-form" novalidate>
      <input type="hidden" id="mf-id" value="${esc(ex.id || '')}">

      <div class="form-row">
        <div class="form-field form-field--grow">
          <label class="form-label">Název cvičení <span class="req">*</span></label>
          <input type="text" id="mf-name" class="input" value="${esc(ex.name)}" required placeholder="Název cvičení">
        </div>
        <div class="form-field" style="min-width:160px">
          <label class="form-label">Kategorie <span class="req">*</span></label>
          <select id="mf-category" class="input" required>
            <option value="">— vyberte —</option>
            ${categories.map(c => `<option value="${esc(c.slug)}" ${c.slug === ex.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field" style="min-width:110px">
          <label class="form-label">Délka (min)</label>
          <input type="number" id="mf-duration" class="input" value="${esc(String(ex.duration_default))}" min="1" max="90">
        </div>
      </div>

      <div class="form-field">
        <label class="form-label">Popis</label>
        <div class="md-toolbar">
          <button type="button" data-md="bold" title="Tučně (**text**)"><b>B</b></button>
          <button type="button" data-md="italic" title="Kurzíva (*text*)"><i>I</i></button>
          <button type="button" data-md="bullet" title="Odrážka (- )">• Seznam</button>
          <button type="button" data-md="hr" title="Oddělovač">—</button>
          <button type="button" data-md="preview" class="md-preview-toggle">👁 Náhled</button>
        </div>
        <textarea id="mf-description" class="input textarea" rows="4" placeholder="Popis jak cvičení provádět...">${esc(ex.description)}</textarea>
        <div id="mf-description-preview" class="md-preview" style="display:none"></div>
      </div>

      <!-- Image -->
      <div class="form-field">
        <label class="form-label">Obrázek / diagram</label>
        <div class="image-tabs">
          <button type="button" class="img-tab ${!ex.imageData ? 'img-tab--active' : ''}" data-tab="url">URL obrázku</button>
          <button type="button" class="img-tab ${ex.imageData ? 'img-tab--active' : ''}" data-tab="upload">Nahrát soubor</button>
        </div>
        <div id="img-tab-url" class="img-tab-panel" ${ex.imageData ? 'style="display:none"' : ''}>
          <input type="url" id="mf-image-url" class="input" value="${esc(ex.imageUrl || '')}" placeholder="https://...">
        </div>
        <div id="img-tab-upload" class="img-tab-panel" ${!ex.imageData ? 'style="display:none"' : ''}>
          <input type="file" id="mf-image-file" class="input" accept="image/*">
          ${ex.imageData ? `<p class="hint">Aktuální obrázek je nahrán. Nahrajte nový pro přepsání.</p>` : ''}
        </div>
        <div id="img-preview" class="img-preview-wrap" ${imgSrc ? '' : 'style="display:none"'}>
          <img id="img-preview-el" src="${esc(imgSrc)}" alt="Náhled obrázku">
          <button type="button" id="btn-remove-img" class="btn btn--sm btn--danger btn--icon-only" title="Odebrat obrázek">✕</button>
        </div>
        <input type="hidden" id="mf-image-data" value="">
      </div>

      <!-- Video -->
      <div class="form-field">
        <label class="form-label">Video (YouTube, Facebook, Instagram)</label>
        <input type="url" id="mf-video" class="input" value="${esc(ex.videoUrl || '')}" placeholder="https://www.youtube.com/watch?v=...">
        <p class="hint">Podporované platformy: YouTube (embed), Facebook, Instagram (odkaz)</p>
        <div id="video-preview" class="video-preview-wrap" ${ex.videoUrl ? '' : 'style="display:none"'}>
          ${ex.videoUrl ? renderVideoPreview(ex.videoUrl) : ''}
        </div>
      </div>

      <details class="form-details">
        <summary>Další informace</summary>
        <div class="form-row">
          <div class="form-field">
            <label class="form-label">Věková skupina</label>
            <input type="text" id="mf-agegroup" class="input" value="${esc(ex.ageGroup || 'U8')}">
          </div>
          <div class="form-field">
            <label class="form-label">Min. hráčů</label>
            <input type="number" id="mf-pmin" class="input" value="${esc(String(ex.players_min || 4))}" min="1">
          </div>
          <div class="form-field">
            <label class="form-label">Max. hráčů</label>
            <input type="number" id="mf-pmax" class="input" value="${esc(String(ex.players_max || 20))}" min="1">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field form-field--grow">
            <label class="form-label">Vybavení (oddělujte čárkou)</label>
            <input type="text" id="mf-equipment" class="input" value="${esc((ex.equipment || []).join(', '))}" placeholder="míče, kužely, ...">
          </div>
          <div class="form-field form-field--grow">
            <label class="form-label">Štítky / tagy (oddělujte čárkou)</label>
            <input type="text" id="mf-tags" class="input" value="${esc((ex.tags || []).join(', '))}" placeholder="dribling, přihrávka, ...">
          </div>
        </div>
      </details>

      <div class="modal-actions">
        <button type="button" class="btn btn--outline" id="btn-modal-cancel">Zrušit</button>
        <button type="submit" class="btn btn--primary">💾 Uložit cvičení</button>
      </div>
    </form>`;

  openModal(isNew ? 'Nové cvičení' : `Upravit: ${ex.name}`, body, () => {
    bindExerciseModalEvents(ex);
  });
}

function bindMdToolbar(textareaId, previewId) {
  document.querySelectorAll('.md-toolbar [data-md]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ta = document.getElementById(textareaId);
      if (!ta) return;
      const action = btn.dataset.md;
      if (action === 'preview') {
        const preview = document.getElementById(previewId);
        if (!preview) return;
        if (preview.style.display === 'none') {
          preview.innerHTML = renderMarkdown(ta.value);
          preview.style.display = '';
          ta.style.display = 'none';
          btn.textContent = '✏️ Upravit';
        } else {
          preview.style.display = 'none';
          ta.style.display = '';
          btn.textContent = '👁 Náhled';
        }
        return;
      }
      const start = ta.selectionStart, end = ta.selectionEnd;
      const sel = ta.value.slice(start, end);
      let insert = '';
      if (action === 'bold')   insert = `**${sel || 'tučný text'}**`;
      if (action === 'italic') insert = `*${sel || 'kurzíva'}*`;
      if (action === 'bullet') insert = `\n- ${sel || 'položka'}`;
      if (action === 'hr')     insert = `\n---\n`;
      ta.setRangeText(insert, start, end, 'end');
      ta.focus();
    });
  });
}

function renderMarkdown(text) {
  if (!text) return '';
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
  const lines = text.split('\n'); const out = []; let inUl=false,inOl=false;
  for (const line of lines) {
    const t = line.trim();
    if (/^- /.test(t)) { if(inOl){out.push('</ol>');inOl=false;} if(!inUl){out.push('<ul>');inUl=true;} out.push(`<li>${inline(t.slice(2))}</li>`); }
    else if (/^\d+\. /.test(t)) { if(inUl){out.push('</ul>');inUl=false;} if(!inOl){out.push('<ol>');inOl=true;} out.push(`<li>${inline(t.replace(/^\d+\. /,''))}</li>`); }
    else if (/^---/.test(t)) { if(inUl){out.push('</ul>');inUl=false;} if(inOl){out.push('</ol>');inOl=false;} out.push('<hr>'); }
    else { if(inUl){out.push('</ul>');inUl=false;} if(inOl){out.push('</ol>');inOl=false;} out.push(t===''?'':`<p>${inline(t)}</p>`); }
  }
  if(inUl) out.push('</ul>'); if(inOl) out.push('</ol>');
  return out.join('');
}

function bindExerciseModalEvents(originalEx) {
  bindMdToolbar('mf-description', 'mf-description-preview');

  // Image tabs
  document.querySelectorAll('.img-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.img-tab').forEach(t => t.classList.remove('img-tab--active'));
      tab.classList.add('img-tab--active');
      const isUpload = tab.dataset.tab === 'upload';
      document.getElementById('img-tab-url').style.display    = isUpload ? 'none' : '';
      document.getElementById('img-tab-upload').style.display = isUpload ? '' : 'none';
    });
  });

  // Image URL preview
  document.getElementById('mf-image-url')?.addEventListener('input', debounce(e => {
    const url = e.target.value.trim();
    const wrap = document.getElementById('img-preview');
    const img  = document.getElementById('img-preview-el');
    if (url) {
      img.src = url;
      img.onload  = () => { wrap.style.display = ''; document.getElementById('mf-image-data').value = ''; };
      img.onerror = () => { wrap.style.display = 'none'; };
    } else {
      wrap.style.display = 'none';
    }
  }, 500));

  // Image file upload
  document.getElementById('mf-image-file')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      document.getElementById('mf-image-data').value = dataUrl;
      document.getElementById('img-preview-el').src  = dataUrl;
      document.getElementById('img-preview').style.display = '';
    };
    reader.readAsDataURL(file);
  });

  // Remove image
  document.getElementById('btn-remove-img')?.addEventListener('click', () => {
    document.getElementById('mf-image-url').value   = '';
    document.getElementById('mf-image-data').value  = '';
    document.getElementById('mf-image-file').value  = '';
    document.getElementById('img-preview').style.display = 'none';
  });

  // Video preview
  document.getElementById('mf-video')?.addEventListener('input', debounce(e => {
    const url  = e.target.value.trim();
    const wrap = document.getElementById('video-preview');
    if (url) {
      wrap.innerHTML      = renderVideoPreview(url);
      wrap.style.display  = '';
    } else {
      wrap.innerHTML      = '';
      wrap.style.display  = 'none';
    }
  }, 700));

  // Cancel
  document.getElementById('btn-modal-cancel')?.addEventListener('click', closeModal);

  // Submit
  document.getElementById('ex-form')?.addEventListener('submit', e => {
    e.preventDefault();
    saveExerciseFromModal(originalEx);
  });
}

function saveExerciseFromModal(originalEx) {
  const id          = document.getElementById('mf-id')?.value || null;
  const name        = document.getElementById('mf-name')?.value.trim() || '';
  const category    = document.getElementById('mf-category')?.value || '';
  const description = document.getElementById('mf-description')?.value.trim() || '';
  const duration_default = parseInt(document.getElementById('mf-duration')?.value) || 10;
  const imageUrl    = document.getElementById('mf-image-url')?.value.trim() || '';
  const imageData   = document.getElementById('mf-image-data')?.value || '';
  const videoUrl    = document.getElementById('mf-video')?.value.trim() || '';
  const ageGroup    = document.getElementById('mf-agegroup')?.value.trim() || 'U8';
  const players_min = parseInt(document.getElementById('mf-pmin')?.value) || 4;
  const players_max = parseInt(document.getElementById('mf-pmax')?.value) || 20;
  const tags        = (document.getElementById('mf-tags')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const equipment   = (document.getElementById('mf-equipment')?.value || '').split(',').map(s => s.trim()).filter(Boolean);

  if (!name) { showToast('Zadejte název cvičení.', 'error'); return; }
  if (!category) { showToast('Vyberte kategorii.', 'error'); return; }

  const exercise = {
    id:               id || undefined,
    name, category, description, duration_default,
    imageUrl:         imageData ? '' : imageUrl,
    imageData:        imageData || (originalEx?.imageData || ''),
    videoUrl,
    tags, equipment, ageGroup, players_min, players_max
  };
  if (!exercise.id) delete exercise.id;

  DataLayer.saveExercise(exercise);
  closeModal();
  showToast('Cvičení uloženo!');
  renderExercisesSection();
}

// ─── CATEGORIES SECTION ───────────────────────────────────────────────────────

function renderCategoriesSection() {
  const actionsEl = document.getElementById('admin-header-actions');
  actionsEl.innerHTML = `<button class="btn btn--primary" id="btn-new-cat">+ Nová kategorie</button>`;
  document.getElementById('btn-new-cat').addEventListener('click', () => openCategoryModal(null));

  const categories = DataLayer.getCategories();

  const html = categories.length === 0
    ? `<div class="empty-state"><p>Žádné kategorie.</p></div>`
    : `<div class="cat-grid">
        ${categories.map(cat => `
          <div class="cat-card" data-id="${esc(cat.id)}">
            <div class="cat-card__color" style="background:${esc(cat.color)}"></div>
            <div class="cat-card__info">
              <span class="badge" style="background:${esc(cat.color)};color:#fff;">${esc(cat.name)}</span>
              <code class="cat-slug">${esc(cat.slug)}</code>
            </div>
            <div class="cat-card__actions">
              <button class="btn btn--sm btn--outline" data-action="edit-cat" data-id="${esc(cat.id)}">Upravit</button>
              <button class="btn btn--sm btn--danger"  data-action="del-cat"  data-id="${esc(cat.id)}">Smazat</button>
            </div>
          </div>`).join('')}
      </div>`;

  document.getElementById('admin-content').innerHTML = html;

  document.getElementById('admin-content').addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'edit-cat') {
      const cat = DataLayer.getCategories().find(c => c.id === e.target.dataset.id);
      if (cat) openCategoryModal(cat);
    }
    if (action === 'del-cat') {
      const cat = DataLayer.getCategories().find(c => c.id === e.target.dataset.id);
      if (cat && confirm(`Smazat kategorii "${cat.name}"?`)) {
        DataLayer.deleteCategory(e.target.dataset.id);
        showToast('Kategorie smazána.');
        renderCategoriesSection();
      }
    }
  });
}

function openCategoryModal(category) {
  const isNew = !category;
  const cat = category || { name: '', slug: '', color: '#3b82f6' };

  const body = `
    <form id="cat-form" class="modal-form" novalidate>
      <input type="hidden" id="cf-id" value="${esc(cat.id || '')}">
      <div class="form-row">
        <div class="form-field form-field--grow">
          <label class="form-label">Název kategorie <span class="req">*</span></label>
          <input type="text" id="cf-name" class="input" value="${esc(cat.name)}" required placeholder="např. Rozcvičení">
        </div>
        <div class="form-field">
          <label class="form-label">Barva štítku</label>
          <div class="color-picker-row">
            <input type="color" id="cf-color" class="color-input" value="${esc(cat.color || '#3b82f6')}">
            <div id="cf-color-preview" class="color-preview" style="background:${esc(cat.color || '#3b82f6')}"></div>
          </div>
        </div>
      </div>
      <div class="form-field">
        <label class="form-label">Slug (automatický, slouží k propojení s cvičeními)</label>
        <input type="text" id="cf-slug" class="input" value="${esc(cat.slug || '')}" placeholder="auto" ${!isNew ? '' : ''}>
        <p class="hint">Změna slugu odpojí cvičení přiřazená pod starý slug.</p>
      </div>
      <div class="form-field">
        <label class="form-label">Náhled štítku</label>
        <div id="cf-badge-preview">
          <span class="badge" id="cf-badge" style="background:${esc(cat.color || '#3b82f6')};color:#fff;">${esc(cat.name || 'Název')}</span>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn--outline" id="btn-cat-cancel">Zrušit</button>
        <button type="submit" class="btn btn--primary">💾 Uložit kategorii</button>
      </div>
    </form>`;

  openModal(isNew ? 'Nová kategorie' : `Upravit: ${cat.name}`, body, () => {
    // Live preview
    const nameEl  = document.getElementById('cf-name');
    const colorEl = document.getElementById('cf-color');
    const badge   = document.getElementById('cf-badge');
    const preview = document.getElementById('cf-color-preview');
    const slugEl  = document.getElementById('cf-slug');

    function updatePreview() {
      const name  = nameEl.value || 'Název';
      const color = colorEl.value;
      badge.textContent = name;
      badge.style.background = color;
      preview.style.background = color;
    }

    nameEl.addEventListener('input', () => {
      updatePreview();
      // Auto-slug only for new categories
      if (isNew) {
        slugEl.value = nameEl.value.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        // Keep original Czech slug for Czech chars
        slugEl.value = nameEl.value.toLowerCase().trim();
      }
    });
    colorEl.addEventListener('input', updatePreview);

    document.getElementById('btn-cat-cancel').addEventListener('click', closeModal);
    document.getElementById('cat-form').addEventListener('submit', e => {
      e.preventDefault();
      const id    = document.getElementById('cf-id').value || null;
      const name  = nameEl.value.trim();
      const color = colorEl.value;
      const slug  = slugEl.value.trim() || name.toLowerCase();
      if (!name) { showToast('Zadejte název kategorie.', 'error'); return; }
      DataLayer.saveCategory({ id: id || undefined, name, slug, color });
      closeModal();
      showToast('Kategorie uložena!');
      renderCategoriesSection();
    });
  });
}

// ─── USERS SECTION ────────────────────────────────────────────────────────────

function renderUsersSection() {
  const actionsEl = document.getElementById('admin-header-actions');
  actionsEl.innerHTML = `<button class="btn btn--primary" id="btn-new-user">+ Nový uživatel</button>`;
  document.getElementById('btn-new-user').addEventListener('click', () => openUserModal(null));

  const users = DataLayer.getUsers();

  const html = users.length === 0
    ? `<div class="empty-state"><p>Žádní uživatelé. Přidejte asistenty a trenéry.</p></div>`
    : `<div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Jméno</th>
            <th>Role</th>
            <th>Email</th>
            <th>Poznámka</th>
            <th style="width:120px"></th>
          </tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong>${esc(u.name)}</strong></td>
                <td><span class="role-badge">${esc(u.role || '')}</span></td>
                <td>${u.email ? `<a href="mailto:${esc(u.email)}">${esc(u.email)}</a>` : '—'}</td>
                <td class="td-note">${esc(u.notes || '')}</td>
                <td class="td-actions">
                  <button class="btn btn--sm btn--outline" data-action="edit-user" data-id="${esc(u.id)}">Upravit</button>
                  <button class="btn btn--sm btn--danger"  data-action="del-user"  data-id="${esc(u.id)}">Smazat</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  document.getElementById('admin-content').innerHTML = html;

  document.getElementById('admin-content').addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'edit-user') openUserModal(DataLayer.getUserById(e.target.dataset.id));
    if (action === 'del-user') {
      const u = DataLayer.getUserById(e.target.dataset.id);
      if (u && confirm(`Smazat uživatele "${u.name}"?`)) {
        DataLayer.deleteUser(e.target.dataset.id);
        showToast('Uživatel smazán.');
        renderUsersSection();
      }
    }
  });
}

function openUserModal(user) {
  const isNew = !user;
  const u = user || { name: '', role: 'Asistent trenéra', email: '', phone: '', notes: '' };

  const body = `
    <form id="user-form" class="modal-form" novalidate>
      <input type="hidden" id="uf-id" value="${esc(u.id || '')}">
      <div class="form-row">
        <div class="form-field form-field--grow">
          <label class="form-label">Jméno a příjmení <span class="req">*</span></label>
          <input type="text" id="uf-name" class="input" value="${esc(u.name)}" required placeholder="Jan Novák">
        </div>
        <div class="form-field" style="min-width:180px">
          <label class="form-label">Role</label>
          <input type="text" id="uf-role" class="input" value="${esc(u.role || 'Asistent trenéra')}" placeholder="Asistent trenéra">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field form-field--grow">
          <label class="form-label">Email</label>
          <input type="email" id="uf-email" class="input" value="${esc(u.email || '')}" placeholder="jan@example.com">
        </div>
        <div class="form-field form-field--grow">
          <label class="form-label">Telefon</label>
          <input type="tel" id="uf-phone" class="input" value="${esc(u.phone || '')}" placeholder="+420 777 000 000">
        </div>
      </div>
      <div class="form-field">
        <label class="form-label">Poznámka</label>
        <textarea id="uf-notes" class="input textarea" rows="3" placeholder="Poznámky...">${esc(u.notes || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn--outline" id="btn-user-cancel">Zrušit</button>
        <button type="submit" class="btn btn--primary">💾 Uložit uživatele</button>
      </div>
    </form>`;

  openModal(isNew ? 'Nový uživatel' : `Upravit: ${u.name}`, body, () => {
    document.getElementById('btn-user-cancel').addEventListener('click', closeModal);
    document.getElementById('user-form').addEventListener('submit', e => {
      e.preventDefault();
      const id    = document.getElementById('uf-id').value || null;
      const name  = document.getElementById('uf-name').value.trim();
      const role  = document.getElementById('uf-role').value.trim();
      const email = document.getElementById('uf-email').value.trim();
      const phone = document.getElementById('uf-phone').value.trim();
      const notes = document.getElementById('uf-notes').value.trim();
      if (!name) { showToast('Zadejte jméno.', 'error'); return; }
      DataLayer.saveUser({ id: id || undefined, name, role, email, phone, notes });
      closeModal();
      showToast('Uživatel uložen!');
      renderUsersSection();
    });
  });
}

// ─── CONCEPT SECTION ─────────────────────────────────────────────────────────

function renderConceptSection() {
  document.getElementById('admin-header-actions').innerHTML = '';
  const concept = DataLayer.getConcept() || { title: '', season: '', intro: '', months: [] };

  const monthsHtml = (concept.months || []).map((m, idx) => `
    <div class="concept-month-row" data-idx="${idx}">
      <div class="concept-month-row__header">
        <span class="concept-month-row__num">${idx + 1}.</span>
        <div class="form-row" style="flex:1">
          <div class="form-field" style="min-width:110px">
            <label class="form-label">Měsíc</label>
            <input type="text" class="input input--sm" name="month-name" value="${esc(m.month || '')}" placeholder="Duben">
          </div>
          <div class="form-field form-field--grow">
            <label class="form-label">Téma</label>
            <input type="text" class="input input--sm" name="month-theme" value="${esc(m.theme || '')}" placeholder="Měsíc Odvahy">
          </div>
          <div class="form-field">
            <label class="form-label">Barva</label>
            <div class="color-picker-row">
              <input type="color" class="color-input" name="month-color" value="${esc(m.color || '#3b82f6')}">
            </div>
          </div>
        </div>
        <button type="button" class="btn btn--sm btn--danger btn--icon-only" data-action="remove-month" data-idx="${idx}" title="Odebrat měsíc">✕</button>
      </div>
      <div class="form-row" style="padding-left:1.5rem">
        <div class="form-field form-field--grow">
          <label class="form-label">Zaměření</label>
          <textarea class="input textarea" name="month-focus" rows="2" placeholder="Popis zaměření...">${esc(m.focus || '')}</textarea>
        </div>
        <div class="form-field form-field--grow">
          <label class="form-label">Cíl měsíce</label>
          <input type="text" class="input input--sm" name="month-goal" value="${esc(m.goal || '')}" placeholder="Cíl...">
        </div>
      </div>
    </div>`).join('');

  document.getElementById('admin-content').innerHTML = `
    <form id="concept-form" class="modal-form" style="max-width:800px" novalidate>
      <div class="form-row">
        <div class="form-field form-field--grow">
          <label class="form-label">Název koncepce</label>
          <input type="text" id="cf2-title" class="input" value="${esc(concept.title || '')}" placeholder="Zpátky do tempa">
        </div>
        <div class="form-field" style="min-width:140px">
          <label class="form-label">Sezóna</label>
          <input type="text" id="cf2-season" class="input" value="${esc(concept.season || '')}" placeholder="Jaro 2026">
        </div>
      </div>
      <div class="form-field">
        <label class="form-label">Úvodní text (volitelný)</label>
        <textarea id="cf2-intro" class="input textarea" rows="3" placeholder="Krátký popis koncepce...">${esc(concept.intro || '')}</textarea>
      </div>

      <div id="concept-months-list" class="concept-months-admin">
        ${monthsHtml}
      </div>
      <button type="button" class="btn btn--outline" id="btn-add-month">+ Přidat měsíc</button>

      <div class="modal-actions" style="margin-top:1.5rem">
        <a href="../index.html#/concept" target="_blank" class="btn btn--outline">👁 Náhled na webu</a>
        <button type="submit" class="btn btn--primary">💾 Uložit koncepci</button>
      </div>
    </form>`;

  document.getElementById('btn-add-month').addEventListener('click', () => {
    const list = document.getElementById('concept-months-list');
    const idx  = list.querySelectorAll('.concept-month-row').length;
    const div  = document.createElement('div');
    div.className = 'concept-month-row';
    div.dataset.idx = idx;
    div.innerHTML = `
      <div class="concept-month-row__header">
        <span class="concept-month-row__num">${idx + 1}.</span>
        <div class="form-row" style="flex:1">
          <div class="form-field" style="min-width:110px">
            <label class="form-label">Měsíc</label>
            <input type="text" class="input input--sm" name="month-name" placeholder="Měsíc">
          </div>
          <div class="form-field form-field--grow">
            <label class="form-label">Téma</label>
            <input type="text" class="input input--sm" name="month-theme" placeholder="Téma měsíce">
          </div>
          <div class="form-field">
            <label class="form-label">Barva</label>
            <div class="color-picker-row"><input type="color" class="color-input" name="month-color" value="#3b82f6"></div>
          </div>
        </div>
        <button type="button" class="btn btn--sm btn--danger btn--icon-only" data-action="remove-month" data-idx="${idx}" title="Odebrat">✕</button>
      </div>
      <div class="form-row" style="padding-left:1.5rem">
        <div class="form-field form-field--grow">
          <label class="form-label">Zaměření</label>
          <textarea class="input textarea" name="month-focus" rows="2" placeholder="Popis zaměření..."></textarea>
        </div>
        <div class="form-field form-field--grow">
          <label class="form-label">Cíl měsíce</label>
          <input type="text" class="input input--sm" name="month-goal" placeholder="Cíl...">
        </div>
      </div>`;
    list.appendChild(div);
  });

  document.getElementById('concept-months-list').addEventListener('click', e => {
    if (e.target.dataset.action === 'remove-month') {
      e.target.closest('.concept-month-row').remove();
    }
  });

  document.getElementById('concept-form').addEventListener('submit', e => {
    e.preventDefault();
    const rows = [...document.querySelectorAll('.concept-month-row')];
    const months = rows.map(row => ({
      id:    'm' + Math.random().toString(36).slice(2, 6),
      month: row.querySelector('[name="month-name"]')?.value.trim() || '',
      theme: row.querySelector('[name="month-theme"]')?.value.trim() || '',
      color: row.querySelector('[name="month-color"]')?.value || '#3b82f6',
      focus: row.querySelector('[name="month-focus"]')?.value.trim() || '',
      goal:  row.querySelector('[name="month-goal"]')?.value.trim() || ''
    })).filter(m => m.month);

    DataLayer.saveConcept({
      title:  document.getElementById('cf2-title').value.trim(),
      season: document.getElementById('cf2-season').value.trim(),
      intro:  document.getElementById('cf2-intro').value.trim(),
      months
    });
    showToast('Koncepce uložena!');
  });
}

// ─── APP SETTINGS SECTION ─────────────────────────────────────────────────────

function renderAppSettingsSection() {
  document.getElementById('admin-header-actions').innerHTML = '';
  const s = DataLayer.getSettings() || {};

  document.getElementById('admin-content').innerHTML = `
    <form id="settings-form" class="modal-form" style="max-width:600px" novalidate>
      <div class="export-card" style="margin-bottom:1.5rem">
        <h2>Základní informace o týmu</h2>
        <div class="form-row">
          <div class="form-field form-field--grow">
            <label class="form-label">Název týmu</label>
            <input type="text" id="sf-team" class="input" value="${esc(s.teamName || 'FK Nový Jičín')}">
          </div>
          <div class="form-field">
            <label class="form-label">Věková skupina</label>
            <input type="text" id="sf-age" class="input" value="${esc(s.ageGroup || 'U8')}">
          </div>
          <div class="form-field">
            <label class="form-label">Sezóna</label>
            <input type="text" id="sf-season" class="input" value="${esc(s.season || '')}">
          </div>
        </div>
      </div>

      <div class="export-card" style="margin-bottom:1.5rem">
        <h2>📅 Sdílený kalendář (iCal)</h2>
        <p>Propojte externí kalendář (Google Calendar, Apple Calendar). Zadejte URL ve formátu iCal (.ics). Pozn.: načítání externích kalendářů závisí na CORS nastavení zdroje.</p>
        <div class="form-field">
          <label class="form-label">iCal URL</label>
          <input type="url" id="sf-ical" class="input" value="${esc(s.icalUrl || '')}" placeholder="https://calendar.google.com/calendar/ical/...">
        </div>
        <div class="form-field">
          <label class="form-label">Název kalendáře (pro .ics export)</label>
          <input type="text" id="sf-caltitle" class="input" value="${esc(s.calendarTitle || 'FK Nový Jičín U8 — Tréninky')}">
        </div>
        ${s.icalUrl ? `<p class="hint">Aktuální zdroj: <a href="${esc(s.icalUrl)}" target="_blank" rel="noopener">${esc(s.icalUrl)}</a></p>` : ''}
      </div>

      <div class="export-card" style="margin-bottom:1.5rem">
        <h2>🏷️ Pravidla klasifikace (Google Kalendář)</h2>
        <p>Pokud název události obsahuje klíčové slovo, přiřadí se jí automaticky typ. Pravidla se vyhodnocují shora dolů, první shoda vyhraje.</p>
        <div id="rules-list" class="rules-list"></div>
        <button type="button" class="btn btn--outline btn--sm" id="btn-add-rule">+ Přidat pravidlo</button>
      </div>

      <div class="export-card" style="margin-bottom:1.5rem">
        <h2>📍 Zkratky míst (kalendář)</h2>
        <p>Pokud místo události obsahuje klíčové slovo, zobrazí se místo toho zkrácený název.</p>
        <div id="aliases-list" class="rules-list"></div>
        <button type="button" class="btn btn--outline btn--sm" id="btn-add-alias">+ Přidat zkratku</button>
      </div>

      <div class="modal-actions">
        <button type="submit" class="btn btn--primary">💾 Uložit nastavení</button>
        <button type="button" class="btn btn--outline" id="btn-reload-repo">🔄 Načíst data z webu</button>
      </div>
    </form>`;

  const EVENT_TYPE_OPTIONS = [
    { value: 'trénink',     label: '⚽ Trénink' },
    { value: 'zapas_doma',  label: '🏠 Zápas doma' },
    { value: 'zapas_venku', label: '🚌 Zápas venku' },
    { value: 'turnaj',      label: '🏆 Turnaj' },
    { value: 'jine',        label: '📌 Jiné' }
  ];

  function renderRuleRow(rule) {
    const typeOptions = EVENT_TYPE_OPTIONS.map(o =>
      `<option value="${esc(o.value)}" ${rule.type === o.value ? 'selected' : ''}>${esc(o.label)}</option>`
    ).join('');
    const div = document.createElement('div');
    div.className = 'rule-row';
    div.innerHTML = `
      <span class="rule-row__if">Pokud název obsahuje</span>
      <input type="text" class="input input--sm rule-keyword" value="${esc(rule.keyword || '')}" placeholder="např. trénink">
      <span class="rule-row__then">→</span>
      <select class="input input--sm rule-type">${typeOptions}</select>
      <button type="button" class="btn btn--sm btn--danger btn--icon-only rule-remove" title="Odebrat">✕</button>`;
    div.querySelector('.rule-remove').addEventListener('click', () => div.remove());
    return div;
  }

  const rulesList = document.getElementById('rules-list');
  (s.classificationRules || []).forEach(r => rulesList.appendChild(renderRuleRow(r)));

  document.getElementById('btn-add-rule').addEventListener('click', () => {
    rulesList.appendChild(renderRuleRow({ keyword: '', type: 'trénink' }));
  });

  function renderAliasRow(alias) {
    const div = document.createElement('div');
    div.className = 'rule-row';
    div.innerHTML = `
      <span class="rule-row__if">Pokud místo obsahuje</span>
      <input type="text" class="input input--sm alias-keyword" value="${esc(alias.keyword || '')}" placeholder="např. Tyršova">
      <span class="rule-row__then">→</span>
      <input type="text" class="input input--sm alias-name" value="${esc(alias.name || '')}" placeholder="zkrácený název">
      <button type="button" class="btn btn--sm btn--danger btn--icon-only alias-remove" title="Odebrat">✕</button>`;
    div.querySelector('.alias-remove').addEventListener('click', () => div.remove());
    return div;
  }

  const aliasesList = document.getElementById('aliases-list');
  (s.locationAliases || []).forEach(a => aliasesList.appendChild(renderAliasRow(a)));

  document.getElementById('btn-add-alias').addEventListener('click', () => {
    aliasesList.appendChild(renderAliasRow({ keyword: '', name: '' }));
  });

  document.getElementById('settings-form').addEventListener('submit', e => {
    e.preventDefault();
    const rules = [...rulesList.querySelectorAll('.rule-row')].map(row => ({
      keyword: row.querySelector('.rule-keyword').value.trim(),
      type:    row.querySelector('.rule-type').value
    })).filter(r => r.keyword);

    const aliases = [...aliasesList.querySelectorAll('.rule-row')].map(row => ({
      keyword: row.querySelector('.alias-keyword').value.trim(),
      name:    row.querySelector('.alias-name').value.trim()
    })).filter(a => a.keyword && a.name);

    DataLayer.saveSettings({
      teamName:              document.getElementById('sf-team').value.trim(),
      ageGroup:              document.getElementById('sf-age').value.trim(),
      season:                document.getElementById('sf-season').value.trim(),
      icalUrl:               document.getElementById('sf-ical').value.trim(),
      calendarTitle:         document.getElementById('sf-caltitle').value.trim(),
      classificationRules:   rules,
      locationAliases:       aliases
    });
    showToast('Nastavení uloženo!');
  });

  document.getElementById('btn-reload-repo').addEventListener('click', async () => {
    if (!confirm('Načíst všechna data znovu z webu? Přepíše lokální změny.')) return;
    try {
      await DataLayer.reloadFromRepo();
      showToast('Data načtena z webu.');
    } catch(e) {
      showToast('Chyba: ' + e.message, 'error');
    }
  });
}

// ─── EXPORT / IMPORT SECTION ──────────────────────────────────────────────────


// ─── PLAYERS SECTION ─────────────────────────────────────────────────────────

function renderPlayersAdminSection() {
  const actionsEl = document.getElementById('admin-header-actions');
  actionsEl.innerHTML = `<button class="btn btn--primary" id="btn-new-player">+ Nový hráč</button>`;
  document.getElementById('btn-new-player').addEventListener('click', () => openPlayerModal(null));

  const players = DataLayer.getPlayers().sort((a, b) => (a.number || 99) - (b.number || 99));

  const html = players.length === 0
    ? `<div class="empty-state"><p>Soupiska je prázdná. Přidejte prvního hráče.</p></div>`
    : `<div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th style="width:60px">#</th>
            <th>Jméno</th>
            <th>Pozice</th>
            <th>Nožička</th>
            <th style="width:140px"></th>
          </tr></thead>
          <tbody>
            ${players.map(p => `
              <tr>
                <td><strong>${esc(String(p.number || '—'))}</strong></td>
                <td>${esc(p.name)}</td>
                <td>${esc(p.position || '—')}</td>
                <td>${esc(p.dominantFoot || '—')}</td>
                <td class="td-actions">
                  <button class="btn btn--sm btn--outline" data-action="edit-player" data-id="${esc(p.id)}">Upravit</button>
                  <button class="btn btn--sm btn--danger"  data-action="del-player"  data-id="${esc(p.id)}">Smazat</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  document.getElementById('admin-content').innerHTML = html;

  document.getElementById('admin-content').addEventListener('click', e => {
    const action = e.target.dataset.action;
    if (action === 'edit-player') openPlayerModal(DataLayer.getPlayerById(e.target.dataset.id));
    if (action === 'del-player') {
      const p = DataLayer.getPlayerById(e.target.dataset.id);
      if (p && confirm(`Smazat hráče "${p.name}"?`)) {
        DataLayer.deletePlayer(e.target.dataset.id);
        showToast('Hráč smazán.');
        renderPlayersAdminSection();
      }
    }
  });
}

function openPlayerModal(player) {
  const isNew = !player;
  const p = player || { name: '', number: '', nickname: '', birthYear: 2018, position: '', dominantFoot: 'pravá', notes: '' };

  const body = `
    <form id="player-form" class="modal-form" novalidate>
      <input type="hidden" id="pf-id" value="${esc(p.id || '')}">
      <div class="form-row">
        <div class="form-field" style="min-width:80px">
          <label class="form-label">Číslo</label>
          <input type="number" id="pf-number" class="input" value="${p.number != null ? esc(String(p.number)) : ''}" min="1" max="99" placeholder="—">
        </div>
        <div class="form-field form-field--grow">
          <label class="form-label">Jméno a příjmení <span class="req">*</span></label>
          <input type="text" id="pf-name" class="input" value="${esc(p.name)}" required placeholder="Jan Novák">
        </div>
        <div class="form-field" style="min-width:110px">
          <label class="form-label">Přezdívka na dresu</label>
          <input type="text" id="pf-nickname" class="input" value="${esc(p.nickname || '')}" placeholder="Honza">
        </div>
      </div>
      <div class="form-row">
        <div class="form-field form-field--grow">
          <label class="form-label">Pozice</label>
          <input type="text" id="pf-position" class="input" value="${esc(p.position || '')}" placeholder="útočník">
        </div>
        <div class="form-field">
          <label class="form-label">Dominantní noha</label>
          <select id="pf-foot" class="input">
            <option value="pravá" ${p.dominantFoot === 'pravá' ? 'selected' : ''}>Pravá</option>
            <option value="levá"  ${p.dominantFoot === 'levá'  ? 'selected' : ''}>Levá</option>
            <option value="obě"   ${p.dominantFoot === 'obě'   ? 'selected' : ''}>Obě</option>
          </select>
        </div>
      </div>
      <div class="form-field">
        <label class="form-label">Poznámka</label>
        <textarea id="pf-notes" class="input textarea" rows="2">${esc(p.notes || '')}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn--outline" id="btn-player-cancel">Zrušit</button>
        <button type="submit" class="btn btn--primary">💾 Uložit hráče</button>
      </div>
    </form>`;

  openModal(isNew ? 'Nový hráč' : `Upravit: ${p.name}`, body, () => {
    document.getElementById('btn-player-cancel').addEventListener('click', closeModal);
    document.getElementById('player-form').addEventListener('submit', e => {
      e.preventDefault();
      const id = document.getElementById('pf-id').value || null;
      const name = document.getElementById('pf-name').value.trim();
      if (!name) { showToast('Zadejte jméno hráče.', 'error'); return; }
      const numVal = document.getElementById('pf-number').value.trim();
      DataLayer.savePlayer({
        id: id || undefined,
        name,
        number:       numVal !== '' ? parseInt(numVal) : null,
        nickname:     document.getElementById('pf-nickname').value.trim(),
        birthYear:    parseInt(document.getElementById('pf-birthyear').value) || 2018,
        position:     document.getElementById('pf-position').value.trim(),
        dominantFoot: document.getElementById('pf-foot').value,
        notes:        document.getElementById('pf-notes').value.trim()
      });
      closeModal();
      showToast('Hráč uložen!');
      renderPlayersAdminSection();
    });
  });
}

// ─── Testing events admin ─────────────────────────────────────────────────────

function renderTestingsAdminSection() {
  const actionsEl = document.getElementById('admin-header-actions');
  actionsEl.innerHTML = `<button class="btn btn--primary" id="btn-new-testing">+ Nová událost</button>`;
  document.getElementById('btn-new-testing').addEventListener('click', () => openTestingEventEditor(null));

  const events = DataLayer.getTestingEvents().sort((a, b) => b.date.localeCompare(a.date));

  const html = events.length === 0
    ? `<div class="empty-state"><p>Žádné testovací události. Vytvořte první.</p></div>`
    : `<div class="table-wrap">
        <table class="data-table">
          <thead><tr>
            <th>Datum</th><th>Název</th><th>Testy</th><th>Hráčů</th><th style="width:140px"></th>
          </tr></thead>
          <tbody>
            ${events.map(evt => `<tr>
              <td>${esc(evt.date)}</td>
              <td class="td-name">${esc(evt.name)}</td>
              <td>${(evt.tests || []).length}</td>
              <td>${(evt.tests || []).reduce((s, t) => s + (t.results || []).length, 0)}</td>
              <td class="td-actions">
                <button class="btn btn--sm btn--outline" data-action="edit-tevt" data-id="${esc(evt.id)}">Upravit</button>
                <button class="btn btn--sm btn--danger"  data-action="del-tevt"  data-id="${esc(evt.id)}">Smazat</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

  document.getElementById('admin-content').innerHTML = html;

  document.getElementById('admin-content').addEventListener('click', e => {
    if (e.target.dataset.action === 'edit-tevt') openTestingEventEditor(DataLayer.getTestingEventById(e.target.dataset.id));
    if (e.target.dataset.action === 'del-tevt') {
      const evt = DataLayer.getTestingEventById(e.target.dataset.id);
      if (evt && confirm(`Smazat testování "${evt.name}"?`)) {
        DataLayer.deleteTestingEvent(e.target.dataset.id);
        showToast('Testování smazáno.');
        renderTestingsAdminSection();
      }
    }
  });
}

function openTestingEventEditor(event) {
  currentSection = 'testings-admin';
  const isNew = !event;
  const evt = event || { name: '', date: new Date().toISOString().split('T')[0], description: '', tests: [] };
  const players = DataLayer.getPlayers().sort((a, b) => (a.number || 99) - (b.number || 99));

  document.getElementById('admin-page-title').textContent = isNew ? 'Nové testování' : `Upravit: ${evt.name}`;
  document.getElementById('admin-header-actions').innerHTML = '';

  document.getElementById('admin-content').innerHTML = buildTestingEventHTML(evt, players);
  bindTestingEventEditorEvents(evt, players);
}

function buildTestingEventHTML(evt, players) {
  const testsHtml = (evt.tests || []).map((test, ti) => buildTestCardHTML(test, ti, players)).join('');

  return `
    <div class="comp-topbar">
      <button type="button" class="btn btn--outline" id="tevt-back">← Zpět</button>
      <button type="button" class="btn btn--primary" id="tevt-save">💾 Uložit</button>
    </div>

    <input type="hidden" id="tevt-id" value="${esc(evt.id || '')}">

    <div class="export-card" style="margin-bottom:1.5rem">
      <div class="form-row">
        <div class="form-field form-field--grow">
          <label class="form-label">Název události <span class="req">*</span></label>
          <input type="text" id="tevt-name" class="input" value="${esc(evt.name)}" placeholder="Testování rychlosti">
        </div>
        <div class="form-field">
          <label class="form-label">Datum</label>
          <input type="date" id="tevt-date" class="input" value="${esc(evt.date)}">
        </div>
      </div>
      <div class="form-field">
        <label class="form-label">Popis</label>
        <input type="text" id="tevt-desc" class="input" value="${esc(evt.description || '')}" placeholder="Krátký popis testování">
      </div>
    </div>

    <div id="tevt-tests-wrap">${testsHtml}</div>

    <button type="button" class="btn btn--outline" id="tevt-add-test" style="margin-top:0.5rem">+ Přidat test</button>`;
}

function buildTestCardHTML(test, testIdx, players) {
  const attempts = test.results && test.results.length > 0
    ? Math.max(...test.results.map(r => (r.values || []).length), 1)
    : 2;

  const attemptHeaders = Array.from({ length: attempts }, (_, i) =>
    `<th class="tevt-attempt-th">Pokus ${i + 1}</th>`).join('');

  const playerRows = players.map(p => {
    const result = (test.results || []).find(r => r.playerId === p.id);
    const vals = result ? result.values : [];
    const valCells = Array.from({ length: attempts }, (_, i) =>
      `<td><input type="number" class="input input--sm tevt-val" step="0.01" placeholder="—" value="${vals[i] != null ? esc(String(vals[i])) : ''}" data-player="${esc(p.id)}" data-attempt="${i}"></td>`
    ).join('');
    return `<tr data-player-id="${esc(p.id)}">
      <td class="tevt-player-name">${p.number != null ? `<span class="tevt-num">${esc(String(p.number))}</span>` : ''} ${esc(p.name)}</td>
      ${valCells}
      <td class="tevt-addcell"></td>
    </tr>`;
  }).join('');

  return `<div class="tevt-test export-card" data-test-idx="${testIdx}" data-attempts="${attempts}">
    <div class="tevt-test-header">
      <div class="tevt-test-config">
        <input type="text" class="input tevt-testname" placeholder="Název testu (např. Rychlost 30m)" value="${esc(test.testName || '')}">
        <input type="text" class="input input--sm tevt-unit" placeholder="jednotka (s, m, …)" value="${esc(test.unit || '')}" style="max-width:100px">
        <label class="form-label form-label--checkbox" style="white-space:nowrap">
          <input type="checkbox" class="tevt-lower" ${test.lowerIsBetter ? 'checked' : ''}> Nižší = lepší
        </label>
      </div>
      <button type="button" class="btn btn--sm btn--danger tevt-remove-test">Odebrat test</button>
    </div>
    <div class="table-wrap tevt-results-wrap">
      <table class="tevt-results-table">
        <thead><tr>
          <th class="tevt-player-col">Hráč</th>
          ${attemptHeaders}
          <th class="tevt-addcol"><button type="button" class="btn btn--sm btn--outline tevt-addattempt">+ Pokus</button></th>
        </tr></thead>
        <tbody>${playerRows}</tbody>
      </table>
    </div>
  </div>`;
}

function bindTestingEventEditorEvents(evt, players) {
  document.getElementById('tevt-back').addEventListener('click', () => navigateSection('testings-admin'));

  document.getElementById('tevt-save').addEventListener('click', () => saveTestingEventFromEditor(players));

  document.getElementById('tevt-add-test').addEventListener('click', () => {
    const wrap = document.getElementById('tevt-tests-wrap');
    const currentCount = wrap.querySelectorAll('.tevt-test').length;
    const newTest = { testName: '', unit: '', lowerIsBetter: false, results: [] };
    const div = document.createElement('div');
    div.innerHTML = buildTestCardHTML(newTest, currentCount, players);
    wrap.appendChild(div.firstElementChild);
    bindTestCardEvents(wrap.lastElementChild);
  });

  document.querySelectorAll('.tevt-test').forEach(card => bindTestCardEvents(card));
}

function bindTestCardEvents(card) {
  card.querySelector('.tevt-remove-test').addEventListener('click', () => {
    if (confirm('Odebrat tento test?')) card.remove();
  });

  card.querySelector('.tevt-addattempt').addEventListener('click', () => {
    const attempts = parseInt(card.dataset.attempts) + 1;
    card.dataset.attempts = attempts;

    const addColTh = card.querySelector('.tevt-addcol');
    const th = document.createElement('th');
    th.className = 'tevt-attempt-th';
    th.textContent = `Pokus ${attempts}`;
    addColTh.parentNode.insertBefore(th, addColTh);

    card.querySelectorAll('tbody tr').forEach(row => {
      const playerId = row.dataset.playerId;
      const addCell = row.querySelector('.tevt-addcell');
      const td = document.createElement('td');
      td.innerHTML = `<input type="number" class="input input--sm tevt-val" step="0.01" placeholder="—" data-player="${esc(playerId)}" data-attempt="${attempts - 1}">`;
      row.insertBefore(td, addCell);
    });
  });
}

function saveTestingEventFromEditor(players) {
  const id = document.getElementById('tevt-id').value || undefined;
  const name = document.getElementById('tevt-name').value.trim();
  const date = document.getElementById('tevt-date').value;
  const description = document.getElementById('tevt-desc').value.trim();

  if (!name) { showToast('Zadejte název události.', 'error'); return; }
  if (!date) { showToast('Zadejte datum.', 'error'); return; }

  const tests = [];
  document.querySelectorAll('.tevt-test').forEach(card => {
    const testName = card.querySelector('.tevt-testname').value.trim();
    const unit = card.querySelector('.tevt-unit').value.trim();
    const lowerIsBetter = card.querySelector('.tevt-lower').checked;
    const numAttempts = parseInt(card.dataset.attempts);

    // Collect values per player
    const playerMap = {};
    card.querySelectorAll('.tevt-val').forEach(input => {
      const pid = input.dataset.player;
      const aidx = parseInt(input.dataset.attempt);
      const val = parseFloat(input.value);
      if (!playerMap[pid]) playerMap[pid] = [];
      if (!isNaN(val)) {
        while (playerMap[pid].length <= aidx) playerMap[pid].push(null);
        playerMap[pid][aidx] = val;
      }
    });

    const results = Object.entries(playerMap)
      .map(([playerId, values]) => ({ playerId, values: values.filter(v => v != null) }))
      .filter(r => r.values.length > 0);

    if (testName) {
      tests.push({
        id: DataLayer.generateId('tt'),
        testName, unit, lowerIsBetter, results
      });
    }
  });

  DataLayer.saveTestingEvent({ id, name, date, description, tests });
  showToast('Testování uloženo!');
  navigateSection('testings-admin');
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); };
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function init() {
  await DataLayer.init();

  if (isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }

  // Login form
  document.getElementById('login-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const u = document.getElementById('l-username').value.trim();
    const p = document.getElementById('l-password').value;
    if (login(u, p)) {
      showApp();
    } else {
      document.getElementById('login-error').style.display = '';
    }
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', logout);

  // Sidebar toggle (mobile)
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('sidebar--open');
  });

  // Sidebar nav links
  document.querySelectorAll('.sidebar__link[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateSection(link.dataset.section);
      document.getElementById('sidebar').classList.remove('sidebar--open');
    });
  });

  // Modal close
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Hash routing
  const hash = window.location.hash.replace('#', '');
  if (['exercises','categories','users','export'].includes(hash)) {
    navigateSection(hash);
  }
}

document.addEventListener('DOMContentLoaded', init);

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

  const titles = { exercises: 'Cvičení', categories: 'Kategorie', users: 'Uživatelé', export: 'Export / Import' };
  document.getElementById('admin-page-title').textContent = titles[section] || '';

  const actionsEl = document.getElementById('admin-header-actions');
  actionsEl.innerHTML = '';

  switch (section) {
    case 'exercises':   renderExercisesSection();  break;
    case 'categories':  renderCategoriesSection();  break;
    case 'users':       renderUsersSection();        break;
    case 'export':      renderExportSection();       break;
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
        <textarea id="mf-description" class="input textarea" rows="4" placeholder="Popis jak cvičení provádět...">${esc(ex.description)}</textarea>
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

function bindExerciseModalEvents(originalEx) {
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

// ─── EXPORT / IMPORT SECTION ──────────────────────────────────────────────────

function renderExportSection() {
  document.getElementById('admin-header-actions').innerHTML = '';
  document.getElementById('admin-content').innerHTML = `
    <div class="export-section">
      <div class="export-card">
        <h2>📦 Exportovat data</h2>
        <p>Stáhne všechna data (cvičení, tréninky, kategorie, uživatelé) jako JSON soubory. Umístěte je do složky <code>data/</code> v repozitáři a commitněte — tím provedete nový release.</p>
        <button class="btn btn--primary" id="btn-export">Stáhnout JSON soubory</button>
        <div id="export-status" class="status-msg" style="display:none"></div>
      </div>

      <div class="export-card">
        <h2>📥 Importovat data</h2>
        <p>Nahrajte JSON soubory pro přepsání lokálních dat (například po stažení z repozitáře).</p>
        <div class="import-grid">
          <label class="form-label">exercises.json<input type="file" id="imp-ex"   class="input" accept=".json"></label>
          <label class="form-label">trainings.json<input type="file" id="imp-tr"   class="input" accept=".json"></label>
          <label class="form-label">categories.json<input type="file" id="imp-cat" class="input" accept=".json"></label>
          <label class="form-label">users.json<input type="file" id="imp-usr"      class="input" accept=".json"></label>
        </div>
        <button class="btn btn--primary" id="btn-import">Importovat</button>
        <div id="import-status" class="status-msg" style="display:none"></div>
      </div>

      <div class="export-card export-card--warn">
        <h2>🔄 Načíst z repozitáře</h2>
        <p>Přepíše lokální data daty z veřejného webu (data/*.json). Použijte po novém deployi.</p>
        <button class="btn btn--outline" id="btn-reload-repo">Načíst z webu</button>
      </div>

      <div class="export-card export-card--danger">
        <h2>🗑️ Smazat lokální data</h2>
        <p>Vymaže vše z localStorage. Data z repozitáře budou znovu načtena při dalším načtení stránky.</p>
        <button class="btn btn--danger" id="btn-clear">Smazat lokální data</button>
      </div>
    </div>`;

  document.getElementById('btn-export').addEventListener('click', () => {
    DataLayer.exportData();
    const s = document.getElementById('export-status');
    s.textContent = 'Soubory se stahují. Uložte je do data/ v repozitáři a commitněte.';
    s.className = 'status-msg status-msg--success';
    s.style.display = '';
  });

  document.getElementById('btn-import').addEventListener('click', async () => {
    const readJSON = file => new Promise((res, rej) => {
      if (!file) { res(null); return; }
      const r = new FileReader();
      r.onload = e => { try { res(JSON.parse(e.target.result)); } catch(err) { rej(err); } };
      r.readAsText(file);
    });
    try {
      const ex  = await readJSON(document.getElementById('imp-ex')?.files[0]);
      const tr  = await readJSON(document.getElementById('imp-tr')?.files[0]);
      const cat = await readJSON(document.getElementById('imp-cat')?.files[0]);
      const usr = await readJSON(document.getElementById('imp-usr')?.files[0]);
      if (ex)  localStorage.setItem('fnj_exercises',  JSON.stringify(ex));
      if (tr)  localStorage.setItem('fnj_trainings',  JSON.stringify(tr));
      if (cat) localStorage.setItem('fnj_categories', JSON.stringify(cat));
      if (usr) localStorage.setItem('fnj_users',      JSON.stringify(usr));
      const s = document.getElementById('import-status');
      s.textContent = 'Import dokončen!';
      s.className = 'status-msg status-msg--success';
      s.style.display = '';
      showToast('Data importována!');
    } catch(err) {
      showToast('Chyba importu: ' + err.message, 'error');
    }
  });

  document.getElementById('btn-reload-repo').addEventListener('click', async () => {
    if (!confirm('Přepsat lokální data daty z webu?')) return;
    try {
      await DataLayer.reloadFromRepo();
      showToast('Data načtena z repozitáře.');
    } catch(e) {
      showToast('Chyba: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-clear').addEventListener('click', () => {
    if (!confirm('Opravdu smazat všechna lokální data?')) return;
    localStorage.clear();
    showToast('Data smazána. Obnovte stránku.');
    setTimeout(() => window.location.reload(), 1500);
  });
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

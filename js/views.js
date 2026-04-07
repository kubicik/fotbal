/**
 * views.js — Page rendering functions
 * FK Nový Jičín U8 Coach App
 */

const CATEGORY_LABELS = {
  'rozcvičení': 'Rozcvičení',
  'technika': 'Technika',
  'hra': 'Hra',
  'kondice': 'Kondice',
  'závěr': 'Závěr'
};

const CATEGORY_ORDER = ['rozcvičení', 'technika', 'hra', 'kondice', 'závěr'];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('cs-CZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) { return dateStr; }
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
  } catch (e) { return dateStr; }
}

function categoryBadge(categorySlug) {
  const cats = (typeof DataLayer !== 'undefined') ? DataLayer.getCategories() : [];
  const cat  = cats.find(c => c.slug === categorySlug);
  const label = cat ? cat.name : (CATEGORY_LABELS[categorySlug] || categorySlug);
  if (cat && cat.color) {
    return `<span class="badge" style="background:${escHtml(cat.color)};color:#fff;">${escHtml(label)}</span>`;
  }
  return `<span class="badge badge--${escHtml(categorySlug)}">${escHtml(label)}</span>`;
}

function renderEmpty(message, actionHtml = '') {
  return `<div class="empty-state">
    <div class="empty-state__icon">⚽</div>
    <p class="empty-state__text">${escHtml(message)}</p>
    ${actionHtml}
  </div>`;
}

function extractYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function renderYoutube(url) {
  const id = extractYoutubeId(url);
  if (!id) return `<a href="${escHtml(url)}" target="_blank" rel="noopener" class="btn btn--outline">▶ Zobrazit video</a>`;
  return `<div class="video-wrapper">
    <iframe src="https://www.youtube.com/embed/${escHtml(id)}" frameborder="0" allowfullscreen loading="lazy" title="Video cvičení"></iframe>
  </div>`;
}

// ─── Trainings list ───────────────────────────────────────────────────────────

function renderTrainings(trainings, editMode) {
  const sorted = [...trainings].sort((a, b) => b.date.localeCompare(a.date));

  const header = `<div class="page-header">
    <div>
      <h1 class="page-title">Tréninky</h1>
      <p class="page-subtitle">FK Nový Jičín — U8 (nar. 2018)</p>
    </div>
    ${editMode ? `<a href="#/training/new" class="btn btn--primary">+ Nový trénink</a>` : ''}
  </div>`;

  if (sorted.length === 0) {
    return header + renderEmpty('Zatím žádné tréninky.',
      editMode ? `<a href="#/training/new" class="btn btn--primary">Vytvořit první trénink</a>` : '');
  }

  const cards = sorted.map(t => {
    const exCount = (t.exercises || []).length;
    const publishedBadge = t.published
      ? `<span class="badge badge--published">Publikováno</span>`
      : `<span class="badge badge--draft">Koncept</span>`;

    return `<article class="card card--training" data-id="${escHtml(t.id)}" role="article">
      <a href="#/training/${escHtml(t.id)}" class="card__link" aria-label="${escHtml(t.title)}">
        <div class="card__header">
          <div class="card__meta">
            <time class="card__date" datetime="${escHtml(t.date)}">${formatDateShort(t.date)}</time>
            ${publishedBadge}
          </div>
          <h2 class="card__title">${escHtml(t.title)}</h2>
          ${t.theme ? `<p class="card__theme">Téma: ${escHtml(t.theme)}</p>` : ''}
        </div>
        <div class="card__footer">
          <span class="card__stat"><span class="card__stat-icon">⏱</span> ${escHtml(String(t.duration_total))} min</span>
          <span class="card__stat"><span class="card__stat-icon">📋</span> ${exCount} cvičení</span>
          ${t.location ? `<span class="card__stat card__stat--location"><span class="card__stat-icon">📍</span> ${escHtml(t.location)}</span>` : ''}
        </div>
      </a>
      ${editMode ? `<div class="card__actions">
        <a href="#/training/${escHtml(t.id)}/edit" class="btn btn--sm btn--outline">Upravit</a>
        <button class="btn btn--sm btn--danger" data-action="delete-training" data-id="${escHtml(t.id)}">Smazat</button>
      </div>` : ''}
    </article>`;
  }).join('');

  return header + `<div class="card-grid card-grid--trainings">${cards}</div>`;
}

// ─── Training detail ──────────────────────────────────────────────────────────

function renderTrainingDetail(training, exercises, editMode) {
  const exMap = {};
  exercises.forEach(e => { exMap[e.id] = e; });

  const sortedExercises = [...(training.exercises || [])].sort((a, b) => a.order - b.order);

  const exercisesHtml = sortedExercises.map((item, idx) => {
    const ex = exMap[item.exerciseId];
    if (!ex) return `<li class="training-ex training-ex--missing">Cvičení nenalezeno (${escHtml(item.exerciseId)})</li>`;

    const imageHtml = ex.imageUrl
      ? `<img src="${escHtml(ex.imageUrl)}" alt="${escHtml(ex.name)}" class="training-ex__image" loading="lazy">`
      : '';

    const videoHtml = ex.videoUrl
      ? `<div class="training-ex__video">${renderYoutube(ex.videoUrl)}</div>`
      : '';

    const itemNotesHtml = item.notes
      ? `<div class="training-ex__item-notes"><strong>Poznámka pro tento trénink:</strong> ${escHtml(item.notes)}</div>`
      : '';

    const equipmentHtml = (ex.equipment && ex.equipment.length)
      ? `<p class="training-ex__detail"><span class="detail-label">Pomůcky:</span> ${ex.equipment.map(escHtml).join(', ')}</p>`
      : '';

    return `<li class="training-ex" data-ex-id="${escHtml(ex.id)}">
      <div class="training-ex__head">
        <span class="training-ex__num">${idx + 1}</span>
        <div class="training-ex__info">
          <h3 class="training-ex__name">${escHtml(ex.name)}</h3>
          <div class="training-ex__badges">
            ${categoryBadge(ex.category)}
            <span class="badge badge--duration">⏱ ${escHtml(String(item.duration))} min</span>
          </div>
        </div>
      </div>
      ${imageHtml ? `<div class="training-ex__img-wrap">${imageHtml}</div>` : ''}
      <div class="training-ex__body">
        <p class="training-ex__description">${escHtml(ex.description)}</p>
        ${equipmentHtml}
        ${itemNotesHtml}
        ${videoHtml}
      </div>
    </li>`;
  }).join('');

  const totalDurationCalc = sortedExercises.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);

  return `<div class="detail-header no-print-nav">
    <button class="btn btn--back" onclick="history.back()">← Zpět</button>
    <div class="detail-header__actions">
      <button class="btn btn--outline" onclick="window.print()">🖨️ Tisknout / PDF</button>
      ${editMode ? `<a href="#/training/${escHtml(training.id)}/edit" class="btn btn--primary">Upravit</a>` : ''}
    </div>
  </div>

  <article class="detail-page" id="print-area">
    <header class="detail-page__header">
      <div class="detail-page__header-top">
        <div class="detail-page__club print-only">FK Nový Jičín — U8</div>
        <h1 class="detail-page__title">${escHtml(training.title)}</h1>
        <div class="detail-page__badges">
          ${training.theme ? `<span class="badge badge--theme">${escHtml(training.theme)}</span>` : ''}
          ${training.published ? `<span class="badge badge--published">Publikováno</span>` : `<span class="badge badge--draft">Koncept</span>`}
        </div>
      </div>
      <dl class="detail-page__meta">
        <div class="detail-page__meta-item">
          <dt>Datum</dt>
          <dd><time datetime="${escHtml(training.date)}">${formatDate(training.date)}</time></dd>
        </div>
        ${training.location ? `<div class="detail-page__meta-item">
          <dt>Místo</dt>
          <dd>${escHtml(training.location)}</dd>
        </div>` : ''}
        <div class="detail-page__meta-item">
          <dt>Délka</dt>
          <dd>${escHtml(String(training.duration_total))} min (naplánováno: ${totalDurationCalc} min)</dd>
        </div>
        <div class="detail-page__meta-item">
          <dt>Počet cvičení</dt>
          <dd>${sortedExercises.length}</dd>
        </div>
      </dl>
      ${training.notes ? `<div class="detail-page__notes">
        <strong>Poznámky pro asistenty:</strong>
        <p>${escHtml(training.notes)}</p>
      </div>` : ''}
    </header>

    <section class="detail-page__exercises">
      <h2 class="section-title">Program tréninku</h2>
      ${sortedExercises.length === 0
        ? '<p class="empty-inline">Žádná cvičení nebyla přidána.</p>'
        : `<ol class="training-ex-list">${exercisesHtml}</ol>`
      }
    </section>
  </article>`;
}

// ─── Exercises list ───────────────────────────────────────────────────────────

function renderExercises(exercises, editMode, filterCat = '', searchQuery = '') {
  let filtered = [...exercises];

  if (filterCat) {
    filtered = filtered.filter(e => e.category === filterCat);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    return a.name.localeCompare(b.name, 'cs');
  });

  const filterOptions = ['', ...CATEGORY_ORDER].map(cat => {
    const label = cat ? (CATEGORY_LABELS[cat] || cat) : 'Všechny kategorie';
    const selected = cat === filterCat ? ' selected' : '';
    return `<option value="${escHtml(cat)}"${selected}>${escHtml(label)}</option>`;
  }).join('');

  const header = `<div class="page-header">
    <div>
      <h1 class="page-title">Cvičení</h1>
      <p class="page-subtitle">Knihovna cvičení (${exercises.length} celkem)</p>
    </div>
    ${editMode ? `<a href="#/exercise/new" class="btn btn--primary">+ Přidat cvičení</a>` : ''}
  </div>
  <div class="filters">
    <input type="search" id="ex-search" class="filters__search" placeholder="Hledat cvičení..." value="${escHtml(searchQuery)}" aria-label="Hledat cvičení">
    <select id="ex-cat-filter" class="filters__select" aria-label="Filtrovat podle kategorie">
      ${filterOptions}
    </select>
    <span class="filters__count">${filtered.length} výsledků</span>
  </div>`;

  if (filtered.length === 0) {
    return header + renderEmpty('Žádná cvičení nenalezena.',
      editMode ? `<a href="#/exercise/new" class="btn btn--primary">Přidat první cvičení</a>` : '');
  }

  const cards = filtered.map(ex => {
    const imageHtml = ex.imageUrl
      ? `<div class="ex-card__img-wrap"><img src="${escHtml(ex.imageUrl)}" alt="${escHtml(ex.name)}" class="ex-card__img" loading="lazy"></div>`
      : `<div class="ex-card__img-wrap ex-card__img-wrap--empty"><span class="ex-card__img-placeholder">⚽</span></div>`;

    const tagsHtml = (ex.tags && ex.tags.length)
      ? `<div class="ex-card__tags">${ex.tags.slice(0, 3).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div>`
      : '';

    return `<article class="card card--exercise" data-id="${escHtml(ex.id)}">
      <a href="#/exercise/${escHtml(ex.id)}" class="card__link" aria-label="${escHtml(ex.name)}">
        ${imageHtml}
        <div class="card__body">
          <div class="card__meta">${categoryBadge(ex.category)}</div>
          <h2 class="card__title card__title--sm">${escHtml(ex.name)}</h2>
          <p class="card__desc">${escHtml((ex.description || '').slice(0, 100))}${(ex.description || '').length > 100 ? '…' : ''}</p>
          <div class="card__footer">
            <span class="card__stat">⏱ ${escHtml(String(ex.duration_default))} min</span>
            ${ex.players_min ? `<span class="card__stat">👤 ${escHtml(String(ex.players_min))}–${escHtml(String(ex.players_max))}</span>` : ''}
          </div>
          ${tagsHtml}
        </div>
      </a>
      ${editMode ? `<div class="card__actions">
        <a href="#/exercise/${escHtml(ex.id)}/edit" class="btn btn--sm btn--outline">Upravit</a>
        <button class="btn btn--sm btn--danger" data-action="delete-exercise" data-id="${escHtml(ex.id)}">Smazat</button>
      </div>` : ''}
    </article>`;
  }).join('');

  return header + `<div class="card-grid card-grid--exercises">${cards}</div>`;
}

// ─── Exercise detail ──────────────────────────────────────────────────────────

function renderExerciseDetail(exercise, editMode) {
  const imageHtml = exercise.imageUrl
    ? `<div class="detail-page__img-wrap"><img src="${escHtml(exercise.imageUrl)}" alt="${escHtml(exercise.name)}" class="detail-page__img"></div>`
    : '';

  const videoHtml = exercise.videoUrl
    ? `<section class="detail-section">
        <h2 class="section-title">Video</h2>
        ${renderYoutube(exercise.videoUrl)}
      </section>`
    : '';

  const equipmentHtml = (exercise.equipment && exercise.equipment.length)
    ? `<div class="detail-page__meta-item">
        <dt>Pomůcky</dt>
        <dd>${exercise.equipment.map(escHtml).join(', ')}</dd>
      </div>`
    : '';

  const tagsHtml = (exercise.tags && exercise.tags.length)
    ? `<div class="detail-page__meta-item">
        <dt>Tagy</dt>
        <dd><div class="tags-list">${exercise.tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div></dd>
      </div>`
    : '';

  return `<div class="detail-header no-print-nav">
    <button class="btn btn--back" onclick="history.back()">← Zpět</button>
    <div class="detail-header__actions">
      ${editMode ? `<a href="#/exercise/${escHtml(exercise.id)}/edit" class="btn btn--primary">Upravit</a>` : ''}
    </div>
  </div>

  <article class="detail-page">
    <header class="detail-page__header">
      <div class="detail-page__header-top">
        <h1 class="detail-page__title">${escHtml(exercise.name)}</h1>
        <div class="detail-page__badges">
          ${categoryBadge(exercise.category)}
          <span class="badge badge--duration">⏱ ${escHtml(String(exercise.duration_default))} min</span>
        </div>
      </div>
      <dl class="detail-page__meta">
        <div class="detail-page__meta-item">
          <dt>Věková skupina</dt>
          <dd>${escHtml(exercise.ageGroup || 'U8')}</dd>
        </div>
        ${exercise.players_min ? `<div class="detail-page__meta-item">
          <dt>Počet hráčů</dt>
          <dd>${escHtml(String(exercise.players_min))}–${escHtml(String(exercise.players_max))}</dd>
        </div>` : ''}
        ${equipmentHtml}
        ${tagsHtml}
      </dl>
    </header>

    ${imageHtml}

    <section class="detail-section">
      <h2 class="section-title">Popis cvičení</h2>
      <p class="detail-description">${escHtml(exercise.description)}</p>
    </section>

    ${videoHtml}
  </article>`;
}

// ─── Training form ────────────────────────────────────────────────────────────

function renderTrainingForm(training, exercises, isNew) {
  const t = training || {
    date: new Date().toISOString().split('T')[0],
    title: '',
    theme: '',
    location: 'Hřiště FK Nový Jičín',
    duration_total: 60,
    notes: '',
    exercises: [],
    published: false
  };

  const sortedTrExercises = [...(t.exercises || [])].sort((a, b) => a.order - b.order);

  const exMap = {};
  exercises.forEach(e => { exMap[e.id] = e; });

  // Added exercises list
  const addedListHtml = sortedTrExercises.map((item, idx) => {
    const ex = exMap[item.exerciseId];
    if (!ex) return '';
    return `<li class="form-ex-item" data-exercise-id="${escHtml(item.exerciseId)}" data-order="${idx}">
      <div class="form-ex-item__drag-handle" title="Přetáhnout">⠿</div>
      <div class="form-ex-item__info">
        <span class="form-ex-item__name">${escHtml(ex.name)}</span>
        ${categoryBadge(ex.category)}
      </div>
      <div class="form-ex-item__controls">
        <div class="form-ex-item__duration">
          <label class="sr-only" for="dur-${escHtml(item.exerciseId)}">Délka (min)</label>
          <input type="number" id="dur-${escHtml(item.exerciseId)}" class="input input--sm" min="1" max="120" value="${escHtml(String(item.duration))}" data-role="ex-duration" aria-label="Délka cvičení v minutách">
          <span>min</span>
        </div>
        <div class="form-ex-item__order-btns">
          <button type="button" class="btn btn--icon" data-action="move-up" title="Posunout nahoru" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn btn--icon" data-action="move-down" title="Posunout dolů" ${idx === sortedTrExercises.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
        <button type="button" class="btn btn--sm btn--danger" data-action="remove-exercise">Odebrat</button>
      </div>
      <div class="form-ex-item__notes">
        <input type="text" class="input input--sm" placeholder="Poznámka ke cvičení (volitelné)" value="${escHtml(item.notes || '')}" data-role="ex-notes" aria-label="Poznámka ke cvičení">
      </div>
    </li>`;
  }).join('');

  // Exercise picker
  const sortedExercises = [...exercises].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    return a.name.localeCompare(b.name, 'cs');
  });

  const pickerRows = sortedExercises.map(ex => {
    const isAdded = sortedTrExercises.some(item => item.exerciseId === ex.id);
    return `<tr class="picker-row ${isAdded ? 'picker-row--added' : ''}" data-exercise-id="${escHtml(ex.id)}" data-name="${escHtml(ex.name.toLowerCase())}" data-category="${escHtml(ex.category)}">
      <td>${categoryBadge(ex.category)}</td>
      <td class="picker-row__name">${escHtml(ex.name)}</td>
      <td>${escHtml(String(ex.duration_default))} min</td>
      <td>
        <button type="button" class="btn btn--sm ${isAdded ? 'btn--outline' : 'btn--primary'}" data-action="add-exercise" data-default-duration="${escHtml(String(ex.duration_default))}">
          ${isAdded ? '✓ Přidáno' : '+ Přidat'}
        </button>
      </td>
    </tr>`;
  }).join('');

  return `<div class="detail-header no-print-nav">
    <button class="btn btn--back" onclick="history.back()">← Zpět</button>
    <h1 class="page-title">${isNew ? 'Nový trénink' : 'Upravit trénink'}</h1>
  </div>

  <form id="training-form" class="form" novalidate>
    <input type="hidden" id="f-id" value="${escHtml(t.id || '')}">

    <section class="form-section">
      <h2 class="form-section__title">Základní informace</h2>
      <div class="form-grid">
        <div class="form-field form-field--required">
          <label for="f-date" class="form-label">Datum tréninku</label>
          <input type="date" id="f-date" class="input" value="${escHtml(t.date)}" required>
        </div>
        <div class="form-field form-field--required form-field--wide">
          <label for="f-title" class="form-label">Název tréninku</label>
          <input type="text" id="f-title" class="input" value="${escHtml(t.title)}" required placeholder="např. Trénink zaměřený na dribling">
        </div>
        <div class="form-field">
          <label for="f-theme" class="form-label">Téma</label>
          <input type="text" id="f-theme" class="input" value="${escHtml(t.theme || '')}" placeholder="např. Dribling">
        </div>
        <div class="form-field">
          <label for="f-location" class="form-label">Místo</label>
          <input type="text" id="f-location" class="input" value="${escHtml(t.location || '')}" placeholder="Hřiště FK Nový Jičín">
        </div>
        <div class="form-field">
          <label for="f-duration" class="form-label">Délka tréninku (min)</label>
          <input type="number" id="f-duration" class="input" value="${escHtml(String(t.duration_total || 60))}" min="15" max="180">
        </div>
        <div class="form-field form-field--wide">
          <label for="f-notes" class="form-label">Poznámky pro asistenty</label>
          <textarea id="f-notes" class="input textarea" rows="3" placeholder="Poznámky, upozornění, zvláštní instrukce...">${escHtml(t.notes || '')}</textarea>
        </div>
        <div class="form-field">
          <label class="form-label form-label--checkbox">
            <input type="checkbox" id="f-published" ${t.published ? 'checked' : ''}>
            Publikováno (viditelné bez editačního režimu)
          </label>
        </div>
      </div>
    </section>

    <section class="form-section">
      <h2 class="form-section__title">
        Program tréninku
        <span class="total-duration-display">Celkem: <strong id="total-dur-display">${sortedTrExercises.reduce((s, i) => s + i.duration, 0)}</strong> min</span>
      </h2>

      ${sortedTrExercises.length === 0
        ? `<p class="empty-inline" id="empty-ex-hint">Zatím žádná cvičení. Přidejte je z knihovny níže.</p>`
        : ''}
      <ol class="form-ex-list" id="form-ex-list">
        ${addedListHtml}
      </ol>
    </section>

    <section class="form-section">
      <h2 class="form-section__title">Přidat cvičení z knihovny</h2>
      <div class="picker-filters">
        <input type="search" id="picker-search" class="input" placeholder="Hledat cvičení..." aria-label="Hledat cvičení">
        <select id="picker-cat" class="input" aria-label="Filtrovat kategorie">
          <option value="">Všechny kategorie</option>
          ${((typeof DataLayer !== 'undefined') ? DataLayer.getCategories() : []).map(cat =>
            `<option value="${escHtml(cat.slug)}">${escHtml(cat.name)}</option>`).join('')}
        </select>
      </div>
      <div class="picker-table-wrap">
        <table class="picker-table" id="exercise-picker">
          <thead>
            <tr>
              <th>Kategorie</th>
              <th>Název</th>
              <th>Výchozí délka</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${pickerRows}
          </tbody>
        </table>
      </div>
    </section>

    <div class="form-actions">
      <button type="button" class="btn btn--outline" onclick="history.back()">Zrušit</button>
      <button type="submit" class="btn btn--primary btn--lg">💾 Uložit trénink</button>
    </div>
  </form>`;
}

// ─── Exercise form ────────────────────────────────────────────────────────────

function renderExerciseForm(exercise, isNew) {
  const ex = exercise || {
    name: '',
    category: 'technika',
    description: '',
    duration_default: 10,
    imageUrl: '',
    videoUrl: '',
    tags: [],
    ageGroup: 'U8',
    players_min: 4,
    players_max: 20,
    equipment: []
  };

  const _cats = (typeof DataLayer !== 'undefined') ? DataLayer.getCategories() : [];
  const categoryOptions = _cats.map(cat => {
    const selected = cat.slug === ex.category ? ' selected' : '';
    return `<option value="${escHtml(cat.slug)}"${selected}>${escHtml(cat.name)}</option>`;
  }).join('');

  const videoPreview = ex.videoUrl
    ? `<div id="video-preview" class="preview-wrap">${renderYoutube(ex.videoUrl)}</div>`
    : `<div id="video-preview" class="preview-wrap" style="display:none"></div>`;

  const imagePreview = ex.imageUrl
    ? `<div id="image-preview" class="preview-wrap"><img src="${escHtml(ex.imageUrl)}" alt="Náhled obrázku" class="image-preview" id="img-preview-el"></div>`
    : `<div id="image-preview" class="preview-wrap" style="display:none"><img src="" alt="Náhled obrázku" class="image-preview" id="img-preview-el"></div>`;

  return `<div class="detail-header no-print-nav">
    <button class="btn btn--back" onclick="history.back()">← Zpět</button>
    <h1 class="page-title">${isNew ? 'Nové cvičení' : 'Upravit cvičení'}</h1>
  </div>

  <form id="exercise-form" class="form" novalidate>
    <input type="hidden" id="f-id" value="${escHtml(ex.id || '')}">

    <section class="form-section">
      <h2 class="form-section__title">Základní informace</h2>
      <div class="form-grid">
        <div class="form-field form-field--required form-field--wide">
          <label for="f-name" class="form-label">Název cvičení</label>
          <input type="text" id="f-name" class="input" value="${escHtml(ex.name)}" required placeholder="Název cvičení">
        </div>
        <div class="form-field form-field--required">
          <label for="f-category" class="form-label">Kategorie</label>
          <select id="f-category" class="input" required>
            ${categoryOptions}
          </select>
        </div>
        <div class="form-field">
          <label for="f-duration" class="form-label">Výchozí délka (min)</label>
          <input type="number" id="f-duration" class="input" value="${escHtml(String(ex.duration_default))}" min="1" max="90">
        </div>
        <div class="form-field">
          <label for="f-agegroup" class="form-label">Věková skupina</label>
          <input type="text" id="f-agegroup" class="input" value="${escHtml(ex.ageGroup || 'U8')}">
        </div>
        <div class="form-field">
          <label for="f-pmin" class="form-label">Min. hráčů</label>
          <input type="number" id="f-pmin" class="input" value="${escHtml(String(ex.players_min || 4))}" min="1">
        </div>
        <div class="form-field">
          <label for="f-pmax" class="form-label">Max. hráčů</label>
          <input type="number" id="f-pmax" class="input" value="${escHtml(String(ex.players_max || 20))}" min="1">
        </div>
        <div class="form-field form-field--wide">
          <label for="f-description" class="form-label">Popis cvičení</label>
          <textarea id="f-description" class="input textarea" rows="5" placeholder="Podrobný popis jak cvičení provádět...">${escHtml(ex.description || '')}</textarea>
        </div>
        <div class="form-field form-field--wide">
          <label for="f-equipment" class="form-label">Pomůcky (oddělte čárkou)</label>
          <input type="text" id="f-equipment" class="input" value="${escHtml((ex.equipment || []).join(', '))}" placeholder="kužely, míče, šátky">
        </div>
        <div class="form-field form-field--wide">
          <label for="f-tags" class="form-label">Tagy (oddělte čárkou)</label>
          <input type="text" id="f-tags" class="input" value="${escHtml((ex.tags || []).join(', '))}" placeholder="dribling, přihrávka, rychlost">
        </div>
      </div>
    </section>

    <section class="form-section">
      <h2 class="form-section__title">Média</h2>
      <div class="form-grid">
        <div class="form-field form-field--wide">
          <label for="f-image" class="form-label">URL obrázku</label>
          <input type="url" id="f-image" class="input" value="${escHtml(ex.imageUrl || '')}" placeholder="https://example.com/obrazek.jpg">
          ${imagePreview}
        </div>
        <div class="form-field form-field--wide">
          <label for="f-video" class="form-label">URL videa (YouTube)</label>
          <input type="url" id="f-video" class="input" value="${escHtml(ex.videoUrl || '')}" placeholder="https://youtube.com/watch?v=...">
          ${videoPreview}
        </div>
      </div>
    </section>

    <div class="form-actions">
      <button type="button" class="btn btn--outline" onclick="history.back()">Zrušit</button>
      <button type="submit" class="btn btn--primary btn--lg">💾 Uložit cvičení</button>
    </div>
  </form>`;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function renderSettings() {
  return `<div class="page-header">
    <div>
      <h1 class="page-title">Nastavení a export</h1>
      <p class="page-subtitle">Správa dat aplikace</p>
    </div>
  </div>

  <div class="settings-grid">

    <section class="settings-card">
      <h2 class="settings-card__title">📤 Exportovat data</h2>
      <p>Stáhne aktuální data (z localStorage) jako JSON soubory. Tyto soubory pak commitněte do složky <code>data/</code> v repozitáři pro "publikování" dat.</p>
      <button class="btn btn--primary" id="btn-export">Exportovat exercises.json + trainings.json</button>
    </section>

    <section class="settings-card">
      <h2 class="settings-card__title">📥 Importovat data</h2>
      <p>Nahraje JSON soubory do localStorage. Vhodné pro přenos dat mezi zařízeními.</p>
      <div class="import-fields">
        <div class="form-field">
          <label for="import-exercises" class="form-label">exercises.json</label>
          <input type="file" id="import-exercises" class="input input--file" accept=".json">
        </div>
        <div class="form-field">
          <label for="import-trainings" class="form-label">trainings.json</label>
          <input type="file" id="import-trainings" class="input input--file" accept=".json">
        </div>
      </div>
      <button class="btn btn--primary" id="btn-import">Importovat vybrané soubory</button>
    </section>

    <section class="settings-card">
      <h2 class="settings-card__title">🔄 Načíst z repozitáře</h2>
      <p>Přepíše lokální data (localStorage) daty z <code>data/exercises.json</code> a <code>data/trainings.json</code> v tomto repozitáři. <strong>Pozor: přepíše neuložené změny!</strong></p>
      <button class="btn btn--outline" id="btn-reload-repo">Načíst z data/*.json</button>
    </section>

    <section class="settings-card">
      <h2 class="settings-card__title">⚠️ Vymazat lokální data</h2>
      <p>Vymaže veškerá lokální data z localStorage. Aplikace se vrátí do výchozího stavu. Data z repozitáře zůstanou nedotčena.</p>
      <button class="btn btn--danger" id="btn-clear">Vymazat localStorage</button>
    </section>

    <section class="settings-card settings-card--wide">
      <h2 class="settings-card__title">📋 Jak publikovat data</h2>
      <ol class="how-to-list">
        <li>Proveďte úpravy v aplikaci (přidejte cvičení nebo tréninky).</li>
        <li>Klikněte na <strong>Exportovat data</strong> — stáhnou se dva JSON soubory.</li>
        <li>Přesuňte soubory do složky <code>data/</code> ve vašem repozitáři (přepište stávající).</li>
        <li>Commitněte změny: <code>git add data/ && git commit -m "Update data" && git push</code></li>
        <li>GitHub Pages automaticky nasadí novou verzi.</li>
        <li>Asistenti a ostatní uvidí aktuální data po obnovení stránky.</li>
      </ol>
    </section>

  </div>

  <div id="settings-status" class="settings-status" style="display:none" role="alert"></div>`;
}

// ─── 404 ──────────────────────────────────────────────────────────────────────

function renderNotFound() {
  return `<div class="empty-state">
    <div class="empty-state__icon">🔍</div>
    <h1 class="empty-state__text">Stránka nenalezena</h1>
    <a href="#/trainings" class="btn btn--primary">Zpět na tréninky</a>
  </div>`;
}

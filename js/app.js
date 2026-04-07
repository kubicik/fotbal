/**
 * app.js — Routing, state management, event handling
 * FK Nový Jičín U8 Coach App
 */

const App = (() => {

  // ─── State ─────────────────────────────────────────────────────────────────

  let currentRoute = null;
  let exSearchQuery = '';
  let exFilterCat = '';

  // ─── DOM refs ──────────────────────────────────────────────────────────────

  const $ = id => document.getElementById(id);
  const main = () => $('main-content');

  // ─── Toast notifications ───────────────────────────────────────────────────

  let toastTimer = null;
  function showToast(message, type = 'success') {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast--${type} toast--visible`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('toast--visible');
    }, 3200);
  }

  // ─── Router ────────────────────────────────────────────────────────────────

  function parseRoute(hash) {
    const path = hash.replace(/^#\//, '').replace(/^#/, '') || 'trainings';
    const parts = path.split('/');
    return {
      section: parts[0],
      id: parts[1] || null,
      action: parts[2] || null,
      raw: path
    };
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  async function handleRoute() {
    const route = parseRoute(window.location.hash);
    currentRoute = route;
    updateNavActive(route.section);

    const editMode = DataLayer.isEditMode();

    let html = '';

    switch (route.section) {
      case 'trainings':
      case '':
        html = renderTrainings(DataLayer.getTrainings(), editMode);
        document.title = 'Tréninky — FK Nový Jičín U8';
        break;

      case 'training':
        if (route.id === 'new') {
          if (!editMode) { navigate('#/trainings'); return; }
          html = renderTrainingForm(null, DataLayer.getExercises(), true);
          document.title = 'Nový trénink — FK Nový Jičín U8';
        } else if (route.action === 'edit') {
          if (!editMode) { navigate(`#/training/${route.id}`); return; }
          const t = DataLayer.getTrainingById(route.id);
          if (!t) { html = renderNotFound(); break; }
          html = renderTrainingForm(t, DataLayer.getExercises(), false);
          document.title = `Upravit: ${t.title} — FK Nový Jičín U8`;
        } else if (route.id) {
          const t = DataLayer.getTrainingById(route.id);
          if (!t) { html = renderNotFound(); break; }
          html = renderTrainingDetail(t, DataLayer.getExercises(), editMode);
          document.title = `${t.title} — FK Nový Jičín U8`;
          if (editMode) PDFExport.setPrintTitle(t.title);
        } else {
          html = renderNotFound();
        }
        break;

      case 'exercises':
        html = renderExercises(DataLayer.getExercises(), editMode, exFilterCat, exSearchQuery);
        document.title = 'Cvičení — FK Nový Jičín U8';
        break;

      case 'exercise':
        if (route.id === 'new') {
          if (!editMode) { navigate('#/exercises'); return; }
          html = renderExerciseForm(null, true);
          document.title = 'Nové cvičení — FK Nový Jičín U8';
        } else if (route.action === 'edit') {
          if (!editMode) { navigate(`#/exercise/${route.id}`); return; }
          const ex = DataLayer.getExerciseById(route.id);
          if (!ex) { html = renderNotFound(); break; }
          html = renderExerciseForm(ex, false);
          document.title = `Upravit: ${ex.name} — FK Nový Jičín U8`;
        } else if (route.id) {
          const ex = DataLayer.getExerciseById(route.id);
          if (!ex) { html = renderNotFound(); break; }
          html = renderExerciseDetail(ex, editMode);
          document.title = `${ex.name} — FK Nový Jičín U8`;
        } else {
          html = renderNotFound();
        }
        break;

      case 'settings':
        html = renderSettings();
        document.title = 'Nastavení — FK Nový Jičín U8';
        break;

      default:
        html = renderNotFound();
        document.title = 'FK Nový Jičín U8';
    }

    main().innerHTML = html;
    main().scrollTop = 0;
    window.scrollTo(0, 0);

    // Bind page-specific events after render
    bindPageEvents(route);
  }

  // ─── Navigation state ──────────────────────────────────────────────────────

  function updateNavActive(section) {
    document.querySelectorAll('.nav__link').forEach(link => {
      link.classList.remove('nav__link--active');
      const href = link.getAttribute('href') || '';
      const linkSection = href.replace('#/', '').split('/')[0];
      if (linkSection === section || (section === '' && linkSection === 'trainings')) {
        link.classList.add('nav__link--active');
      }
    });
  }

  function updateEditModeUI() {
    const editMode = DataLayer.isEditMode();
    const toggle = $('edit-mode-toggle');
    const label = $('edit-mode-label');
    if (toggle) toggle.checked = editMode;
    if (label) label.textContent = editMode ? 'Režim úprav: ZAP' : 'Režim úprav: VYP';
    document.body.classList.toggle('edit-mode', editMode);
  }

  // ─── Event delegation ──────────────────────────────────────────────────────

  function bindGlobalEvents() {
    // Edit mode toggle
    document.addEventListener('change', e => {
      if (e.target.id === 'edit-mode-toggle') {
        DataLayer.setEditMode(e.target.checked);
        updateEditModeUI();
        handleRoute();
      }
    });

    // Menu toggle (mobile)
    const menuBtn = $('menu-toggle');
    const navMenu = $('nav-menu');
    if (menuBtn && navMenu) {
      menuBtn.addEventListener('click', () => {
        const open = navMenu.classList.toggle('nav-menu--open');
        menuBtn.setAttribute('aria-expanded', open);
      });
    }

    // Close menu on nav link click (mobile)
    document.addEventListener('click', e => {
      const navMenu = $('nav-menu');
      if (e.target.closest('.nav__link') && navMenu) {
        navMenu.classList.remove('nav-menu--open');
      }
    });

    // Global delete / action delegation
    document.addEventListener('click', e => {
      const action = e.target.dataset.action;

      if (action === 'delete-training') {
        const id = e.target.dataset.id;
        const t = DataLayer.getTrainingById(id);
        if (t && confirm(`Opravdu smazat trénink "${t.title}"?`)) {
          DataLayer.deleteTraining(id);
          showToast('Trénink byl smazán.');
          if (currentRoute.section === 'training' && currentRoute.id === id) {
            navigate('#/trainings');
          } else {
            handleRoute();
          }
        }
        return;
      }

      if (action === 'delete-exercise') {
        const id = e.target.dataset.id;
        const ex = DataLayer.getExerciseById(id);
        if (ex && confirm(`Opravdu smazat cvičení "${ex.name}"? Cvičení bude odebráno ze všech tréninků.`)) {
          DataLayer.deleteExercise(id);
          showToast('Cvičení bylo smazáno.');
          if (currentRoute.section === 'exercise' && currentRoute.id === id) {
            navigate('#/exercises');
          } else {
            handleRoute();
          }
        }
        return;
      }
    });
  }

  // ─── Page-specific event binding ──────────────────────────────────────────

  function bindPageEvents(route) {
    if (route.section === 'exercises') {
      bindExerciseListEvents();
    }
    if (route.section === 'training' && (route.id === 'new' || route.action === 'edit')) {
      bindTrainingFormEvents();
    }
    if (route.section === 'exercise' && (route.id === 'new' || route.action === 'edit')) {
      bindExerciseFormEvents();
    }
    if (route.section === 'settings') {
      bindSettingsEvents();
    }
  }

  // ─── Exercise list ─────────────────────────────────────────────────────────

  function bindExerciseListEvents() {
    const searchEl = $('ex-search');
    const filterEl = $('ex-cat-filter');

    if (searchEl) {
      searchEl.addEventListener('input', debounce(e => {
        exSearchQuery = e.target.value.trim();
        main().innerHTML = renderExercises(DataLayer.getExercises(), DataLayer.isEditMode(), exFilterCat, exSearchQuery);
        bindExerciseListEvents();
      }, 200));
    }

    if (filterEl) {
      filterEl.addEventListener('change', e => {
        exFilterCat = e.target.value;
        main().innerHTML = renderExercises(DataLayer.getExercises(), DataLayer.isEditMode(), exFilterCat, exSearchQuery);
        bindExerciseListEvents();
      });
    }
  }

  // ─── Training form ─────────────────────────────────────────────────────────

  function bindTrainingFormEvents() {
    const form = $('training-form');
    if (!form) return;

    // Exercise picker search/filter
    const pickerSearch = $('picker-search');
    const pickerCat = $('picker-cat');

    function filterPicker() {
      const q = (pickerSearch?.value || '').toLowerCase();
      const cat = pickerCat?.value || '';
      document.querySelectorAll('.picker-row').forEach(row => {
        const name = row.dataset.name || '';
        const rowCat = row.dataset.category || '';
        const matchQ = !q || name.includes(q);
        const matchCat = !cat || rowCat === cat;
        row.style.display = matchQ && matchCat ? '' : 'none';
      });
    }

    pickerSearch?.addEventListener('input', debounce(filterPicker, 150));
    pickerCat?.addEventListener('change', filterPicker);

    // Add exercise from picker
    document.querySelectorAll('[data-action="add-exercise"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.picker-row');
        const exerciseId = row.dataset.exerciseId;
        const defaultDuration = parseInt(btn.dataset.defaultDuration) || 10;
        addExerciseToForm(exerciseId, defaultDuration);
      });
    });

    // Delegated events on the form exercise list
    const exList = $('form-ex-list');
    if (exList) {
      exList.addEventListener('click', e => {
        if (e.target.dataset.action === 'remove-exercise') {
          const item = e.target.closest('.form-ex-item');
          if (item) {
            item.remove();
            updateTotalDuration();
            updatePickerButtonStates();
            updateMoveButtons();
          }
        }
        if (e.target.dataset.action === 'move-up') {
          const item = e.target.closest('.form-ex-item');
          const prev = item.previousElementSibling;
          if (prev) { exList.insertBefore(item, prev); updateMoveButtons(); }
        }
        if (e.target.dataset.action === 'move-down') {
          const item = e.target.closest('.form-ex-item');
          const next = item.nextElementSibling;
          if (next) { exList.insertBefore(next, item); updateMoveButtons(); }
        }
      });

      exList.addEventListener('input', e => {
        if (e.target.dataset.role === 'ex-duration') {
          updateTotalDuration();
        }
      });
    }

    // Form submit
    form.addEventListener('submit', e => {
      e.preventDefault();
      saveTrainingForm();
    });
  }

  function addExerciseToForm(exerciseId, defaultDuration) {
    const exList = $('form-ex-list');
    const emptyHint = $('empty-ex-hint');
    if (!exList) return;

    // Remove the "no exercises" hint
    if (emptyHint) emptyHint.style.display = 'none';

    const ex = DataLayer.getExerciseById(exerciseId);
    if (!ex) return;

    // Check if already added
    if (exList.querySelector(`[data-exercise-id="${exerciseId}"]`)) {
      showToast('Toto cvičení je již přidáno.', 'info');
      return;
    }

    const li = document.createElement('li');
    li.className = 'form-ex-item';
    li.dataset.exerciseId = exerciseId;

    li.innerHTML = `
      <div class="form-ex-item__drag-handle" title="Přetáhnout">⠿</div>
      <div class="form-ex-item__info">
        <span class="form-ex-item__name">${escHtml(ex.name)}</span>
        ${categoryBadge(ex.category)}
      </div>
      <div class="form-ex-item__controls">
        <div class="form-ex-item__duration">
          <label class="sr-only" for="dur-${escHtml(exerciseId)}">Délka (min)</label>
          <input type="number" id="dur-${escHtml(exerciseId)}" class="input input--sm" min="1" max="120" value="${defaultDuration}" data-role="ex-duration" aria-label="Délka cvičení v minutách">
          <span>min</span>
        </div>
        <div class="form-ex-item__order-btns">
          <button type="button" class="btn btn--icon" data-action="move-up" title="Posunout nahoru">▲</button>
          <button type="button" class="btn btn--icon" data-action="move-down" title="Posunout dolů">▼</button>
        </div>
        <button type="button" class="btn btn--sm btn--danger" data-action="remove-exercise">Odebrat</button>
      </div>
      <div class="form-ex-item__notes">
        <input type="text" class="input input--sm" placeholder="Poznámka ke cvičení (volitelné)" data-role="ex-notes" aria-label="Poznámka ke cvičení">
      </div>
    `;

    exList.appendChild(li);
    updateTotalDuration();
    updatePickerButtonStates();
    updateMoveButtons();

    showToast(`Cvičení "${ex.name}" přidáno.`, 'success');
  }

  function updateTotalDuration() {
    const display = $('total-dur-display');
    if (!display) return;
    let total = 0;
    document.querySelectorAll('[data-role="ex-duration"]').forEach(input => {
      total += parseInt(input.value) || 0;
    });
    display.textContent = total;
  }

  function updatePickerButtonStates() {
    const exList = $('form-ex-list');
    if (!exList) return;
    const addedIds = new Set(
      [...exList.querySelectorAll('.form-ex-item')].map(li => li.dataset.exerciseId)
    );

    document.querySelectorAll('.picker-row').forEach(row => {
      const id = row.dataset.exerciseId;
      const btn = row.querySelector('[data-action="add-exercise"]');
      if (!btn) return;
      if (addedIds.has(id)) {
        btn.textContent = '✓ Přidáno';
        btn.className = 'btn btn--sm btn--outline';
        row.classList.add('picker-row--added');
      } else {
        btn.textContent = '+ Přidat';
        btn.className = 'btn btn--sm btn--primary';
        row.classList.remove('picker-row--added');
      }
    });
  }

  function updateMoveButtons() {
    const exList = $('form-ex-list');
    if (!exList) return;
    const items = [...exList.querySelectorAll('.form-ex-item')];
    items.forEach((item, idx) => {
      const upBtn = item.querySelector('[data-action="move-up"]');
      const downBtn = item.querySelector('[data-action="move-down"]');
      if (upBtn) upBtn.disabled = idx === 0;
      if (downBtn) downBtn.disabled = idx === items.length - 1;
    });
  }

  function saveTrainingForm() {
    const form = $('training-form');
    if (!form) return;

    const id = $('f-id')?.value || null;
    const date = $('f-date')?.value || '';
    const title = $('f-title')?.value?.trim() || '';
    const theme = $('f-theme')?.value?.trim() || '';
    const location = $('f-location')?.value?.trim() || '';
    const duration_total = parseInt($('f-duration')?.value) || 60;
    const notes = $('f-notes')?.value?.trim() || '';
    const published = $('f-published')?.checked || false;

    if (!date || !title) {
      showToast('Vyplňte prosím datum a název tréninku.', 'error');
      return;
    }

    // Collect exercises
    const exItems = [...($('form-ex-list')?.querySelectorAll('.form-ex-item') || [])];
    const exercises = exItems.map((item, idx) => ({
      exerciseId: item.dataset.exerciseId,
      duration: parseInt(item.querySelector('[data-role="ex-duration"]')?.value) || 10,
      order: idx + 1,
      notes: item.querySelector('[data-role="ex-notes"]')?.value?.trim() || ''
    }));

    const training = {
      id: id || undefined,
      date,
      title,
      theme,
      location,
      duration_total,
      notes,
      exercises,
      published
    };

    // Remove undefined id for new
    if (!training.id) delete training.id;

    const saved = DataLayer.saveTraining(training);
    showToast('Trénink byl uložen!', 'success');
    navigate(`#/training/${saved.id}`);
  }

  // ─── Exercise form ─────────────────────────────────────────────────────────

  function bindExerciseFormEvents() {
    const form = $('exercise-form');
    if (!form) return;

    form.addEventListener('submit', e => {
      e.preventDefault();
      saveExerciseForm();
    });

    // Image URL preview
    const imgInput = $('f-image');
    if (imgInput) {
      imgInput.addEventListener('input', debounce(e => {
        const url = e.target.value.trim();
        const preview = $('image-preview');
        const img = $('img-preview-el');
        if (url && preview && img) {
          img.src = url;
          img.onerror = () => { preview.style.display = 'none'; };
          img.onload = () => { preview.style.display = ''; };
          preview.style.display = '';
        } else if (preview) {
          preview.style.display = 'none';
        }
      }, 600));
    }

    // Video URL preview
    const vidInput = $('f-video');
    if (vidInput) {
      vidInput.addEventListener('input', debounce(e => {
        const url = e.target.value.trim();
        const preview = $('video-preview');
        if (preview) {
          if (url) {
            preview.innerHTML = renderYoutube(url);
            preview.style.display = '';
          } else {
            preview.innerHTML = '';
            preview.style.display = 'none';
          }
        }
      }, 800));
    }
  }

  function saveExerciseForm() {
    const id = $('f-id')?.value || null;
    const name = $('f-name')?.value?.trim() || '';
    const category = $('f-category')?.value || 'technika';
    const description = $('f-description')?.value?.trim() || '';
    const duration_default = parseInt($('f-duration')?.value) || 10;
    const imageUrl = $('f-image')?.value?.trim() || '';
    const videoUrl = $('f-video')?.value?.trim() || '';
    const tagsRaw = $('f-tags')?.value || '';
    const equipmentRaw = $('f-equipment')?.value || '';
    const ageGroup = $('f-agegroup')?.value?.trim() || 'U8';
    const players_min = parseInt($('f-pmin')?.value) || 4;
    const players_max = parseInt($('f-pmax')?.value) || 20;

    if (!name) {
      showToast('Vyplňte prosím název cvičení.', 'error');
      return;
    }

    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const equipment = equipmentRaw.split(',').map(t => t.trim()).filter(Boolean);

    const exercise = {
      id: id || undefined,
      name,
      category,
      description,
      duration_default,
      imageUrl,
      videoUrl,
      tags,
      ageGroup,
      players_min,
      players_max,
      equipment
    };

    if (!exercise.id) delete exercise.id;

    const saved = DataLayer.saveExercise(exercise);
    showToast('Cvičení bylo uloženo!', 'success');
    navigate(`#/exercise/${saved.id}`);
  }

  // ─── Settings events ───────────────────────────────────────────────────────

  function bindSettingsEvents() {
    const statusEl = $('settings-status');

    function showStatus(msg, type = 'success') {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = `settings-status settings-status--${type}`;
      statusEl.style.display = '';
      setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
    }

    $('btn-export')?.addEventListener('click', () => {
      DataLayer.exportData();
      showStatus('Soubory se stahují... Umístěte je do složky data/ v repozitáři.', 'success');
    });

    $('btn-import')?.addEventListener('click', async () => {
      const exFile = $('import-exercises')?.files[0];
      const trFile = $('import-trainings')?.files[0];
      if (!exFile && !trFile) {
        showStatus('Vyberte alespoň jeden soubor.', 'error');
        return;
      }
      try {
        await DataLayer.importFromFiles(exFile || null, trFile || null);
        showStatus('Data byla importována!', 'success');
        showToast('Import dokončen!', 'success');
      } catch (err) {
        showStatus('Chyba při importu: ' + err.message, 'error');
      }
    });

    $('btn-reload-repo')?.addEventListener('click', async () => {
      if (!confirm('Opravdu přepsat lokální data daty z repozitáře?')) return;
      try {
        const result = await DataLayer.reloadFromRepo();
        showStatus(`Načteno ${result.exercises} cvičení a ${result.trainings} tréninků.`, 'success');
        showToast('Data načtena z repozitáře.', 'success');
      } catch (err) {
        showStatus('Chyba: ' + err.message, 'error');
      }
    });

    $('btn-clear')?.addEventListener('click', () => {
      if (!confirm('Opravdu vymazat všechna lokální data? Tato akce je nevratná!')) return;
      localStorage.clear();
      showStatus('Lokální data vymazána. Obnovte stránku.', 'success');
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────

  async function init() {
    await DataLayer.init();
    updateEditModeUI();
    bindGlobalEvents();

    window.addEventListener('hashchange', handleRoute);

    // Default route
    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = '#/trainings';
    } else {
      handleRoute();
    }
  }

  return { init };

})();

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

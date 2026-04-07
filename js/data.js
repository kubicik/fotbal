/**
 * data.js — Data layer: localStorage + JSON import/export
 * FK Nový Jičín U8 Coach App
 */

const DATA_KEYS = {
  exercises:   'fnj_exercises',
  trainings:   'fnj_trainings',
  categories:  'fnj_categories',
  users:       'fnj_users',
  players:     'fnj_players',
  testings:    'fnj_testings',
  concept:     'fnj_concept',
  settings:    'fnj_settings',
  editMode:    'fnj_editmode',
  initialized: 'fnj_initialized'
};

const DataLayer = (() => {

  // ─── Internal helpers ────────────────────────────────────────────────────

  function getFromStorage(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('localStorage read error:', e);
      return null;
    }
  }

  function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('localStorage write error:', e);
    }
  }

  function generateId(prefix) {
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 6);
    return `${prefix}-${ts}-${rnd}`;
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  async function init() {
    const initialized = localStorage.getItem(DATA_KEYS.initialized);
    // If already initialized but keys added later are missing, seed them
    if (initialized) {
      if (localStorage.getItem(DATA_KEYS.players) === null) {
        try {
          const r = await fetch('./data/players.json');
          saveToStorage(DATA_KEYS.players, r.ok ? await r.json() : []);
        } catch(e) { saveToStorage(DATA_KEYS.players, []); }
      }
      if (localStorage.getItem(DATA_KEYS.testings) === null) {
        try {
          const r = await fetch('./data/testings.json');
          saveToStorage(DATA_KEYS.testings, r.ok ? await r.json() : []);
        } catch(e) { saveToStorage(DATA_KEYS.testings, []); }
      }
      return;
    }

    console.log('First run — loading data from repository JSON files...');
    try {
      const [exRes, trRes, catRes, usrRes, plrRes, tevtRes, conRes, setRes] = await Promise.all([
        fetch('./data/exercises.json'),
        fetch('./data/trainings.json'),
        fetch('./data/categories.json'),
        fetch('./data/users.json'),
        fetch('./data/players.json'),
        fetch('./data/testings.json'),
        fetch('./data/concept.json'),
        fetch('./data/settings.json')
      ]);

      saveToStorage(DATA_KEYS.exercises,  exRes.ok   ? await exRes.json()   : []);
      saveToStorage(DATA_KEYS.trainings,  trRes.ok   ? await trRes.json()   : []);
      saveToStorage(DATA_KEYS.categories, catRes.ok  ? await catRes.json()  : _defaultCategories());
      saveToStorage(DATA_KEYS.users,      usrRes.ok  ? await usrRes.json()  : []);
      saveToStorage(DATA_KEYS.players,    plrRes.ok  ? await plrRes.json()  : []);
      saveToStorage(DATA_KEYS.testings,   tevtRes.ok ? await tevtRes.json() : []);
      if (conRes.ok) saveToStorage(DATA_KEYS.concept,  await conRes.json());
      if (setRes.ok) saveToStorage(DATA_KEYS.settings, await setRes.json());

      localStorage.setItem(DATA_KEYS.initialized, '1');
    } catch (e) {
      saveToStorage(DATA_KEYS.exercises,  []);
      saveToStorage(DATA_KEYS.trainings,  []);
      saveToStorage(DATA_KEYS.categories, _defaultCategories());
      saveToStorage(DATA_KEYS.users,      []);
      saveToStorage(DATA_KEYS.players,    []);
      saveToStorage(DATA_KEYS.testings,   []);
      localStorage.setItem(DATA_KEYS.initialized, '1');
      console.warn('Fetch error — starting with default data.', e);
    }
  }

  // ─── Default categories fallback ────────────────────────────────────────

  function _defaultCategories() {
    return [
      { id: 'cat-001', name: 'Rozcvičení', slug: 'rozcvičení', color: '#22c55e' },
      { id: 'cat-002', name: 'Technika',   slug: 'technika',   color: '#3b82f6' },
      { id: 'cat-003', name: 'Hra',        slug: 'hra',        color: '#f97316' },
      { id: 'cat-004', name: 'Kondice',    slug: 'kondice',    color: '#ef4444' },
      { id: 'cat-005', name: 'Závěr',      slug: 'závěr',      color: '#a855f7' }
    ];
  }

  // ─── Categories ──────────────────────────────────────────────────────────

  function getCategories() {
    return getFromStorage(DATA_KEYS.categories) || _defaultCategories();
  }

  function getCategoryBySlug(slug) {
    return getCategories().find(c => c.slug === slug) || null;
  }

  function saveCategory(cat) {
    const categories = getCategories();
    if (!cat.id) {
      cat.id = generateId('cat');
      if (!cat.slug) cat.slug = cat.name.toLowerCase().replace(/\s+/g, '-');
      categories.push(cat);
    } else {
      const idx = categories.findIndex(c => c.id === cat.id);
      if (idx >= 0) categories[idx] = cat;
      else categories.push(cat);
    }
    saveToStorage(DATA_KEYS.categories, categories);
    return cat;
  }

  function deleteCategory(id) {
    const categories = getCategories().filter(c => c.id !== id);
    saveToStorage(DATA_KEYS.categories, categories);
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  function getUsers() {
    return getFromStorage(DATA_KEYS.users) || [];
  }

  function getUserById(id) {
    return getUsers().find(u => u.id === id) || null;
  }

  function saveUser(user) {
    const users = getUsers();
    if (!user.id) {
      user.id = generateId('usr');
      user.createdAt = new Date().toISOString().split('T')[0];
      users.push(user);
    } else {
      const idx = users.findIndex(u => u.id === user.id);
      if (idx >= 0) users[idx] = user;
      else users.push(user);
    }
    saveToStorage(DATA_KEYS.users, users);
    return user;
  }

  function deleteUser(id) {
    saveToStorage(DATA_KEYS.users, getUsers().filter(u => u.id !== id));
  }

  // ─── Players ─────────────────────────────────────────────────────────────

  function getPlayers() {
    return getFromStorage(DATA_KEYS.players) || [];
  }

  function getPlayerById(id) {
    return getPlayers().find(p => p.id === id) || null;
  }

  function savePlayer(player) {
    const players = getPlayers();
    if (!player.id) {
      player.id = generateId('plr');
      player.createdAt = new Date().toISOString().split('T')[0];
      players.push(player);
    } else {
      const idx = players.findIndex(p => p.id === player.id);
      if (idx >= 0) players[idx] = player;
      else players.push(player);
    }
    saveToStorage(DATA_KEYS.players, players);
    return player;
  }

  function deletePlayer(id) {
    saveToStorage(DATA_KEYS.players, getPlayers().filter(p => p.id !== id));
  }

  function addPlayerTest(playerId, test) {
    test.id = generateId('tst');
    const players = getPlayers();
    const p = players.find(p => p.id === playerId);
    if (!p) return;
    if (!p.tests) p.tests = [];
    p.tests.push(test);
    saveToStorage(DATA_KEYS.players, players);
  }

  function deletePlayerTest(playerId, testId) {
    const players = getPlayers();
    const p = players.find(p => p.id === playerId);
    if (!p) return;
    p.tests = (p.tests || []).filter(t => t.id !== testId);
    saveToStorage(DATA_KEYS.players, players);
  }

  // ─── Testing events ──────────────────────────────────────────────────────

  function getTestingEvents() {
    return getFromStorage(DATA_KEYS.testings) || [];
  }

  function getTestingEventById(id) {
    return getTestingEvents().find(e => e.id === id) || null;
  }

  function saveTestingEvent(event) {
    const events = getTestingEvents();
    if (!event.id) {
      event.id = generateId('tevt');
      event.createdAt = new Date().toISOString().split('T')[0];
      events.push(event);
    } else {
      const idx = events.findIndex(e => e.id === event.id);
      if (idx >= 0) events[idx] = event;
      else events.push(event);
    }
    saveToStorage(DATA_KEYS.testings, events);
    return event;
  }

  function deleteTestingEvent(id) {
    saveToStorage(DATA_KEYS.testings, getTestingEvents().filter(e => e.id !== id));
  }

  // ─── Exercises ───────────────────────────────────────────────────────────

  function getExercises() {
    return getFromStorage(DATA_KEYS.exercises) || [];
  }

  function getExerciseById(id) {
    return getExercises().find(e => e.id === id) || null;
  }

  function saveExercise(exercise) {
    const exercises = getExercises();
    if (!exercise.id) {
      exercise.id = generateId('ex');
      exercise.createdAt = new Date().toISOString().split('T')[0];
      exercises.push(exercise);
    } else {
      const idx = exercises.findIndex(e => e.id === exercise.id);
      if (idx >= 0) {
        exercises[idx] = exercise;
      } else {
        exercises.push(exercise);
      }
    }
    saveToStorage(DATA_KEYS.exercises, exercises);
    return exercise;
  }

  function deleteExercise(id) {
    const exercises = getExercises().filter(e => e.id !== id);
    saveToStorage(DATA_KEYS.exercises, exercises);
    // Also remove from trainings
    const trainings = getTrainings().map(t => ({
      ...t,
      exercises: t.exercises.filter(ex => ex.exerciseId !== id)
    }));
    saveToStorage(DATA_KEYS.trainings, trainings);
  }

  // ─── Trainings ───────────────────────────────────────────────────────────

  function getTrainings() {
    return getFromStorage(DATA_KEYS.trainings) || [];
  }

  function getTrainingById(id) {
    return getTrainings().find(t => t.id === id) || null;
  }

  function saveTraining(training) {
    const trainings = getTrainings();
    if (!training.id) {
      training.id = generateId('tr');
      training.createdAt = new Date().toISOString().split('T')[0];
      trainings.push(training);
    } else {
      const idx = trainings.findIndex(t => t.id === training.id);
      if (idx >= 0) {
        trainings[idx] = training;
      } else {
        trainings.push(training);
      }
    }
    saveToStorage(DATA_KEYS.trainings, trainings);
    return training;
  }

  function deleteTraining(id) {
    const trainings = getTrainings().filter(t => t.id !== id);
    saveToStorage(DATA_KEYS.trainings, trainings);
  }

  // ─── Concept ─────────────────────────────────────────────────────────────

  function getConcept() {
    return getFromStorage(DATA_KEYS.concept) || null;
  }

  function saveConcept(concept) {
    concept.updatedAt = new Date().toISOString().split('T')[0];
    saveToStorage(DATA_KEYS.concept, concept);
    return concept;
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  function getSettings() {
    return getFromStorage(DATA_KEYS.settings) || {};
  }

  function saveSettings(settings) {
    saveToStorage(DATA_KEYS.settings, settings);
    return settings;
  }

  // ─── Edit mode ───────────────────────────────────────────────────────────

  function isEditMode() {
    return localStorage.getItem(DATA_KEYS.editMode) === '1';
  }

  function setEditMode(val) {
    localStorage.setItem(DATA_KEYS.editMode, val ? '1' : '0');
  }

  // ─── Export / Import ─────────────────────────────────────────────────────

  function exportData() {
    _downloadJSON(getExercises(),       'exercises.json');
    setTimeout(() => _downloadJSON(getTrainings(),      'trainings.json'),  300);
    setTimeout(() => _downloadJSON(getCategories(),     'categories.json'), 600);
    setTimeout(() => _downloadJSON(getUsers(),          'users.json'),      900);
    setTimeout(() => _downloadJSON(getPlayers(),        'players.json'),    1100);
    setTimeout(() => _downloadJSON(getTestingEvents(),  'testings.json'),   1400);
    const concept  = getConcept();  if (concept)  setTimeout(() => _downloadJSON(concept,   'concept.json'),  1700);
    const settings = getSettings(); if (settings) setTimeout(() => _downloadJSON(settings,  'settings.json'), 2000);
  }

  function _downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importFromFiles(exercisesFile, trainingsFile) {
    return new Promise((resolve, reject) => {
      let exercisesDone = !exercisesFile;
      let trainingsDone = !trainingsFile;

      const check = () => {
        if (exercisesDone && trainingsDone) resolve();
      };

      if (exercisesFile) {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const data = JSON.parse(e.target.result);
            saveToStorage(DATA_KEYS.exercises, data);
            exercisesDone = true;
            check();
          } catch (err) { reject(err); }
        };
        reader.readAsText(exercisesFile);
      }

      if (trainingsFile) {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const data = JSON.parse(e.target.result);
            saveToStorage(DATA_KEYS.trainings, data);
            trainingsDone = true;
            check();
          } catch (err) { reject(err); }
        };
        reader.readAsText(trainingsFile);
      }
    });
  }

  async function reloadFromRepo() {
    const ts = Date.now();
    const [exRes, trRes, catRes, usrRes, plrRes, tevtRes, conRes, setRes] = await Promise.all([
      fetch('./data/exercises.json?'  + ts),
      fetch('./data/trainings.json?'  + ts),
      fetch('./data/categories.json?' + ts),
      fetch('./data/users.json?'      + ts),
      fetch('./data/players.json?'    + ts),
      fetch('./data/testings.json?'   + ts),
      fetch('./data/concept.json?'    + ts),
      fetch('./data/settings.json?'   + ts)
    ]);

    if (!exRes.ok || !trRes.ok) throw new Error('Nepodařilo se načíst soubory z repozitáře.');

    const exercises  = await exRes.json();
    const trainings  = await trRes.json();
    const categories = catRes.ok  ? await catRes.json()  : _defaultCategories();
    const users      = usrRes.ok  ? await usrRes.json()  : [];
    const players    = plrRes.ok  ? await plrRes.json()  : [];
    const testings   = tevtRes.ok ? await tevtRes.json() : [];
    const concept    = conRes.ok  ? await conRes.json()  : null;
    const settings   = setRes.ok  ? await setRes.json()  : {};

    saveToStorage(DATA_KEYS.exercises,  exercises);
    saveToStorage(DATA_KEYS.trainings,  trainings);
    saveToStorage(DATA_KEYS.categories, categories);
    saveToStorage(DATA_KEYS.users,      users);
    saveToStorage(DATA_KEYS.players,    players);
    saveToStorage(DATA_KEYS.testings,   testings);
    if (concept)  saveToStorage(DATA_KEYS.concept,  concept);
    if (settings) saveToStorage(DATA_KEYS.settings, settings);
    return { exercises: exercises.length, trainings: trainings.length };
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  return {
    init,
    getExercises, getExerciseById, saveExercise, deleteExercise,
    getTrainings, getTrainingById, saveTraining, deleteTraining,
    getCategories, getCategoryBySlug, saveCategory, deleteCategory,
    getUsers, getUserById, saveUser, deleteUser,
    getPlayers, getPlayerById, savePlayer, deletePlayer, addPlayerTest, deletePlayerTest,
    getTestingEvents, getTestingEventById, saveTestingEvent, deleteTestingEvent,
    getConcept, saveConcept,
    getSettings, saveSettings,
    isEditMode, setEditMode,
    exportData, importFromFiles, reloadFromRepo,
    generateId
  };
})();

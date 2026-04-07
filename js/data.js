/**
 * data.js — Data layer: localStorage + JSON import/export
 * FK Nový Jičín U8 Coach App
 */

const DATA_KEYS = {
  exercises: 'fnj_exercises',
  trainings: 'fnj_trainings',
  editMode: 'fnj_editmode',
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
    if (initialized) return;

    console.log('First run — loading data from repository JSON files...');
    try {
      const [exercisesRes, trainingsRes] = await Promise.all([
        fetch('./data/exercises.json'),
        fetch('./data/trainings.json')
      ]);

      if (exercisesRes.ok && trainingsRes.ok) {
        const exercises = await exercisesRes.json();
        const trainings = await trainingsRes.json();
        saveToStorage(DATA_KEYS.exercises, exercises);
        saveToStorage(DATA_KEYS.trainings, trainings);
        localStorage.setItem(DATA_KEYS.initialized, '1');
        console.log(`Loaded ${exercises.length} exercises and ${trainings.length} trainings.`);
      } else {
        // Fallback: start with empty arrays
        saveToStorage(DATA_KEYS.exercises, []);
        saveToStorage(DATA_KEYS.trainings, []);
        localStorage.setItem(DATA_KEYS.initialized, '1');
        console.warn('Could not fetch JSON files — starting with empty data.');
      }
    } catch (e) {
      // Works on file:// too (fetch may fail)
      saveToStorage(DATA_KEYS.exercises, []);
      saveToStorage(DATA_KEYS.trainings, []);
      localStorage.setItem(DATA_KEYS.initialized, '1');
      console.warn('Fetch error (possibly file:// protocol) — starting with empty data.', e);
    }
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

  // ─── Edit mode ───────────────────────────────────────────────────────────

  function isEditMode() {
    return localStorage.getItem(DATA_KEYS.editMode) === '1';
  }

  function setEditMode(val) {
    localStorage.setItem(DATA_KEYS.editMode, val ? '1' : '0');
  }

  // ─── Export / Import ─────────────────────────────────────────────────────

  function exportData() {
    const exercises = getExercises();
    const trainings = getTrainings();

    _downloadJSON(exercises, 'exercises.json');
    setTimeout(() => _downloadJSON(trainings, 'trainings.json'), 300);
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
    const [exercisesRes, trainingsRes] = await Promise.all([
      fetch('./data/exercises.json?' + Date.now()),
      fetch('./data/trainings.json?' + Date.now())
    ]);

    if (!exercisesRes.ok || !trainingsRes.ok) {
      throw new Error('Nepodařilo se načíst soubory z repozitáře.');
    }

    const exercises = await exercisesRes.json();
    const trainings = await trainingsRes.json();
    saveToStorage(DATA_KEYS.exercises, exercises);
    saveToStorage(DATA_KEYS.trainings, trainings);
    return { exercises: exercises.length, trainings: trainings.length };
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  return {
    init,
    getExercises,
    getExerciseById,
    saveExercise,
    deleteExercise,
    getTrainings,
    getTrainingById,
    saveTraining,
    deleteTraining,
    isEditMode,
    setEditMode,
    exportData,
    importFromFiles,
    reloadFromRepo,
    generateId
  };
})();

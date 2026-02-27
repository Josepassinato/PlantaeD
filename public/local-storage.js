/**
 * local-storage.js — IndexedDB-based local persistence for plans
 * Provides offline-first save/load with JSON export/import
 */
const LocalStorage = (() => {
  const DB_NAME = 'planta3d';
  const DB_VERSION = 1;
  const STORE_NAME = 'plans';
  let db = null;

  function open() {
    if (db) return Promise.resolve(db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          store.createIndex('name', 'name', { unique: false });
        }
      };
      req.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      req.onerror = (e) => {
        console.error('IndexedDB open error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  async function savePlan(plan) {
    if (!plan || !plan.id) return;
    const database = await open();
    const record = {
      ...JSON.parse(JSON.stringify(plan)),
      updatedAt: Date.now()
    };
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function loadPlan(id) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function deletePlan(id) {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function listPlans() {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).index('updatedAt').openCursor(null, 'prev');
      const results = [];
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const plan = cursor.value;
          results.push({
            id: plan.id,
            name: plan.name,
            updatedAt: plan.updatedAt
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function exportPlanAsJSON(plan) {
    if (!plan) return;
    const data = JSON.stringify(plan, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = (plan.name || 'planta3d-projeto') + '.json';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importPlanFromJSON() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const plan = JSON.parse(ev.target.result);
            if (!plan || typeof plan !== 'object') {
              throw new Error('Invalid plan format');
            }
            // Give it a new ID to avoid conflicts
            plan.id = 'plan-' + Date.now();
            resolve(plan);
          } catch (err) {
            console.error('JSON import error:', err);
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };
      input.click();
    });
  }

  return { open, savePlan, loadPlan, deletePlan, listPlans, exportPlanAsJSON, importPlanFromJSON };
})();

/**
 * data-model.js — Schema migration, plan creation, validation, ID generation
 */
const DataModel = (() => {
  const SCHEMA_VERSION = 2;

  let idCounter = 0;

  function generateId(prefix) {
    idCounter++;
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + idCounter;
  }

  /**
   * Migrate plan from v1 to v2. Adds missing arrays/fields.
   * Existing data is never modified.
   */
  function migratePlan(plan) {
    if (!plan) return plan;

    // Ensure arrays exist
    if (!plan.walls) plan.walls = [];
    if (!plan.rooms) plan.rooms = [];
    if (!plan.doors) plan.doors = [];
    if (!plan.windows) plan.windows = [];
    if (!plan.dimensions) plan.dimensions = [];
    // Normalize annotations: support both flat array and {notes:[], measurements:[]} dict
    if (!plan.annotations) {
      plan.annotations = [];
    } else if (!Array.isArray(plan.annotations)) {
      // Convert dict format to flat array
      const flat = [];
      if (Array.isArray(plan.annotations.notes)) flat.push(...plan.annotations.notes);
      if (Array.isArray(plan.annotations.measurements)) flat.push(...plan.annotations.measurements);
      plan.annotations = flat;
    }
    if (!plan.furniture) plan.furniture = [];
    if (!plan.stairs) plan.stairs = [];
    if (!plan.columns) plan.columns = [];

    // Ensure defaults
    if (!plan.units) plan.units = 'meters';
    if (!plan.floorHeight) plan.floorHeight = 2.8;
    if (!plan.wallThickness) plan.wallThickness = 0.15;

    // Migrate walls — add optional fields
    plan.walls.forEach(w => {
      if (!w.id) w.id = generateId('w');
    });

    // Migrate rooms — add optional fields
    plan.rooms.forEach(r => {
      if (!r.id) r.id = generateId('r');
    });

    // Migrate doors — ensure type
    plan.doors.forEach(d => {
      if (!d.id) d.id = generateId('d');
      if (!d.type) d.type = 'single';
    });

    // Migrate windows — ensure type
    plan.windows.forEach(w => {
      if (!w.id) w.id = generateId('win');
      if (!w.type) w.type = 'standard';
    });

    // Migrate furniture
    plan.furniture.forEach(f => {
      if (!f.id) f.id = generateId('furn');
      if (!f.position) f.position = { x: 0, y: 0 };
      if (f.rotation === undefined) f.rotation = 0;
      if (!f.scale) f.scale = { x: 1, y: 1, z: 1 };
    });

    plan.schemaVersion = SCHEMA_VERSION;
    return plan;
  }

  function createDefaultPlan(name) {
    return {
      id: 'plan-' + Date.now(),
      name: name || 'Novo Plano',
      schemaVersion: SCHEMA_VERSION,
      units: 'meters',
      floorHeight: 2.8,
      wallThickness: 0.15,
      walls: [],
      rooms: [],
      doors: [],
      windows: [],
      dimensions: [],
      annotations: [],
      furniture: [],
      stairs: [],
      columns: []
    };
  }

  function validatePlan(plan) {
    const errors = [];
    if (!plan) { errors.push('Plan is null'); return { valid: false, errors }; }
    if (!plan.id) errors.push('Missing plan id');
    if (!plan.name) errors.push('Missing plan name');
    if (!Array.isArray(plan.walls)) errors.push('walls must be an array');
    if (!Array.isArray(plan.rooms)) errors.push('rooms must be an array');

    // Validate wall references in doors/windows
    const wallIds = new Set((plan.walls || []).map(w => w.id));
    (plan.doors || []).forEach(d => {
      if (!wallIds.has(d.wallId)) errors.push(`Door ${d.id} references missing wall ${d.wallId}`);
    });
    (plan.windows || []).forEach(w => {
      if (!wallIds.has(w.wallId)) errors.push(`Window ${w.id} references missing wall ${w.wallId}`);
    });

    return { valid: errors.length === 0, errors };
  }

  return { migratePlan, createDefaultPlan, validatePlan, generateId, SCHEMA_VERSION };
})();

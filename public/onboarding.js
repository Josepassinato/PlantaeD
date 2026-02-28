/**
 * onboarding.js — FASE 1.1 "Start New Project" modal + FASE 1.2 Dashboard
 * Full-featured onboarding flow for Planta3D with template library.
 *
 * Globals used: App, ThreeScene, Editor2D, EventBus, FloorManager,
 *               LocalStorage, FurnitureCatalog, DataModel
 */
window.Onboarding = (() => {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
   *  CONSTANTS
   * ══════════════════════════════════════════════════════════════════════ */

  const CONTAINER_ID = 'onboarding-start-container';
  const DASHBOARD_ID = 'onboarding-dashboard-container';
  const THUMBNAILS_KEY = 'p3d_project_thumbnails';

  /* ══════════════════════════════════════════════════════════════════════
   *  SVG ICONS — each card and action gets a hand-crafted icon
   * ══════════════════════════════════════════════════════════════════════ */

  const ICONS = {
    /* ── Start-modal card icons (48x48) ── */
    blank: '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="8" y="8" width="32" height="32" rx="3"/>'
      + '<line x1="24" y1="16" x2="24" y2="32"/>'
      + '<line x1="16" y1="24" x2="32" y2="24"/>'
      + '</svg>',

    upload: '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="6" y="6" width="36" height="36" rx="3"/>'
      + '<circle cx="16" cy="16" r="3" fill="currentColor" stroke="none" opacity="0.5"/>'
      + '<path d="M6 32l10-10 8 8 6-6 12 12"/>'
      + '<path d="M24 14v10"/><path d="M19 19l5-5 5 5"/>'
      + '</svg>',

    dxf: '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M28 6H12a4 4 0 0 0-4 4v28a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4V18z"/>'
      + '<path d="M28 6v12h12"/>'
      + '<text x="24" y="34" font-family="monospace" font-size="9" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">DXF</text>'
      + '</svg>',

    template: '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="6" y="6" width="36" height="36" rx="3"/>'
      + '<line x1="6" y1="18" x2="42" y2="18"/>'
      + '<line x1="18" y1="18" x2="18" y2="42"/>'
      + '<rect x="22" y="22" width="16" height="8" rx="1" stroke-dasharray="3 2" opacity="0.5"/>'
      + '<rect x="8" y="22" width="6" height="16" rx="1" stroke-dasharray="3 2" opacity="0.5"/>'
      + '</svg>',

    saved: '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M40 42H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12l4 6h16a2 2 0 0 1 2 2v26a2 2 0 0 1-2 2z"/>'
      + '<path d="M14 24h20"/><path d="M14 30h14"/><path d="M14 36h8"/>'
      + '</svg>',

    /* ── Action icons (16x16) ── */
    search: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">'
      + '<circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="18" y2="18"/>'
      + '</svg>',

    duplicate: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="6" y="6" width="11" height="11" rx="1.5"/>'
      + '<path d="M3 14V4a1.5 1.5 0 0 1 1.5-1.5H14"/>'
      + '</svg>',

    rename: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M14 3l3 3-9 9H5v-3z"/><line x1="11" y1="6" x2="14" y2="9"/>'
      + '</svg>',

    trash: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M4 5h12"/><path d="M5 5v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V5"/>'
      + '<path d="M8 3h4"/><line x1="8" y1="8" x2="8" y2="14"/><line x1="12" y1="8" x2="12" y2="14"/>'
      + '</svg>',

    close: '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'
      + '<line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/>'
      + '</svg>',

    back: '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M12 4l-6 6 6 6"/>'
      + '</svg>',

    /* ── Template mini-icons (40x40) ── */
    tplStudio: '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4">'
      + '<rect x="4" y="4" width="32" height="32" rx="2"/>'
      + '<line x1="4" y1="22" x2="18" y2="22" opacity="0.5"/><line x1="18" y1="4" x2="18" y2="22" opacity="0.5"/>'
      + '<rect x="20" y="6" width="14" height="6" rx="1"/><rect x="6" y="24" width="6" height="10" rx="1"/><rect x="14" y="28" width="8" height="4" rx="0.5"/>'
      + '</svg>',

    tplApt1: '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4">'
      + '<rect x="4" y="4" width="32" height="32" rx="2"/>'
      + '<line x1="4" y1="20" x2="36" y2="20"/><line x1="20" y1="4" x2="20" y2="20"/>'
      + '<rect x="22" y="6" width="12" height="6" rx="1"/><rect x="6" y="6" width="8" height="8" rx="1"/><rect x="6" y="24" width="12" height="6" rx="1"/>'
      + '</svg>',

    tplApt2: '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4">'
      + '<rect x="4" y="4" width="32" height="32" rx="2"/>'
      + '<line x1="4" y1="18" x2="36" y2="18"/><line x1="18" y1="4" x2="18" y2="18"/><line x1="18" y1="28" x2="36" y2="28"/>'
      + '<rect x="6" y="6" width="8" height="6" rx="1"/><rect x="20" y="6" width="8" height="6" rx="1"/><rect x="6" y="22" width="10" height="8" rx="1"/>'
      + '</svg>',

    tplKitchen: '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4">'
      + '<rect x="4" y="4" width="32" height="32" rx="2"/>'
      + '<rect x="6" y="6" width="8" height="5" rx="1"/><circle cx="10" cy="8.5" r="1.5"/>'
      + '<rect x="16" y="6" width="5" height="5" rx="1"/><rect x="6" y="28" width="28" height="5" rx="1"/>'
      + '<line x1="6" y1="14" x2="34" y2="14" stroke-dasharray="3 2" opacity="0.4"/>'
      + '</svg>',

    tplBathroom: '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4">'
      + '<rect x="4" y="4" width="32" height="32" rx="2"/>'
      + '<rect x="6" y="6" width="8" height="12" rx="4"/><rect x="6" y="26" width="6" height="8" rx="1"/>'
      + '<rect x="24" y="6" width="10" height="10" rx="1"/>'
      + '</svg>',

    tplOffice: '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4">'
      + '<rect x="4" y="4" width="32" height="32" rx="2"/>'
      + '<rect x="8" y="8" width="14" height="8" rx="1"/><rect x="6" y="20" width="6" height="4" rx="1"/>'
      + '<rect x="24" y="8" width="10" height="4" rx="0.5"/><rect x="24" y="14" width="10" height="4" rx="0.5"/>'
      + '</svg>',

    tplLiving: '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4">'
      + '<rect x="4" y="4" width="32" height="32" rx="2"/>'
      + '<rect x="8" y="14" width="16" height="8" rx="2"/><rect x="6" y="16" width="2" height="4" rx="1"/>'
      + '<rect x="24" y="16" width="2" height="4" rx="1"/><rect x="28" y="8" width="6" height="24" rx="1"/>'
      + '<rect x="12" y="24" width="8" height="4" rx="1"/>'
      + '</svg>',

    tplCommercial: '<svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4">'
      + '<rect x="4" y="4" width="32" height="32" rx="2"/>'
      + '<rect x="6" y="6" width="28" height="6" rx="1"/><rect x="6" y="16" width="12" height="8" rx="1"/>'
      + '<rect x="22" y="16" width="12" height="8" rx="1"/><rect x="6" y="28" width="28" height="6" rx="1"/>'
      + '</svg>'
  };


  /* ══════════════════════════════════════════════════════════════════════
   *  TEMPLATE LIBRARY
   *  Each template returns a complete plan object compatible with
   *  DataModel.migratePlan() and FloorManager.migratePlanToFloors().
   *  Wall IDs are generated first so doors/windows can reference them.
   * ══════════════════════════════════════════════════════════════════════ */

  let _idSeq = 0;

  /** Generate a unique element ID, compatible with DataModel when available. */
  function _id(prefix) {
    _idSeq++;
    if (typeof DataModel !== 'undefined' && DataModel.generateId) {
      return DataModel.generateId(prefix);
    }
    return prefix + '-' + Date.now().toString(36) + '-' + _idSeq;
  }

  /** Create a wall object matching the app schema. */
  function _wall(sx, sy, ex, ey, opts) {
    return Object.assign({
      id: _id('w'),
      start: { x: sx, y: sy },
      end: { x: ex, y: ey },
      thickness: 0.15,
      height: 2.8,
      color: '#F5F5F0'
    }, opts);
  }

  /** Create a room with vertices (NOT points). */
  function _room(name, vertices, opts) {
    return Object.assign({
      id: _id('r'),
      name: name,
      vertices: vertices,
      floorMaterial: 'hardwood',
      floorColor: '#c4a882'
    }, opts);
  }

  /** Create a door referencing a wall by its ID. */
  function _door(wallId, position, opts) {
    return Object.assign({
      id: _id('d'),
      wallId: wallId,
      position: position,
      width: 0.9,
      height: 2.1,
      type: 'single'
    }, opts);
  }

  /** Create a window referencing a wall by its ID. */
  function _window(wallId, position, opts) {
    return Object.assign({
      id: _id('win'),
      wallId: wallId,
      position: position,
      width: 1.2,
      height: 1.0,
      sillHeight: 1.0,
      type: 'standard'
    }, opts);
  }

  /** Create a furniture item using exact FurnitureCatalog IDs. */
  function _furn(catalogId, x, y, rotation) {
    var item = (typeof FurnitureCatalog !== 'undefined')
      ? FurnitureCatalog.getItem(catalogId)
      : null;
    return {
      id: _id('furn'),
      catalogId: catalogId,
      name: item ? item.name : catalogId,
      position: { x: x, y: y },
      rotation: rotation || 0,
      width: item ? item.width : 1,
      depth: item ? item.depth : 1,
      height: item ? item.height : 1,
      color: item ? item.color : '#888888',
      scale: { x: 1, y: 1, z: 1 }
    };
  }

  /** Build a plan skeleton; the builder callback populates it. */
  function _buildPlan(name, builder) {
    var plan = {
      id: 'plan-' + Date.now(),
      name: name,
      schemaVersion: 2,
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
    builder(plan);
    return plan;
  }

  /* ── Template definitions ─────────────────────────────────────────── */

  var TEMPLATES = {

    /* ── Studio 30m2 ── */
    studio: {
      name: 'Studio 30m\u00B2',
      subtitle: 'Apartamento compacto integrado',
      area: '30m\u00B2',
      icon: 'tplStudio',
      build: function () {
        return _buildPlan('Studio 30m\u00B2', function (p) {
          var w1 = _wall(0, 0, 6, 0);
          var w2 = _wall(6, 0, 6, 5);
          var w3 = _wall(6, 5, 0, 5);
          var w4 = _wall(0, 5, 0, 0);
          var w5 = _wall(0, 3.5, 2.5, 3.5);
          var w6 = _wall(2.5, 3.5, 2.5, 5);
          p.walls = [w1, w2, w3, w4, w5, w6];

          p.rooms = [
            _room('Estar/Quarto', [
              { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 3.5 }, { x: 0, y: 3.5 }
            ]),
            _room('Cozinha', [
              { x: 2.5, y: 3.5 }, { x: 6, y: 3.5 }, { x: 6, y: 5 }, { x: 2.5, y: 5 }
            ], { floorMaterial: 'tile', floorColor: '#e0ddd4' }),
            _room('Banheiro', [
              { x: 0, y: 3.5 }, { x: 2.5, y: 3.5 }, { x: 2.5, y: 5 }, { x: 0, y: 5 }
            ], { floorMaterial: 'tile', floorColor: '#d6d3cd' })
          ];

          p.doors = [
            _door(w3.id, 3.5, { width: 1.0 }),
            _door(w5.id, 1.5, { width: 0.7 }),
            _door(w6.id, 0.2, { width: 0.8 })
          ];

          p.windows = [
            _window(w1.id, 1.5, { width: 2.0, height: 1.4, sillHeight: 0.8 }),
            _window(w2.id, 1.0, { width: 1.5, height: 1.2, sillHeight: 0.9 })
          ];

          p.furniture = [
            _furn('bed-double', 1.0, 1.2, 0),
            _furn('table-bedside', 2.7, 0.5, 0),
            _furn('wardrobe-2d', 4.5, 0.4, 0),
            _furn('sofa-2seat', 4.5, 2.2, Math.PI / 2),
            _furn('table-coffee', 3.5, 2.5, 0),
            _furn('tv-50', 5.9, 2.0, Math.PI / 2),
            _furn('fridge-single', 5.3, 4.5, Math.PI),
            _furn('stove-4', 4.2, 4.5, Math.PI),
            _furn('sink-kitchen', 3.2, 4.5, Math.PI),
            _furn('toilet', 0.5, 4.3, Math.PI),
            _furn('sink-bath', 1.5, 4.5, Math.PI),
            _furn('shower', 2.0, 3.8, 0)
          ];
        });
      }
    },

    /* ── 1-Bedroom 50m2 ── */
    apt1: {
      name: 'Apartamento 1 quarto',
      subtitle: '1 quarto, sala, cozinha e banheiro',
      area: '50m\u00B2',
      icon: 'tplApt1',
      build: function () {
        return _buildPlan('Apartamento 1 Quarto 50m\u00B2', function (p) {
          var w1 = _wall(0, 0, 10, 0);
          var w2 = _wall(10, 0, 10, 5);
          var w3 = _wall(10, 5, 0, 5);
          var w4 = _wall(0, 5, 0, 0);
          var w5 = _wall(4, 0, 4, 5);
          var w6 = _wall(4, 3, 7, 3);
          var w7 = _wall(7, 3, 7, 5);
          var w8 = _wall(7, 3, 10, 3);
          p.walls = [w1, w2, w3, w4, w5, w6, w7, w8];

          p.rooms = [
            _room('Quarto', [
              { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 5 }, { x: 0, y: 5 }
            ]),
            _room('Sala', [
              { x: 4, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 3 }, { x: 4, y: 3 }
            ]),
            _room('Cozinha', [
              { x: 4, y: 3 }, { x: 7, y: 3 }, { x: 7, y: 5 }, { x: 4, y: 5 }
            ], { floorMaterial: 'tile', floorColor: '#e0ddd4' }),
            _room('Banheiro', [
              { x: 7, y: 3 }, { x: 10, y: 3 }, { x: 10, y: 5 }, { x: 7, y: 5 }
            ], { floorMaterial: 'tile', floorColor: '#d6d3cd' })
          ];

          p.doors = [
            _door(w3.id, 1.5, { width: 1.0 }),
            _door(w5.id, 1.0, { width: 0.9 }),
            _door(w6.id, 0.5, { width: 0.9 }),
            _door(w8.id, 0.5, { width: 0.7 })
          ];

          p.windows = [
            _window(w1.id, 1.0, { width: 1.8, height: 1.4, sillHeight: 0.8 }),
            _window(w1.id, 6.0, { width: 2.0, height: 1.4, sillHeight: 0.8 }),
            _window(w4.id, 1.5, { width: 1.2, height: 1.2, sillHeight: 0.9 })
          ];

          p.furniture = [
            _furn('bed-queen', 1.0, 1.5, 0),
            _furn('table-bedside', 0.3, 0.4, 0),
            _furn('table-bedside', 2.8, 0.4, 0),
            _furn('wardrobe-sliding', 3.0, 4.0, Math.PI),
            _furn('sofa-3seat', 6.5, 0.6, 0),
            _furn('table-coffee', 6.5, 1.8, 0),
            _furn('table-tv', 6.5, 2.6, 0),
            _furn('fridge-single', 4.5, 4.5, Math.PI),
            _furn('stove-4', 5.5, 4.5, Math.PI),
            _furn('sink-kitchen', 6.5, 4.5, Math.PI),
            _furn('toilet', 8.0, 4.3, Math.PI),
            _furn('sink-bath', 9.0, 4.5, Math.PI),
            _furn('shower', 9.5, 3.5, 0)
          ];
        });
      }
    },

    /* ── 2-Bedroom 70m2 ── */
    apt2: {
      name: 'Apartamento 2 quartos',
      subtitle: '2 quartos, sala, cozinha e banheiro',
      area: '70m\u00B2',
      icon: 'tplApt2',
      build: function () {
        return _buildPlan('Apartamento 2 Quartos 70m\u00B2', function (p) {
          var w1 = _wall(0, 0, 10, 0);
          var w2 = _wall(10, 0, 10, 7);
          var w3 = _wall(10, 7, 0, 7);
          var w4 = _wall(0, 7, 0, 0);
          var w5 = _wall(4.5, 0, 4.5, 4);
          var w6 = _wall(0, 4, 4.5, 4);
          var w7 = _wall(4.5, 4, 10, 4);
          var w8 = _wall(7, 4, 7, 7);
          p.walls = [w1, w2, w3, w4, w5, w6, w7, w8];

          p.rooms = [
            _room('Quarto 1', [
              { x: 0, y: 0 }, { x: 4.5, y: 0 }, { x: 4.5, y: 4 }, { x: 0, y: 4 }
            ]),
            _room('Quarto 2', [
              { x: 0, y: 4 }, { x: 4.5, y: 4 }, { x: 4.5, y: 7 }, { x: 0, y: 7 }
            ]),
            _room('Sala', [
              { x: 4.5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4 }, { x: 4.5, y: 4 }
            ]),
            _room('Cozinha', [
              { x: 4.5, y: 4 }, { x: 7, y: 4 }, { x: 7, y: 7 }, { x: 4.5, y: 7 }
            ], { floorMaterial: 'tile', floorColor: '#e0ddd4' }),
            _room('Banheiro', [
              { x: 7, y: 4 }, { x: 10, y: 4 }, { x: 10, y: 7 }, { x: 7, y: 7 }
            ], { floorMaterial: 'tile', floorColor: '#d6d3cd' })
          ];

          p.doors = [
            _door(w1.id, 6.5, { width: 1.0 }),
            _door(w5.id, 1.5, { width: 0.9 }),
            _door(w6.id, 1.5, { width: 0.9 }),
            _door(w7.id, 0.5, { width: 0.9 }),
            _door(w8.id, 1.0, { width: 0.7 })
          ];

          p.windows = [
            _window(w4.id, 1.0, { width: 1.5, height: 1.4, sillHeight: 0.8 }),
            _window(w4.id, 5.0, { width: 1.5, height: 1.4, sillHeight: 0.8 }),
            _window(w2.id, 1.0, { width: 2.0, height: 1.4, sillHeight: 0.8 }),
            _window(w3.id, 2.0, { width: 1.2, height: 1.0, sillHeight: 1.0 })
          ];

          p.furniture = [
            _furn('bed-queen', 1.0, 1.2, 0),
            _furn('table-bedside', 0.3, 0.4, 0),
            _furn('wardrobe-sliding', 3.5, 3.0, Math.PI),
            _furn('bed-single', 1.0, 5.0, 0),
            _furn('desk-standard', 3.0, 5.0, 0),
            _furn('chair-office', 3.0, 5.8, 0),
            _furn('wardrobe-2d', 3.5, 6.5, Math.PI),
            _furn('sofa-3seat', 6.5, 0.6, 0),
            _furn('table-coffee', 6.5, 2.0, 0),
            _furn('table-tv', 9.5, 2.0, Math.PI / 2),
            _furn('table-dining-4', 7.5, 3.2, 0),
            _furn('fridge-single', 5.0, 6.5, Math.PI),
            _furn('stove-4', 5.8, 6.5, Math.PI),
            _furn('sink-kitchen', 6.5, 6.5, Math.PI),
            _furn('toilet', 8.0, 6.3, Math.PI),
            _furn('sink-bath', 9.0, 6.5, Math.PI),
            _furn('shower-rect', 9.5, 4.8, 0)
          ];
        });
      }
    },

    /* ── Kitchen ── */
    kitchen: {
      name: 'Cozinha',
      subtitle: 'Cozinha completa com ilha',
      area: '12m\u00B2',
      icon: 'tplKitchen',
      build: function () {
        return _buildPlan('Cozinha', function (p) {
          var w1 = _wall(0, 0, 4, 0);
          var w2 = _wall(4, 0, 4, 3);
          var w3 = _wall(4, 3, 0, 3);
          var w4 = _wall(0, 3, 0, 0);
          p.walls = [w1, w2, w3, w4];

          p.rooms = [
            _room('Cozinha', [
              { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }
            ], { floorMaterial: 'tile', floorColor: '#e0ddd4' })
          ];

          p.doors = [ _door(w3.id, 0.5, { width: 0.9 }) ];

          p.windows = [
            _window(w1.id, 1.0, { width: 1.5, height: 1.2, sillHeight: 1.0 })
          ];

          p.furniture = [
            _furn('fridge-double', 0.5, 2.5, Math.PI),
            _furn('counter-section', 1.3, 2.7, Math.PI),
            _furn('stove-4', 1.9, 2.7, Math.PI),
            _furn('counter-section', 2.5, 2.7, Math.PI),
            _furn('sink-kitchen', 3.3, 2.7, Math.PI),
            _furn('microwave', 3.5, 0.3, 0),
            _furn('kitchen-island', 2.0, 1.2, 0),
            _furn('stool-bar', 1.2, 0.8, 0),
            _furn('stool-bar', 2.0, 0.8, 0),
            _furn('stool-bar', 2.8, 0.8, 0)
          ];
        });
      }
    },

    /* ── Bathroom ── */
    bathroom: {
      name: 'Banheiro',
      subtitle: 'Banheiro completo com box',
      area: '5m\u00B2',
      icon: 'tplBathroom',
      build: function () {
        return _buildPlan('Banheiro', function (p) {
          var w1 = _wall(0, 0, 2.5, 0);
          var w2 = _wall(2.5, 0, 2.5, 2);
          var w3 = _wall(2.5, 2, 0, 2);
          var w4 = _wall(0, 2, 0, 0);
          p.walls = [w1, w2, w3, w4];

          p.rooms = [
            _room('Banheiro', [
              { x: 0, y: 0 }, { x: 2.5, y: 0 }, { x: 2.5, y: 2 }, { x: 0, y: 2 }
            ], { floorMaterial: 'tile', floorColor: '#d6d3cd' })
          ];

          p.doors = [ _door(w4.id, 0.3, { width: 0.7 }) ];

          p.windows = [
            _window(w2.id, 0.5, { width: 0.6, height: 0.6, sillHeight: 1.5 })
          ];

          p.furniture = [
            _furn('shower-rect', 1.9, 0.5, 0),
            _furn('toilet', 0.4, 0.5, 0),
            _furn('sink-bath', 0.4, 1.6, Math.PI),
            _furn('bath-cabinet', 1.2, 1.7, Math.PI),
            _furn('towel-rack', 2.3, 1.5, Math.PI / 2)
          ];
        });
      }
    },

    /* ── Home Office ── */
    office: {
      name: 'Home Office',
      subtitle: 'Escritorio em casa funcional',
      area: '9m\u00B2',
      icon: 'tplOffice',
      build: function () {
        return _buildPlan('Home Office', function (p) {
          var w1 = _wall(0, 0, 3, 0);
          var w2 = _wall(3, 0, 3, 3);
          var w3 = _wall(3, 3, 0, 3);
          var w4 = _wall(0, 3, 0, 0);
          p.walls = [w1, w2, w3, w4];

          p.rooms = [
            _room('Home Office', [
              { x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 3 }, { x: 0, y: 3 }
            ])
          ];

          p.doors = [ _door(w3.id, 0.3, { width: 0.9 }) ];

          p.windows = [
            _window(w1.id, 0.8, { width: 1.4, height: 1.2, sillHeight: 0.9 })
          ];

          p.furniture = [
            _furn('desk-l', 1.5, 0.5, 0),
            _furn('chair-office', 1.5, 1.3, 0),
            _furn('monitor', 1.5, 0.3, 0),
            _furn('bookcase-wide', 2.5, 2.8, Math.PI),
            _furn('file-cabinet', 0.3, 2.5, Math.PI),
            _furn('lamp-desk', 2.3, 0.3, 0),
            _furn('plant-medium', 0.3, 0.3, 0),
            _furn('printer', 0.3, 1.5, 0)
          ];
        });
      }
    },

    /* ── Living Room ── */
    living: {
      name: 'Sala de Estar',
      subtitle: 'Sala ampla com TV e estar',
      area: '20m\u00B2',
      icon: 'tplLiving',
      build: function () {
        return _buildPlan('Sala de Estar', function (p) {
          var w1 = _wall(0, 0, 5, 0);
          var w2 = _wall(5, 0, 5, 4);
          var w3 = _wall(5, 4, 0, 4);
          var w4 = _wall(0, 4, 0, 0);
          p.walls = [w1, w2, w3, w4];

          p.rooms = [
            _room('Sala de Estar', [
              { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 4 }, { x: 0, y: 4 }
            ])
          ];

          p.doors = [ _door(w3.id, 1.0, { width: 1.0, type: 'double' }) ];

          p.windows = [
            _window(w1.id, 0.8, { width: 2.0, height: 1.4, sillHeight: 0.8 }),
            _window(w2.id, 1.0, { width: 1.5, height: 1.2, sillHeight: 0.9 })
          ];

          p.furniture = [
            _furn('sofa-3seat', 1.5, 2.5, 0),
            _furn('sofa-2seat', 0.4, 1.5, Math.PI / 2),
            _furn('table-coffee', 2.0, 1.5, 0),
            _furn('table-tv', 4.5, 1.5, Math.PI / 2),
            _furn('tv-65', 4.9, 1.5, Math.PI / 2),
            _furn('rug-large', 2.0, 1.5, 0),
            _furn('lamp-floor', 0.3, 3.5, 0),
            _furn('bookcase-wide', 4.5, 3.5, Math.PI / 2),
            _furn('plant-tall', 4.5, 0.4, 0),
            _furn('table-side', 3.5, 2.8, 0)
          ];
        });
      }
    },

    /* ── Commercial Space ── */
    commercial: {
      name: 'Espaco Comercial',
      subtitle: 'Loja ou escritorio comercial',
      area: '40m\u00B2',
      icon: 'tplCommercial',
      build: function () {
        return _buildPlan('Espaco Comercial', function (p) {
          var w1 = _wall(0, 0, 8, 0);
          var w2 = _wall(8, 0, 8, 5);
          var w3 = _wall(8, 5, 0, 5);
          var w4 = _wall(0, 5, 0, 0);
          var w5 = _wall(5, 3, 8, 3);
          var w6 = _wall(5, 3, 5, 5);
          p.walls = [w1, w2, w3, w4, w5, w6];

          p.rooms = [
            _room('Area Principal', [
              { x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 3 },
              { x: 5, y: 3 }, { x: 5, y: 5 }, { x: 0, y: 5 }
            ]),
            _room('Escritorio', [
              { x: 5, y: 3 }, { x: 8, y: 3 }, { x: 8, y: 5 }, { x: 5, y: 5 }
            ])
          ];

          p.doors = [
            _door(w1.id, 3.0, { width: 1.6, type: 'double' }),
            _door(w5.id, 0.5, { width: 0.9 })
          ];

          p.windows = [
            _window(w1.id, 0.5, { width: 2.0, height: 2.0, sillHeight: 0.3 }),
            _window(w1.id, 5.5, { width: 2.0, height: 2.0, sillHeight: 0.3 }),
            _window(w2.id, 0.8, { width: 1.5, height: 1.2, sillHeight: 0.9 })
          ];

          p.furniture = [
            _furn('reception-desk', 4.0, 1.5, 0),
            _furn('chair-office', 4.0, 2.3, 0),
            _furn('sofa-2seat', 1.0, 0.6, 0),
            _furn('sofa-2seat', 1.0, 2.0, 0),
            _furn('table-coffee', 1.0, 1.3, 0),
            _furn('meeting-table', 6.5, 4.0, 0),
            _furn('chair-office', 5.8, 3.6, Math.PI),
            _furn('chair-office', 7.2, 3.6, Math.PI),
            _furn('chair-office', 5.8, 4.4, 0),
            _furn('chair-office', 7.2, 4.4, 0),
            _furn('file-cabinet-tall', 7.5, 1.0, 0),
            _furn('plant-tall', 0.4, 0.4, 0),
            _furn('plant-tall', 7.5, 0.4, 0)
          ];
        });
      }
    }
  };


  /* ══════════════════════════════════════════════════════════════════════
   *  THUMBNAIL PERSISTENCE (localStorage, JPEG, small)
   * ══════════════════════════════════════════════════════════════════════ */

  function _getThumbnails() {
    try { return JSON.parse(localStorage.getItem(THUMBNAILS_KEY) || '{}'); }
    catch (_e) { return {}; }
  }

  function _saveThumbnail(planId, dataUrl) {
    try {
      var thumbs = _getThumbnails();
      thumbs[planId] = dataUrl;
      localStorage.setItem(THUMBNAILS_KEY, JSON.stringify(thumbs));
    } catch (_e) { /* quota exceeded */ }
  }

  function _removeThumbnail(planId) {
    try {
      var thumbs = _getThumbnails();
      delete thumbs[planId];
      localStorage.setItem(THUMBNAILS_KEY, JSON.stringify(thumbs));
    } catch (_e) { /* ok */ }
  }

  function _generateThumbnail(planId) {
    try {
      var editorCanvas = document.getElementById('editor-canvas');
      var threeCanvas  = document.getElementById('three-canvas');
      var src = (editorCanvas && editorCanvas.classList.contains('active'))
        ? editorCanvas : threeCanvas;
      if (!src || src.width === 0) return;

      var size = 200;
      var c = document.createElement('canvas');
      c.width = size; c.height = size;
      var ctx = c.getContext('2d');
      var sw = src.width, sh = src.height;
      var scale = Math.min(size / sw, size / sh);
      var dw = sw * scale, dh = sh * scale;
      ctx.fillStyle = '#0f1118';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(src, 0, 0, sw, sh, (size - dw) / 2, (size - dh) / 2, dw, dh);
      _saveThumbnail(planId, c.toDataURL('image/jpeg', 0.6));
    } catch (_e) { /* non-critical */ }
  }


  /* ══════════════════════════════════════════════════════════════════════
   *  HTML HELPERS
   * ══════════════════════════════════════════════════════════════════════ */

  function _esc(text) {
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function _fmtDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear() + ' '
      + String(d.getHours()).padStart(2, '0') + ':'
      + String(d.getMinutes()).padStart(2, '0');
  }

  function _getOrCreate(id) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      document.body.appendChild(el);
    }
    return el;
  }


  /* ══════════════════════════════════════════════════════════════════════
   *  START NEW PROJECT MODAL (FASE 1.1)
   * ══════════════════════════════════════════════════════════════════════ */

  var _escKeyStart = null;

  function _renderStartModal() {
    var container = _getOrCreate(CONTAINER_ID);

    var CARDS = [
      { key: 'blank',    icon: ICONS.blank,    title: 'Criar do zero',        sub: 'Comece com um projeto em branco'   },
      { key: 'upload',   icon: ICONS.upload,   title: 'Upload de planta',     sub: 'Use uma imagem como referencia'    },
      { key: 'dxf',      icon: ICONS.dxf,      title: 'Importar DXF',         sub: 'Abra um arquivo do AutoCAD'        },
      { key: 'template', icon: ICONS.template, title: 'Usar template',        sub: 'Escolha um modelo pronto'          },
      { key: 'saved',    icon: ICONS.saved,    title: 'Abrir projeto salvo',  sub: 'Continue um projeto existente'     }
    ];

    container.innerHTML =
      '<div class="ob-modal-overlay ob-hidden" id="ob-start-overlay">'
      + '<div class="ob-modal">'

        /* Header */
        + '<div class="ob-modal-header">'
          + '<div class="ob-logo">'
            + '<div class="ob-logo-mark">P3D</div>'
            + '<div class="ob-logo-text">'
              + '<h1 class="ob-title">Planta 3D</h1>'
              + '<p class="ob-subtitle">Crie plantas de ambientes em 2D e 3D</p>'
            + '</div>'
          + '</div>'
          + '<button class="ob-close-btn" id="ob-start-close" title="Fechar">' + ICONS.close + '</button>'
        + '</div>'

        /* Cards */
        + '<h2 class="ob-section-title">Iniciar novo projeto</h2>'
        + '<div class="ob-cards-grid" id="ob-start-cards">'
          + CARDS.map(function (c) {
              return '<button class="ob-card" data-action="' + c.key + '">'
                + '<div class="ob-card-icon">' + c.icon + '</div>'
                + '<div class="ob-card-text">'
                  + '<span class="ob-card-title">' + c.title + '</span>'
                  + '<span class="ob-card-subtitle">' + c.sub + '</span>'
                + '</div>'
              + '</button>';
            }).join('')
        + '</div>'

        /* Template sub-panel (hidden by default) */
        + '<div class="ob-template-panel hidden" id="ob-template-panel">'
          + '<div class="ob-template-header">'
            + '<button class="ob-back-btn" id="ob-template-back">' + ICONS.back + '<span>Voltar</span></button>'
            + '<h2 class="ob-section-title">Escolha um template</h2>'
          + '</div>'
          + '<div class="ob-template-grid" id="ob-template-grid">'
            + Object.keys(TEMPLATES).map(function (key) {
                var t = TEMPLATES[key];
                return '<button class="ob-template-card" data-template="' + key + '">'
                  + '<div class="ob-template-icon">' + (ICONS[t.icon] || ICONS.template) + '</div>'
                  + '<div class="ob-template-info">'
                    + '<span class="ob-template-name">' + _esc(t.name) + '</span>'
                    + '<span class="ob-template-detail">' + _esc(t.subtitle) + '</span>'
                    + '<span class="ob-template-area">' + _esc(t.area) + '</span>'
                  + '</div>'
                + '</button>';
              }).join('')
          + '</div>'
        + '</div>'

        /* Footer */
        + '<div class="ob-footer">'
          + '<a href="/tutorial.html" class="ob-footer-link" target="_blank">Primeira vez? Veja o tutorial</a>'
        + '</div>'

      + '</div>'
    + '</div>';

    /* ── Wire events ── */
    container.querySelector('#ob-start-close').addEventListener('click', hideStartModal);

    container.querySelectorAll('.ob-card[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () { _onCardAction(btn.dataset.action); });
    });

    container.querySelector('#ob-template-back').addEventListener('click', function () {
      container.querySelector('#ob-template-panel').classList.add('hidden');
      container.querySelector('#ob-start-cards').classList.remove('hidden');
    });

    container.querySelectorAll('.ob-template-card[data-template]').forEach(function (btn) {
      btn.addEventListener('click', function () { _onTemplateSelect(btn.dataset.template); });
    });

    container.querySelector('#ob-start-overlay').addEventListener('click', function (e) {
      if (e.target.id === 'ob-start-overlay') hideStartModal();
    });

    _escKeyStart = function (e) { if (e.key === 'Escape') hideStartModal(); };
    document.addEventListener('keydown', _escKeyStart);
  }


  /* ── Card action handlers ── */

  function _onCardAction(action) {
    switch (action) {
      case 'blank':
        hideStartModal();
        document.getElementById('btn-new-plan').click();
        break;

      case 'upload':
        hideStartModal();
        _uploadImage();
        break;

      case 'dxf':
        hideStartModal();
        // Create a blank project first, then trigger the DXF import file picker
        document.getElementById('btn-new-plan').click();
        setTimeout(function () {
          var btn = document.getElementById('btn-import-dxf');
          if (btn) btn.click();
        }, 500);
        break;

      case 'template':
        document.getElementById('ob-start-cards').classList.add('hidden');
        document.getElementById('ob-template-panel').classList.remove('hidden');
        break;

      case 'saved':
        hideStartModal();
        showDashboard().catch(function () {
          var sb = document.getElementById('sidebar');
          if (sb) sb.classList.add('open');
        });
        break;
    }
  }

  /** Upload an image to use as floor-plan reference background. */
  function _uploadImage() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;

      var planName = file.name.replace(/\.[^.]+$/, '') || 'Projeto com referencia';
      var plan = (typeof DataModel !== 'undefined')
        ? DataModel.createDefaultPlan(planName)
        : _buildPlan(planName, function () {});

      var reader = new FileReader();
      reader.onload = function (ev) {
        plan.backgroundImage = ev.target.result;
        plan.backgroundOpacity = 0.3;
        _savePlanAndReload(plan);
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  /** Template selection handler. */
  function _onTemplateSelect(key) {
    var tpl = TEMPLATES[key];
    if (!tpl || typeof tpl.build !== 'function') return;

    hideStartModal();
    if (typeof App !== 'undefined') App.setStatus('Criando projeto a partir do template...');

    var plan = tpl.build();
    if (typeof DataModel !== 'undefined') DataModel.migratePlan(plan);
    _savePlanAndReload(plan);
  }

  /** Save a plan to IndexedDB + server, then reload page to pick it up. */
  function _savePlanAndReload(plan) {
    var done = function () { window.location.reload(); };

    // Save locally
    var localPromise = (typeof LocalStorage !== 'undefined')
      ? LocalStorage.savePlan(plan) : Promise.resolve();

    localPromise.then(function () {
      // Try to mirror on server
      return fetch('/api/planta3d/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plan.name })
      }).then(function (res) {
        if (!res.ok) return;
        return res.json().then(function (srv) {
          var merged = JSON.parse(JSON.stringify(plan));
          merged.id = srv.id;
          return fetch('/api/planta3d/plans/' + srv.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged)
          });
        });
      }).catch(function () { /* offline ok */ });
    }).then(done).catch(done);
  }


  /* ══════════════════════════════════════════════════════════════════════
   *  DASHBOARD "MEUS PROJETOS" (FASE 1.2)
   * ══════════════════════════════════════════════════════════════════════ */

  var _escKeyDash = null;

  function _renderDashboard(projects) {
    var container = _getOrCreate(DASHBOARD_ID);
    var thumbs = _getThumbnails();

    container.innerHTML =
      '<div class="ob-modal-overlay ob-hidden" id="ob-dashboard-overlay">'
      + '<div class="ob-modal ob-modal--wide">'

        /* Header */
        + '<div class="ob-modal-header">'
          + '<div class="ob-logo">'
            + '<div class="ob-logo-mark">P3D</div>'
            + '<h1 class="ob-dashboard-title">Meus Projetos</h1>'
          + '</div>'
          + '<div class="ob-header-actions">'
            + '<button class="ob-btn ob-btn--primary" id="ob-dash-new">'
              + '<span class="ob-btn-icon">' + ICONS.blank + '</span>'
              + '<span>Novo Projeto</span>'
            + '</button>'
            + '<button class="ob-close-btn" id="ob-dash-close" title="Fechar">' + ICONS.close + '</button>'
          + '</div>'
        + '</div>'

        /* Search */
        + '<div class="ob-search-bar">'
          + '<span class="ob-search-icon">' + ICONS.search + '</span>'
          + '<input type="text" class="ob-search-input" id="ob-dash-search" placeholder="Buscar projetos..." autocomplete="off"/>'
        + '</div>'

        /* Grid */
        + '<div class="ob-projects-grid" id="ob-projects-grid">'
          + _projectCardsHTML(projects, thumbs)
        + '</div>'

        + (projects.length === 0
          ? '<div class="ob-empty-state"><p>Nenhum projeto encontrado.</p>'
            + '<button class="ob-btn ob-btn--primary" id="ob-dash-empty-new">Criar primeiro projeto</button></div>'
          : '')

      + '</div>'
    + '</div>';

    _bindDashEvents(container, projects, thumbs);
  }

  function _projectCardsHTML(projects, thumbs) {
    if (!projects || !projects.length) return '';
    return projects.map(function (p) {
      var thumb = thumbs[p.id] || '';
      var nm = _esc(p.name || 'Sem nome');
      var dt = _fmtDate(p.updatedAt);
      return '<div class="ob-project-card" data-id="' + p.id + '">'
        + '<div class="ob-project-thumb" data-id="' + p.id + '">'
          + (thumb
              ? '<img src="' + thumb + '" alt="' + nm + '" class="ob-project-img"/>'
              : '<div class="ob-project-placeholder">'
                + '<svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.3">'
                + '<rect x="6" y="6" width="36" height="36" rx="3"/><line x1="6" y1="18" x2="42" y2="18"/><line x1="18" y1="18" x2="18" y2="42"/></svg></div>')
        + '</div>'
        + '<div class="ob-project-info">'
          + '<span class="ob-project-name">' + nm + '</span>'
          + '<span class="ob-project-date">' + dt + '</span>'
        + '</div>'
        + '<div class="ob-project-actions">'
          + '<button class="ob-action-btn" data-act="duplicate" data-id="' + p.id + '" title="Duplicar">' + ICONS.duplicate + '</button>'
          + '<button class="ob-action-btn" data-act="rename" data-id="' + p.id + '" title="Renomear">' + ICONS.rename + '</button>'
          + '<button class="ob-action-btn ob-action-btn--danger" data-act="delete" data-id="' + p.id + '" title="Excluir">' + ICONS.trash + '</button>'
        + '</div>'
      + '</div>';
    }).join('');
  }

  function _bindDashEvents(container, projects, thumbs) {
    container.querySelector('#ob-dash-close').addEventListener('click', hideDashboard);

    container.querySelector('#ob-dashboard-overlay').addEventListener('click', function (e) {
      if (e.target.id === 'ob-dashboard-overlay') hideDashboard();
    });

    var newBtn = container.querySelector('#ob-dash-new');
    if (newBtn) newBtn.addEventListener('click', function () { hideDashboard(); showStartModal(); });

    var emptyBtn = container.querySelector('#ob-dash-empty-new');
    if (emptyBtn) emptyBtn.addEventListener('click', function () { hideDashboard(); showStartModal(); });

    /* Search filter */
    var search = container.querySelector('#ob-dash-search');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.toLowerCase().trim();
        var filtered = q
          ? projects.filter(function (p) { return (p.name || '').toLowerCase().indexOf(q) !== -1; })
          : projects;
        var grid = container.querySelector('#ob-projects-grid');
        if (grid) {
          grid.innerHTML = _projectCardsHTML(filtered, thumbs);
          _bindCardClicks(container, projects);
        }
      });
    }

    _bindCardClicks(container, projects);

    _escKeyDash = function (e) { if (e.key === 'Escape') hideDashboard(); };
    document.addEventListener('keydown', _escKeyDash);
  }

  function _bindCardClicks(container, allProjects) {
    /* Open on thumbnail click */
    container.querySelectorAll('.ob-project-thumb[data-id]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        hideDashboard();
        _openProject(el.dataset.id);
      });
    });

    /* Action buttons */
    container.querySelectorAll('.ob-action-btn[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.dataset.id;
        switch (btn.dataset.act) {
          case 'duplicate': _duplicateProject(id); break;
          case 'rename':    _renameProject(id); break;
          case 'delete':    _deleteProject(id); break;
        }
      });
    });
  }


  /* ── Project CRUD operations for dashboard ── */

  function _openProject(id) {
    /* Try clicking the matching sidebar list-item first (uses App.loadPlan). */
    var items = document.querySelectorAll('#plan-list li');
    for (var i = 0; i < items.length; i++) {
      if (items[i].dataset.id === id) {
        items[i].click();
        document.getElementById('sidebar').classList.remove('open');
        return;
      }
    }
    /* Fallback: reload with hash hint */
    window.location.hash = '#plan=' + id;
    window.location.reload();
  }

  function _duplicateProject(id) {
    _loadFullPlan(id).then(function (orig) {
      if (!orig) {
        App.setStatus('Projeto nao encontrado');
        setTimeout(function () { App.setStatus(''); }, 2000);
        return;
      }
      var copy = JSON.parse(JSON.stringify(orig));
      copy.id = 'plan-' + Date.now();
      copy.name = (orig.name || 'Projeto') + ' (copia)';
      copy.updatedAt = Date.now();

      var t = _getThumbnails();
      if (t[id]) _saveThumbnail(copy.id, t[id]);

      _savePlanQuiet(copy).then(function () {
        App.setStatus('Projeto duplicado!');
        setTimeout(function () { App.setStatus(''); }, 2000);
        showDashboard();
      });
    });
  }

  function _renameProject(id) {
    _loadFullPlan(id).then(function (plan) {
      if (!plan) return;
      App.showCustomPrompt('Novo nome:', plan.name || 'Projeto').then(function (newName) {
        if (!newName) return;
        plan.name = newName;
        plan.updatedAt = Date.now();
        _savePlanQuiet(plan).then(function () {
          App.setStatus('Projeto renomeado!');
          setTimeout(function () { App.setStatus(''); }, 2000);
          showDashboard();
        });
      });
    });
  }

  function _deleteProject(id) {
    App.showCustomConfirm(
      'Excluir projeto',
      'Tem certeza que deseja excluir este projeto? Esta acao nao pode ser desfeita.'
    ).then(function (yes) {
      if (!yes) return;
      var p1 = fetch('/api/planta3d/plans/' + id, { method: 'DELETE' }).catch(function () {});
      var p2 = (typeof LocalStorage !== 'undefined') ? LocalStorage.deletePlan(id).catch(function () {}) : Promise.resolve();
      Promise.all([p1, p2]).then(function () {
        _removeThumbnail(id);
        App.setStatus('Projeto excluido');
        setTimeout(function () { App.setStatus(''); }, 2000);
        showDashboard();
      });
    });
  }

  /** Load a full plan from server or local storage. */
  function _loadFullPlan(id) {
    return fetch('/api/planta3d/plans/' + id)
      .then(function (res) { return res.ok ? res.json() : null; })
      .catch(function () { return null; })
      .then(function (plan) {
        if (plan) return plan;
        if (typeof LocalStorage !== 'undefined') return LocalStorage.loadPlan(id);
        return null;
      });
  }

  /** Save a plan to both local + server without reloading. */
  function _savePlanQuiet(plan) {
    var localP = (typeof LocalStorage !== 'undefined')
      ? LocalStorage.savePlan(plan) : Promise.resolve();
    return localP.then(function () {
      return fetch('/api/planta3d/plans/' + plan.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan)
      }).catch(function () {});
    });
  }


  /* ══════════════════════════════════════════════════════════════════════
   *  PUBLIC API
   * ══════════════════════════════════════════════════════════════════════ */

  function init() {
    /* EventBus wiring */
    if (typeof EventBus !== 'undefined') {
      EventBus.on('onboarding:show', showStartModal);
      EventBus.on('onboarding:dashboard', function () { showDashboard(); });
      EventBus.on('plan:saved', function (plan) {
        if (plan && plan.id) _generateThumbnail(plan.id);
      });
    }

    /* Pre-render hidden start modal */
    _renderStartModal();

    /* Decide whether to show start modal or dashboard */
    _checkInitialState();
  }

  function _checkInitialState() {
    /* Delay slightly so App.init() can finish loading plans */
    setTimeout(function () {
      var planEl = document.getElementById('plan-name');
      if (planEl && planEl.textContent !== 'Nenhum projeto aberto') return;

      var empty = document.getElementById('empty-overlay');
      if (!empty || empty.classList.contains('hidden')) return;

      /* Count available projects */
      var count = 0;
      var serverP = fetch('/api/planta3d/plans')
        .then(function (r) { return r.json(); })
        .then(function (arr) { count += (arr || []).length; })
        .catch(function () {});

      serverP.then(function () {
        if (count === 0 && typeof LocalStorage !== 'undefined') {
          return LocalStorage.listPlans().then(function (lp) {
            count += (lp || []).length;
          }).catch(function () {});
        }
      }).then(function () {
        if (count > 0) {
          showDashboard();
        } else {
          showStartModal();
        }
      });
    }, 600);
  }

  function showStartModal() {
    hideDashboard();
    var overlay = document.getElementById('ob-start-overlay');
    if (!overlay) {
      _renderStartModal();
      overlay = document.getElementById('ob-start-overlay');
    }
    if (overlay) {
      overlay.classList.remove('ob-hidden');
      overlay.classList.add('ob-visible');
    }
    /* Reset to main cards view */
    var cards = document.getElementById('ob-start-cards');
    var tplPanel = document.getElementById('ob-template-panel');
    if (cards) cards.classList.remove('hidden');
    if (tplPanel) tplPanel.classList.add('hidden');
  }

  function hideStartModal() {
    var overlay = document.getElementById('ob-start-overlay');
    if (overlay) {
      overlay.classList.add('ob-hidden');
      overlay.classList.remove('ob-visible');
    }
    if (_escKeyStart) {
      document.removeEventListener('keydown', _escKeyStart);
      _escKeyStart = null;
    }
  }

  function showDashboard() {
    hideStartModal();

    var projects = [];

    return fetch('/api/planta3d/plans')
      .then(function (r) { return r.json(); })
      .then(function (arr) { if (Array.isArray(arr)) projects = arr; })
      .catch(function () {})
      .then(function () {
        if (typeof LocalStorage !== 'undefined') {
          return LocalStorage.listPlans().then(function (lp) {
            var ids = {};
            projects.forEach(function (p) { ids[p.id] = true; });
            (lp || []).forEach(function (p) { if (!ids[p.id]) projects.push(p); });
          }).catch(function () {});
        }
      })
      .then(function () {
        projects.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
        _renderDashboard(projects);

        var overlay = document.getElementById('ob-dashboard-overlay');
        if (overlay) {
          overlay.classList.remove('ob-hidden');
          overlay.classList.add('ob-visible');
        }
      });
  }

  function hideDashboard() {
    var overlay = document.getElementById('ob-dashboard-overlay');
    if (overlay) {
      overlay.classList.add('ob-hidden');
      overlay.classList.remove('ob-visible');
    }
    if (_escKeyDash) {
      document.removeEventListener('keydown', _escKeyDash);
      _escKeyDash = null;
    }
  }

  /**
   * Build and return a template plan object by key name.
   * Does NOT persist or load — caller is responsible for that.
   */
  function loadTemplate(name) {
    var tpl = TEMPLATES[name];
    if (!tpl || typeof tpl.build !== 'function') {
      console.warn('Onboarding: template not found:', name);
      return null;
    }
    var plan = tpl.build();
    if (typeof DataModel !== 'undefined') DataModel.migratePlan(plan);
    return plan;
  }

  /** Return metadata about all available templates. */
  function getTemplateList() {
    return Object.keys(TEMPLATES).map(function (key) {
      var t = TEMPLATES[key];
      return { key: key, name: t.name, subtitle: t.subtitle, area: t.area };
    });
  }


  /* ══════════════════════════════════════════════════════════════════════
   *  RETURN PUBLIC INTERFACE
   * ══════════════════════════════════════════════════════════════════════ */

  return {
    init: init,
    showStartModal: showStartModal,
    hideStartModal: hideStartModal,
    showDashboard: showDashboard,
    hideDashboard: hideDashboard,
    loadTemplate: loadTemplate,
    getTemplateList: getTemplateList
  };

})();

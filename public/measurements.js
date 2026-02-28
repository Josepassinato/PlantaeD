/**
 * measurements.js — FASE 7: Precise Measurements + Field Notes for Planta3D
 *
 * Subsystems:
 *   7.1  Automatic measurements (area, perimeter, element counts)
 *   7.2  Field Notes (typed, color-coded, with optional photo)
 *   7.3  Precise dimensioning (dimension lines, angle display, enhanced snap)
 *   7.4  Measurements panel HTML (summary card, per-room table, field notes list)
 *   7.5  DXF Export (walls as LINE entities, rooms as LWPOLYLINE)
 */
window.Measurements = (() => {
  'use strict';

  // ──────────────────────────────────────────────
  // Constants
  // ──────────────────────────────────────────────

  const NOTE_COLORS = {
    info:    '#58A6FF',
    alert:   '#F85149',
    pending: '#D29922',
    done:    '#3FB950'
  };

  const NOTE_LABELS = {
    info:    'Info',
    alert:   'Alerta',
    pending: 'Pendente',
    done:    'Concluido'
  };

  const DIM_LINE_COLOR   = '#29b6f6';
  const DIM_TEXT_COLOR    = '#e0e0e0';
  const DIM_ARROW_SIZE   = 0.12;   // meters
  const DIM_OFFSET       = 0.4;    // meters perpendicular offset from wall
  const DIM_FONT         = '0.22px sans-serif';
  const ANGLE_FONT       = 'bold 0.18px sans-serif';
  const ANGLE_COLOR      = '#ffc107';
  const SNAP_MIDPOINT_R  = 0.05;   // radius for midpoint snap markers
  const SNAP_PERP_DASH   = [0.06, 0.04];

  // Internal state for the measurements panel
  let panelEl = null;
  let isInitialized = false;

  // ──────────────────────────────────────────────
  // 7.1 — Automatic Measurements
  // ──────────────────────────────────────────────

  /**
   * Shoelace formula for polygon area.
   * @param {{ x: number, y: number }[]} points - Ordered polygon vertices (room.points or room.vertices)
   * @returns {number} Absolute area in square meters
   */
  function calculateRoomArea(room) {
    const pts = room.points || room.vertices;
    if (!pts || pts.length < 3) return 0;
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area / 2);
  }

  /**
   * Euclidean wall length.
   * @param {{ x1?: number, y1?: number, x2?: number, y2?: number, start?: {x,y}, end?: {x,y} }} wall
   * @returns {number} Length in meters
   */
  function calculateWallLength(wall) {
    let x1, y1, x2, y2;
    if (wall.start && wall.end) {
      x1 = wall.start.x; y1 = wall.start.y;
      x2 = wall.end.x;   y2 = wall.end.y;
    } else {
      x1 = wall.x1; y1 = wall.y1;
      x2 = wall.x2; y2 = wall.y2;
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Total perimeter: sum of all wall lengths.
   * @param {object} plan
   * @returns {number} Perimeter in meters
   */
  function calculatePerimeter(plan) {
    if (!plan || !plan.walls) return 0;
    return plan.walls.reduce((sum, w) => sum + calculateWallLength(w), 0);
  }

  /**
   * Count plan elements.
   * @param {object} plan
   * @returns {{ walls: number, doors: number, windows: number, furniture: number, rooms: number, columns: number, stairs: number }}
   */
  function countElements(plan) {
    if (!plan) return { walls: 0, doors: 0, windows: 0, furniture: 0, rooms: 0, columns: 0, stairs: 0 };
    return {
      walls:     (plan.walls     || []).length,
      doors:     (plan.doors     || []).length,
      windows:   (plan.windows   || []).length,
      furniture: (plan.furniture || []).length,
      rooms:     (plan.rooms     || []).length,
      columns:   (plan.columns   || []).length,
      stairs:    (plan.stairs    || []).length
    };
  }

  /**
   * Sum of all room areas.
   * @param {object} plan
   * @returns {number} Total area in m^2
   */
  function getTotalArea(plan) {
    if (!plan || !plan.rooms) return 0;
    return plan.rooms.reduce((sum, r) => sum + calculateRoomArea(r), 0);
  }

  /**
   * Update the status bar with real-time measurement info.
   * Called on plan:changed events.
   */
  function updateStatusBar(plan) {
    if (!plan) return;
    const area = getTotalArea(plan);
    const perim = calculatePerimeter(plan);
    const counts = countElements(plan);

    const parts = [];
    if (area > 0)          parts.push(`Area: ${area.toFixed(1)}m\u00B2`);
    if (perim > 0)         parts.push(`Perim: ${perim.toFixed(1)}m`);
    if (counts.doors > 0)  parts.push(`Portas: ${counts.doors}`);
    if (counts.windows > 0) parts.push(`Janelas: ${counts.windows}`);

    const statusEl = document.getElementById('tool-status');
    if (statusEl && parts.length > 0) {
      // Only update if no tool-specific message is showing
      const existing = statusEl.textContent;
      if (!existing || existing.startsWith('Area:') || existing.startsWith('Perim:')) {
        statusEl.textContent = parts.join('  |  ');
      }
    }
  }

  // ──────────────────────────────────────────────
  // 7.2 — Field Notes System
  // ──────────────────────────────────────────────

  let noteIdCounter = 0;

  /**
   * Add a field note to the current plan.
   * @param {number} x - World X
   * @param {number} y - World Y
   * @param {string} text
   * @param {'info'|'alert'|'pending'|'done'} type
   * @param {string} [photo] - Optional base64 image
   * @returns {object} The created note
   */
  function addFieldNote(x, y, text, type, photo) {
    const plan = _getPlan();
    if (!plan) return null;

    type = type || 'info';
    if (!NOTE_COLORS[type]) type = 'info';

    noteIdCounter++;
    const note = {
      id: 'fn-' + Date.now().toString(36) + '-' + noteIdCounter,
      x: x,
      y: y,
      text: text || '',
      type: type,
      color: NOTE_COLORS[type],
      timestamp: new Date().toISOString(),
      photo: photo || null
    };

    if (!plan.fieldNotes) plan.fieldNotes = [];
    plan.fieldNotes.push(note);

    EventBus.emit('plan:changed', plan);
    EventBus.emit('fieldnote:added', note);
    _refreshPanel();
    return note;
  }

  /**
   * Remove a field note by id.
   * @param {string} id
   * @returns {boolean} true if removed
   */
  function removeFieldNote(id) {
    const plan = _getPlan();
    if (!plan || !plan.fieldNotes) return false;

    const idx = plan.fieldNotes.findIndex(n => n.id === id);
    if (idx === -1) return false;

    plan.fieldNotes.splice(idx, 1);
    EventBus.emit('plan:changed', plan);
    EventBus.emit('fieldnote:removed', { id });
    _refreshPanel();
    return true;
  }

  /**
   * Update a field note's properties.
   * @param {string} id
   * @param {object} updates - Partial update: { text?, type?, x?, y?, photo? }
   * @returns {object|null} Updated note or null
   */
  function updateFieldNote(id, updates) {
    const plan = _getPlan();
    if (!plan || !plan.fieldNotes) return null;

    const note = plan.fieldNotes.find(n => n.id === id);
    if (!note) return null;

    if (updates.text !== undefined)  note.text = updates.text;
    if (updates.type !== undefined) {
      note.type = updates.type;
      note.color = NOTE_COLORS[updates.type] || NOTE_COLORS.info;
    }
    if (updates.x !== undefined)     note.x = updates.x;
    if (updates.y !== undefined)     note.y = updates.y;
    if (updates.photo !== undefined) note.photo = updates.photo;

    EventBus.emit('plan:changed', plan);
    EventBus.emit('fieldnote:updated', note);
    _refreshPanel();
    return note;
  }

  /**
   * Get all field notes from the plan.
   * @returns {object[]}
   */
  function getFieldNotes() {
    const plan = _getPlan();
    if (!plan || !plan.fieldNotes) return [];
    return plan.fieldNotes.slice(); // defensive copy
  }

  // ──────────────────────────────────────────────
  // 7.3 — Precise Dimensioning & Rendering
  // ──────────────────────────────────────────────

  /**
   * Render auto-dimension lines on all walls, angle indicators at corners,
   * and field note pins.
   *
   * Called from the CanvasRenderer pipeline or externally.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} plan
   * @param {number} scale - current zoom (pixels per meter)
   * @param {{ x: number, y: number }} offset - current pan offset
   */
  function renderDimensions(ctx, plan, scale, offset) {
    if (!plan) return;

    ctx.save();

    // --- Auto-dimension lines on walls ---
    _renderWallDimensions(ctx, plan, scale);

    // --- Angle display at wall junctions ---
    _renderWallAngles(ctx, plan, scale);

    // --- Field notes ---
    _renderFieldNotes(ctx, plan, scale);

    ctx.restore();
  }

  /**
   * Draw dimension lines with arrows + text for every wall.
   */
  function _renderWallDimensions(ctx, plan, scale) {
    const walls = plan.walls;
    if (!walls || walls.length === 0) return;

    walls.forEach(wall => {
      const sx = wall.start.x, sy = wall.start.y;
      const ex = wall.end.x,   ey = wall.end.y;
      const dx = ex - sx, dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.05) return; // skip tiny walls

      // Unit normal (perpendicular, pointing "left" of wall direction)
      const nx = -dy / len;
      const ny =  dx / len;

      // Offset points for the dimension line
      const off = DIM_OFFSET;
      const p1x = sx + nx * off, p1y = sy + ny * off;
      const p2x = ex + nx * off, p2y = ey + ny * off;

      // Extension lines
      ctx.strokeStyle = DIM_LINE_COLOR;
      ctx.lineWidth = 0.015;
      ctx.setLineDash([0.04, 0.03]);
      ctx.beginPath();
      ctx.moveTo(sx + nx * 0.05, sy + ny * 0.05);
      ctx.lineTo(p1x + nx * 0.05, p1y + ny * 0.05);
      ctx.moveTo(ex + nx * 0.05, ey + ny * 0.05);
      ctx.lineTo(p2x + nx * 0.05, p2y + ny * 0.05);
      ctx.stroke();
      ctx.setLineDash([]);

      // Main dimension line
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.stroke();

      // Arrows at each end
      _drawArrow(ctx, p1x, p1y, dx / len, dy / len, DIM_ARROW_SIZE);
      _drawArrow(ctx, p2x, p2y, -dx / len, -dy / len, DIM_ARROW_SIZE);

      // Label: wall length
      const mx = (p1x + p2x) / 2;
      const my = (p1y + p2y) / 2;
      const label = len.toFixed(2) + 'm';

      // Rotate text to align with wall
      const angle = Math.atan2(dy, dx);
      let textAngle = angle;
      // Keep text readable (never upside-down)
      if (textAngle > Math.PI / 2)  textAngle -= Math.PI;
      if (textAngle < -Math.PI / 2) textAngle += Math.PI;

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(textAngle);
      ctx.fillStyle = DIM_TEXT_COLOR;
      ctx.font = DIM_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, 0, -0.06);
      ctx.restore();
    });
  }

  /**
   * Draw a small filled arrow head.
   */
  function _drawArrow(ctx, x, y, dirX, dirY, size) {
    // perpendicular
    const px = -dirY, py = dirX;
    const hw = size * 0.35;

    ctx.fillStyle = DIM_LINE_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - dirX * size + px * hw, y - dirY * size + py * hw);
    ctx.lineTo(x - dirX * size - px * hw, y - dirY * size - py * hw);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Find wall junctions (shared endpoints) and draw angle arcs.
   */
  function _renderWallAngles(ctx, plan, scale) {
    const walls = plan.walls;
    if (!walls || walls.length < 2) return;

    // Build adjacency: group walls by endpoint
    const epMap = new Map(); // key = "x,y" -> [{ wall, end: 'start'|'end' }]
    const EPSILON = 0.05;

    walls.forEach(w => {
      _addEndpoint(epMap, w.start.x, w.start.y, w, 'start', EPSILON);
      _addEndpoint(epMap, w.end.x,   w.end.y,   w, 'end',   EPSILON);
    });

    // For each junction with >= 2 walls, compute and display angles
    epMap.forEach((entries, key) => {
      if (entries.length < 2) return;

      const [cx, cy] = key.split(',').map(Number);

      // Compute direction angles of each wall away from the junction
      const angles = entries.map(e => {
        const w = e.wall;
        let dx, dy;
        if (e.end === 'start') {
          dx = w.end.x - w.start.x;
          dy = w.end.y - w.start.y;
        } else {
          dx = w.start.x - w.end.x;
          dy = w.start.y - w.end.y;
        }
        return Math.atan2(dy, dx);
      });

      // Sort angles
      angles.sort((a, b) => a - b);

      // Draw angle between each consecutive pair
      for (let i = 0; i < angles.length; i++) {
        const a1 = angles[i];
        const a2 = angles[(i + 1) % angles.length];
        let sweep = a2 - a1;
        if (sweep <= 0) sweep += Math.PI * 2;

        // Only draw if angle is "interesting" (not ~180 degrees, i.e. a straight continuation)
        const deg = (sweep * 180 / Math.PI);
        if (Math.abs(deg - 180) < 2) continue;
        if (deg < 1) continue;

        // Draw arc
        const radius = 0.25;
        ctx.strokeStyle = ANGLE_COLOR;
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, a1, a1 + sweep, false);
        ctx.stroke();

        // Angle label
        const midAngle = a1 + sweep / 2;
        const labelR = radius + 0.12;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;

        ctx.fillStyle = ANGLE_COLOR;
        ctx.font = ANGLE_FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(deg) + '\u00B0', lx, ly);
      }
    });
  }

  /**
   * Helper: add an endpoint to the adjacency map, merging nearby points.
   */
  function _addEndpoint(epMap, x, y, wall, end, epsilon) {
    // Find existing key within epsilon
    let foundKey = null;
    for (const [key] of epMap) {
      const [kx, ky] = key.split(',').map(Number);
      if (Math.abs(kx - x) < epsilon && Math.abs(ky - y) < epsilon) {
        foundKey = key;
        break;
      }
    }
    if (foundKey) {
      epMap.get(foundKey).push({ wall, end });
    } else {
      const key = x.toFixed(4) + ',' + y.toFixed(4);
      epMap.set(key, [{ wall, end }]);
    }
  }

  /**
   * Render field note pins on the 2D canvas.
   */
  function _renderFieldNotes(ctx, plan, scale) {
    const notes = plan.fieldNotes;
    if (!notes || notes.length === 0) return;

    notes.forEach(note => {
      const x = note.x, y = note.y;
      const color = note.color || NOTE_COLORS[note.type] || NOTE_COLORS.info;

      // Pin drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(x + 0.03, y + 0.03, 0.14, 0, Math.PI * 2);
      ctx.fill();

      // Pin circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 0.14, 0, Math.PI * 2);
      ctx.fill();

      // White inner dot
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Pin pointer (triangle below circle)
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 0.07, y + 0.10);
      ctx.lineTo(x + 0.07, y + 0.10);
      ctx.lineTo(x, y + 0.24);
      ctx.closePath();
      ctx.fill();

      // Note text label
      if (note.text) {
        const maxChars = 24;
        const displayText = note.text.length > maxChars
          ? note.text.substring(0, maxChars - 1) + '\u2026'
          : note.text;

        // Background rect
        ctx.font = '0.18px sans-serif';
        const textW = ctx.measureText(displayText).width;
        const padX = 0.08, padY = 0.04;
        const bgX = x - textW / 2 - padX;
        const bgY = y - 0.34 - padY;
        const bgW = textW + padX * 2;
        const bgH = 0.22 + padY * 2;

        ctx.fillStyle = 'rgba(15,15,26,0.85)';
        _roundRect(ctx, bgX, bgY, bgW, bgH, 0.06);
        ctx.fill();

        // Left color accent bar
        ctx.fillStyle = color;
        _roundRect(ctx, bgX, bgY, 0.04, bgH, 0.06);
        ctx.fill();

        // Text
        ctx.fillStyle = '#e0e0e0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, x, y - 0.24);
      }

      // Type badge (small letter)
      const badge = note.type === 'info' ? 'i'
        : note.type === 'alert' ? '!'
        : note.type === 'pending' ? '?'
        : '\u2713';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 0.11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge, x, y);
    });
  }

  /**
   * Draw a rounded rectangle path.
   */
  function _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ──────────────────────────────────────────────
  // 7.3b — Enhanced Snap Helpers
  // ──────────────────────────────────────────────

  /**
   * Compute enhanced snap candidates for a given world position.
   * Returns the best snap point considering: endpoints, midpoints, perpendicular.
   *
   * @param {{ x: number, y: number }} point
   * @param {object[]} walls
   * @param {number} [threshold=0.3]
   * @returns {{ x: number, y: number, snapType: string }|null}
   */
  function enhancedSnap(point, walls, threshold) {
    const t = threshold || 0.3;
    let best = null;
    let bestDist = t;

    if (!walls) return null;

    walls.forEach(w => {
      // --- Endpoint snap ---
      [w.start, w.end].forEach(ep => {
        const d = _dist(point.x, point.y, ep.x, ep.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x: ep.x, y: ep.y, snapType: 'endpoint' };
        }
      });

      // --- Midpoint snap ---
      const mx = (w.start.x + w.end.x) / 2;
      const my = (w.start.y + w.end.y) / 2;
      const dm = _dist(point.x, point.y, mx, my);
      if (dm < bestDist) {
        bestDist = dm;
        best = { x: mx, y: my, snapType: 'midpoint' };
      }

      // --- Perpendicular snap ---
      const pp = _perpendicularPoint(point, w);
      if (pp) {
        const dp = _dist(point.x, point.y, pp.x, pp.y);
        if (dp < bestDist) {
          bestDist = dp;
          best = { x: pp.x, y: pp.y, snapType: 'perpendicular' };
        }
      }
    });

    return best;
  }

  /**
   * Project a point onto the wall's line segment.
   * Returns null if projection falls outside the segment.
   */
  function _perpendicularPoint(point, wall) {
    const ax = wall.start.x, ay = wall.start.y;
    const bx = wall.end.x,   by = wall.end.y;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 0.0001) return null;

    let t = ((point.x - ax) * dx + (point.y - ay) * dy) / lenSq;
    // Clamp to segment interior (small margin to avoid duplicating endpoints)
    if (t < 0.05 || t > 0.95) return null;

    return {
      x: ax + t * dx,
      y: ay + t * dy
    };
  }

  // ──────────────────────────────────────────────
  // 7.3c — Numeric Wall Length Input
  // ──────────────────────────────────────────────

  /**
   * Show a floating input field near the cursor for precise wall length entry.
   * Returns a Promise that resolves with the entered length or null on cancel.
   *
   * @param {number} screenX - Screen pixel X
   * @param {number} screenY - Screen pixel Y
   * @param {number} currentLength - Current measured length (default value)
   * @returns {Promise<number|null>}
   */
  function showWallLengthInput(screenX, screenY, currentLength) {
    return new Promise(resolve => {
      // Remove any existing input
      _removeWallLengthInput();

      const container = document.getElementById('canvas-container');
      if (!container) { resolve(null); return; }

      const wrap = document.createElement('div');
      wrap.id = 'wall-length-input-wrap';
      wrap.style.cssText = `
        position: absolute;
        left: ${Math.min(screenX, container.clientWidth - 140)}px;
        top: ${Math.max(0, screenY - 40)}px;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(15,15,26,0.95);
        border: 1px solid #58A6FF;
        border-radius: 6px;
        padding: 4px 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      `;

      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.min = '0.01';
      input.value = currentLength.toFixed(2);
      input.style.cssText = `
        width: 80px;
        background: #1a1d28;
        border: 1px solid #333;
        color: #e0e0e0;
        font-size: 14px;
        padding: 4px 6px;
        border-radius: 4px;
        outline: none;
        font-family: 'Space Mono', monospace;
      `;

      const label = document.createElement('span');
      label.textContent = 'm';
      label.style.cssText = 'color: #9e9e9e; font-size: 13px;';

      wrap.appendChild(input);
      wrap.appendChild(label);
      container.appendChild(wrap);

      input.focus();
      input.select();

      const finish = (val) => {
        _removeWallLengthInput();
        resolve(val);
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const v = parseFloat(input.value);
          finish(v > 0 ? v : null);
        } else if (e.key === 'Escape') {
          finish(null);
        }
      });

      input.addEventListener('blur', () => {
        // Small delay to allow click on the input
        setTimeout(() => {
          if (document.getElementById('wall-length-input-wrap')) {
            const v = parseFloat(input.value);
            finish(v > 0 ? v : null);
          }
        }, 150);
      });
    });
  }

  function _removeWallLengthInput() {
    const existing = document.getElementById('wall-length-input-wrap');
    if (existing) existing.remove();
  }

  // ──────────────────────────────────────────────
  // 7.4 — Measurements Panel HTML
  // ──────────────────────────────────────────────

  /**
   * Initialize the measurements panel: create DOM, wire EventBus.
   */
  function init() {
    if (isInitialized) return;
    isInitialized = true;

    _createPanelDOM();

    // Listen for plan changes to update measurements
    EventBus.on('plan:changed', (plan) => {
      updateStatusBar(plan);
      _refreshPanel();
    });

    // Listen for field note events
    EventBus.on('fieldnote:added', _refreshPanel);
    EventBus.on('fieldnote:removed', _refreshPanel);
    EventBus.on('fieldnote:updated', _refreshPanel);
  }

  /**
   * Create the measurements panel DOM and inject it into the page.
   */
  function _createPanelDOM() {
    // Check if already exists
    if (document.getElementById('measurements-panel')) {
      panelEl = document.getElementById('measurements-panel');
      return;
    }

    panelEl = document.createElement('aside');
    panelEl.id = 'measurements-panel';
    panelEl.className = 'hidden';
    panelEl.innerHTML = `
      <div class="panel-header">
        <h2>Medicoes</h2>
        <button id="btn-close-measurements" class="panel-close-btn" title="Fechar">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/>
          </svg>
        </button>
      </div>
      <div id="measurements-content" style="overflow-y:auto; max-height:calc(100vh - 120px); padding:8px;">
        <div id="measurements-summary" class="measurements-summary"></div>
        <div id="measurements-rooms" class="measurements-rooms"></div>
        <div id="measurements-fieldnotes" class="measurements-fieldnotes"></div>
        <div id="measurements-actions" style="padding:8px 0;">
          <button id="btn-export-dxf" class="small-btn" title="Exportar DXF" style="width:100%;padding:8px;background:#1a2a4e;color:#58A6FF;border:1px solid #2a3a5e;border-radius:6px;cursor:pointer;font-size:13px;">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;">
              <path d="M3 10v3h10v-3"/><path d="M8 2v8"/><path d="M5 7l3 3 3-3"/>
            </svg>
            Exportar DXF
          </button>
        </div>
      </div>
    `;

    // Insert into right-panels
    const rightPanels = document.querySelector('.right-panels');
    if (rightPanels) {
      rightPanels.appendChild(panelEl);
    } else {
      document.body.appendChild(panelEl);
    }

    // Close button
    document.getElementById('btn-close-measurements').addEventListener('click', () => {
      panelEl.classList.add('hidden');
    });

    // DXF export button
    document.getElementById('btn-export-dxf').addEventListener('click', () => {
      const plan = _getPlan();
      if (plan) {
        exportDXF(plan);
        if (typeof App !== 'undefined' && App.setStatus) {
          App.setStatus('DXF exportado!');
          setTimeout(() => App.setStatus(''), 2000);
        }
      }
    });
  }

  /**
   * Open/show the measurements panel.
   */
  function openPanel() {
    if (!panelEl) _createPanelDOM();
    panelEl.classList.remove('hidden');
    _refreshPanel();
  }

  /**
   * Close/hide the measurements panel.
   */
  function closePanel() {
    if (panelEl) panelEl.classList.add('hidden');
  }

  /**
   * Toggle panel visibility.
   */
  function togglePanel() {
    if (!panelEl) _createPanelDOM();
    if (panelEl.classList.contains('hidden')) {
      openPanel();
    } else {
      closePanel();
    }
  }

  /**
   * Refresh panel content with current plan data.
   */
  function _refreshPanel() {
    const plan = _getPlan();
    if (!plan) return;
    if (!panelEl || panelEl.classList.contains('hidden')) return;

    _renderSummaryCard(plan);
    _renderRoomTable(plan);
    _renderFieldNotesList(plan);
  }

  /**
   * Summary card: total area, perimeter, counts.
   */
  function _renderSummaryCard(plan) {
    const el = document.getElementById('measurements-summary');
    if (!el) return;

    const area = getTotalArea(plan);
    const perim = calculatePerimeter(plan);
    const counts = countElements(plan);

    el.innerHTML = `
      <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Resumo do Projeto</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="background:#1a1d28;border-radius:6px;padding:8px 10px;">
            <div style="font-size:18px;font-weight:700;color:#58A6FF;">${area.toFixed(1)}<span style="font-size:12px;color:#9ca3af;"> m\u00B2</span></div>
            <div style="font-size:11px;color:#6b7280;">Area Total</div>
          </div>
          <div style="background:#1a1d28;border-radius:6px;padding:8px 10px;">
            <div style="font-size:18px;font-weight:700;color:#58A6FF;">${perim.toFixed(1)}<span style="font-size:12px;color:#9ca3af;"> m</span></div>
            <div style="font-size:11px;color:#6b7280;">Perimetro</div>
          </div>
          <div style="background:#1a1d28;border-radius:6px;padding:8px 10px;">
            <div style="font-size:18px;font-weight:700;color:#e0e0e0;">${counts.doors}</div>
            <div style="font-size:11px;color:#6b7280;">Portas</div>
          </div>
          <div style="background:#1a1d28;border-radius:6px;padding:8px 10px;">
            <div style="font-size:18px;font-weight:700;color:#e0e0e0;">${counts.windows}</div>
            <div style="font-size:11px;color:#6b7280;">Janelas</div>
          </div>
          <div style="background:#1a1d28;border-radius:6px;padding:8px 10px;">
            <div style="font-size:18px;font-weight:700;color:#e0e0e0;">${counts.walls}</div>
            <div style="font-size:11px;color:#6b7280;">Paredes</div>
          </div>
          <div style="background:#1a1d28;border-radius:6px;padding:8px 10px;">
            <div style="font-size:18px;font-weight:700;color:#e0e0e0;">${counts.furniture}</div>
            <div style="font-size:11px;color:#6b7280;">Moveis</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Per-room breakdown table.
   */
  function _renderRoomTable(plan) {
    const el = document.getElementById('measurements-rooms');
    if (!el) return;

    const rooms = plan.rooms || [];
    if (rooms.length === 0) {
      el.innerHTML = `
        <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:12px;margin-bottom:12px;">
          <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Salas</div>
          <div style="color:#6b7280;font-size:13px;text-align:center;padding:16px 0;">Nenhuma sala definida</div>
        </div>
      `;
      return;
    }

    let rows = '';
    rooms.forEach((r, i) => {
      const area = calculateRoomArea(r);
      const name = _escHtml(r.name || `Sala ${i + 1}`);
      const perimeter = _calculateRoomPerimeter(r);
      rows += `
        <tr style="border-bottom:1px solid #1f2937;">
          <td style="padding:6px 8px;color:#e0e0e0;font-size:13px;">${name}</td>
          <td style="padding:6px 8px;color:#58A6FF;font-size:13px;text-align:right;">${area.toFixed(1)} m\u00B2</td>
          <td style="padding:6px 8px;color:#9ca3af;font-size:13px;text-align:right;">${perimeter.toFixed(1)} m</td>
        </tr>
      `;
    });

    el.innerHTML = `
      <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Salas (${rooms.length})</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #374151;">
              <th style="padding:4px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Nome</th>
              <th style="padding:4px 8px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;">Area</th>
              <th style="padding:4px 8px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;">Perim.</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Calculate room perimeter from vertices.
   */
  function _calculateRoomPerimeter(room) {
    const pts = room.points || room.vertices;
    if (!pts || pts.length < 2) return 0;
    let perim = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      perim += _dist(pts[i].x, pts[i].y, pts[j].x, pts[j].y);
    }
    return perim;
  }

  /**
   * Field notes list with color-coded pins.
   */
  function _renderFieldNotesList(plan) {
    const el = document.getElementById('measurements-fieldnotes');
    if (!el) return;

    const notes = plan.fieldNotes || [];

    if (notes.length === 0) {
      el.innerHTML = `
        <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:12px;">
          <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Notas de Campo</div>
          <div style="color:#6b7280;font-size:13px;text-align:center;padding:16px 0;">Nenhuma nota de campo</div>
        </div>
      `;
      return;
    }

    let items = '';
    notes.forEach(note => {
      const color = note.color || NOTE_COLORS[note.type] || NOTE_COLORS.info;
      const label = NOTE_LABELS[note.type] || 'Info';
      const text = _escHtml(note.text || '');
      const time = note.timestamp
        ? new Date(note.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '';
      const photoThumb = note.photo
        ? `<img src="${note.photo}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;margin-top:4px;" alt="foto">`
        : '';

      items += `
        <div class="fieldnote-item" data-note-id="${note.id}" style="display:flex;gap:8px;align-items:flex-start;padding:8px;border-bottom:1px solid #1f2937;cursor:pointer;">
          <div style="flex-shrink:0;width:10px;height:10px;border-radius:50%;background:${color};margin-top:4px;"></div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11px;color:${color};font-weight:600;text-transform:uppercase;">${label}</span>
              <span style="font-size:10px;color:#6b7280;">${time}</span>
            </div>
            <div style="font-size:13px;color:#e0e0e0;margin-top:2px;word-break:break-word;">${text}</div>
            ${photoThumb}
          </div>
          <button class="fieldnote-delete" data-note-id="${note.id}" title="Remover" style="flex-shrink:0;background:none;border:none;color:#6b7280;cursor:pointer;font-size:16px;padding:0 4px;line-height:1;">&times;</button>
        </div>
      `;
    });

    el.innerHTML = `
      <div style="background:#111827;border:1px solid #1f2937;border-radius:8px;padding:12px;">
        <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Notas de Campo (${notes.length})</div>
        <div>${items}</div>
      </div>
    `;

    // Wire delete buttons
    el.querySelectorAll('.fieldnote-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        removeFieldNote(btn.dataset.noteId);
      });
    });

    // Wire click-to-pan on notes
    el.querySelectorAll('.fieldnote-item').forEach(item => {
      item.addEventListener('click', e => {
        if (e.target.classList.contains('fieldnote-delete')) return;
        const noteId = item.dataset.noteId;
        const note = (plan.fieldNotes || []).find(n => n.id === noteId);
        if (note) {
          EventBus.emit('fieldnote:focus', note);
        }
      });
    });
  }

  // ──────────────────────────────────────────────
  // 7.5 — DXF Export (basic)
  // ──────────────────────────────────────────────

  /**
   * Generate a DXF string from a plan.
   * Writes walls as LINE entities and rooms as LWPOLYLINE entities.
   * Then triggers a download.
   *
   * @param {object} plan
   * @returns {string} DXF content
   */
  function exportDXF(plan) {
    if (!plan) return '';

    const lines = [];

    // --- HEADER section ---
    lines.push('0');
    lines.push('SECTION');
    lines.push('2');
    lines.push('HEADER');
    lines.push('9');
    lines.push('$ACADVER');
    lines.push('1');
    lines.push('AC1015');
    lines.push('9');
    lines.push('$INSUNITS');
    lines.push('70');
    lines.push('6'); // meters
    lines.push('0');
    lines.push('ENDSEC');

    // --- TABLES section ---
    lines.push('0');
    lines.push('SECTION');
    lines.push('2');
    lines.push('TABLES');

    // Layer table
    lines.push('0');
    lines.push('TABLE');
    lines.push('2');
    lines.push('LAYER');
    lines.push('70');
    lines.push('3'); // number of layers

    // Layer: WALLS
    _dxfLayer(lines, 'WALLS', 7);   // white
    // Layer: ROOMS
    _dxfLayer(lines, 'ROOMS', 3);   // green
    // Layer: DIMENSIONS
    _dxfLayer(lines, 'DIMENSIONS', 1); // red

    lines.push('0');
    lines.push('ENDTAB');

    lines.push('0');
    lines.push('ENDSEC');

    // --- ENTITIES section ---
    lines.push('0');
    lines.push('SECTION');
    lines.push('2');
    lines.push('ENTITIES');

    // Walls as LINE entities
    (plan.walls || []).forEach(wall => {
      lines.push('0');
      lines.push('LINE');
      lines.push('8');
      lines.push('WALLS');
      // Start point
      lines.push('10');
      lines.push(wall.start.x.toFixed(6));
      lines.push('20');
      lines.push(wall.start.y.toFixed(6));
      lines.push('30');
      lines.push('0.000000');
      // End point
      lines.push('11');
      lines.push(wall.end.x.toFixed(6));
      lines.push('21');
      lines.push(wall.end.y.toFixed(6));
      lines.push('31');
      lines.push('0.000000');
    });

    // Rooms as LWPOLYLINE entities
    (plan.rooms || []).forEach(room => {
      const pts = room.points || room.vertices;
      if (!pts || pts.length < 3) return;

      lines.push('0');
      lines.push('LWPOLYLINE');
      lines.push('8');
      lines.push('ROOMS');
      lines.push('70');
      lines.push('1'); // closed polyline flag
      lines.push('90');
      lines.push(String(pts.length)); // number of vertices

      pts.forEach(p => {
        lines.push('10');
        lines.push(p.x.toFixed(6));
        lines.push('20');
        lines.push(p.y.toFixed(6));
      });
    });

    // Manual dimensions as LINE entities on DIMENSIONS layer
    (plan.dimensions || []).forEach(dim => {
      lines.push('0');
      lines.push('LINE');
      lines.push('8');
      lines.push('DIMENSIONS');
      lines.push('10');
      lines.push(dim.start.x.toFixed(6));
      lines.push('20');
      lines.push(dim.start.y.toFixed(6));
      lines.push('30');
      lines.push('0.000000');
      lines.push('11');
      lines.push(dim.end.x.toFixed(6));
      lines.push('21');
      lines.push(dim.end.y.toFixed(6));
      lines.push('31');
      lines.push('0.000000');
    });

    lines.push('0');
    lines.push('ENDSEC');

    // --- EOF ---
    lines.push('0');
    lines.push('EOF');

    const dxfString = lines.join('\n');

    // Trigger download
    _downloadFile(
      dxfString,
      `${(plan.name || 'planta').replace(/[^a-zA-Z0-9_-]/g, '_')}.dxf`,
      'application/dxf'
    );

    return dxfString;
  }

  /**
   * Write a DXF LAYER definition.
   */
  function _dxfLayer(lines, name, color) {
    lines.push('0');
    lines.push('LAYER');
    lines.push('2');
    lines.push(name);
    lines.push('70');
    lines.push('0');
    lines.push('62');
    lines.push(String(color));
    lines.push('6');
    lines.push('CONTINUOUS');
  }

  /**
   * Trigger a browser file download.
   */
  function _downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ──────────────────────────────────────────────
  // Shared utilities
  // ──────────────────────────────────────────────

  function _dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function _escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Get the current plan from Editor2D or App.
   */
  function _getPlan() {
    if (typeof Editor2D !== 'undefined' && Editor2D.getPlan) {
      return Editor2D.getPlan();
    }
    return null;
  }

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  return {
    // Lifecycle
    init,
    openPanel,
    closePanel,
    togglePanel,

    // 7.1 — Automatic measurements
    calculateRoomArea,
    calculateWallLength,
    calculatePerimeter,
    countElements,
    getTotalArea,
    updateStatusBar,

    // 7.2 — Field notes
    addFieldNote,
    removeFieldNote,
    updateFieldNote,
    getFieldNotes,

    // 7.3 — Precise dimensioning / rendering
    renderDimensions,
    enhancedSnap,
    showWallLengthInput,

    // 7.5 — DXF export
    exportDXF,

    // Constants
    NOTE_COLORS,
    NOTE_LABELS
  };
})();

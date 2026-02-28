/**
 * share-manager.js — FASE 6: Collaboration & Sharing for Planta3D
 * Provides share-by-link, comment system, professional exports, and viewer mode.
 */
window.ShareManager = (() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  const MAX_URL_PLAN_BYTES = 8000;
  const COMMENT_PIN_RADIUS = 0.14;
  const COMMENT_PIN_COLOR_OPEN = '#FF9500';
  const COMMENT_PIN_COLOR_RESOLVED = '#4CAF50';
  const SHARE_MODAL_ID = 'share-modal';

  let _viewerMode = false;
  let _modalEl = null;

  // ---------------------------------------------------------------------------
  // 6.1 — Share by Link
  // ---------------------------------------------------------------------------

  /**
   * Generate a share link for a plan. Small plans are embedded inline as base64
   * in the URL hash. Larger plans are stored in localStorage with a unique ID.
   * Returns { mode: 'inline'|'id', value: string }.
   */
  function generateShareLink(plan) {
    if (!plan) return null;

    const json = JSON.stringify(plan);
    const encoded = _utfToBase64(json);

    if (encoded.length <= MAX_URL_PLAN_BYTES) {
      const url = _buildUrl({ p: encoded });
      return { mode: 'inline', value: url, data: encoded };
    }

    // Large plan: persist via localStorage and share by ID
    const shareId = _generateShareId();
    try {
      localStorage.setItem('p3d_share_' + shareId, json);
    } catch (e) {
      console.warn('ShareManager: localStorage quota exceeded, falling back to inline', e);
      const url = _buildUrl({ p: encoded });
      return { mode: 'inline', value: url, data: encoded };
    }

    const url = _buildUrl({ id: shareId });
    return { mode: 'id', value: url, shareId: shareId };
  }

  /**
   * Copy text to the system clipboard. Returns Promise<boolean>.
   */
  async function copyToClipboard(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      return _fallbackCopy(text);
    } catch (e) {
      console.warn('ShareManager: clipboard copy failed', e);
      return _fallbackCopy(text);
    }
  }

  /**
   * Generate a QR code canvas for the given URL.
   * Uses an inline lightweight QR encoder (no external library).
   */
  function generateQRCode(url, size) {
    size = size || 200;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const matrix = _encodeQR(url);
    const moduleCount = matrix.length;
    if (moduleCount === 0) return canvas;

    const cellSize = size / moduleCount;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix[row][col]) {
          ctx.fillRect(
            Math.floor(col * cellSize),
            Math.floor(row * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }

    return canvas;
  }

  // ---------------------------------------------------------------------------
  // 6.2 — Comment System
  // ---------------------------------------------------------------------------

  /**
   * Add a pin comment at world-coordinate position (x, y).
   */
  function addComment(plan, x, y, text, author) {
    if (!plan) return null;
    if (!plan.comments) plan.comments = [];

    const comment = {
      id: DataModel.generateId('cmt'),
      x: x,
      y: y,
      text: text || '',
      author: author || 'Anonimo',
      timestamp: Date.now(),
      status: 'open'
    };

    plan.comments.push(comment);
    EventBus.emit('comment:added', comment);
    return comment;
  }

  /**
   * Mark a comment as resolved.
   */
  function resolveComment(plan, id) {
    if (!plan || !plan.comments) return null;
    const comment = plan.comments.find(function (c) { return c.id === id; });
    if (!comment) return null;
    comment.status = 'resolved';
    comment.resolvedAt = Date.now();
    EventBus.emit('comment:resolved', comment);
    return comment;
  }

  /**
   * Delete a comment by ID.
   */
  function deleteComment(plan, id) {
    if (!plan || !plan.comments) return false;
    const idx = plan.comments.findIndex(function (c) { return c.id === id; });
    if (idx === -1) return false;
    const removed = plan.comments.splice(idx, 1)[0];
    EventBus.emit('comment:deleted', removed);
    return true;
  }

  /**
   * Return all comments for the plan.
   */
  function getComments(plan) {
    if (!plan) return [];
    return plan.comments || [];
  }

  /**
   * Render comment pin markers onto a 2D canvas context.
   * Designed to be called from CanvasRenderer or Editor2D render pipelines.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} plan
   * @param {number} scale   - current zoom / pixels-per-meter
   * @param {Object} offset  - { x, y } pan offset in screen pixels
   */
  function renderComments(ctx, plan, scale, offset) {
    if (!plan || !plan.comments || plan.comments.length === 0) return;

    const comments = plan.comments;
    const ox = offset ? offset.x : 0;
    const oy = offset ? offset.y : 0;
    const s = scale || 1;

    comments.forEach(function (comment, index) {
      var sx = comment.x * s + ox;
      var sy = comment.y * s + oy;
      var isResolved = comment.status === 'resolved';
      var pinColor = isResolved ? COMMENT_PIN_COLOR_RESOLVED : COMMENT_PIN_COLOR_OPEN;
      var radius = COMMENT_PIN_RADIUS * s;

      ctx.save();

      // Drop shadow
      ctx.beginPath();
      ctx.arc(sx, sy + radius * 0.2, radius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();

      // Pin body circle
      ctx.beginPath();
      ctx.arc(sx, sy - radius * 0.4, radius, 0, Math.PI * 2);
      ctx.fillStyle = pinColor;
      ctx.fill();
      ctx.strokeStyle = isResolved ? '#388E3C' : '#E65100';
      ctx.lineWidth = Math.max(1, 0.02 * s);
      ctx.stroke();

      // Pin number label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + Math.max(8, radius * 1.1) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(index + 1), sx, sy - radius * 0.4);

      // Resolved checkmark
      if (isResolved) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.5, 0.03 * s);
        ctx.beginPath();
        var cx = sx + radius * 0.5;
        var cy = sy - radius * 1.2;
        ctx.moveTo(cx - radius * 0.25, cy);
        ctx.lineTo(cx - radius * 0.05, cy + radius * 0.2);
        ctx.lineTo(cx + radius * 0.25, cy - radius * 0.15);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  // ---------------------------------------------------------------------------
  // 6.3 — Professional Export
  // ---------------------------------------------------------------------------

  /**
   * Build a full professional export data structure containing all sections
   * needed for a comprehensive PDF (cover page, 2D plan, 3D renders,
   * material list, budget summary).
   */
  function buildProfessionalExportData(plan, options) {
    if (!plan) return null;
    options = options || {};

    var rooms = plan.rooms || [];
    var walls = plan.walls || [];
    var furniture = plan.furniture || [];

    // Total wall length
    var totalWallLength = 0;
    walls.forEach(function (w) {
      var dx = w.end.x - w.start.x;
      var dy = w.end.y - w.start.y;
      totalWallLength += Math.sqrt(dx * dx + dy * dy);
    });

    // Total area
    var totalArea = rooms.reduce(function (sum, r) {
      return sum + _calcArea(r.vertices || []);
    }, 0);

    // Furniture list with quantities
    var furnMap = new Map();
    furniture.forEach(function (f) {
      var item = (typeof FurnitureCatalog !== 'undefined')
        ? FurnitureCatalog.getItem(f.catalogId)
        : null;
      var name = item ? item.name : (f.catalogId || 'Item');
      var entry = furnMap.get(name) || {
        name: name,
        count: 0,
        category: item ? item.category : 'Outros'
      };
      entry.count++;
      furnMap.set(name, entry);
    });

    // Material list from rooms
    var materials = [];
    rooms.forEach(function (r) {
      if (r.floorMaterial) {
        var mat = (typeof MaterialSystem !== 'undefined')
          ? MaterialSystem.getFloorMaterial(r.floorMaterial)
          : null;
        materials.push({
          room: r.name || 'Sala',
          material: mat ? mat.name : r.floorMaterial,
          area: _calcArea(r.vertices || [])
        });
      }
    });

    // Capture 2D view
    var canvas2D = _capture2DView(plan);

    // Capture 3D views
    var canvas3D = null;
    var renders3D = [];

    try {
      if (typeof ThreeScene !== 'undefined') {
        var renderer = ThreeScene.getRenderer();
        var scene = ThreeScene.getScene();
        var camera = ThreeScene.getCamera();
        renderer.render(scene, camera);
        canvas3D = renderer.domElement.toDataURL('image/png');

        // Multiple angle renders
        var angles = [
          { name: 'Perspectiva', pos: { x: 12, y: 10, z: 12 } },
          { name: 'Frontal', pos: { x: 0, y: 8, z: 20 } },
          { name: 'Lateral', pos: { x: 20, y: 8, z: 0 } },
          { name: 'Topo', pos: { x: 0, y: 25, z: 0.1 } }
        ];

        var origPos = camera.position.clone();
        var origTarget = ThreeScene.getControls().target.clone();

        angles.forEach(function (angle) {
          camera.position.set(angle.pos.x, angle.pos.y, angle.pos.z);
          camera.lookAt(origTarget);
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
          renders3D.push({
            name: angle.name,
            dataUrl: renderer.domElement.toDataURL('image/png')
          });
        });

        // Restore camera position
        camera.position.copy(origPos);
        camera.lookAt(origTarget);
        camera.updateProjectionMatrix();
      }
    } catch (e) {
      console.warn('ShareManager: 3D capture failed', e);
    }

    return {
      cover: {
        projectName: plan.name || 'Projeto',
        date: new Date().toLocaleDateString('pt-BR'),
        author: options.author || '',
        address: options.address || '',
        clientName: options.clientName || ''
      },
      floorPlan2D: canvas2D,
      renders3D: renders3D,
      mainView3D: canvas3D,
      rooms: rooms.map(function (r) {
        return {
          name: r.name || 'Sem nome',
          area: _calcArea(r.vertices || []),
          material: r.floorMaterial || '-'
        };
      }),
      totalArea: totalArea,
      wallCount: walls.length,
      totalWallLength: totalWallLength,
      doorCount: (plan.doors || []).length,
      windowCount: (plan.windows || []).length,
      furnitureList: Array.from(furnMap.values()),
      materialList: materials,
      budgetSummary: options.budget || null,
      comments: plan.comments || []
    };
  }

  /**
   * Generate shareable text for WhatsApp with link and plan summary.
   * Returns { text, whatsappUrl, shareLink }.
   */
  function exportForWhatsApp(plan) {
    if (!plan) return null;

    var shareResult = generateShareLink(plan);
    if (!shareResult) return null;

    var rooms = plan.rooms || [];
    var totalArea = rooms.reduce(function (sum, r) {
      return sum + _calcArea(r.vertices || []);
    }, 0);
    var wallCount = (plan.walls || []).length;
    var furnCount = (plan.furniture || []).length;

    var lines = [
      '*' + (plan.name || 'Projeto') + '* - Planta 3D',
      '',
      rooms.length + ' ambientes | ' + totalArea.toFixed(1) + 'm\u00B2',
      wallCount + ' paredes',
      furnCount + ' moveis'
    ];

    if (rooms.length > 0) {
      lines.push('');
      lines.push('*Ambientes:*');
      rooms.forEach(function (r) {
        var area = _calcArea(r.vertices || []);
        lines.push('  - ' + (r.name || 'Sala') + ' (' + area.toFixed(1) + 'm\u00B2)');
      });
    }

    lines.push('');
    lines.push('Abrir projeto:');
    lines.push(shareResult.value);

    var text = lines.join('\n');
    var whatsappUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);

    return { text: text, whatsappUrl: whatsappUrl, shareLink: shareResult.value };
  }

  /**
   * Export plan as DXF (Drawing Exchange Format).
   * Generates walls with proper thickness as LINE entities, plus doors, windows,
   * rooms, furniture outlines, and dimensions on separate layers.
   */
  function exportDXF(plan) {
    if (!plan) return '';

    var walls = plan.walls || [];
    var doors = plan.doors || [];
    var windows = plan.windows || [];
    var rooms = plan.rooms || [];
    var furniture = plan.furniture || [];

    var lines = [];

    // --- HEADER ---
    lines.push('0', 'SECTION');
    lines.push('2', 'HEADER');
    lines.push('9', '$ACADVER');
    lines.push('1', 'AC1015');
    lines.push('9', '$INSUNITS');
    lines.push('70', '6');
    lines.push('9', '$MEASUREMENT');
    lines.push('70', '1');
    lines.push('9', '$EXTMIN');
    lines.push('10', '0.0');
    lines.push('20', '0.0');
    lines.push('30', '0.0');

    var maxX = 0, maxY = 0;
    walls.forEach(function (w) {
      maxX = Math.max(maxX, w.start.x, w.end.x);
      maxY = Math.max(maxY, w.start.y, w.end.y);
    });
    rooms.forEach(function (r) {
      (r.vertices || []).forEach(function (v) {
        maxX = Math.max(maxX, v.x);
        maxY = Math.max(maxY, v.y);
      });
    });

    lines.push('9', '$EXTMAX');
    lines.push('10', maxX.toFixed(4));
    lines.push('20', maxY.toFixed(4));
    lines.push('30', '0.0');
    lines.push('0', 'ENDSEC');

    // --- TABLES ---
    lines.push('0', 'SECTION');
    lines.push('2', 'TABLES');
    lines.push('0', 'TABLE');
    lines.push('2', 'LAYER');
    lines.push('70', '6');

    var layerDefs = [
      { name: 'WALLS',      color: '7' },
      { name: 'DOORS',      color: '3' },
      { name: 'WINDOWS',    color: '5' },
      { name: 'ROOMS',      color: '1' },
      { name: 'FURNITURE',  color: '4' },
      { name: 'DIMENSIONS', color: '2' }
    ];
    layerDefs.forEach(function (ld) {
      lines.push('0', 'LAYER');
      lines.push('2', ld.name);
      lines.push('70', '0');
      lines.push('62', ld.color);
      lines.push('6', 'CONTINUOUS');
    });

    lines.push('0', 'ENDTAB');
    lines.push('0', 'ENDSEC');

    // --- ENTITIES ---
    lines.push('0', 'SECTION');
    lines.push('2', 'ENTITIES');

    // Walls (draw both edges + caps for wall thickness)
    walls.forEach(function (wall) {
      var t = wall.thickness || (plan.wallThickness || 0.15);
      var sx = wall.start.x, sy = wall.start.y;
      var ex = wall.end.x, ey = wall.end.y;
      var dx = ex - sx, dy = ey - sy;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.001) return;

      var nx = -dy / len * (t / 2);
      var ny =  dx / len * (t / 2);

      _dxfLine(lines, 'WALLS', sx + nx, sy + ny, 0, ex + nx, ey + ny, 0);
      _dxfLine(lines, 'WALLS', sx - nx, sy - ny, 0, ex - nx, ey - ny, 0);
      _dxfLine(lines, 'WALLS', sx + nx, sy + ny, 0, sx - nx, sy - ny, 0);
      _dxfLine(lines, 'WALLS', ex + nx, ey + ny, 0, ex - nx, ey - ny, 0);
    });

    // Doors
    doors.forEach(function (door) {
      var wall = walls.find(function (w) { return w.id === door.wallId; });
      if (!wall) return;

      var sx = wall.start.x, sy = wall.start.y;
      var ex = wall.end.x, ey = wall.end.y;
      var dx = ex - sx, dy = ey - sy;
      var wLen = Math.sqrt(dx * dx + dy * dy);
      if (wLen < 0.001) return;

      var dirX = dx / wLen, dirY = dy / wLen;
      var pos = door.position || 0;
      var w = door.width || 0.9;

      var p1x = sx + dirX * pos;
      var p1y = sy + dirY * pos;
      var p2x = sx + dirX * (pos + w);
      var p2y = sy + dirY * (pos + w);

      _dxfLine(lines, 'DOORS', p1x, p1y, 0, p2x, p2y, 0);

      // Swing arc approximated with line segments
      var arcAngle = Math.atan2(dirY, dirX);
      var arcSteps = 8;
      for (var i = 0; i < arcSteps; i++) {
        var a1 = arcAngle + (Math.PI / 2) * (i / arcSteps);
        var a2 = arcAngle + (Math.PI / 2) * ((i + 1) / arcSteps);
        _dxfLine(lines, 'DOORS',
          p1x + Math.cos(a1) * w, p1y + Math.sin(a1) * w, 0,
          p1x + Math.cos(a2) * w, p1y + Math.sin(a2) * w, 0
        );
      }
    });

    // Windows
    windows.forEach(function (win) {
      var wall = walls.find(function (w) { return w.id === win.wallId; });
      if (!wall) return;

      var sx = wall.start.x, sy = wall.start.y;
      var ex = wall.end.x, ey = wall.end.y;
      var dx = ex - sx, dy = ey - sy;
      var wLen = Math.sqrt(dx * dx + dy * dy);
      if (wLen < 0.001) return;

      var dirX = dx / wLen, dirY = dy / wLen;
      var t = wall.thickness || (plan.wallThickness || 0.15);
      var perpX = -dirY * (t / 2);
      var perpY =  dirX * (t / 2);
      var pos = win.position || 0;
      var w = win.width || 1.2;

      var p1x = sx + dirX * pos;
      var p1y = sy + dirY * pos;
      var p2x = sx + dirX * (pos + w);
      var p2y = sy + dirY * (pos + w);

      _dxfLine(lines, 'WINDOWS', p1x + perpX, p1y + perpY, 0, p2x + perpX, p2y + perpY, 0);
      _dxfLine(lines, 'WINDOWS', p2x + perpX, p2y + perpY, 0, p2x - perpX, p2y - perpY, 0);
      _dxfLine(lines, 'WINDOWS', p2x - perpX, p2y - perpY, 0, p1x - perpX, p1y - perpY, 0);
      _dxfLine(lines, 'WINDOWS', p1x - perpX, p1y - perpY, 0, p1x + perpX, p1y + perpY, 0);
      _dxfLine(lines, 'WINDOWS', p1x, p1y, 0, p2x, p2y, 0);
    });

    // Rooms as closed polylines
    rooms.forEach(function (room) {
      if (!room.vertices || room.vertices.length < 3) return;
      var verts = room.vertices;
      for (var i = 0; i < verts.length; i++) {
        var next = (i + 1) % verts.length;
        _dxfLine(lines, 'ROOMS', verts[i].x, verts[i].y, 0, verts[next].x, verts[next].y, 0);
      }
      var cx = verts.reduce(function (s, v) { return s + v.x; }, 0) / verts.length;
      var cy = verts.reduce(function (s, v) { return s + v.y; }, 0) / verts.length;
      _dxfText(lines, 'ROOMS', cx, cy, 0, room.name || 'Sala', 0.3);
    });

    // Furniture as rectangles with labels
    furniture.forEach(function (f) {
      if (!f.position) return;
      var item = (typeof FurnitureCatalog !== 'undefined')
        ? FurnitureCatalog.getItem(f.catalogId)
        : null;
      var name = item ? item.name : (f.catalogId || 'Item');
      var w = item ? item.width * (f.scale ? f.scale.x : 1) : 0.5;
      var d = item ? item.depth * (f.scale ? f.scale.z || f.scale.y : 1) : 0.5;
      var px = f.position.x, py = f.position.y;
      var hw = w / 2, hd = d / 2;
      var rot = f.rotation || 0;

      var corners = [
        _rotatePoint(-hw, -hd, rot), _rotatePoint(hw, -hd, rot),
        _rotatePoint(hw,  hd, rot),  _rotatePoint(-hw, hd, rot)
      ];
      for (var ci = 0; ci < 4; ci++) {
        var ni = (ci + 1) % 4;
        _dxfLine(lines, 'FURNITURE',
          px + corners[ci].x, py + corners[ci].y, 0,
          px + corners[ni].x, py + corners[ni].y, 0
        );
      }
      _dxfText(lines, 'FURNITURE', px, py, 0, name, 0.15);
    });

    // Dimensions
    (plan.dimensions || []).forEach(function (dim) {
      _dxfLine(lines, 'DIMENSIONS', dim.start.x, dim.start.y, 0, dim.end.x, dim.end.y, 0);
      var mx = (dim.start.x + dim.end.x) / 2;
      var my = (dim.start.y + dim.end.y) / 2;
      _dxfText(lines, 'DIMENSIONS', mx, my, 0, dim.label || '', 0.2);
    });

    lines.push('0', 'ENDSEC');
    lines.push('0', 'EOF');

    return lines.join('\n');
  }

  /**
   * Trigger DXF file download.
   */
  function downloadDXF(plan) {
    var content = exportDXF(plan);
    if (!content) return;
    var blob = new Blob([content], { type: 'application/dxf' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (plan.name || 'planta3d') + '.dxf';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export plan furniture/materials as CSV (Bill of Materials).
   */
  function exportCSV(plan) {
    if (!plan) return '';

    var rows = [['Categoria', 'Item', 'Quantidade', 'Unidade', 'Detalhe']];

    // Walls
    var walls = plan.walls || [];
    if (walls.length > 0) {
      var totalLen = 0;
      walls.forEach(function (w) {
        var dx = w.end.x - w.start.x;
        var dy = w.end.y - w.start.y;
        totalLen += Math.sqrt(dx * dx + dy * dy);
      });
      rows.push(['Estrutura', 'Paredes', String(walls.length), 'un', totalLen.toFixed(1) + 'm lineares']);
    }

    // Doors
    if ((plan.doors || []).length > 0) {
      rows.push(['Aberturas', 'Portas', String(plan.doors.length), 'un',
        plan.doors.map(function (d) { return (d.width || 0.9) + 'm'; }).join(', ')]);
    }

    // Windows
    if ((plan.windows || []).length > 0) {
      rows.push(['Aberturas', 'Janelas', String(plan.windows.length), 'un',
        plan.windows.map(function (w) { return (w.width || 1.2) + 'x' + (w.height || 1.0) + 'm'; }).join(', ')]);
    }

    // Furniture
    var furnMap = new Map();
    (plan.furniture || []).forEach(function (f) {
      var item = (typeof FurnitureCatalog !== 'undefined')
        ? FurnitureCatalog.getItem(f.catalogId)
        : null;
      var name = item ? item.name : (f.catalogId || 'Item');
      furnMap.set(name, (furnMap.get(name) || 0) + 1);
    });
    furnMap.forEach(function (qty, name) {
      rows.push(['Mobiliario', name, String(qty), 'un', '']);
    });

    // Room floor materials
    (plan.rooms || []).forEach(function (r) {
      if (r.floorMaterial) {
        var mat = (typeof MaterialSystem !== 'undefined')
          ? MaterialSystem.getFloorMaterial(r.floorMaterial)
          : null;
        var area = _calcArea(r.vertices || []);
        rows.push(['Revestimento', mat ? mat.name : r.floorMaterial, '1', 'm\u00B2',
          area.toFixed(1) + 'm\u00B2 (' + (r.name || 'Sala') + ')']);
      }
    });

    // Columns
    if ((plan.columns || []).length > 0) {
      rows.push(['Estrutura', 'Pilares', String(plan.columns.length), 'un', '']);
    }

    // Stairs
    if ((plan.stairs || []).length > 0) {
      rows.push(['Estrutura', 'Escadas', String(plan.stairs.length), 'un', '']);
    }

    return rows.map(function (row) {
      return row.map(function (cell) {
        return '"' + String(cell).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
  }

  /**
   * Trigger CSV file download.
   */
  function downloadCSV(plan) {
    var content = exportCSV(plan);
    if (!content) return;
    var blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (plan.name || 'planta3d') + '-materiais.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export current 2D canvas view as a high-resolution PNG.
   */
  function exportPNG(plan) {
    if (!plan) return;
    try {
      var edCanvas = (typeof Editor2D !== 'undefined') ? Editor2D.getCanvas() : null;
      if (!edCanvas) return;

      var off = document.createElement('canvas');
      off.width = 1920;
      off.height = 1080;
      var offCtx = off.getContext('2d');
      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, off.width, off.height);

      var vs = Editor2D.getViewState();
      offCtx.save();
      offCtx.translate(off.width / 2, off.height / 2);
      offCtx.scale(vs.zoom * 0.8, vs.zoom * 0.8);
      offCtx.translate(-vs.pan.x / vs.zoom, -vs.pan.y / vs.zoom);

      var tempVS = Object.assign({}, vs, {
        showGrid: false,
        selection: null,
        hoverElement: null,
        snapPoints: null
      });
      if (typeof CanvasRenderer !== 'undefined') {
        CanvasRenderer.render(offCtx, off, plan, tempVS);
      }
      offCtx.restore();

      var a = document.createElement('a');
      a.href = off.toDataURL('image/png');
      a.download = (plan.name || 'planta3d') + '.png';
      a.click();
    } catch (e) {
      console.error('ShareManager: PNG export failed', e);
    }
  }

  // ---------------------------------------------------------------------------
  // 6.4 — Share Modal (Tab-based UI)
  // ---------------------------------------------------------------------------

  /**
   * Open the share modal for the given plan.
   */
  function openModal(plan) {
    if (!plan) return;

    if (!_modalEl) {
      _createModalHTML();
    }

    _populateShareTab(plan);
    _populateCommentsTab(plan);
    _populateExportTab(plan);
    _switchTab('share');

    _modalEl.classList.remove('hidden');
    EventBus.emit('share:modal-opened');
  }

  /**
   * Close the share modal.
   */
  function closeModal() {
    if (_modalEl) {
      _modalEl.classList.add('hidden');
      EventBus.emit('share:modal-closed');
    }
  }

  function _createModalHTML() {
    _modalEl = document.createElement('div');
    _modalEl.id = SHARE_MODAL_ID;
    _modalEl.className = 'modal-overlay hidden';

    _modalEl.innerHTML =
      '<div class="modal-card" style="max-width:560px;width:94vw;max-height:88vh;display:flex;flex-direction:column;">' +

      // Header
      '  <div class="modal-header">' +
      '    <h2>Compartilhar & Exportar</h2>' +
      '    <button class="modal-close" id="share-modal-close">&times;</button>' +
      '  </div>' +

      // Tabs bar
      '  <div class="share-tabs" style="display:flex;border-bottom:1px solid var(--border);padding:0 18px;">' +
      '    <button class="share-tab active" data-tab="share" style="flex:1;padding:10px 6px;background:none;border:none;border-bottom:2px solid var(--accent);color:var(--accent);cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;">Compartilhar</button>' +
      '    <button class="share-tab" data-tab="comments" style="flex:1;padding:10px 6px;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-secondary);cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;">Comentarios</button>' +
      '    <button class="share-tab" data-tab="export" style="flex:1;padding:10px 6px;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-secondary);cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;">Exportar</button>' +
      '  </div>' +

      // Body (scrollable)
      '  <div class="modal-body" style="overflow-y:auto;flex:1;padding:18px;">' +

      // SHARE TAB
      '    <div class="share-tab-content" id="share-tab-share">' +
      '      <label style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;display:block;">Link de compartilhamento</label>' +
      '      <div style="display:flex;gap:8px;margin-bottom:14px;">' +
      '        <input type="text" id="share-link-input" readonly style="flex:1;background:var(--bg-elevated);border:1px solid var(--border);color:var(--white);padding:8px 12px;border-radius:var(--radius-sm);font-size:13px;font-family:\'Space Mono\',monospace;" />' +
      '        <button id="share-copy-btn" style="background:var(--accent);color:var(--bg-surface);border:none;padding:8px 16px;border-radius:var(--radius-sm);cursor:pointer;font-weight:600;font-size:13px;white-space:nowrap;">Copiar</button>' +
      '      </div>' +
      '      <div id="share-qr-container" style="display:flex;justify-content:center;margin:16px 0;"></div>' +
      '      <div style="display:flex;gap:8px;justify-content:center;margin-top:14px;">' +
      '        <button id="share-whatsapp-btn" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:#fff;border:none;padding:10px 20px;border-radius:var(--radius-sm);cursor:pointer;font-weight:600;font-size:13px;">' +
      '          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
      '          WhatsApp' +
      '        </button>' +
      '      </div>' +
      '      <p id="share-copy-feedback" style="text-align:center;color:var(--accent);font-size:12px;margin-top:8px;min-height:16px;"></p>' +
      '    </div>' +

      // COMMENTS TAB
      '    <div class="share-tab-content hidden" id="share-tab-comments">' +
      '      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '        <span style="font-size:13px;color:var(--text-secondary);" id="share-comment-count">0 comentarios</span>' +
      '        <button id="share-add-comment-btn" style="background:var(--accent);color:var(--bg-surface);border:none;padding:6px 14px;border-radius:var(--radius-sm);cursor:pointer;font-weight:600;font-size:12px;">+ Comentario</button>' +
      '      </div>' +
      '      <div id="share-comments-list" style="display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto;"></div>' +
      '      <div id="share-comments-empty" style="text-align:center;color:var(--text-muted);padding:32px 0;font-size:13px;">Nenhum comentario ainda</div>' +
      '    </div>' +

      // EXPORT TAB
      '    <div class="share-tab-content hidden" id="share-tab-export">' +
      '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      _exportButton('share-export-pdf', 'var(--accent)', 'M4 2h8l5 5v13a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zM12 2v5h5M6 14h8M6 17h5', 'PDF Profissional', 'Plantas, 3D e materiais') +
      _exportButton('share-export-dxf', '#FF9500', 'M12 2H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V9zM12 2v7h7M8 15l2-2 2 2 2-2 2 2', 'DXF (AutoCAD)', 'Compativel com CAD') +
      _exportButton('share-export-csv', '#4CAF50', 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18', 'CSV Materiais', 'Lista para orcamento') +
      _exportButton('share-export-png', '#2196F3', 'M3 3h18v18H3zM3 15l5-5 4 4 2-2 7 7', 'PNG Imagem', 'Alta resolucao') +
      '      </div>' +
      '      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">' +
      '        <label style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;display:block;">Opcoes de exportacao</label>' +
      '        <div style="display:flex;flex-direction:column;gap:8px;">' +
      '          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);cursor:pointer;">' +
      '            <input type="checkbox" id="share-export-include-comments" checked style="accent-color:var(--accent);" />' +
      '            Incluir comentarios no PDF' +
      '          </label>' +
      '          <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text);cursor:pointer;">' +
      '            <input type="checkbox" id="share-export-include-3d" checked style="accent-color:var(--accent);" />' +
      '            Incluir vistas 3D multiplas' +
      '          </label>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +

      '  </div>' +
      '</div>';

    document.body.appendChild(_modalEl);

    // Close handlers
    _modalEl.querySelector('#share-modal-close').addEventListener('click', closeModal);
    _modalEl.addEventListener('click', function (e) {
      if (e.target === _modalEl) closeModal();
    });

    // Tab switching
    _modalEl.querySelectorAll('.share-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { _switchTab(tab.dataset.tab); });
    });
  }

  function _exportButton(id, color, pathD, title, subtitle) {
    return '' +
      '<button class="share-export-btn" id="' + id + '" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 12px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:all .15s;">' +
      '  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="' + color + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + pathD + '"/></svg>' +
      '  <span style="color:var(--white);font-weight:600;font-size:13px;">' + title + '</span>' +
      '  <span style="color:var(--text-muted);font-size:11px;">' + subtitle + '</span>' +
      '</button>';
  }

  function _switchTab(tabName) {
    if (!_modalEl) return;
    _modalEl.querySelectorAll('.share-tab').forEach(function (t) {
      var isActive = t.dataset.tab === tabName;
      t.classList.toggle('active', isActive);
      t.style.color = isActive ? 'var(--accent)' : 'var(--text-secondary)';
      t.style.borderBottomColor = isActive ? 'var(--accent)' : 'transparent';
    });
    _modalEl.querySelectorAll('.share-tab-content').forEach(function (c) {
      c.classList.add('hidden');
    });
    var target = _modalEl.querySelector('#share-tab-' + tabName);
    if (target) target.classList.remove('hidden');
  }

  function _populateShareTab(plan) {
    if (!_modalEl) return;

    var result = generateShareLink(plan);
    var linkInput = _modalEl.querySelector('#share-link-input');
    var qrContainer = _modalEl.querySelector('#share-qr-container');
    var feedback = _modalEl.querySelector('#share-copy-feedback');

    if (result) {
      linkInput.value = result.value;
      qrContainer.innerHTML = '';
      var qrCanvas = generateQRCode(result.value, 180);
      qrCanvas.style.borderRadius = '8px';
      qrCanvas.style.border = '1px solid rgba(255,255,255,0.06)';
      qrContainer.appendChild(qrCanvas);
    }

    // Copy button (replace to clear old listeners)
    _replaceWithHandler('share-copy-btn', function () {
      copyToClipboard(linkInput.value).then(function (ok) {
        feedback.textContent = ok ? 'Link copiado!' : 'Erro ao copiar';
        setTimeout(function () { feedback.textContent = ''; }, 2500);
      });
    });

    // WhatsApp button
    _replaceWithHandler('share-whatsapp-btn', function () {
      var wa = exportForWhatsApp(plan);
      if (wa && wa.whatsappUrl) {
        window.open(wa.whatsappUrl, '_blank');
      }
    });
  }

  function _populateCommentsTab(plan) {
    if (!_modalEl) return;

    var comments = getComments(plan);
    var list = _modalEl.querySelector('#share-comments-list');
    var empty = _modalEl.querySelector('#share-comments-empty');
    var countEl = _modalEl.querySelector('#share-comment-count');

    countEl.textContent = comments.length + (comments.length === 1 ? ' comentario' : ' comentarios');

    if (comments.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      list.innerHTML = comments.map(function (c, i) {
        var date = new Date(c.timestamp);
        var dateStr = date.toLocaleDateString('pt-BR') + ' ' +
          date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        var statusColor = c.status === 'resolved' ? '#4CAF50' : '#FF9500';
        var statusLabel = c.status === 'resolved' ? 'Resolvido' : 'Aberto';

        return '' +
          '<div class="share-comment-item" data-id="' + c.id + '" style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;">' +
          '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '    <div style="display:flex;align-items:center;gap:8px;">' +
          '      <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:' + statusColor + ';color:#fff;font-size:11px;font-weight:700;">' + (i + 1) + '</span>' +
          '      <span style="font-weight:600;font-size:13px;color:var(--white);">' + _escHtml(c.author) + '</span>' +
          '    </div>' +
          '    <div style="display:flex;align-items:center;gap:6px;">' +
          '      <span style="font-size:11px;color:' + statusColor + ';font-weight:600;padding:2px 8px;border-radius:10px;background:' + statusColor + '20;">' + statusLabel + '</span>' +
          '      <button class="share-comment-resolve" data-id="' + c.id + '" title="' + (c.status === 'resolved' ? 'Ja resolvido' : 'Marcar como resolvido') + '" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:2px;"' + (c.status === 'resolved' ? ' disabled' : '') + '>&#10003;</button>' +
          '      <button class="share-comment-delete" data-id="' + c.id + '" title="Excluir" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;padding:2px;">&times;</button>' +
          '    </div>' +
          '  </div>' +
          '  <p style="font-size:13px;color:var(--text);margin:0 0 4px;line-height:1.5;">' + _escHtml(c.text) + '</p>' +
          '  <span style="font-size:11px;color:var(--text-muted);">' + dateStr + ' | pos: (' + c.x.toFixed(1) + ', ' + c.y.toFixed(1) + ')</span>' +
          '</div>';
      }).join('');

      // Wire resolve/delete handlers
      list.querySelectorAll('.share-comment-resolve').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          resolveComment(plan, btn.dataset.id);
          _populateCommentsTab(plan);
          EventBus.emit('plan:changed', plan);
        });
      });
      list.querySelectorAll('.share-comment-delete').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          deleteComment(plan, btn.dataset.id);
          _populateCommentsTab(plan);
          EventBus.emit('plan:changed', plan);
        });
      });
    }

    // Add comment button
    _replaceWithHandler('share-add-comment-btn', function () {
      closeModal();
      _startCommentPlacement(plan);
    });
  }

  function _populateExportTab(plan) {
    if (!_modalEl) return;

    var _wireExport = function (id, handler) {
      var btn = _modalEl.querySelector('#' + id);
      if (!btn) return;
      var newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', handler);
      newBtn.addEventListener('mouseenter', function () {
        newBtn.style.borderColor = 'var(--border-accent)';
        newBtn.style.background = 'var(--accent-soft)';
      });
      newBtn.addEventListener('mouseleave', function () {
        newBtn.style.borderColor = 'var(--border)';
        newBtn.style.background = 'var(--bg-elevated)';
      });
    };

    _wireExport('share-export-pdf', function () {
      if (typeof PDFExport !== 'undefined') {
        PDFExport.exportPDF(plan, {
          clientName: '',
          includeComments: _modalEl.querySelector('#share-export-include-comments').checked,
          include3DViews: _modalEl.querySelector('#share-export-include-3d').checked
        });
      }
      closeModal();
    });

    _wireExport('share-export-dxf', function () {
      downloadDXF(plan);
      closeModal();
    });

    _wireExport('share-export-csv', function () {
      downloadCSV(plan);
      closeModal();
    });

    _wireExport('share-export-png', function () {
      exportPNG(plan);
      closeModal();
    });
  }

  /**
   * Enter comment-placement mode: the user clicks on the 2D editor canvas to
   * place a pin. After placement, a prompt collects the text and author.
   */
  function _startCommentPlacement(plan) {
    if (typeof App !== 'undefined' && App.setStatus) {
      App.setStatus('Clique no plano para posicionar o comentario');
    }

    var canvas = document.getElementById('editor-canvas');
    if (!canvas) return;

    var handler = function (e) {
      canvas.removeEventListener('click', handler);
      canvas.style.cursor = '';

      var rect = canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;

      // Convert screen -> world
      var worldPos;
      if (typeof Editor2D !== 'undefined') {
        var vs = Editor2D.getViewState();
        worldPos = {
          x: (sx - vs.pan.x) / vs.zoom,
          y: (sy - vs.pan.y) / vs.zoom
        };
      } else {
        worldPos = { x: sx, y: sy };
      }

      var text = prompt('Texto do comentario:');
      if (!text) {
        if (typeof App !== 'undefined' && App.setStatus) App.setStatus('');
        return;
      }

      var author = prompt('Seu nome:', 'Anonimo') || 'Anonimo';
      addComment(plan, worldPos.x, worldPos.y, text, author);
      EventBus.emit('plan:changed', plan);

      if (typeof App !== 'undefined' && App.setStatus) {
        App.setStatus('Comentario adicionado!');
        setTimeout(function () { App.setStatus(''); }, 2000);
      }

      // Reopen modal on comments tab
      openModal(plan);
      _switchTab('comments');
    };

    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('click', handler);
  }

  // ---------------------------------------------------------------------------
  // 6.5 — Viewer Mode
  // ---------------------------------------------------------------------------

  /**
   * Check if the current URL contains shared plan data.
   */
  function isViewerMode() {
    return _viewerMode;
  }

  /**
   * Decode a shared plan from the URL hash and load it in read-only mode.
   * Returns the decoded plan or null.
   */
  function loadSharedPlan() {
    var params = _parseUrlHash();
    var planJson = null;

    if (params.p) {
      // Inline base64 plan
      try {
        var json = _base64ToUtf(params.p);
        planJson = JSON.parse(json);
      } catch (e) {
        console.error('ShareManager: failed to decode inline plan', e);
        return null;
      }
    } else if (params.id) {
      // Plan stored in localStorage by share ID
      try {
        var stored = localStorage.getItem('p3d_share_' + params.id);
        if (stored) {
          planJson = JSON.parse(stored);
        } else {
          console.warn('ShareManager: shared plan not found for id', params.id);
          return null;
        }
      } catch (e) {
        console.error('ShareManager: failed to load shared plan by ID', e);
        return null;
      }
    }

    if (!planJson) return null;

    // Migrate schema if needed
    if (typeof DataModel !== 'undefined') {
      DataModel.migratePlan(planJson);
    }

    _viewerMode = true;
    _applyViewerRestrictions();

    EventBus.emit('share:viewer-loaded', planJson);
    return planJson;
  }

  /**
   * Apply read-only restrictions to the UI for viewer mode.
   */
  function _applyViewerRestrictions() {
    // Hide editing tools
    var editToolIds = [
      'tool-wall', 'tool-door', 'tool-window', 'tool-room',
      'tool-column', 'tool-stairs', 'tool-furniture', 'tool-eraser',
      'tool-note', 'tool-measure', 'tool-dimension'
    ];
    editToolIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Hide mobile edit tools
    var mobileEditIds = [
      'tool-wall-mobile', 'tool-door-mobile', 'tool-window-mobile', 'tool-eraser-mobile'
    ];
    mobileEditIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Hide state-modifying buttons
    var hideIds = ['btn-save-plan', 'btn-new-plan', 'btn-import-json', 'btn-import-dxf'];
    hideIds.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Add viewer badge
    var navCenter = document.querySelector('.nav-center');
    if (navCenter && !document.getElementById('viewer-badge')) {
      var badge = document.createElement('span');
      badge.id = 'viewer-badge';
      badge.textContent = 'VISUALIZACAO';
      badge.style.cssText = [
        'margin-left:10px', 'font-size:10px', 'font-weight:700',
        'color:var(--accent)', 'background:var(--accent-soft)',
        'padding:2px 8px', 'border-radius:var(--radius-full)',
        'border:1px solid var(--border-accent)', 'letter-spacing:0.5px'
      ].join(';');
      navCenter.appendChild(badge);
    }

    if (typeof App !== 'undefined' && App.setStatus) {
      App.setStatus('Modo visualizacao — somente leitura');
    }
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  function init() {
    // Detect viewer mode from URL on page load
    var params = _parseUrlHash();
    if (params.p || params.id) {
      _viewerMode = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  function _utfToBase64(str) {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      var bytes = new TextEncoder().encode(str);
      var binary = '';
      for (var i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
  }

  function _base64ToUtf(b64) {
    try {
      return decodeURIComponent(escape(atob(b64)));
    } catch (e) {
      var binary = atob(b64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
  }

  function _buildUrl(params) {
    var base = window.location.origin + window.location.pathname;
    var parts = [];
    for (var k in params) {
      if (params.hasOwnProperty(k)) {
        parts.push(k + '=' + encodeURIComponent(params[k]));
      }
    }
    return base + '#' + parts.join('&');
  }

  function _parseUrlHash() {
    var hash = window.location.hash.slice(1);
    if (!hash) return {};
    var result = {};
    hash.split('&').forEach(function (part) {
      var eqIdx = part.indexOf('=');
      if (eqIdx === -1) return;
      var key = part.slice(0, eqIdx);
      var val = part.slice(eqIdx + 1);
      if (key) result[key] = decodeURIComponent(val);
    });
    return result;
  }

  function _generateShareId() {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function _fallbackCopy(text) {
    try {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
      document.body.appendChild(textarea);
      textarea.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function _calcArea(vertices) {
    if (!vertices || vertices.length < 3) return 0;
    var area = 0;
    var n = vertices.length;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2);
  }

  function _escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function _rotatePoint(x, y, angle) {
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  }

  function _capture2DView(plan) {
    try {
      var edCanvas = (typeof Editor2D !== 'undefined') ? Editor2D.getCanvas() : null;
      if (!edCanvas) return null;

      var off = document.createElement('canvas');
      off.width = 1200;
      off.height = 800;
      var ctx = off.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, off.width, off.height);

      var vs = Editor2D.getViewState();
      ctx.save();
      ctx.translate(off.width / 2, off.height / 2);
      ctx.scale(vs.zoom * 0.8, vs.zoom * 0.8);
      ctx.translate(-vs.pan.x / vs.zoom, -vs.pan.y / vs.zoom);

      var tempVS = Object.assign({}, vs, {
        showGrid: false,
        selection: null,
        hoverElement: null,
        snapPoints: null
      });
      if (typeof CanvasRenderer !== 'undefined') {
        CanvasRenderer.render(ctx, off, plan, tempVS);
      }
      ctx.restore();
      return off.toDataURL('image/png');
    } catch (e) {
      console.warn('ShareManager: 2D capture failed', e);
      return null;
    }
  }

  function _replaceWithHandler(id, handler) {
    var el = _modalEl.querySelector('#' + id);
    if (!el) return;
    var newEl = el.cloneNode(true);
    el.parentNode.replaceChild(newEl, el);
    newEl.addEventListener('click', handler);
  }

  // ---------------------------------------------------------------------------
  // DXF entity helpers
  // ---------------------------------------------------------------------------

  function _dxfLine(lines, layer, x1, y1, z1, x2, y2, z2) {
    lines.push('0', 'LINE');
    lines.push('8', layer);
    lines.push('10', x1.toFixed(4));
    lines.push('20', y1.toFixed(4));
    lines.push('30', z1.toFixed(4));
    lines.push('11', x2.toFixed(4));
    lines.push('21', y2.toFixed(4));
    lines.push('31', z2.toFixed(4));
  }

  function _dxfText(lines, layer, x, y, z, text, height) {
    lines.push('0', 'TEXT');
    lines.push('8', layer);
    lines.push('10', x.toFixed(4));
    lines.push('20', y.toFixed(4));
    lines.push('30', z.toFixed(4));
    lines.push('40', (height || 0.25).toFixed(4));
    lines.push('1', text);
    lines.push('72', '1');
    lines.push('11', x.toFixed(4));
    lines.push('21', y.toFixed(4));
    lines.push('31', z.toFixed(4));
  }

  // ---------------------------------------------------------------------------
  // Minimal QR Code Encoder
  // ---------------------------------------------------------------------------
  // Generates a boolean matrix for rendering. Supports byte-mode encoding
  // with version auto-selection (1-20) and mask pattern 0.

  function _encodeQR(text) {
    var data = [];
    for (var i = 0; i < text.length; i++) {
      data.push(text.charCodeAt(i));
    }

    // Byte mode capacity (L error correction)
    var capacities = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271,
                      321, 367, 425, 458, 520, 586, 644, 718, 792, 858];
    var version = 1;
    for (var ci = 0; ci < capacities.length; ci++) {
      if (data.length <= capacities[ci]) {
        version = ci + 1;
        break;
      }
      if (ci === capacities.length - 1) version = capacities.length;
    }

    var size = 17 + version * 4;
    var matrix = [];
    for (var r = 0; r < size; r++) {
      matrix.push(new Array(size).fill(false));
    }

    // Finder patterns
    _placeFinderPattern(matrix, 0, 0);
    _placeFinderPattern(matrix, 0, size - 7);
    _placeFinderPattern(matrix, size - 7, 0);

    // Timing patterns
    for (var ti = 8; ti < size - 8; ti++) {
      matrix[6][ti] = (ti % 2 === 0);
      matrix[ti][6] = (ti % 2 === 0);
    }

    // Alignment patterns (version >= 2)
    if (version >= 2) {
      var alignPos = _getAlignmentPositions(version, size);
      for (var ai = 0; ai < alignPos.length; ai++) {
        for (var aj = 0; aj < alignPos.length; aj++) {
          var ar = alignPos[ai], ac = alignPos[aj];
          if ((ar < 9 && ac < 9) || (ar < 9 && ac > size - 9) || (ar > size - 9 && ac < 9)) continue;
          _placeAlignmentPattern(matrix, ar, ac);
        }
      }
    }

    // Build bit stream
    var bits = [];
    // Mode indicator: 0100 (byte)
    bits.push(0, 1, 0, 0);
    // Character count
    var countBits = version <= 9 ? 8 : 16;
    for (var b = countBits - 1; b >= 0; b--) {
      bits.push((data.length >> b) & 1);
    }
    // Data bytes
    data.forEach(function (byte) {
      for (var bi = 7; bi >= 0; bi--) {
        bits.push((byte >> bi) & 1);
      }
    });
    // Terminator
    for (var ti2 = 0; ti2 < 4 && bits.length < capacities[version - 1] * 8; ti2++) {
      bits.push(0);
    }

    // Fill data modules
    var reserved = _buildReservedMask(matrix, version, size);
    var bitIdx = 0;
    var goingUp = true;

    for (var col = size - 1; col >= 1; col -= 2) {
      if (col === 6) col = 5;
      var rowOrder = goingUp ? _range(size - 1, -1) : _range(0, size);
      for (var ri = 0; ri < rowOrder.length; ri++) {
        var row = rowOrder[ri];
        for (var dc = 0; dc < 2; dc++) {
          var c = col - dc;
          if (c < 0 || c >= size) continue;
          if (reserved[row][c]) continue;
          if (bitIdx < bits.length) {
            matrix[row][c] = bits[bitIdx] === 1;
          } else {
            matrix[row][c] = ((bitIdx + row + c) % 2 === 0);
          }
          bitIdx++;
        }
      }
      goingUp = !goingUp;
    }

    // Apply mask pattern 0: (row + col) % 2 == 0
    for (var mr = 0; mr < size; mr++) {
      for (var mc = 0; mc < size; mc++) {
        if (!reserved[mr][mc]) {
          if ((mr + mc) % 2 === 0) {
            matrix[mr][mc] = !matrix[mr][mc];
          }
        }
      }
    }

    // Add quiet zone (1-module border)
    var bordered = [];
    var bSize = size + 2;
    for (var br = 0; br < bSize; br++) {
      bordered.push(new Array(bSize).fill(false));
    }
    for (var cr = 0; cr < size; cr++) {
      for (var cc = 0; cc < size; cc++) {
        bordered[cr + 1][cc + 1] = matrix[cr][cc];
      }
    }

    return bordered;
  }

  function _placeFinderPattern(matrix, row, col) {
    for (var r = 0; r < 7; r++) {
      for (var c = 0; c < 7; c++) {
        var inOuter = (r === 0 || r === 6 || c === 0 || c === 6);
        var inInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        if (row + r < matrix.length && col + c < matrix.length) {
          matrix[row + r][col + c] = inOuter || inInner;
        }
      }
    }
    // Separators
    for (var si = 0; si < 8; si++) {
      if (row + 7 < matrix.length && col + si < matrix.length) matrix[row + 7][col + si] = false;
      if (row + si < matrix.length && col + 7 < matrix.length) matrix[row + si][col + 7] = false;
      if (row - 1 >= 0 && col + si < matrix.length) matrix[row - 1][col + si] = false;
      if (row + si < matrix.length && col - 1 >= 0) matrix[row + si][col - 1] = false;
    }
  }

  function _placeAlignmentPattern(matrix, row, col) {
    for (var r = -2; r <= 2; r++) {
      for (var c = -2; c <= 2; c++) {
        var tr = row + r, tc = col + c;
        if (tr < 0 || tr >= matrix.length || tc < 0 || tc >= matrix.length) continue;
        matrix[tr][tc] = (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0));
      }
    }
  }

  function _getAlignmentPositions(version, size) {
    if (version === 1) return [];
    var positions = [6];
    var last = size - 7;
    if (version <= 6) {
      positions.push(last);
    } else {
      var count = Math.floor(version / 7) + 2;
      var step = Math.ceil((last - 6) / (count - 1));
      for (var i = 1; i < count; i++) {
        positions.push(6 + i * step);
      }
      positions[positions.length - 1] = last;
    }
    return positions;
  }

  function _buildReservedMask(matrix, version, size) {
    var mask = [];
    for (var r = 0; r < size; r++) {
      mask.push(new Array(size).fill(false));
    }

    // Finder patterns + separators
    for (var fr = 0; fr < 9; fr++) {
      for (var fc = 0; fc < 9; fc++) {
        if (fr < size && fc < size) mask[fr][fc] = true;
      }
    }
    for (var tr = 0; tr < 9; tr++) {
      for (var tc = size - 8; tc < size; tc++) {
        if (tr < size && tc >= 0) mask[tr][tc] = true;
      }
    }
    for (var br = size - 8; br < size; br++) {
      for (var bc = 0; bc < 9; bc++) {
        if (br >= 0 && bc < size) mask[br][bc] = true;
      }
    }

    // Timing patterns
    for (var ti = 0; ti < size; ti++) {
      mask[6][ti] = true;
      mask[ti][6] = true;
    }

    // Alignment patterns
    if (version >= 2) {
      var alignPos = _getAlignmentPositions(version, size);
      for (var ai = 0; ai < alignPos.length; ai++) {
        for (var aj = 0; aj < alignPos.length; aj++) {
          var ar = alignPos[ai], ac = alignPos[aj];
          if ((ar < 9 && ac < 9) || (ar < 9 && ac > size - 9) || (ar > size - 9 && ac < 9)) continue;
          for (var dr = -2; dr <= 2; dr++) {
            for (var dc = -2; dc <= 2; dc++) {
              var pr = ar + dr, pc = ac + dc;
              if (pr >= 0 && pr < size && pc >= 0 && pc < size) mask[pr][pc] = true;
            }
          }
        }
      }
    }

    // Dark module
    if (size > 13) mask[size - 8][8] = true;

    return mask;
  }

  function _range(start, end) {
    var arr = [];
    if (start < end) {
      for (var i = start; i < end; i++) arr.push(i);
    } else {
      for (var i = start; i > end; i--) arr.push(i);
    }
    return arr;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    // Init
    init: init,

    // 6.1 — Share by Link
    generateShareLink: generateShareLink,
    copyToClipboard: copyToClipboard,
    generateQRCode: generateQRCode,

    // 6.2 — Comments
    addComment: addComment,
    resolveComment: resolveComment,
    deleteComment: deleteComment,
    getComments: getComments,
    renderComments: renderComments,

    // 6.3 — Export
    buildProfessionalExportData: buildProfessionalExportData,
    exportForWhatsApp: exportForWhatsApp,
    exportDXF: exportDXF,
    downloadDXF: downloadDXF,
    exportCSV: exportCSV,
    downloadCSV: downloadCSV,
    exportPNG: exportPNG,

    // 6.4 — Modal
    openModal: openModal,
    closeModal: closeModal,

    // 6.5 — Viewer Mode
    isViewerMode: isViewerMode,
    loadSharedPlan: loadSharedPlan
  };
})();

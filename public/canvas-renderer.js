/**
 * canvas-renderer.js — Pure 2D rendering functions for the editor canvas
 */
const CanvasRenderer = (() => {

  const COLORS = {
    grid: '#1a2a4e',
    gridMajor: '#2a3a5e',
    wall: '#D0C8B8',
    wallStroke: '#888888',
    door: '#8d6e63',
    doorArc: 'rgba(141,110,99,0.3)',
    window: 'rgba(100,181,246,0.5)',
    windowFrame: '#bdbdbd',
    floor: '#e8dcc8',
    selection: '#42a5f5',
    selectionFill: 'rgba(66,165,245,0.15)',
    snap: '#ff9800',
    furniture: '#8B7355',
    dimension: '#ff5722',
    measureLine: '#29b6f6',
    noteMarker: '#ff9800',
    hoverHighlight: 'rgba(66,165,245,0.25)',
    eraser: '#ef5350',
    column: '#a0a0a0',
    columnHatch: '#808080',
    stairs: '#c8b89a',
    stairsArrow: '#8d6e63',
    roomDraw: 'rgba(66,165,245,0.25)',
    roomDrawStroke: '#42a5f5'
  };

  /**
   * Clear and draw full scene
   */
  function render(ctx, canvas, plan, viewState) {
    const { pan, zoom } = viewState;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw layers in order
    if (viewState.showGrid !== false) drawGrid(ctx, pan, zoom, w, h);
    if (plan) {
      drawRooms(ctx, plan);
      drawWalls(ctx, plan);
      drawDoors(ctx, plan);
      drawWindows(ctx, plan);
      drawColumns(ctx, plan);
      drawStairs(ctx, plan);
      drawDimensions(ctx, plan);
      drawAnnotations2D(ctx, plan);
      drawFurniture(ctx, plan);
    }

    // Overlays
    if (viewState.selection) drawSelection(ctx, viewState.selection, plan);
    if (viewState.hoverElement) drawHover(ctx, viewState.hoverElement, plan);
    if (viewState.snapPoints) drawSnapPoints(ctx, viewState.snapPoints);
    if (viewState.drawingWall) drawDrawingWall(ctx, viewState.drawingWall);
    if (viewState.placingFurniture) drawPlacingFurniture(ctx, viewState.placingFurniture);
    if (viewState.drawingDimension) drawDrawingDimension(ctx, viewState.drawingDimension);
    if (viewState.drawingRoom) drawDrawingRoom(ctx, viewState.drawingRoom);
    if (viewState.placingColumn) drawPlacingColumn(ctx, viewState.placingColumn);
    if (viewState.placingStairs) drawPlacingStairs(ctx, viewState.placingStairs);

    ctx.restore();
  }

  function drawGrid(ctx, pan, zoom, canvasW, canvasH) {
    const gridSize = 0.25; // meters
    const majorEvery = 4;  // every 1m

    // Visible world range
    const left = -pan.x / zoom;
    const top = -pan.y / zoom;
    const right = (canvasW - pan.x) / zoom;
    const bottom = (canvasH - pan.y) / zoom;

    const startX = Math.floor(left / gridSize) * gridSize;
    const startY = Math.floor(top / gridSize) * gridSize;

    // Minor grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5 / zoom;
    ctx.beginPath();
    for (let x = startX; x <= right; x += gridSize) {
      const i = Math.round(x / gridSize);
      if (i % majorEvery === 0) continue;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = startY; y <= bottom; y += gridSize) {
      const i = Math.round(y / gridSize);
      if (i % majorEvery === 0) continue;
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();

    // Major grid (1m)
    ctx.strokeStyle = COLORS.gridMajor;
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    const majorSize = gridSize * majorEvery;
    const startMX = Math.floor(left / majorSize) * majorSize;
    const startMY = Math.floor(top / majorSize) * majorSize;
    for (let x = startMX; x <= right; x += majorSize) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = startMY; y <= bottom; y += majorSize) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();
  }

  function drawRooms(ctx, plan) {
    if (!plan.rooms) return;
    const now = performance.now();
    plan.rooms.forEach(room => {
      let originalAlpha = ctx.globalAlpha;
      ctx.globalAlpha = originalAlpha * getAnimationAlpha(room, now); // Apply fade-out

      if (!room.vertices || room.vertices.length < 3) {
        ctx.globalAlpha = originalAlpha; // Restore alpha before early exit
        return;
      }

      ctx.beginPath();
      ctx.moveTo(room.vertices[0].x, room.vertices[0].y);
      for (let i = 1; i < room.vertices.length; i++) {
        ctx.lineTo(room.vertices[i].x, room.vertices[i].y);
      }
      ctx.closePath();

      // Floor fill
      if (room.floorMaterial) {
        ctx.fillStyle = MaterialSystem.get2DFloorStyle(ctx, room.floorMaterial);
      } else if (room.floorColor) {
        ctx.fillStyle = room.floorColor;
      } else {
        ctx.fillStyle = COLORS.floor;
      }
      ctx.fill();

      // Room label
      if (room.name) {
        const c = room.labelPosition || centroid(room.vertices);
        ctx.fillStyle = 'rgba(224,224,224,0.8)';
        ctx.font = 'bold 0.35px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.name, c.x, c.y - 0.2);

        // Area
        const area = calcArea(room.vertices);
        ctx.font = '0.28px sans-serif';
        ctx.fillStyle = 'rgba(158,158,158,0.8)';
        ctx.fillText(area.toFixed(1) + 'm\u00B2', c.x, c.y + 0.15);
      }
      ctx.globalAlpha = originalAlpha; // Restore original alpha
    });
  }

  function drawWalls(ctx, plan) {
    if (!plan.walls) return;
    plan.walls.forEach(wall => drawWall(ctx, wall, plan));
  }

  function drawWall(ctx, wall, plan) {
    const now = performance.now();
    let originalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = originalAlpha * getAnimationAlpha(wall, now);

    const t = wall.thickness || (plan ? plan.wallThickness : 0.15) || 0.15;
    const sx = wall.start.x, sy = wall.start.y;
    const ex = wall.end.x, ey = wall.end.y;
    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) {
      ctx.globalAlpha = originalAlpha;
      return; // Restore alpha before early exit
    }

    // Normal perpendicular
    const nx = -dy / len * (t / 2);
    const ny = dx / len * (t / 2);

    // Wall rectangle corners
    ctx.beginPath();
    ctx.moveTo(sx + nx, sy + ny);
    ctx.lineTo(ex + nx, ey + ny);
    ctx.lineTo(ex - nx, ey - ny);
    ctx.lineTo(sx - nx, sy - ny);
    ctx.closePath();

    ctx.fillStyle = wall.color || COLORS.wall;
    ctx.fill();
    ctx.strokeStyle = COLORS.wallStroke;
    ctx.lineWidth = 0.02;
    ctx.stroke();
    ctx.globalAlpha = originalAlpha; // Restore original alpha
  }

  function drawDoors(ctx, plan) {
    if (!plan.doors || !plan.walls) return;
    plan.doors.forEach(door => drawDoorOnWall(ctx, door, plan));
  }

  function drawDoorOnWall(ctx, door, plan) {
    const wall = plan.walls.find(w => w.id === door.wallId);
    // If the wall is fading out, or already gone, this door also fades out.
    // Or if the door itself is marked for fade out.
    const now = performance.now();
    let originalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = originalAlpha * getAnimationAlpha(door, now);
    if (wall && wall._fadeStartTime) {
      ctx.globalAlpha = originalAlpha * getAnimationAlpha(wall, now);
    }

    if (!wall && !door._fadeStartTime) {
      ctx.globalAlpha = originalAlpha; // Restore alpha before early exit if no wall and not fading itself
      return;
    }

    const sx = wall ? wall.start.x : 0, sy = wall ? wall.start.y : 0; // Use 0 if wall is null
    const ex = wall ? wall.end.x : 0, ey = wall ? wall.end.y : 0; // Use 0 if wall is null
    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01 && !door._fadeStartTime) {
      ctx.globalAlpha = originalAlpha;
      return; // Restore alpha before early exit
    }

    const nx = dx / len, ny = dy / len;
    const t = (wall ? wall.thickness : 0) || (plan ? plan.wallThickness : 0.15) || 0.15;
    const pos = door.position || 0;
    const w = door.width || 0.9;

    // Door center
    const cx = sx + nx * (pos + w / 2);
    const cy = sy + ny * (pos + w / 2);

    // Clear wall section (draw bg color)
    const perpX = -ny * (t / 2 + 0.01);
    const perpY = nx * (t / 2 + 0.01);
    const hw = w / 2;

    ctx.fillStyle = '#0f0f1a'; // Background color for clearing
    ctx.beginPath();
    ctx.moveTo(cx - nx * hw + perpX, cy - ny * hw + perpY);
    ctx.lineTo(cx + nx * hw + perpX, cy + ny * hw + perpY);
    ctx.lineTo(cx + nx * hw - perpX, cy + ny * hw - perpY);
    ctx.lineTo(cx - nx * hw - perpX, cy - ny * hw - perpY);
    ctx.closePath();
    ctx.fill();

    // Door line
    ctx.strokeStyle = COLORS.door;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(sx + nx * pos, sy + ny * pos);
    ctx.lineTo(sx + nx * (pos + w), sy + ny * (pos + w));
    ctx.stroke();

    // Swing arc
    const startX = sx + nx * pos;
    const startY = sy + ny * pos;
    const angle = Math.atan2(ny, nx);
    ctx.strokeStyle = COLORS.doorArc;
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.arc(startX, startY, w, angle, angle + Math.PI / 2, false);
    ctx.stroke();

    ctx.globalAlpha = originalAlpha; // Restore original alpha
  }

  function drawWindows(ctx, plan) {
    if (!plan.windows || !plan.walls) return;
    plan.windows.forEach(win => drawWindowOnWall(ctx, win, plan));
  }

  function drawWindowOnWall(ctx, win, plan) {
    const wall = plan.walls.find(w => w.id === win.wallId);
    // If the wall is fading out, or already gone, this window also fades out.
    // Or if the window itself is marked for fade out.
    const now = performance.now();
    let originalAlpha = ctx.globalAlpha;
    ctx.globalAlpha = originalAlpha * getAnimationAlpha(win, now);
    if (wall && wall._fadeStartTime) {
      ctx.globalAlpha = originalAlpha * getAnimationAlpha(wall, now);
    }

    if (!wall && !win._fadeStartTime) {
      ctx.globalAlpha = originalAlpha; // Restore alpha before early exit if no wall and not fading itself
      return;
    }

    const sx = wall ? wall.start.x : 0, sy = wall ? wall.start.y : 0;
    const ex = wall ? wall.end.x : 0, ey = wall ? wall.end.y : 0;
    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01 && !win._fadeStartTime) {
      ctx.globalAlpha = originalAlpha;
      return;
    }

    const nx = dx / len, ny = dy / len;
    const t = (wall ? wall.thickness : 0) || (plan ? plan.wallThickness : 0.15) || 0.15;
    const pos = win.position || 0;
    const w = win.width || 1.2;
    const perpX = -ny * (t / 2 + 0.01);
    const perpY = nx * (t / 2 + 0.01);

    const p1x = sx + nx * pos;
    const p1y = sy + ny * pos;
    const p2x = sx + nx * (pos + w);
    const p2y = sy + ny * (pos + w);

    // Clear wall section
    ctx.fillStyle = '#0f0f1a';
    ctx.beginPath();
    ctx.moveTo(p1x + perpX, p1y + perpY);
    ctx.lineTo(p2x + perpX, p2y + perpY);
    ctx.lineTo(p2x - perpX, p2y - perpY);
    ctx.lineTo(p1x - perpX, p1y - perpY);
    ctx.closePath();
    ctx.fill();

    // Window frame (outer)
    ctx.strokeStyle = COLORS.windowFrame;
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(p1x + perpX, p1y + perpY);
    ctx.lineTo(p2x + perpX, p2y + perpY);
    ctx.lineTo(p2x - perpX, p2y - perpY);
    ctx.lineTo(p1x - perpX, p1y - perpY);
    ctx.closePath();
    ctx.stroke();

    // Glass
    ctx.fillStyle = COLORS.window;
    ctx.fill();

    // Center line
    ctx.strokeStyle = COLORS.windowFrame;
    ctx.lineWidth = 0.015;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

    ctx.globalAlpha = originalAlpha; // Restore original alpha
  }

  function drawDimensions(ctx, plan) {
    if (!plan.dimensions) return;
    const now = performance.now();
    plan.dimensions.forEach(dim => {
      let originalAlpha = ctx.globalAlpha;
      ctx.globalAlpha = originalAlpha * getAnimationAlpha(dim, now); // Apply fade-out

      const s = dim.start, e = dim.end;
      const dx = e.x - s.x, dy = e.y - s.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) {
        ctx.globalAlpha = originalAlpha;
        return; // Restore alpha before early exit
      }

      const offset = dim.offset || -0.5;
      const px = -dy / len * offset;
      const py = dx / len * offset;

      const p1 = { x: s.x + px, y: s.y + py };
      const p2 = { x: e.x + px, y: e.y + py };

      ctx.strokeStyle = COLORS.dimension;
      ctx.lineWidth = 0.02;

      // Extension lines
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(p1.x, p1.y);
      ctx.moveTo(e.x, e.y); ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Main line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Label
      const label = dim.label || len.toFixed(2) + 'm';
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      ctx.fillStyle = COLORS.dimension;
      ctx.font = '0.25px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(label, mx, my - 0.05);

      ctx.globalAlpha = originalAlpha; // Restore original alpha
    });
  }

  function drawAnnotations2D(ctx, plan) {
    if (!plan.annotations) return;
    const now = performance.now();
    plan.annotations.forEach(ann => {
      let originalAlpha = ctx.globalAlpha;
      ctx.globalAlpha = originalAlpha * getAnimationAlpha(ann, now); // Apply fade-out

      if (ann.type === 'note') {
        ctx.fillStyle = ann.color || COLORS.noteMarker;
        ctx.beginPath();
        ctx.arc(ann.position.x, ann.position.y, 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(224,224,224,0.8)';
        ctx.font = '0.22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(ann.text, ann.position.x, ann.position.y - 0.18);
      }
      if (ann.type === 'measurement') {
        ctx.strokeStyle = COLORS.measureLine;
        ctx.lineWidth = 0.03;
        ctx.beginPath();
        ctx.moveTo(ann.start.x, ann.start.y);
        ctx.lineTo(ann.end.x, ann.end.y);
        ctx.stroke();

        // Endpoints
        [ann.start, ann.end].forEach(p => {
          ctx.fillStyle = COLORS.measureLine;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 0.06, 0, Math.PI * 2);
          ctx.fill();
        });

        // Label
        const mx = (ann.start.x + ann.end.x) / 2;
        const my = (ann.start.y + ann.end.y) / 2;
        ctx.fillStyle = COLORS.measureLine;
        ctx.font = 'bold 0.25px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(ann.value + (ann.unit || 'm'), mx, my - 0.1);
      }
      ctx.globalAlpha = originalAlpha; // Restore original alpha
    });
  }

  function drawFurniture(ctx, plan) {
    if (!plan.furniture) return;
    const now = performance.now();
    plan.furniture.forEach(f => {
      const item = FurnitureCatalog.getItem(f.catalogId);
      if (!item) return;
      const w = item.width * (f.scale ? f.scale.x : 1);
      const d = item.depth * (f.scale ? f.scale.z || f.scale.y : 1);

      let originalAlpha = ctx.globalAlpha;
      ctx.globalAlpha = originalAlpha * getAnimationAlpha(f, now); // Apply fade-in or fade-out

      ctx.save();
      ctx.translate(f.position.x, f.position.y);

      let currentRotation = f.rotation || 0;
      if (f._rotationAnimationStartTime && (now - f._rotationAnimationStartTime < f._rotationAnimationDuration)) {
        const elapsed = now - f._rotationAnimationStartTime;
        const progress = Math.min(1, elapsed / f._rotationAnimationDuration);
        currentRotation = f._startRotation + (f._targetRotation - f._startRotation) * progress;
        dirty = true; // Ensure render loop continues for animation
      } else if (f._rotationAnimationStartTime) {
        // Animation finished, set final rotation and clean up
        currentRotation = f._targetRotation;
        f.rotation = f._targetRotation; // Persist the final rotation
        delete f._startRotation;
        delete f._targetRotation;
        delete f._rotationAnimationStartTime;
        delete f._rotationAnimationDuration;
      }

      ctx.rotate(currentRotation);

      FurnitureIcons.draw(ctx, f.catalogId, 0, 0, w, d, 0, f.color || item.color); // Draw at 0,0 since we translated
      ctx.restore();
      ctx.globalAlpha = originalAlpha; // Restore original alpha
    });
  }

  function drawSelection(ctx, selection, plan) {
    if (!selection || !selection.type) return;
    const el = selection.element;

    ctx.strokeStyle = COLORS.selection; // Primary selection color
    ctx.lineWidth = 0.08; // Make selection border more prominent
    ctx.setLineDash([0.1, 0.06]);

    // Draw selection outline based on element type
    if (selection.type === 'wall') {
      const t = el.thickness || (plan ? plan.wallThickness : 0.15) || 0.15;
      drawWallOutline(ctx, el, t);
    } else if (selection.type === 'furniture') {
      const item = FurnitureCatalog.getItem(el.catalogId);
      if (item) {
        const w = item.width * (el.scale ? el.scale.x : 1);
        const d = item.depth * (el.scale ? el.scale.z || el.scale.y : 1);
        ctx.save();
        ctx.translate(el.position.x, el.position.y);
        if (el.rotation) ctx.rotate(el.rotation);
        
        // Solid background for clarity
        ctx.fillStyle = COLORS.selectionFill;
        ctx.fillRect(-w / 2, -d / 2, w, d);

        // Main selection stroke (dashed)
        ctx.strokeRect(-w / 2, -d / 2, w, d);
        ctx.restore();
        drawSelectionHandles(ctx, el, w, d);
      }
    } else if (selection.type === 'room') {
      if (el.vertices && el.vertices.length >= 3) {
        ctx.fillStyle = COLORS.selectionFill;
        ctx.beginPath();
        ctx.moveTo(el.vertices[0].x, el.vertices[0].y);
        for (let i = 1; i < el.vertices.length; i++) {
          ctx.lineTo(el.vertices[i].x, el.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (selection.type === 'column') {
      // Draw a solid background and then the dashed stroke
      ctx.strokeStyle = COLORS.selection; // Keep the color
      ctx.lineWidth = 0.04; // Thinner for inner stroke
      drawColumnSelection(ctx, el); // This draws the dashed line
    } else if (selection.type === 'stairs') {
      ctx.strokeStyle = COLORS.selection; // Keep the color
      ctx.lineWidth = 0.04; // Thinner for inner stroke
      drawStairsSelection(ctx, el); // This draws the dashed line
    } else if (selection.type === 'dimension') {
      const s = el.start, e = el.end;
      ctx.fillStyle = COLORS.dimension;
      ctx.beginPath(); ctx.arc(s.x, s.y, 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x, e.y, 0.08, 0, Math.PI * 2); ctx.fill();
    }

    ctx.setLineDash([]);
  }

  function drawWallOutline(ctx, wall, thickness) {
    const sx = wall.start.x, sy = wall.start.y;
    const ex = wall.end.x, ey = wall.end.y;
    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;
    const nx = -dy / len * (thickness / 2 + 0.02);
    const ny = dx / len * (thickness / 2 + 0.02);

    ctx.beginPath();
    ctx.moveTo(sx + nx, sy + ny);
    ctx.lineTo(ex + nx, ey + ny);
    ctx.lineTo(ex - nx, ey - ny);
    ctx.lineTo(sx - nx, sy - ny);
    ctx.closePath();
    ctx.stroke();
  }

  function drawSelectionHandles(ctx, el, w, d) {
    const handleSize = 0.08;
    ctx.fillStyle = COLORS.selection;
    ctx.save();
    ctx.translate(el.position.x, el.position.y);
    if (el.rotation) ctx.rotate(el.rotation);

    // 4 corner handles
    [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].forEach(([hx, hy]) => {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    });

    // Rotation handle
    ctx.beginPath();
    ctx.arc(0, -d / 2 - 0.2, handleSize * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHover(ctx, hoverElement, plan) {
    if (!hoverElement) return;
    ctx.fillStyle = COLORS.hoverHighlight;
    ctx.strokeStyle = COLORS.selection;
    ctx.lineWidth = 0.02;
    ctx.setLineDash([]);

    if (hoverElement.type === 'wall') {
      const wall = hoverElement.element;
      const t = wall.thickness || (plan ? plan.wallThickness : 0.15) || 0.15;
      const sx = wall.start.x, sy = wall.start.y;
      const ex = wall.end.x, ey = wall.end.y;
      const dx = ex - sx, dy = ey - sy;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) return;
      const nx = -dy / len * (t / 2);
      const ny = dx / len * (t / 2);

      ctx.beginPath();
      ctx.moveTo(sx + nx, sy + ny);
      ctx.lineTo(ex + nx, ey + ny);
      ctx.lineTo(ex - nx, ey - ny);
      ctx.lineTo(sx - nx, sy - ny);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSnapPoints(ctx, points) {
    if (!points || points.length === 0) return;
    const now = performance.now();

    ctx.strokeStyle = COLORS.snap;
    ctx.lineWidth = 0.02;
    ctx.setLineDash([0.05, 0.03]); // Dashed lines for guides

    points.forEach(p => {
      // Draw extended snap lines (horizontal and vertical)
      ctx.beginPath();
      ctx.moveTo(p.x, -1000); ctx.lineTo(p.x, 1000); // Vertical guide
      ctx.moveTo(-1000, p.y); ctx.lineTo(1000, p.y); // Horizontal guide
      ctx.stroke();

      // Draw the snap point marker (circle and cross)
      ctx.fillStyle = COLORS.snap;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.snap;
      ctx.lineWidth = 0.02;
      ctx.beginPath();
      ctx.moveTo(p.x - 0.1, p.y);
      ctx.lineTo(p.x + 0.1, p.y);
      ctx.moveTo(p.x, p.y - 0.1);
      ctx.lineTo(p.x, p.y + 0.1);
      ctx.stroke();
    });

    ctx.setLineDash([]); // Reset line dash
  }

  function drawDrawingWall(ctx, drawingWall) {
    const { start, end, thickness } = drawingWall;
    if (!start || !end) return;

    const t = thickness || 0.15;
    const dx = end.x - start.x, dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;

    const nx = -dy / len * (t / 2);
    const ny = dx / len * (t / 2);

    ctx.fillStyle = 'rgba(208,200,184,0.5)';
    ctx.strokeStyle = COLORS.selection;
    ctx.lineWidth = 0.02;
    ctx.setLineDash([0.08, 0.04]);
    ctx.beginPath();
    ctx.moveTo(start.x + nx, start.y + ny);
    ctx.lineTo(end.x + nx, end.y + ny);
    ctx.lineTo(end.x - nx, end.y - ny);
    ctx.lineTo(start.x - nx, start.y - ny);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Length label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 0.25px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    ctx.fillText(len.toFixed(2) + 'm', mx, my - t);
  }

  function drawPlacingFurniture(ctx, placing) {
    if (!placing.catalogId || !placing.position) return;
    const item = FurnitureCatalog.getItem(placing.catalogId);
    if (!item) return;

    ctx.globalAlpha = 0.6;
    FurnitureIcons.draw(ctx, placing.catalogId, placing.position.x, placing.position.y,
      item.width, item.depth, placing.rotation || 0, item.color);
    ctx.globalAlpha = 1;
  }

  function drawColumns(ctx, plan) {
    if (!plan.columns) return;
    const now = performance.now();
    plan.columns.forEach(col => {
      let originalAlpha = ctx.globalAlpha;
      ctx.globalAlpha = originalAlpha * getAnimationAlpha(col, now); // Apply fade-out

      const s = col.size || 0.3;
      const x = col.position.x, y = col.position.y;

      if (col.shape === 'circular') {
        ctx.fillStyle = COLORS.column;
        ctx.beginPath();
        ctx.arc(x, y, s / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.columnHatch;
        ctx.lineWidth = 0.02;
        ctx.stroke();
        // Hatching (X pattern)
        ctx.beginPath();
        const r = s / 2 * 0.7;
        ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r);
        ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r);
        ctx.stroke();
      } else {
        // Square column
        ctx.fillStyle = COLORS.column;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.strokeStyle = COLORS.columnHatch;
        ctx.lineWidth = 0.02;
        ctx.strokeRect(x - s / 2, y - s / 2, s, s);
        // Hatching (diagonal lines)
        ctx.beginPath();
        const step = 0.08;
        for (let d = -s; d <= s; d += step) {
          const x1 = Math.max(x - s / 2, x - s / 2 + d);
          const y1 = Math.max(y - s / 2, y - s / 2 - d);
          const x2 = Math.min(x + s / 2, x + s / 2 + d);
          const y2 = Math.min(y + s / 2, y + s / 2 - d);
          if (x1 <= x + s / 2 && x2 >= x - s / 2) {
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = originalAlpha; // Restore original alpha
    });
  }

  function drawStairs(ctx, plan) {
    if (!plan.stairs) return;
    const now = performance.now();
    plan.stairs.forEach(stair => {
      let originalAlpha = ctx.globalAlpha;
      ctx.globalAlpha = originalAlpha * getAnimationAlpha(stair, now); // Apply fade-out

      const w = stair.width || 1.0;
      const d = stair.depth || 2.5;
      const steps = stair.steps || 12;
      const x = stair.position.x, y = stair.position.y;
      const rot = stair.rotation || 0;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);

      // Outline
      ctx.fillStyle = COLORS.stairs;
      ctx.fillRect(-w / 2, -d / 2, w, d);
      ctx.strokeStyle = COLORS.stairsArrow;
      ctx.lineWidth = 0.02;
      ctx.strokeRect(-w / 2, -d / 2, w, d);

      // Step lines
      ctx.beginPath();
      for (let i = 1; i < steps; i++) {
        const sy = -d / 2 + i * stepDepth;
        ctx.moveTo(-w / 2, sy);
        ctx.lineTo(w / 2, sy);
      }
      ctx.stroke();

      // Direction arrow
      ctx.strokeStyle = COLORS.stairsArrow;
      ctx.lineWidth = 0.04;
      ctx.beginPath();
      ctx.moveTo(0, d / 4);
      ctx.lineTo(0, -d / 4);
      ctx.lineTo(-w / 6, -d / 6);
      ctx.moveTo(0, -d / 4);
      ctx.lineTo(w / 6, -d / 6);
      ctx.stroke();

      ctx.restore();
      ctx.globalAlpha = originalAlpha; // Restore original alpha
    });
  }

  function drawDrawingDimension(ctx, drawing) {
    if (!drawing.start) return;
    const s = drawing.start;
    const e = drawing.end || s;
    const dx = e.x - s.x, dy = e.y - s.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    ctx.strokeStyle = COLORS.dimension;
    ctx.lineWidth = 0.02;
    ctx.setLineDash([0.06, 0.04]);

    if (len > 0.01) {
      const offset = -0.5;
      const px = -dy / len * offset, py = dx / len * offset;
      const p1 = { x: s.x + px, y: s.y + py };
      const p2 = { x: e.x + px, y: e.y + py };

      // Extension lines
      ctx.beginPath();
      ctx.moveTo(s.x, s.y); ctx.lineTo(p1.x, p1.y);
      ctx.moveTo(e.x, e.y); ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Main line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Label
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      ctx.fillStyle = COLORS.dimension;
      ctx.font = 'bold 0.25px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(len.toFixed(2) + 'm', mx, my - 0.05);
    }

    ctx.setLineDash([]);

    // Start point marker
    ctx.fillStyle = COLORS.dimension;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 0.06, 0, Math.PI * 2);
    ctx.fill();
    if (drawing.end) {
      ctx.beginPath();
      ctx.arc(e.x, e.y, 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDrawingRoom(ctx, drawing) {
    if (!drawing.vertices || drawing.vertices.length === 0) return;

    ctx.fillStyle = COLORS.roomDraw;
    ctx.strokeStyle = COLORS.roomDrawStroke;
    ctx.lineWidth = 0.03;
    ctx.setLineDash([0.08, 0.04]);

    ctx.beginPath();
    ctx.moveTo(drawing.vertices[0].x, drawing.vertices[0].y);
    for (let i = 1; i < drawing.vertices.length; i++) {
      ctx.lineTo(drawing.vertices[i].x, drawing.vertices[i].y);
    }
    if (drawing.currentPoint) {
      ctx.lineTo(drawing.currentPoint.x, drawing.currentPoint.y);
    }
    if (drawing.vertices.length >= 3) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertex markers
    drawing.vertices.forEach((v, i) => {
      ctx.fillStyle = i === 0 ? '#66bb6a' : COLORS.roomDrawStroke;
      ctx.beginPath();
      ctx.arc(v.x, v.y, 0.06, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawPlacingColumn(ctx, placing) {
    if (!placing.position) return;
    const s = placing.size || 0.3;
    const x = placing.position.x, y = placing.position.y;

    ctx.globalAlpha = 0.6;
    if (placing.shape === 'circular') {
      ctx.fillStyle = COLORS.column;
      ctx.beginPath();
      ctx.arc(x, y, s / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.columnHatch;
      ctx.lineWidth = 0.02;
      ctx.stroke();
    } else {
      ctx.fillStyle = COLORS.column;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      ctx.strokeStyle = COLORS.columnHatch;
      ctx.lineWidth = 0.02;
      ctx.strokeRect(x - s / 2, y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlacingStairs(ctx, placing) {
    if (!placing.position) return;
    const w = placing.width || 1.0;
    const d = placing.depth || 2.5;
    const steps = placing.steps || 12;
    const x = placing.position.x, y = placing.position.y;
    const rot = placing.rotation || 0;

    ctx.globalAlpha = 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    ctx.fillStyle = COLORS.stairs;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    ctx.strokeStyle = COLORS.stairsArrow;
    ctx.lineWidth = 0.02;
    ctx.strokeRect(-w / 2, -d / 2, w, d);

    const stepDepth = d / steps;
    ctx.beginPath();
    for (let i = 1; i < steps; i++) {
      const sy = -d / 2 + i * stepDepth;
      ctx.moveTo(-w / 2, sy);
      ctx.lineTo(w / 2, sy);
    }
    ctx.stroke();

    // Arrow
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(0, d / 4); ctx.lineTo(0, -d / 4);
    ctx.lineTo(-w / 6, -d / 6);
    ctx.moveTo(0, -d / 4); ctx.lineTo(w / 6, -d / 6);
    ctx.stroke();

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Selection drawing for new types
  function drawColumnSelection(ctx, col) {
    const s = col.size || 0.3;
    const x = col.position.x, y = col.position.y;

    // Draw solid background for column selection
    ctx.fillStyle = COLORS.selectionFill;
    if (col.shape === 'circular') {
      ctx.beginPath();
      ctx.arc(x, y, s / 2 + 0.06, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(x - s / 2 - 0.06, y - s / 2 - 0.06, s + 0.12, s + 0.12);
    }

    // Draw main dashed selection stroke
    ctx.strokeStyle = COLORS.selection;
    ctx.lineWidth = 0.08; // Match main selection width
    ctx.setLineDash([0.1, 0.06]);
    if (col.shape === 'circular') {
      ctx.beginPath();
      ctx.arc(x, y, s / 2 + 0.04, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(x - s / 2 - 0.04, y - s / 2 - 0.04, s + 0.08, s + 0.08);
    }
    ctx.setLineDash([]);
  }

  function drawStairsSelection(ctx, stair) {
    const w = stair.width || 1.0;
    const d = stair.depth || 2.5;
    ctx.save();
    ctx.translate(stair.position.x, stair.position.y);
    ctx.rotate(stair.rotation || 0);

    // Draw solid background for stairs selection
    ctx.fillStyle = COLORS.selectionFill;
    ctx.fillRect(-w / 2 - 0.06, -d / 2 - 0.06, w + 0.12, d + 0.12);

    // Draw main dashed selection stroke
    ctx.strokeStyle = COLORS.selection;
    ctx.lineWidth = 0.08; // Match main selection width
    ctx.setLineDash([0.1, 0.06]);
    ctx.strokeRect(-w / 2 - 0.04, -d / 2 - 0.04, w + 0.08, d + 0.08);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Helpers
  function centroid(vertices) {
    let cx = 0, cy = 0;
    vertices.forEach(v => { cx += v.x; cy += v.y; });
    return { x: cx / vertices.length, y: cy / vertices.length };
  }

  function calcArea(vertices) {
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2);
  }

  // Helper for animation alpha
  function getAnimationAlpha(element, now) {
    if (element._animationStartTime && (now - element._animationStartTime < element._animationDuration)) {
      const elapsed = now - element._animationStartTime;
      return Math.min(1, elapsed / element._animationDuration);
    }
    if (element._fadeStartTime && (now - element._fadeStartTime < element._animationDuration)) {
      const elapsed = now - element._fadeStartTime;
      return Math.max(0, 1 - (elapsed / element._animationDuration));
    }
    return 1; // Not animating
  }

  return { render, drawGrid, drawWall, drawRooms, drawColumns, drawStairs, COLORS };
})();

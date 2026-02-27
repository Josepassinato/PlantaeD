/**
 * hit-testing.js — Find elements at screen/world coordinates
 */
const HitTesting = (() => {

  /** Distance from point to line segment */
  function pointToSegmentDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay));

    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
  }

  /** Get position parameter along wall (0..wallLength) for the closest point */
  function positionOnWall(px, py, wall) {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    let t = ((px - wall.start.x) * dx + (py - wall.start.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return t * Math.sqrt(lenSq);
  }

  /** Find wall at world point, with tolerance */
  function findWallAt(x, y, plan, tolerance) {
    if (!plan || !plan.walls) return null;
    tolerance = tolerance || 0.3;

    let best = null;
    let bestDist = tolerance;

    plan.walls.forEach(wall => {
      const d = pointToSegmentDist(x, y, wall.start.x, wall.start.y, wall.end.x, wall.end.y);
      if (d < bestDist) {
        bestDist = d;
        best = wall;
      }
    });

    return best;
  }

  /** Find door at world point */
  function findDoorAt(x, y, plan, tolerance) {
    if (!plan || !plan.doors || !plan.walls) return null;
    tolerance = tolerance || 0.3;

    for (let i = 0; i < plan.doors.length; i++) {
      const door = plan.doors[i];
      const wall = plan.walls.find(w => w.id === door.wallId);
      if (!wall) continue;

      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) continue;

      const nx = dx / len, ny = dy / len;
      const pos = door.position || 0;
      const w = door.width || 0.9;
      const cx = wall.start.x + nx * (pos + w / 2);
      const cy = wall.start.y + ny * (pos + w / 2);
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (dist < tolerance + w / 2) return door;
    }
    return null;
  }

  /** Find window at world point */
  function findWindowAt(x, y, plan, tolerance) {
    if (!plan || !plan.windows || !plan.walls) return null;
    tolerance = tolerance || 0.3;

    for (let i = 0; i < plan.windows.length; i++) {
      const win = plan.windows[i];
      const wall = plan.walls.find(w => w.id === win.wallId);
      if (!wall) continue;

      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) continue;

      const nx = dx / len, ny = dy / len;
      const pos = win.position || 0;
      const w = win.width || 1.2;
      const cx = wall.start.x + nx * (pos + w / 2);
      const cy = wall.start.y + ny * (pos + w / 2);
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (dist < tolerance + w / 2) return win;
    }
    return null;
  }

  /** Find furniture item at world point */
  function findFurnitureAt(x, y, plan, tolerance) {
    if (!plan || !plan.furniture) return null;
    tolerance = tolerance || 0.2;

    for (let i = plan.furniture.length - 1; i >= 0; i--) {
      const f = plan.furniture[i];
      const cat = typeof FurnitureCatalog !== 'undefined' ? FurnitureCatalog.getItem(f.catalogId) : null;
      const hw = ((cat ? cat.width : 0.8) * (f.scale ? f.scale.x : 1)) / 2;
      const hd = ((cat ? cat.depth : 0.8) * (f.scale ? f.scale.z || f.scale.y : 1)) / 2;

      // Rotate point into furniture local space
      const cos = Math.cos(-f.rotation || 0);
      const sin = Math.sin(-f.rotation || 0);
      const lx = (x - f.position.x) * cos - (y - f.position.y) * sin;
      const ly = (x - f.position.x) * sin + (y - f.position.y) * cos;

      if (Math.abs(lx) < hw + tolerance && Math.abs(ly) < hd + tolerance) {
        return f;
      }
    }
    return null;
  }

  /** Find room at world point (point-in-polygon) */
  function findRoomAt(x, y, plan) {
    if (!plan || !plan.rooms) return null;

    for (let i = 0; i < plan.rooms.length; i++) {
      const room = plan.rooms[i];
      if (room.vertices && pointInPolygon(x, y, room.vertices)) {
        return room;
      }
    }
    return null;
  }

  /** Ray-casting point-in-polygon */
  function pointInPolygon(px, py, vertices) {
    let inside = false;
    const n = vertices.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = vertices[i].x, yi = vertices[i].y;
      const xj = vertices[j].x, yj = vertices[j].y;
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /** Find column at world point */
  function findColumnAt(x, y, plan, tolerance) {
    if (!plan || !plan.columns) return null;
    tolerance = tolerance || 0.3;

    for (let i = plan.columns.length - 1; i >= 0; i--) {
      const col = plan.columns[i];
      const size = col.size || 0.3;
      const dist = Math.sqrt((x - col.position.x) * (x - col.position.x) + (y - col.position.y) * (y - col.position.y));
      if (dist < size / 2 + tolerance) return col;
    }
    return null;
  }

  /** Find stairs at world point */
  function findStairsAt(x, y, plan, tolerance) {
    if (!plan || !plan.stairs) return null;
    tolerance = tolerance || 0.2;

    for (let i = plan.stairs.length - 1; i >= 0; i--) {
      const stair = plan.stairs[i];
      const w = stair.width || 1.0;
      const d = stair.depth || 2.5;
      const cos = Math.cos(-(stair.rotation || 0));
      const sin = Math.sin(-(stair.rotation || 0));
      const lx = (x - stair.position.x) * cos - (y - stair.position.y) * sin;
      const ly = (x - stair.position.x) * sin + (y - stair.position.y) * cos;
      if (Math.abs(lx) < w / 2 + tolerance && Math.abs(ly) < d / 2 + tolerance) return stair;
    }
    return null;
  }

  /** Find dimension at world point */
  function findDimensionAt(x, y, plan, tolerance) {
    if (!plan || !plan.dimensions) return null;
    tolerance = tolerance || 0.3;

    for (let i = 0; i < plan.dimensions.length; i++) {
      const dim = plan.dimensions[i];
      const offset = dim.offset || -0.5;
      const dx = dim.end.x - dim.start.x, dy = dim.end.y - dim.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.01) continue;
      const px = -dy / len * offset, py = dx / len * offset;
      const p1x = dim.start.x + px, p1y = dim.start.y + py;
      const p2x = dim.end.x + px, p2y = dim.end.y + py;
      const d = pointToSegmentDist(x, y, p1x, p1y, p2x, p2y);
      if (d < tolerance) return dim;
    }
    return null;
  }

  /** Find any element at point, returns {type, element} */
  function findElementAt(x, y, plan, tolerance) {
    // Check in reverse priority: furniture > column > stairs > door > window > dimension > wall > room
    const furn = findFurnitureAt(x, y, plan, tolerance);
    if (furn) return { type: 'furniture', element: furn };

    const col = findColumnAt(x, y, plan, tolerance);
    if (col) return { type: 'column', element: col };

    const stair = findStairsAt(x, y, plan, tolerance);
    if (stair) return { type: 'stairs', element: stair };

    const door = findDoorAt(x, y, plan, tolerance);
    if (door) return { type: 'door', element: door };

    const win = findWindowAt(x, y, plan, tolerance);
    if (win) return { type: 'window', element: win };

    const dim = findDimensionAt(x, y, plan, tolerance);
    if (dim) return { type: 'dimension', element: dim };

    const wall = findWallAt(x, y, plan, tolerance);
    if (wall) return { type: 'wall', element: wall };

    const room = findRoomAt(x, y, plan);
    if (room) return { type: 'room', element: room };

    return null;
  }

  return {
    pointToSegmentDist, positionOnWall,
    findWallAt, findDoorAt, findWindowAt, findFurnitureAt, findRoomAt,
    findColumnAt, findStairsAt, findDimensionAt,
    findElementAt, pointInPolygon
  };
})();

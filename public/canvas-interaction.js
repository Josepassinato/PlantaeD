/**
 * canvas-interaction.js — Coordinate transforms, snapping utilities
 */
const CanvasInteraction = (() => {
  const GRID_SIZE = 0.25;       // meters
  const SNAP_THRESHOLD = 0.15;  // meters (world space)
  const ANGLE_SNAP = 15;        // degrees
  const MAGNETIC_THRESHOLD = 0.3; // meters for wall endpoint snapping

  /** Convert screen pixel coords to world coords given a 2D canvas context */
  function screenToWorld(screenX, screenY, pan, zoom) {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom
    };
  }

  /** Convert world coords to screen pixel coords */
  function worldToScreen(worldX, worldY, pan, zoom) {
    return {
      x: worldX * zoom + pan.x,
      y: worldY * zoom + pan.y
    };
  }

  /** Snap to grid */
  function snap(value, gridSize) {
    const g = gridSize || GRID_SIZE;
    return Math.round(value / g) * g;
  }

  /** Snap a point to grid */
  function snapPoint(x, y, gridSize) {
    return {
      x: snap(x, gridSize),
      y: snap(y, gridSize)
    };
  }

  /** Magnetic snap: snap to nearby wall endpoints */
  function magneticSnap(point, walls, threshold) {
    const t = threshold || MAGNETIC_THRESHOLD;
    let best = null;
    let bestDist = t;

    walls.forEach(wall => {
      [wall.start, wall.end].forEach(ep => {
        const dx = point.x - ep.x;
        const dy = point.y - ep.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) {
          bestDist = d;
          best = { x: ep.x, y: ep.y };
        }
      });
    });

    return best || snapPoint(point.x, point.y);
  }

  /** Snap angle to nearest increment */
  function angleSnap(angle, increment) {
    const inc = (increment || ANGLE_SNAP) * Math.PI / 180;
    return Math.round(angle / inc) * inc;
  }

  /** Constrain a line to horizontal/vertical/45deg from start */
  function constrainLine(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    const len = Math.sqrt(dx * dx + dy * dy);

    // Snap to 0, 45, 90, 135, 180, etc.
    const snappedAngle = angleSnap(angle);
    return {
      x: startX + Math.cos(snappedAngle) * len,
      y: startY + Math.sin(snappedAngle) * len
    };
  }

  /** Distance between two points */
  function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  return {
    screenToWorld, worldToScreen, snap, snapPoint, magneticSnap,
    angleSnap, constrainLine, distance,
    GRID_SIZE, SNAP_THRESHOLD, ANGLE_SNAP, MAGNETIC_THRESHOLD
  };
})();

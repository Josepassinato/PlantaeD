/**
 * floor-plan.js — Wall/room/door/window/dimension/furniture geometry builders
 * Coordinate convention: JSON {x, y} -> Three.js {x, 0, z}
 */
const FloorPlan = (() => {

  function buildAll(plan) {
    const groups = ThreeScene.getGroups();
    const mats = ThreeScene.getMaterials();

    ThreeScene.clearGroups();

    // Floors
    if (plan.rooms) plan.rooms.forEach(room => buildRoomFloor(room, groups, mats));
    // Walls
    if (plan.walls) plan.walls.forEach(wall => buildWallMesh(wall, plan, groups, mats));
    // Doors
    if (plan.doors) plan.doors.forEach(door => buildDoorMesh(door, plan, groups, mats));
    // Windows
    if (plan.windows) plan.windows.forEach(win => buildWindowMesh(win, plan, groups, mats));
    // Furniture
    if (plan.furniture) plan.furniture.forEach(furn => buildFurniture(furn, groups));
    // Columns
    if (plan.columns) plan.columns.forEach(col => buildColumnMesh(col, plan, groups, mats));
    // Stairs
    if (plan.stairs) plan.stairs.forEach(stair => buildStairsMesh(stair, plan, groups, mats));
    // Dimensions
    if (plan.dimensions) plan.dimensions.forEach(dim => buildDimensionLine(dim, groups, mats));
    // Annotations
    if (plan.annotations) plan.annotations.forEach(ann => {
      Annotations.buildAnnotation3D(ann);
    });
  }

  function buildWallMesh(wall, plan, groups, mats) {
    const sx = wall.start.x, sz = wall.start.y;
    const ex = wall.end.x, ez = wall.end.y;
    const h = wall.height || plan.floorHeight || 2.8;
    const t = wall.thickness || plan.wallThickness || 0.15;

    const dx = ex - sx;
    const dz = ez - sz;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return;

    const angle = Math.atan2(dz, dx);

    const geo = new THREE.BoxGeometry(len, h, t);

    // Material-aware: use wall color/texture if set
    let mat;
    if (wall.color && typeof MaterialSystem !== 'undefined') {
      mat = MaterialSystem.createThreeWallMaterial(wall.color);
    } else {
      mat = mats.wall.clone();
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      sx + dx / 2,
      h / 2,
      sz + dz / 2
    );
    mesh.rotation.y = -angle;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'wall', id: wall.id };

    // Edge lines
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, mats.wallEdge);
    mesh.add(line);

    groups.walls.add(mesh);
  }

  function buildRoomFloor(room, groups, mats) {
    if (!room.vertices || room.vertices.length < 3) return;

    const shape = new THREE.Shape();
    shape.moveTo(room.vertices[0].x, room.vertices[0].y);
    for (let i = 1; i < room.vertices.length; i++) {
      shape.lineTo(room.vertices[i].x, room.vertices[i].y);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape);

    // Material-aware floor
    let mat;
    if (room.floorMaterial && typeof MaterialSystem !== 'undefined') {
      mat = MaterialSystem.createThreeFloorMaterial(room.floorMaterial);
    } else {
      mat = mats.floor.clone();
      if (room.floorColor) mat.color.set(room.floorColor);
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.005; // slight offset above grid
    mesh.receiveShadow = true;
    mesh.userData = { type: 'room', id: room.id };

    groups.floors.add(mesh);

    // Room label
    if (room.name) {
      const area = calcArea(room.vertices);
      const label = `${room.name}\n${area.toFixed(1)}m\u00B2`;
      const lp = room.labelPosition || centroid(room.vertices);
      const sprite = createLabelSprite(label, 0.8);
      sprite.position.set(lp.x, 0.1, lp.y);
      sprite.userData = { type: 'label', roomId: room.id };
      groups.labels.add(sprite);
    }
  }

  function buildDoorMesh(door, plan, groups, mats) {
    const wall = plan.walls.find(w => w.id === door.wallId);
    if (!wall) return;

    const sx = wall.start.x, sz = wall.start.y;
    const ex = wall.end.x, ez = wall.end.y;
    const dx = ex - sx, dz = ez - sz;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return;

    const nx = dx / len, nz = dz / len;
    const angle = Math.atan2(dz, dx);
    const pos = door.position || 0;
    const w = door.width || 0.9;
    const h = door.height || 2.1;
    const t = (wall.thickness || plan.wallThickness || 0.15) + 0.02;

    // Door panel
    const doorGeo = new THREE.BoxGeometry(w, h, 0.04);
    const doorMesh = new THREE.Mesh(doorGeo, mats.door);
    doorMesh.position.set(
      sx + nx * (pos + w / 2),
      h / 2,
      sz + nz * (pos + w / 2)
    );
    doorMesh.rotation.y = -angle;
    doorMesh.castShadow = true;
    doorMesh.userData = { type: 'door', id: door.id };

    // Frame
    const frameGeo = new THREE.BoxGeometry(w + 0.06, h + 0.03, t);
    const frameMesh = new THREE.Mesh(frameGeo, mats.doorFrame);
    frameMesh.position.copy(doorMesh.position);
    frameMesh.position.y = h / 2;
    frameMesh.rotation.y = -angle;

    // Cut-out: make wall behind transparent by overlaying a dark box
    const cutGeo = new THREE.BoxGeometry(w, h, t + 0.01);
    const cutMat = new THREE.MeshBasicMaterial({ color: 0x0f0f1a });
    const cutMesh = new THREE.Mesh(cutGeo, cutMat);
    cutMesh.position.copy(doorMesh.position);
    cutMesh.position.y = h / 2;
    cutMesh.rotation.y = -angle;

    groups.doors.add(cutMesh);
    groups.doors.add(frameMesh);
    groups.doors.add(doorMesh);

    // Swing arc
    const arcGeo = new THREE.RingGeometry(0.1, w, 16, 1, 0, Math.PI / 2);
    const arcMat = new THREE.MeshBasicMaterial({ color: 0x8d6e63, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.rotation.x = -Math.PI / 2;
    arcMesh.position.set(
      sx + nx * pos,
      0.02,
      sz + nz * pos
    );
    arcMesh.rotation.z = angle;
    groups.doors.add(arcMesh);
  }

  function buildWindowMesh(win, plan, groups, mats) {
    const wall = plan.walls.find(w => w.id === win.wallId);
    if (!wall) return;

    const sx = wall.start.x, sz = wall.start.y;
    const ex = wall.end.x, ez = wall.end.y;
    const dx = ex - sx, dz = ez - sz;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return;

    const nx = dx / len, nz = dz / len;
    const angle = Math.atan2(dz, dx);
    const pos = win.position || 0;
    const w = win.width || 1.2;
    const h = win.height || 1.0;
    const sill = win.sillHeight || 1.0;
    const t = (wall.thickness || plan.wallThickness || 0.15) + 0.02;

    // Glass pane
    const glassGeo = new THREE.BoxGeometry(w, h, 0.02);
    const glassMesh = new THREE.Mesh(glassGeo, mats.window);
    glassMesh.position.set(
      sx + nx * (pos + w / 2),
      sill + h / 2,
      sz + nz * (pos + w / 2)
    );
    glassMesh.rotation.y = -angle;
    glassMesh.userData = { type: 'window', id: win.id };

    // Frame
    const frameGeo = new THREE.BoxGeometry(w + 0.06, h + 0.06, t);
    const frameMesh = new THREE.Mesh(frameGeo, mats.windowFrame);
    frameMesh.position.copy(glassMesh.position);
    frameMesh.rotation.y = -angle;

    // Cut-out
    const cutGeo = new THREE.BoxGeometry(w, h, t + 0.01);
    const cutMat = new THREE.MeshBasicMaterial({ color: 0x0f0f1a });
    const cutMesh = new THREE.Mesh(cutGeo, cutMat);
    cutMesh.position.copy(glassMesh.position);
    cutMesh.rotation.y = -angle;

    groups.windows.add(cutMesh);
    groups.windows.add(frameMesh);
    groups.windows.add(glassMesh);
  }

  function buildFurniture(furn, groups) {
    if (typeof FurnitureModels3D === 'undefined') return;
    const model = FurnitureModels3D.createModel(furn);
    if (model) {
      groups.furniture.add(model);
    }
  }

  function buildDimensionLine(dim, groups, mats) {
    const s = new THREE.Vector3(dim.start.x, 0.05, dim.start.y);
    const e = new THREE.Vector3(dim.end.x, 0.05, dim.end.y);

    const offset = dim.offset || -0.5;
    const dx = e.x - s.x, dz = e.z - s.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.01) return;

    // Perpendicular offset
    const px = -dz / len * offset;
    const pz = dx / len * offset;

    const p1 = new THREE.Vector3(s.x + px, 0.05, s.z + pz);
    const p2 = new THREE.Vector3(e.x + px, 0.05, e.z + pz);

    // Main line
    const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const line = new THREE.Line(lineGeo, mats.dimension);
    groups.dimensions.add(line);

    // Extension lines
    const ext1Geo = new THREE.BufferGeometry().setFromPoints([s, p1]);
    groups.dimensions.add(new THREE.Line(ext1Geo, mats.dimension));
    const ext2Geo = new THREE.BufferGeometry().setFromPoints([e, p2]);
    groups.dimensions.add(new THREE.Line(ext2Geo, mats.dimension));

    // Tick marks
    const tickLen = 0.15;
    const tnx = dx / len * tickLen;
    const tnz = dz / len * tickLen;
    const tick1Geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p1.x - tnx, 0.05, p1.z - tnz),
      new THREE.Vector3(p1.x + tnx, 0.05, p1.z + tnz)
    ]);
    groups.dimensions.add(new THREE.Line(tick1Geo, mats.dimension));
    const tick2Geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p2.x - tnx, 0.05, p2.z - tnz),
      new THREE.Vector3(p2.x + tnx, 0.05, p2.z + tnz)
    ]);
    groups.dimensions.add(new THREE.Line(tick2Geo, mats.dimension));

    // Label
    const label = dim.label || `${len.toFixed(2)}m`;
    const midX = (p1.x + p2.x) / 2;
    const midZ = (p1.z + p2.z) / 2;
    const sprite = createLabelSprite(label, 0.5, '#ff5722');
    sprite.position.set(midX, 0.3, midZ);
    groups.dimensions.add(sprite);
  }

  function buildColumnMesh(col, plan, groups, mats) {
    const s = col.size || 0.3;
    const h = col.height || plan.floorHeight || 2.8;
    const x = col.position.x;
    const z = col.position.y;

    let geo;
    if (col.shape === 'circular') {
      geo = new THREE.CylinderGeometry(s / 2, s / 2, h, 16);
    } else {
      geo = new THREE.BoxGeometry(s, h, s);
    }

    const mesh = new THREE.Mesh(geo, mats.column.clone());
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'column', id: col.id };

    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, mats.columnEdge);
    mesh.add(line);

    groups.columns.add(mesh);
  }

  function buildStairsMesh(stair, plan, groups, mats) {
    const w = stair.width || 1.0;
    const d = stair.depth || 2.5;
    const steps = stair.steps || 12;
    const totalH = stair.height || plan.floorHeight || 2.8;
    const x = stair.position.x;
    const z = stair.position.y;
    const rot = stair.rotation || 0;

    const stepH = totalH / steps;
    const stepD = d / steps;
    const group = new THREE.Group();

    for (let i = 0; i < steps; i++) {
      const geo = new THREE.BoxGeometry(w, stepH, stepD);
      const mesh = new THREE.Mesh(geo, mats.stair.clone());
      mesh.position.set(0, stepH / 2 + i * stepH, -d / 2 + stepD / 2 + i * stepD);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(edges, mats.stairEdge);
      mesh.add(line);

      group.add(mesh);
    }

    group.position.set(x, 0, z);
    group.rotation.y = -rot;
    group.userData = { type: 'stairs', id: stair.id };

    groups.stairs.add(group);
  }

  function createLabelSprite(text, scale, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;

    ctx.fillStyle = 'rgba(22, 33, 62, 0.85)';
    ctx.roundRect(4, 4, 248, 120, 8);
    ctx.fill();

    ctx.fillStyle = color || '#e0e0e0';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = text.split('\n');
    const lineHeight = 34;
    const startY = canvas.height / 2 - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, i) => {
      if (i > 0) {
        ctx.font = '22px -apple-system, sans-serif';
        ctx.fillStyle = '#9e9e9e';
      }
      ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scale * 2, scale, 1);
    return sprite;
  }

  // Shoelace formula for polygon area
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

  function centroid(vertices) {
    let cx = 0, cy = 0;
    vertices.forEach(v => { cx += v.x; cy += v.y; });
    return { x: cx / vertices.length, y: cy / vertices.length };
  }

  return { buildAll, createLabelSprite, calcArea };
})();

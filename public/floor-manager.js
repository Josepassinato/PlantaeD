/**
 * floor-manager.js — Multi-floor management system
 * Handles floor CRUD, active floor switching, and vertical stacking in 3D
 */
const FloorManager = (() => {
  let activeFloorIndex = 0;
  let showAllFloors = true;
  let ghostOpacity = 0.15;

  /**
   * Migrate a flat plan (no floors array) to multi-floor format.
   * Moves all existing elements into a single ground floor.
   */
  function migratePlanToFloors(plan) {
    if (!plan) return plan;
    if (plan.floors && Array.isArray(plan.floors) && plan.floors.length > 0) return plan;

    // Move existing elements into floor 0
    plan.floors = [{
      id: DataModel.generateId('floor'),
      name: 'Terreo',
      level: 0,
      height: plan.floorHeight || 2.8,
      walls: plan.walls || [],
      rooms: plan.rooms || [],
      doors: plan.doors || [],
      windows: plan.windows || [],
      furniture: plan.furniture || [],
      columns: plan.columns || [],
      stairs: plan.stairs || [],
      dimensions: plan.dimensions || [],
      annotations: plan.annotations || []
    }];

    // Keep top-level arrays as views of active floor (for backward compatibility)
    syncActiveFloor(plan);
    return plan;
  }

  /**
   * Sync top-level plan arrays to point to active floor data.
   * This ensures backward compatibility with existing code.
   */
  function syncActiveFloor(plan) {
    if (!plan || !plan.floors || plan.floors.length === 0) return;
    const floor = plan.floors[activeFloorIndex] || plan.floors[0];
    plan.walls = floor.walls;
    plan.rooms = floor.rooms;
    plan.doors = floor.doors;
    plan.windows = floor.windows;
    plan.furniture = floor.furniture;
    plan.columns = floor.columns;
    plan.stairs = floor.stairs;
    plan.dimensions = floor.dimensions;
    plan.annotations = floor.annotations;
    plan._activeFloorId = floor.id;
  }

  function getActiveFloor(plan) {
    if (!plan || !plan.floors) return null;
    return plan.floors[activeFloorIndex] || plan.floors[0];
  }

  function getActiveFloorIndex() {
    return activeFloorIndex;
  }

  function setActiveFloor(plan, index) {
    if (!plan || !plan.floors) return;
    if (index < 0 || index >= plan.floors.length) return;
    activeFloorIndex = index;
    syncActiveFloor(plan);
    EventBus.emit('floor:changed', { index, floor: plan.floors[index] });
  }

  function addFloor(plan, name) {
    if (!plan) return null;
    if (!plan.floors) migratePlanToFloors(plan);

    const level = plan.floors.length;
    const floor = {
      id: DataModel.generateId('floor'),
      name: name || `Andar ${level}`,
      level: level,
      height: plan.floorHeight || 2.8,
      walls: [],
      rooms: [],
      doors: [],
      windows: [],
      furniture: [],
      columns: [],
      stairs: [],
      dimensions: [],
      annotations: []
    };

    plan.floors.push(floor);
    setActiveFloor(plan, plan.floors.length - 1);
    EventBus.emit('floor:added', { floor, index: plan.floors.length - 1 });
    return floor;
  }

  function removeFloor(plan, index) {
    if (!plan || !plan.floors || plan.floors.length <= 1) return false;
    if (index < 0 || index >= plan.floors.length) return false;

    plan.floors.splice(index, 1);
    // Re-number levels
    plan.floors.forEach((f, i) => { f.level = i; });

    if (activeFloorIndex >= plan.floors.length) {
      activeFloorIndex = plan.floors.length - 1;
    }
    syncActiveFloor(plan);
    EventBus.emit('floor:removed', { index });
    return true;
  }

  function renameFloor(plan, index, name) {
    if (!plan || !plan.floors || !plan.floors[index]) return;
    plan.floors[index].name = name;
    EventBus.emit('floor:renamed', { index, name });
  }

  function getFloorCount(plan) {
    return (plan && plan.floors) ? plan.floors.length : 1;
  }

  function getFloors(plan) {
    return (plan && plan.floors) ? plan.floors : [];
  }

  /**
   * Build 3D for all floors with vertical stacking.
   * Active floor rendered normally, others as ghost (transparent).
   */
  function buildAllFloors(plan) {
    if (!plan || !plan.floors) return;

    const groups = ThreeScene.getGroups();
    ThreeScene.clearGroups();

    plan.floors.forEach((floor, i) => {
      const yOffset = i * (floor.height || plan.floorHeight || 2.8);
      const isActive = (i === activeFloorIndex);
      const visible = isActive || showAllFloors;

      if (!visible) return;

      // Create a temp plan-like object for this floor
      const floorPlan = {
        floorHeight: floor.height || plan.floorHeight || 2.8,
        wallThickness: plan.wallThickness || 0.15,
        walls: floor.walls || [],
        rooms: floor.rooms || [],
        doors: floor.doors || [],
        windows: floor.windows || [],
        furniture: floor.furniture || [],
        columns: floor.columns || [],
        stairs: floor.stairs || [],
        dimensions: floor.dimensions || [],
        annotations: floor.annotations || []
      };

      // Build floor geometry with Y offset
      buildFloorGeometry(floorPlan, groups, yOffset, isActive);
    });

    // Build floor plate (slab) between floors
    if (plan.floors.length > 1) {
      buildFloorSlabs(plan, groups);
    }
  }

  function buildFloorGeometry(floorPlan, groups, yOffset, isActive) {
    const mats = ThreeScene.getMaterials();
    const opacity = isActive ? 1.0 : ghostOpacity;

    // Build rooms (floor surfaces)
    floorPlan.rooms.forEach(room => {
      if (!room.vertices || room.vertices.length < 3) return;
      const shape = new THREE.Shape();
      shape.moveTo(room.vertices[0].x, room.vertices[0].y);
      for (let i = 1; i < room.vertices.length; i++) {
        shape.lineTo(room.vertices[i].x, room.vertices[i].y);
      }
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      let mat;
      if (room.floorMaterial && typeof MaterialSystem !== 'undefined') {
        mat = MaterialSystem.createThreeFloorMaterial(room.floorMaterial);
      } else {
        mat = mats.floor.clone();
        if (room.floorColor) mat.color.set(room.floorColor);
      }
      if (!isActive) { mat.transparent = true; mat.opacity = opacity; }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = yOffset + 0.005;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'room', id: room.id };
      groups.floors.add(mesh);

      // Room label (only for active floor)
      if (isActive && room.name) {
        const area = FloorPlan.calcArea(room.vertices);
        const label = `${room.name}\n${area.toFixed(1)}m\u00B2`;
        const lp = room.labelPosition || centroid(room.vertices);
        const sprite = FloorPlan.createLabelSprite(label, 0.8);
        sprite.position.set(lp.x, yOffset + 0.1, lp.y);
        groups.labels.add(sprite);
      }
    });

    // Build walls
    floorPlan.walls.forEach(wall => {
      const sx = wall.start.x, sz = wall.start.y;
      const ex = wall.end.x, ez = wall.end.y;
      const h = wall.height || floorPlan.floorHeight || 2.8;
      const t = wall.thickness || floorPlan.wallThickness || 0.15;
      const dx = ex - sx, dz = ez - sz;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.01) return;
      const angle = Math.atan2(dz, dx);
      const geo = new THREE.BoxGeometry(len, h, t);
      let mat;
      if (wall.color && typeof MaterialSystem !== 'undefined') {
        mat = MaterialSystem.createThreeWallMaterial(wall.color);
      } else {
        mat = mats.wall.clone();
      }
      if (!isActive) { mat.transparent = true; mat.opacity = opacity; }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(sx + dx / 2, yOffset + h / 2, sz + dz / 2);
      mesh.rotation.y = -angle;
      mesh.castShadow = isActive;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'wall', id: wall.id };
      if (isActive) {
        const edges = new THREE.EdgesGeometry(geo);
        mesh.add(new THREE.LineSegments(edges, mats.wallEdge));
      }
      groups.walls.add(mesh);
    });

    // Build doors (only on active floor for clarity)
    if (isActive) {
      floorPlan.doors.forEach(door => {
        const wall = floorPlan.walls.find(w => w.id === door.wallId);
        if (!wall) return;
        buildDoorAt(door, wall, floorPlan, groups, mats, yOffset);
      });
      floorPlan.windows.forEach(win => {
        const wall = floorPlan.walls.find(w => w.id === win.wallId);
        if (!wall) return;
        buildWindowAt(win, wall, floorPlan, groups, mats, yOffset);
      });
    }

    // Build furniture
    floorPlan.furniture.forEach(furn => {
      if (typeof FurnitureModels3D === 'undefined') return;
      const model = FurnitureModels3D.createModel(furn);
      if (model) {
        model.position.y += yOffset;
        if (!isActive) {
          model.traverse(child => {
            if (child.material) {
              child.material = child.material.clone();
              child.material.transparent = true;
              child.material.opacity = opacity;
            }
          });
        }
        groups.furniture.add(model);
      }
    });

    // Build columns
    floorPlan.columns.forEach(col => {
      const s = col.size || 0.3;
      const h = col.height || floorPlan.floorHeight || 2.8;
      let geo = col.shape === 'circular'
        ? new THREE.CylinderGeometry(s / 2, s / 2, h, 16)
        : new THREE.BoxGeometry(s, h, s);
      const mat = mats.column.clone();
      if (!isActive) { mat.transparent = true; mat.opacity = opacity; }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(col.position.x, yOffset + h / 2, col.position.y);
      mesh.castShadow = isActive;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'column', id: col.id };
      if (isActive) {
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), mats.columnEdge));
      }
      groups.columns.add(mesh);
    });

    // Stairs
    floorPlan.stairs.forEach(stair => {
      const w = stair.width || 1.0;
      const d = stair.depth || 2.5;
      const steps = stair.steps || 12;
      const totalH = stair.height || floorPlan.floorHeight || 2.8;
      const stepH = totalH / steps;
      const stepD = d / steps;
      const group = new THREE.Group();
      for (let i = 0; i < steps; i++) {
        const geo = new THREE.BoxGeometry(w, stepH, stepD);
        const mat = mats.stair.clone();
        if (!isActive) { mat.transparent = true; mat.opacity = opacity; }
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, stepH / 2 + i * stepH, -d / 2 + stepD / 2 + i * stepD);
        mesh.castShadow = isActive;
        mesh.receiveShadow = true;
        if (isActive) {
          mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), mats.stairEdge));
        }
        group.add(mesh);
      }
      group.position.set(stair.position.x, yOffset, stair.position.y);
      group.rotation.y = -(stair.rotation || 0);
      group.userData = { type: 'stairs', id: stair.id };
      groups.stairs.add(group);
    });

    // Dimensions (active floor only)
    if (isActive) {
      floorPlan.dimensions.forEach(dim => {
        const s = new THREE.Vector3(dim.start.x, yOffset + 0.05, dim.start.y);
        const e = new THREE.Vector3(dim.end.x, yOffset + 0.05, dim.end.y);
        const offset = dim.offset || -0.5;
        const dx = e.x - s.x, dz = e.z - s.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) return;
        const px = -dz / len * offset;
        const pz = dx / len * offset;
        const p1 = new THREE.Vector3(s.x + px, yOffset + 0.05, s.z + pz);
        const p2 = new THREE.Vector3(e.x + px, yOffset + 0.05, e.z + pz);
        const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        groups.dimensions.add(new THREE.Line(lineGeo, mats.dimension));
        groups.dimensions.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([s, p1]), mats.dimension));
        groups.dimensions.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([e, p2]), mats.dimension));
        const label = dim.label || `${len.toFixed(2)}m`;
        const sprite = FloorPlan.createLabelSprite(label, 0.5, '#ff5722');
        sprite.position.set((p1.x + p2.x) / 2, yOffset + 0.3, (p1.z + p2.z) / 2);
        groups.dimensions.add(sprite);
      });
    }

    // Annotations (active floor only)
    if (isActive && floorPlan.annotations) {
      floorPlan.annotations.forEach(ann => {
        Annotations.buildAnnotation3D(ann);
      });
    }
  }

  function buildDoorAt(door, wall, floorPlan, groups, mats, yOffset) {
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
    const t = (wall.thickness || floorPlan.wallThickness || 0.15) + 0.02;

    const doorGeo = new THREE.BoxGeometry(w, h, 0.04);
    const doorMesh = new THREE.Mesh(doorGeo, mats.door);
    doorMesh.position.set(sx + nx * (pos + w / 2), yOffset + h / 2, sz + nz * (pos + w / 2));
    doorMesh.rotation.y = -angle;
    doorMesh.castShadow = true;
    doorMesh.userData = { type: 'door', id: door.id };

    const frameGeo = new THREE.BoxGeometry(w + 0.06, h + 0.03, t);
    const frameMesh = new THREE.Mesh(frameGeo, mats.doorFrame);
    frameMesh.position.copy(doorMesh.position);
    frameMesh.rotation.y = -angle;

    const cutGeo = new THREE.BoxGeometry(w, h, t + 0.01);
    const cutMesh = new THREE.Mesh(cutGeo, new THREE.MeshBasicMaterial({ color: 0x0f0f1a }));
    cutMesh.position.copy(doorMesh.position);
    cutMesh.rotation.y = -angle;

    groups.doors.add(cutMesh);
    groups.doors.add(frameMesh);
    groups.doors.add(doorMesh);
  }

  function buildWindowAt(win, wall, floorPlan, groups, mats, yOffset) {
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
    const t = (wall.thickness || floorPlan.wallThickness || 0.15) + 0.02;

    const glassGeo = new THREE.BoxGeometry(w, h, 0.02);
    const glassMesh = new THREE.Mesh(glassGeo, mats.window);
    glassMesh.position.set(sx + nx * (pos + w / 2), yOffset + sill + h / 2, sz + nz * (pos + w / 2));
    glassMesh.rotation.y = -angle;
    glassMesh.userData = { type: 'window', id: win.id };

    const frameGeo = new THREE.BoxGeometry(w + 0.06, h + 0.06, t);
    const frameMesh = new THREE.Mesh(frameGeo, mats.windowFrame);
    frameMesh.position.copy(glassMesh.position);
    frameMesh.rotation.y = -angle;

    const cutGeo = new THREE.BoxGeometry(w, h, t + 0.01);
    const cutMesh = new THREE.Mesh(cutGeo, new THREE.MeshBasicMaterial({ color: 0x0f0f1a }));
    cutMesh.position.copy(glassMesh.position);
    cutMesh.rotation.y = -angle;

    groups.windows.add(cutMesh);
    groups.windows.add(frameMesh);
    groups.windows.add(glassMesh);
  }

  /**
   * Build concrete slabs between floors
   */
  function buildFloorSlabs(plan, groups) {
    if (!plan.floors || plan.floors.length < 2) return;

    for (let i = 1; i < plan.floors.length; i++) {
      const yOffset = i * (plan.floors[i - 1].height || plan.floorHeight || 2.8);
      const prevFloor = plan.floors[i - 1];
      const rooms = prevFloor.rooms || [];

      rooms.forEach(room => {
        if (!room.vertices || room.vertices.length < 3) return;
        const shape = new THREE.Shape();
        shape.moveTo(room.vertices[0].x, room.vertices[0].y);
        for (let j = 1; j < room.vertices.length; j++) {
          shape.lineTo(room.vertices[j].x, room.vertices[j].y);
        }
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
        const mat = new THREE.MeshStandardMaterial({
          color: 0x808080,
          roughness: 0.95,
          metalness: 0
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = yOffset;
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        groups.floors.add(mesh);
      });
    }
  }

  function centroid(vertices) {
    let cx = 0, cy = 0;
    vertices.forEach(v => { cx += v.x; cy += v.y; });
    return { x: cx / vertices.length, y: cy / vertices.length };
  }

  function setShowAllFloors(show) {
    showAllFloors = show;
    EventBus.emit('floor:visibility', { showAll: show });
  }

  function getShowAllFloors() {
    return showAllFloors;
  }

  function setGhostOpacity(val) {
    ghostOpacity = Math.max(0.05, Math.min(0.5, val));
  }

  return {
    migratePlanToFloors,
    syncActiveFloor,
    getActiveFloor,
    getActiveFloorIndex,
    setActiveFloor,
    addFloor,
    removeFloor,
    renameFloor,
    getFloorCount,
    getFloors,
    buildAllFloors,
    setShowAllFloors,
    getShowAllFloors,
    setGhostOpacity
  };
})();

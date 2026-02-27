/**
 * editor-2d.js — Central 2D editor: canvas init, mouse/keyboard, tool state machine
 * Tools: select, wall, door, window, furniture, eraser, pan, note, measure,
 *        dimension (C), column (P), room (O), stairs (T)
 */
const Editor2D = (() => {
  let canvas, ctx;
  let plan = null;
  let active = false;
  let dirty = true;
  let rafId = null;

  // View state
  const viewState = {
    pan: { x: 0, y: 0 },
    zoom: 60,  // pixels per meter
    showGrid: true,
    selection: null,
    hoverElement: null,
    snapPoints: null,
    drawingWall: null,
    placingFurniture: null,
    drawingDimension: null,
    drawingRoom: null,
    placingColumn: null,
    placingStairs: null
  };

  // Tool state
  let currentTool = 'select';
  let isMouseDown = false;
  let dragStart = null;
  let panStart = null;
  let panStartOffset = null;
  let wallStart = null;
  let dimensionStart = null;
  let roomVertices = null;
  let snapEnabled = true;

  function init() {
    canvas = document.getElementById('editor-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Mouse events
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('dblclick', onDblClick);

    // Touch events for mobile
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    // Context menu
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Keyboard
    document.addEventListener('keydown', onKeyDown);

    // Start render loop
    renderLoop();
  }

  function resize() {
    if (!canvas) return;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    dirty = true;
  }

  function setPlan(p) {
    plan = p;
    if (plan) {
      centerOnPlan();
    }
    viewState.selection = null;
    viewState.hoverElement = null;
    viewState.drawingWall = null;
    viewState.placingFurniture = null;
    viewState.drawingDimension = null;
    viewState.drawingRoom = null;
    viewState.placingColumn = null;
    viewState.placingStairs = null;
    wallStart = null;
    dimensionStart = null;
    roomVertices = null;
    dirty = true;
  }

  function setActive(isActive) {
    active = isActive;
    if (active) {
      resize();
      dirty = true;
    }
  }

  function setTool(tool) {
    // Cleanup previous tool state
    if (currentTool === 'wall' && wallStart) {
      wallStart = null;
      viewState.drawingWall = null;
    }
    if (currentTool === 'furniture') {
      viewState.placingFurniture = null;
    }
    if (currentTool === 'dimension') {
      dimensionStart = null;
      viewState.drawingDimension = null;
    }
    if (currentTool === 'room') {
      roomVertices = null;
      viewState.drawingRoom = null;
    }
    if (currentTool === 'column') {
      viewState.placingColumn = null;
    }
    if (currentTool === 'stairs') {
      viewState.placingStairs = null;
    }

    currentTool = tool;
    viewState.selection = null;
    viewState.hoverElement = null;
    viewState.snapPoints = null;

    // Set cursor
    if (canvas) {
      switch (tool) {
        case 'wall': canvas.style.cursor = 'crosshair'; break;
        case 'door': canvas.style.cursor = 'crosshair'; break;
        case 'window': canvas.style.cursor = 'crosshair'; break;
        case 'dimension': canvas.style.cursor = 'crosshair'; break;
        case 'room': canvas.style.cursor = 'crosshair'; break;
        case 'furniture': canvas.style.cursor = 'copy'; break;
        case 'column': canvas.style.cursor = 'copy'; break;
        case 'stairs': canvas.style.cursor = 'copy'; break;
        case 'eraser': canvas.style.cursor = 'not-allowed'; break;
        case 'pan': canvas.style.cursor = 'grab'; break;
        default: canvas.style.cursor = 'default';
      }
    }

    // Init tool state
    if (tool === 'column') {
      viewState.placingColumn = { position: { x: 0, y: 0 }, size: 0.3, shape: 'square' };
    }
    if (tool === 'stairs') {
      viewState.placingStairs = { position: { x: 0, y: 0 }, width: 1.0, depth: 2.5, steps: 12, rotation: 0, type: 'straight' };
    }

    dirty = true;
    EventBus.emit('tool:changed', { tool });
  }

  function setFurnitureToPlace(catalogId) {
    if (catalogId) {
      setTool('furniture');
      viewState.placingFurniture = { catalogId, position: { x: 0, y: 0 }, rotation: 0 };
    } else {
      viewState.placingFurniture = null;
    }
    dirty = true;
  }

  // ---- Mouse/Touch Handlers ----

  function getWorldPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return CanvasInteraction.screenToWorld(sx, sy, viewState.pan, viewState.zoom);
  }

  function onMouseDown(e) {
    if (!active || !plan) return;
    isMouseDown = true;
    const world = getWorldPos(e.clientX, e.clientY);

    if (e.button === 1 || (e.button === 0 && (currentTool === 'pan' || e.shiftKey))) {
      // Pan
      panStart = { x: e.clientX, y: e.clientY };
      panStartOffset = { ...viewState.pan };
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      handleToolMouseDown(world, e);
    }
  }

  function onMouseMove(e) {
    if (!active || !plan) return;
    const world = getWorldPos(e.clientX, e.clientY);

    // Panning
    if (panStart) {
      viewState.pan.x = panStartOffset.x + (e.clientX - panStart.x);
      viewState.pan.y = panStartOffset.y + (e.clientY - panStart.y);
      dirty = true;
      return;
    }

    handleToolMouseMove(world, e);
  }

  function onMouseUp(e) {
    if (!active) return;
    isMouseDown = false;
    const world = getWorldPos(e.clientX, e.clientY);

    if (panStart) {
      panStart = null;
      panStartOffset = null;
      canvas.style.cursor = currentTool === 'pan' ? 'grab' : 'default';
      return;
    }

    handleToolMouseUp(world, e);
  }

  function onWheel(e) {
    if (!active) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(10, Math.min(300, viewState.zoom * factor));

    // Zoom toward cursor
    viewState.pan.x = mx - (mx - viewState.pan.x) * (newZoom / viewState.zoom);
    viewState.pan.y = my - (my - viewState.pan.y) * (newZoom / viewState.zoom);
    viewState.zoom = newZoom;
    dirty = true;
  }

  function onDblClick(e) {
    if (!active || !plan) return;
    const world = getWorldPos(e.clientX, e.clientY);

    if (currentTool === 'select') {
      const hit = HitTesting.findElementAt(world.x, world.y, plan);
      if (hit) {
        EventBus.emit('element:properties', hit);
      }
    }

    // Room tool: double-click closes polygon
    if (currentTool === 'room' && roomVertices && roomVertices.length >= 3) {
      e.preventDefault();
      finishRoom();
    }
  }

  // Touch support
  let lastTouchDist = 0;
  function onTouchStart(e) {
    if (!active) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouchDist = getTouchDist(e.touches);
      panStart = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      panStartOffset = { ...viewState.pan };
    } else if (e.touches.length === 1) {
      onMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, button: 0, shiftKey: false, preventDefault: () => {} });
    }
  }

  function onTouchMove(e) {
    if (!active) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDist(e.touches);
      const mid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      const factor = dist / lastTouchDist;
      viewState.zoom = Math.max(10, Math.min(300, viewState.zoom * factor));
      viewState.pan.x = panStartOffset.x + (mid.x - panStart.x);
      viewState.pan.y = panStartOffset.y + (mid.y - panStart.y);
      lastTouchDist = dist;
      dirty = true;
    } else if (e.touches.length === 1) {
      onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY, shiftKey: false });
    }
  }

  function onTouchEnd(e) {
    panStart = null;
    panStartOffset = null;
    isMouseDown = false;
  }

  function getTouchDist(touches) {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ---- Tool Handlers ----

  function handleToolMouseDown(world, e) {
    const snapped = snapEnabled ? CanvasInteraction.magneticSnap(world, plan.walls || []) : world;

    switch (currentTool) {
      case 'select':
        handleSelectDown(snapped);
        break;
      case 'wall':
        handleWallDown(snapped, e);
        break;
      case 'door':
        handleDoorDown(world);
        break;
      case 'window':
        handleWindowDown(world);
        break;
      case 'furniture':
        handleFurnitureDown(snapped);
        break;
      case 'eraser':
        handleEraserDown(world);
        break;
      case 'dimension':
        handleDimensionDown(snapped);
        break;
      case 'column':
        handleColumnDown(snapped);
        break;
      case 'room':
        handleRoomDown(snapped);
        break;
      case 'stairs':
        handleStairsDown(snapped);
        break;
    }
  }

  function handleToolMouseMove(world, e) {
    const snapped = snapEnabled ? CanvasInteraction.magneticSnap(world, plan.walls || []) : world;

    switch (currentTool) {
      case 'select':
        handleSelectMove(world);
        break;
      case 'wall':
        handleWallMove(snapped, e);
        break;
      case 'furniture':
        if (viewState.placingFurniture) {
          viewState.placingFurniture.position = snapped;
          dirty = true;
        }
        break;
      case 'dimension':
        handleDimensionMove(snapped);
        break;
      case 'room':
        handleRoomMove(snapped);
        break;
      case 'column':
        if (viewState.placingColumn) {
          viewState.placingColumn.position = snapped;
          dirty = true;
        }
        break;
      case 'stairs':
        if (viewState.placingStairs) {
          viewState.placingStairs.position = snapped;
          dirty = true;
        }
        break;
      case 'eraser':
      case 'door':
      case 'window':
        // Hover highlight
        const hit = HitTesting.findElementAt(world.x, world.y, plan);
        viewState.hoverElement = hit;
        dirty = true;
        break;
    }
  }

  function handleToolMouseUp(world, e) {
    dragStart = null;

    if (currentTool === 'select' && viewState.selection && viewState.selection.type === 'furniture' && viewState.selection._dragging) {
      viewState.selection._dragging = false;
      emitPlanChanged();
    }
  }

  // SELECT tool
  function handleSelectDown(world) {
    const hit = HitTesting.findElementAt(world.x, world.y, plan);

    if (hit) {
      viewState.selection = hit;
      EventBus.emit('element:selected', hit);

      if (hit.type === 'furniture') {
        dragStart = { x: world.x, y: world.y };
        hit._dragging = true;
      }
    } else {
      viewState.selection = null;
      EventBus.emit('element:deselected');
    }
    dirty = true;
  }

  function handleSelectMove(world) {
    if (isMouseDown && viewState.selection && viewState.selection.type === 'furniture' && viewState.selection._dragging) {
      const snapped = snapEnabled ? CanvasInteraction.snapPoint(world.x, world.y) : world;
      viewState.selection.element.position.x = snapped.x;
      viewState.selection.element.position.y = snapped.y;
      dirty = true;
    } else {
      // Hover
      const hit = HitTesting.findElementAt(world.x, world.y, plan);
      viewState.hoverElement = hit;
      dirty = true;
    }
  }

  // WALL tool
  function handleWallDown(snapped, e) {
    if (!wallStart) {
      UndoManager.snapshot();
      wallStart = { x: snapped.x, y: snapped.y };
      viewState.drawingWall = { start: wallStart, end: wallStart, thickness: plan.wallThickness || 0.15 };
    } else {
      const end = e.ctrlKey ? CanvasInteraction.constrainLine(wallStart.x, wallStart.y, snapped.x, snapped.y) : snapped;
      const wall = {
        id: DataModel.generateId('w'),
        start: { x: wallStart.x, y: wallStart.y },
        end: { x: end.x, y: end.y },
        height: plan.floorHeight || 2.8,
        thickness: plan.wallThickness || 0.15
      };
      plan.walls.push(wall);
      EventBus.emit('wall:added', wall);

      // Continue chain: new wall starts from end of previous
      wallStart = { x: end.x, y: end.y };
      viewState.drawingWall = { start: wallStart, end: wallStart, thickness: plan.wallThickness || 0.15 };
      dirty = true;
      emitPlanChanged();
    }
  }

  function handleWallMove(snapped, e) {
    if (wallStart && viewState.drawingWall) {
      const end = e.ctrlKey ? CanvasInteraction.constrainLine(wallStart.x, wallStart.y, snapped.x, snapped.y) : snapped;
      viewState.drawingWall.end = end;

      // Show snap points
      const snapPts = [];
      (plan.walls || []).forEach(w => {
        [w.start, w.end].forEach(ep => {
          const d = CanvasInteraction.distance(snapped.x, snapped.y, ep.x, ep.y);
          if (d < CanvasInteraction.MAGNETIC_THRESHOLD && d > 0.01) snapPts.push(ep);
        });
      });
      viewState.snapPoints = snapPts.length > 0 ? snapPts : null;
      dirty = true;
    }
  }

  // DOOR tool
  function handleDoorDown(world) {
    const wall = HitTesting.findWallAt(world.x, world.y, plan);
    if (!wall) return;

    UndoManager.snapshot();
    const pos = HitTesting.positionOnWall(world.x, world.y, wall);
    const door = {
      id: DataModel.generateId('d'),
      wallId: wall.id,
      position: Math.max(0, pos - 0.45),
      width: 0.9,
      height: 2.1,
      type: 'single'
    };
    plan.doors.push(door);
    EventBus.emit('door:added', door);
    dirty = true;
    emitPlanChanged();
  }

  // WINDOW tool
  function handleWindowDown(world) {
    const wall = HitTesting.findWallAt(world.x, world.y, plan);
    if (!wall) return;

    UndoManager.snapshot();
    const pos = HitTesting.positionOnWall(world.x, world.y, wall);
    const win = {
      id: DataModel.generateId('win'),
      wallId: wall.id,
      position: Math.max(0, pos - 0.6),
      width: 1.2,
      height: 1.0,
      sillHeight: 1.0,
      type: 'standard'
    };
    plan.windows.push(win);
    EventBus.emit('window:added', win);
    dirty = true;
    emitPlanChanged();
  }

  // FURNITURE tool
  function handleFurnitureDown(world) {
    if (!viewState.placingFurniture) return;

    UndoManager.snapshot();
    const furn = {
      id: DataModel.generateId('furn'),
      catalogId: viewState.placingFurniture.catalogId,
      position: { x: world.x, y: world.y },
      rotation: viewState.placingFurniture.rotation || 0,
      scale: { x: 1, y: 1, z: 1 },
      color: null,
      locked: false
    };
    plan.furniture.push(furn);
    EventBus.emit('furniture:placed', furn);
    dirty = true;
    emitPlanChanged();
    // Keep placing mode active for rapid placement
  }

  // DIMENSION tool (C)
  function handleDimensionDown(snapped) {
    if (!dimensionStart) {
      dimensionStart = { x: snapped.x, y: snapped.y };
      viewState.drawingDimension = { start: dimensionStart, end: null };
    } else {
      UndoManager.snapshot();
      const dx = snapped.x - dimensionStart.x;
      const dy = snapped.y - dimensionStart.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.05) {
        dimensionStart = null;
        viewState.drawingDimension = null;
        dirty = true;
        return;
      }
      const dim = {
        id: DataModel.generateId('dim'),
        start: { x: dimensionStart.x, y: dimensionStart.y },
        end: { x: snapped.x, y: snapped.y },
        offset: -0.5,
        label: len.toFixed(2) + 'm'
      };
      if (!plan.dimensions) plan.dimensions = [];
      plan.dimensions.push(dim);
      EventBus.emit('dimension:added', dim);
      dimensionStart = null;
      viewState.drawingDimension = null;
      dirty = true;
      emitPlanChanged();
    }
  }

  function handleDimensionMove(snapped) {
    if (dimensionStart && viewState.drawingDimension) {
      viewState.drawingDimension.end = snapped;
      dirty = true;
    }
  }

  // COLUMN tool (P)
  function handleColumnDown(snapped) {
    if (!viewState.placingColumn) return;

    UndoManager.snapshot();
    const col = {
      id: DataModel.generateId('col'),
      position: { x: snapped.x, y: snapped.y },
      size: viewState.placingColumn.size || 0.3,
      height: plan.floorHeight || 2.8,
      shape: viewState.placingColumn.shape || 'square'
    };
    if (!plan.columns) plan.columns = [];
    plan.columns.push(col);
    EventBus.emit('column:added', col);
    dirty = true;
    emitPlanChanged();
    // Keep placing mode
  }

  // ROOM tool (O)
  function handleRoomDown(snapped) {
    if (!roomVertices) {
      roomVertices = [{ x: snapped.x, y: snapped.y }];
      viewState.drawingRoom = { vertices: roomVertices, currentPoint: null };
      dirty = true;
      return;
    }

    // Check if clicking near first vertex to close
    if (roomVertices.length >= 3) {
      const first = roomVertices[0];
      const dist = CanvasInteraction.distance(snapped.x, snapped.y, first.x, first.y);
      if (dist < 0.3) {
        finishRoom();
        return;
      }
    }

    // Add vertex
    roomVertices.push({ x: snapped.x, y: snapped.y });
    viewState.drawingRoom.vertices = roomVertices;
    dirty = true;
  }

  function handleRoomMove(snapped) {
    if (roomVertices && viewState.drawingRoom) {
      viewState.drawingRoom.currentPoint = snapped;
      dirty = true;
    }
  }

  function finishRoom() {
    if (!roomVertices || roomVertices.length < 3) {
      roomVertices = null;
      viewState.drawingRoom = null;
      dirty = true;
      return;
    }

    const name = prompt('Nome da sala:', 'Sala');
    if (name === null) {
      roomVertices = null;
      viewState.drawingRoom = null;
      dirty = true;
      return;
    }

    UndoManager.snapshot();
    const room = {
      id: DataModel.generateId('r'),
      name: name || 'Sala',
      vertices: roomVertices.map(v => ({ x: v.x, y: v.y })),
      floorMaterial: 'hardwood',
      floorColor: '#e8dcc8'
    };
    if (!plan.rooms) plan.rooms = [];
    plan.rooms.push(room);
    EventBus.emit('room:added', room);
    roomVertices = null;
    viewState.drawingRoom = null;
    dirty = true;
    emitPlanChanged();
  }

  // STAIRS tool (T)
  function handleStairsDown(snapped) {
    if (!viewState.placingStairs) return;

    UndoManager.snapshot();
    const stair = {
      id: DataModel.generateId('stair'),
      position: { x: snapped.x, y: snapped.y },
      width: viewState.placingStairs.width || 1.0,
      depth: viewState.placingStairs.depth || 2.5,
      steps: viewState.placingStairs.steps || 12,
      rotation: viewState.placingStairs.rotation || 0,
      type: viewState.placingStairs.type || 'straight',
      height: plan.floorHeight || 2.8
    };
    if (!plan.stairs) plan.stairs = [];
    plan.stairs.push(stair);
    EventBus.emit('stairs:added', stair);
    dirty = true;
    emitPlanChanged();
    // Keep placing mode
  }

  // ERASER tool
  function handleEraserDown(world) {
    const hit = HitTesting.findElementAt(world.x, world.y, plan);
    if (!hit) return;

    UndoManager.snapshot();
    switch (hit.type) {
      case 'wall':
        // Also remove doors/windows on this wall
        plan.doors = plan.doors.filter(d => d.wallId !== hit.element.id);
        plan.windows = plan.windows.filter(w => w.wallId !== hit.element.id);
        plan.walls = plan.walls.filter(w => w.id !== hit.element.id);
        EventBus.emit('wall:deleted', hit.element);
        break;
      case 'door':
        plan.doors = plan.doors.filter(d => d.id !== hit.element.id);
        break;
      case 'window':
        plan.windows = plan.windows.filter(w => w.id !== hit.element.id);
        break;
      case 'furniture':
        plan.furniture = plan.furniture.filter(f => f.id !== hit.element.id);
        break;
      case 'column':
        plan.columns = plan.columns.filter(c => c.id !== hit.element.id);
        break;
      case 'stairs':
        plan.stairs = plan.stairs.filter(s => s.id !== hit.element.id);
        break;
      case 'dimension':
        plan.dimensions = plan.dimensions.filter(d => d.id !== hit.element.id);
        break;
      case 'room':
        plan.rooms = plan.rooms.filter(r => r.id !== hit.element.id);
        break;
    }
    viewState.selection = null;
    viewState.hoverElement = null;
    dirty = true;
    emitPlanChanged();
  }

  // ---- Keyboard ----

  function onKeyDown(e) {
    if (!active) return;

    // Escape: cancel current action
    if (e.key === 'Escape') {
      if (wallStart) {
        wallStart = null;
        viewState.drawingWall = null;
        dirty = true;
      }
      if (viewState.placingFurniture) {
        viewState.placingFurniture = null;
        setTool('select');
      }
      if (dimensionStart) {
        dimensionStart = null;
        viewState.drawingDimension = null;
        dirty = true;
      }
      if (roomVertices) {
        roomVertices = null;
        viewState.drawingRoom = null;
        dirty = true;
      }
      if (viewState.placingColumn) {
        viewState.placingColumn = null;
        setTool('select');
      }
      if (viewState.placingStairs) {
        viewState.placingStairs = null;
        setTool('select');
      }
      if (viewState.selection) {
        viewState.selection = null;
        EventBus.emit('element:deselected');
        dirty = true;
      }
      return;
    }

    // Delete selected element
    if ((e.key === 'Delete' || e.key === 'Backspace') && viewState.selection) {
      e.preventDefault();
      handleEraserDown({
        x: viewState.selection.element.position ? viewState.selection.element.position.x : 0,
        y: viewState.selection.element.position ? viewState.selection.element.position.y : 0
      });
      return;
    }

    // Rotate placing furniture or stairs
    if (e.key === 'r' || e.key === 'R') {
      if (viewState.placingFurniture) {
        viewState.placingFurniture.rotation = (viewState.placingFurniture.rotation || 0) + Math.PI / 4;
        dirty = true;
      } else if (viewState.placingStairs) {
        viewState.placingStairs.rotation = (viewState.placingStairs.rotation || 0) + Math.PI / 4;
        dirty = true;
      } else if (viewState.selection && viewState.selection.type === 'furniture') {
        UndoManager.snapshot();
        viewState.selection.element.rotation = (viewState.selection.element.rotation || 0) + Math.PI / 4;
        dirty = true;
        emitPlanChanged();
      } else if (viewState.selection && viewState.selection.type === 'stairs') {
        UndoManager.snapshot();
        viewState.selection.element.rotation = (viewState.selection.element.rotation || 0) + Math.PI / 4;
        dirty = true;
        emitPlanChanged();
      }
    }

    // Toggle column shape (Q while placing column)
    if ((e.key === 'q' || e.key === 'Q') && viewState.placingColumn) {
      viewState.placingColumn.shape = viewState.placingColumn.shape === 'square' ? 'circular' : 'square';
      dirty = true;
    }

    // Toggle snap
    if (e.key === 's' && !e.ctrlKey) {
      snapEnabled = !snapEnabled;
      EventBus.emit('snap:toggled', { enabled: snapEnabled });
    }
  }

  // ---- Utilities ----

  function emitPlanChanged() {
    EventBus.emit('plan:changed', plan);
  }

  function centerOnPlan() {
    if (!plan || !plan.walls || plan.walls.length === 0) {
      viewState.pan = { x: canvas.width / 2, y: canvas.height / 2 };
      viewState.zoom = 60;
      return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    plan.walls.forEach(w => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minY = Math.min(minY, w.start.y, w.end.y);
      maxY = Math.max(maxY, w.start.y, w.end.y);
    });

    const planW = maxX - minX;
    const planH = maxY - minY;
    const padding = 2; // meters
    const zoomX = canvas.width / (planW + padding * 2);
    const zoomY = canvas.height / (planH + padding * 2);
    viewState.zoom = Math.min(zoomX, zoomY, 150);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    viewState.pan.x = canvas.width / 2 - cx * viewState.zoom;
    viewState.pan.y = canvas.height / 2 - cy * viewState.zoom;
  }

  function renderLoop() {
    if (active && dirty) {
      CanvasRenderer.render(ctx, canvas, plan, viewState);
      dirty = false;
    }
    rafId = requestAnimationFrame(renderLoop);
  }

  function markDirty() {
    dirty = true;
  }

  function getCanvas() { return canvas; }
  function getViewState() { return viewState; }
  function getPlan() { return plan; }
  function getCurrentTool() { return currentTool; }
  function isSnapEnabled() { return snapEnabled; }

  function toggleSnap() {
    snapEnabled = !snapEnabled;
    EventBus.emit('snap:toggled', { enabled: snapEnabled });
    return snapEnabled;
  }

  function destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
  }

  return {
    init, setPlan, setActive, setTool, setFurnitureToPlace,
    markDirty, resize, centerOnPlan, getCanvas, getViewState, getPlan,
    getCurrentTool, isSnapEnabled, toggleSnap, destroy
  };
})();

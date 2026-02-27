/**
 * app.js — Global state, API helpers, toolbar, integration hub
 */
window.App = (() => {
  let currentPlan = null;
  let activeTool = 'select';
  let plans = [];
  let is2DMode = false;
  let saveTimer = null;
  let activeFurnCategory = null;

  async function init() {
    // Init Three.js scene
    const threeCanvas = document.getElementById('three-canvas');
    ThreeScene.init(threeCanvas);

    // Init modules
    Controls.init();
    Annotations.init();
    Editor2D.init();

    // Init undo manager
    UndoManager.init(
      () => currentPlan ? JSON.parse(JSON.stringify(currentPlan)) : null,
      (state) => {
        currentPlan = state;
        refreshViews();
      }
    );

    // Init plugin manager
    PluginManager.init({
      getPlan: () => currentPlan,
      getActiveTool: () => activeTool,
      setTool: setTool,
      emit: EventBus.emit,
      on: EventBus.on,
      off: EventBus.off
    });

    // Canvas click for 3D mode annotations
    threeCanvas.addEventListener('click', onCanvasClick);

    // Toolbar tools
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });

    // Bottom toolbar tools (mobile)
    document.querySelectorAll('#bottom-toolbar .tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });

    // New plan
    document.getElementById('btn-new-plan').addEventListener('click', createNewPlan);

    // Undo/Redo buttons
    document.getElementById('btn-undo').addEventListener('click', () => {
      UndoManager.undo();
    });
    document.getElementById('btn-redo').addEventListener('click', () => {
      UndoManager.redo();
    });

    // Snap toggle
    document.getElementById('btn-snap').addEventListener('click', () => {
      const enabled = Editor2D.toggleSnap();
      document.getElementById('btn-snap').classList.toggle('active', enabled);
    });

    // Quick Tools Menu Toggle
    document.getElementById('btn-quick-tools-toggle').addEventListener('click', toggleQuickToolsMenu);

    // NOTE: btn-2d3d and btn-grid listeners are handled by controls.js
    // to avoid double-binding which causes conflicting state toggles.

    // Furniture panel close
    document.getElementById('btn-close-furniture').addEventListener('click', closeFurniturePanel);
    document.getElementById('btn-close-properties').addEventListener('click', closePropertiesPanel);

    // Furniture search
    document.getElementById('furniture-search').addEventListener('input', (e) => {
      renderFurnitureItems(e.target.value);
    });

    // PNG export
    document.getElementById('btn-export-png').addEventListener('click', exportPNG);

    // DXF import
    document.getElementById('btn-import-dxf').addEventListener('click', () => {
      document.getElementById('dxf-file-input').click();
    });
    document.getElementById('dxf-file-input').addEventListener('change', importDXF);

    // JSON export/import
    document.getElementById('btn-export-json').addEventListener('click', () => {
      if (!currentPlan) {
        App.setStatus('Nenhum plano para exportar');
        setTimeout(() => App.setStatus(''), 2000);
        return;
      }
      LocalStorage.exportPlanAsJSON(currentPlan);
      App.setStatus('Projeto exportado como JSON!');
      setTimeout(() => App.setStatus(''), 2000);
    });
    document.getElementById('btn-import-json').addEventListener('click', async () => {
      const plan = await LocalStorage.importPlanFromJSON();
      if (!plan) return;
      DataModel.migratePlan(plan);
      currentPlan = plan;
      await LocalStorage.savePlan(plan);
      try { await savePlanToServer(plan); } catch (e) { /* offline ok */ }
      document.getElementById('plan-name').textContent = plan.name;
      document.getElementById('empty-overlay').classList.add('hidden');
      UndoManager.clear();
      refreshViews();
      await loadPlanList();
      renderPlanList();
      App.setStatus('Projeto importado com sucesso!');
      setTimeout(() => App.setStatus(''), 2000);
    });

    // Init local storage
    await LocalStorage.open();

    // Walkthrough
    Walkthrough.init();
    document.getElementById('btn-walkthrough').addEventListener('click', () => {
      if (!currentPlan) {
        setStatus('Carregue um plano primeiro');
        setTimeout(() => setStatus(''), 2000);
        return;
      }
      if (is2DMode) {
        setStatus('Mude para vista 3D primeiro');
        setTimeout(() => setStatus(''), 2000);
        return;
      }
      // Expose currentPlan for walkthrough to find center
      window._currentPlan = currentPlan;
      Walkthrough.toggle();
    });

    // Floor management
    document.getElementById('btn-add-floor').addEventListener('click', () => {
      if (!currentPlan) return;
      UndoManager.snapshot();
      FloorManager.addFloor(currentPlan);
      refreshViews();
      renderFloorList();
      EventBus.emit('plan:changed', currentPlan);
    });
    document.getElementById('floor-show-all').addEventListener('change', (e) => {
      FloorManager.setShowAllFloors(e.target.checked);
      refreshViews();
    });

    // Wire EventBus listeners
    wireEvents();

    // Keyboard shortcuts
    document.addEventListener('keydown', onGlobalKeyDown);

    // Load plans
    await loadPlanList();

    // Auto-load first plan
    if (plans.length > 0) {
      await loadPlan(plans[0].id);
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  function wireEvents() {
    // Undo state changes
    EventBus.on('undo:changed', ({ canUndo, canRedo }) => {
      document.getElementById('btn-undo').disabled = !canUndo;
      document.getElementById('btn-redo').disabled = !canRedo;
    });

    // Plan changed -> auto-save
    EventBus.on('plan:changed', (plan) => {
      if (!plan || !plan.id) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => savePlan(plan), 1500);

      // Refresh 3D if in 3D mode
      if (!is2DMode && currentPlan) {
        FloorPlan.buildAll(currentPlan);
      }
    });

    // Tool changed
    EventBus.on('tool:changed', ({ tool }) => {
      if (tool === 'furniture') {
        openFurniturePanel();
      } else {
        closeFurniturePanel();
      }
    });

    // Element selected -> show properties
    EventBus.on('element:selected', (hit) => {
      showProperties(hit);
    });

    EventBus.on('element:deselected', () => {
      closePropertiesPanel();
    });

    // Snap toggled
    EventBus.on('snap:toggled', ({ enabled }) => {
      document.getElementById('btn-snap').classList.toggle('active', enabled);
      setStatus(enabled ? 'Snap ativado' : 'Snap desativado');
      setTimeout(() => setStatus(''), 1500);
    });
  }

  function onGlobalKeyDown(e) {
    // Undo: Ctrl+Z
    if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      UndoManager.undo();
      return;
    }
    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      UndoManager.redo();
      return;
    }

    // Tool shortcuts (only when not typing in input)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
      case 'v': setTool('select'); break;
      case 'w': setTool('wall'); break;
      case 'd': setTool('door'); break;
      case 'j': setTool('window'); break;
      case 'f': setTool('furniture'); break;
      case 'e': setTool('eraser'); break;
      case 'n': setTool('note'); break;
      case 'm': setTool('measure'); break;
      case 'c': setTool('dimension'); break;
      case 'p': setTool('column'); break;
      case 'o': setTool('room'); break;
      case 't': setTool('stairs'); break;
    }
  }

  async function loadPlanList() {
    let serverPlans = [];
    let localPlans = [];

    // Load from server
    try {
      const res = await fetch('/api/planta3d/plans');
      serverPlans = await res.json();
    } catch (err) {
      console.error('Server unreachable, using local storage:', err);
    }

    // Load from local storage
    try {
      localPlans = await LocalStorage.listPlans();
    } catch (err) {
      console.error('Local storage error:', err);
    }

    // Merge: server plans + local-only plans
    const mergedMap = new Map();
    serverPlans.forEach(p => mergedMap.set(p.id, { ...p, source: 'server' }));
    localPlans.forEach(p => {
      if (!mergedMap.has(p.id)) {
        mergedMap.set(p.id, { ...p, source: 'local' });
      }
    });
    plans = Array.from(mergedMap.values());
    renderPlanList();
  }

  function renderPlanList() {
    const list = document.getElementById('plan-list');
    const empty = document.getElementById('plan-list-empty');

    if (plans.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    list.innerHTML = plans.map(p => `
      <li data-id="${p.id}" class="${currentPlan && currentPlan.id === p.id ? 'active' : ''}">
        <span class="plan-item-name">${escHtml(p.name)}${p.source === 'local' ? ' <small style="color:var(--accent);font-size:10px">(local)</small>' : ''}</span>
        <button class="plan-item-delete" data-id="${p.id}" title="Excluir plano">&times;</button>
      </li>
    `).join('');

    // Click handlers
    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('plan-item-delete')) return;
        loadPlan(li.dataset.id);
        document.getElementById('sidebar').classList.remove('open');
      });
    });

    list.querySelectorAll('.plan-item-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await App.showCustomConfirm('Confirmar exclusao', 'Tem certeza que deseja excluir este plano? Esta acao nao pode ser desfeita.');
        if (confirmed) {
          await deletePlan(btn.dataset.id);
        }
      });
    });
  }

  async function loadPlan(id) {
    showLoading(true);
    try {
      let plan = null;

      // Try server first
      try {
        const res = await fetch(`/api/planta3d/plans/${id}`);
        if (res.ok) plan = await res.json();
      } catch (e) {
        console.warn('Server load failed, trying local:', e);
      }

      // Fallback to local storage
      if (!plan) {
        plan = await LocalStorage.loadPlan(id);
      }

      if (!plan) throw new Error('Plan not found');
      currentPlan = plan;

      // Migrate to v2
      DataModel.migratePlan(currentPlan);

      // Migrate to multi-floor format
      FloorManager.migratePlanToFloors(currentPlan);

      // Ensure local copy is up to date
      await LocalStorage.savePlan(currentPlan);

      document.getElementById('plan-name').textContent = currentPlan.name;
      document.getElementById('empty-overlay').classList.add('hidden');

      // Clear undo history for new plan
      UndoManager.clear();

      refreshViews();
      renderPlanList();
      renderFloorList();

      EventBus.emit('plan:loaded', currentPlan);
    } catch (err) {
      console.error('Failed to load plan:', err);
      setStatus('Erro ao carregar plano');
      setTimeout(() => setStatus(''), 3000);
    } finally {
      showLoading(false);
    }
  }

  function refreshViews() {
    if (!currentPlan) return;

    // Use multi-floor rendering if plan has floors
    if (currentPlan.floors && currentPlan.floors.length > 0) {
      FloorManager.buildAllFloors(currentPlan);
    } else {
      FloorPlan.buildAll(currentPlan);
    }

    // Update 2D editor (uses active floor via synced top-level arrays)
    Editor2D.setPlan(currentPlan);

    // Update annotations
    Annotations.setPlan(currentPlan);

    if (!is2DMode) {
      centerCameraOnPlan();
    }
  }

  function renderFloorList() {
    const list = document.getElementById('floor-list');
    if (!currentPlan || !currentPlan.floors) {
      list.innerHTML = '<li class="active"><span>Terreo</span></li>';
      return;
    }

    const activeIdx = FloorManager.getActiveFloorIndex();
    list.innerHTML = currentPlan.floors.map((f, i) => `
      <li data-index="${i}" class="${i === activeIdx ? 'active' : ''}">
        <span>${escHtml(f.name)}</span>
        ${currentPlan.floors.length > 1 ? `<button class="floor-delete" data-index="${i}" title="Remover andar">&times;</button>` : ''}
      </li>
    `).join('');

    // Click to switch floor
    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('floor-delete')) return;
        const idx = parseInt(li.dataset.index);
        UndoManager.snapshot();
        FloorManager.setActiveFloor(currentPlan, idx);
        refreshViews();
        renderFloorList();
      });
    });

    // Delete floor
    list.querySelectorAll('.floor-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const floor = currentPlan.floors[idx];
        const confirmed = await App.showCustomConfirm(
          'Remover andar',
          `Tem certeza que deseja remover "${floor.name}"? Todos os elementos deste andar serao perdidos.`
        );
        if (confirmed) {
          UndoManager.snapshot();
          FloorManager.removeFloor(currentPlan, idx);
          refreshViews();
          renderFloorList();
          EventBus.emit('plan:changed', currentPlan);
        }
      });
    });
  }

  function centerCameraOnPlan() {
    if (!currentPlan || !currentPlan.walls || currentPlan.walls.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    currentPlan.walls.forEach(w => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.y, w.end.y);
      maxZ = Math.max(maxZ, w.start.y, w.end.y);
    });

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const size = Math.max(maxX - minX, maxZ - minZ);
    const dist = size * 1.2;

    ThreeScene.getControls().target.set(cx, 0, cz);
    ThreeScene.animateCameraTo(
      { x: cx + dist, y: dist * 0.8, z: cz + dist },
      { x: cx, y: 0, z: cz }
    );
  }

  async function createNewPlan() {
    const name = await App.showCustomPrompt('Nome do plano:', 'Novo Plano');
    if (!name) return;

    try {
      let plan = null;
      // Try server first
      try {
        const res = await fetch('/api/planta3d/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        plan = await res.json();
      } catch (e) {
        console.warn('Server unavailable, creating locally:', e);
      }

      // Fallback: create locally
      if (!plan) {
        plan = DataModel.createDefaultPlan(name);
      }

      // Save to local storage
      await LocalStorage.savePlan(plan);

      await loadPlanList();
      await loadPlan(plan.id);
    } catch (err) {
      console.error('Failed to create plan:', err);
      setStatus('Erro ao criar plano');
      setTimeout(() => setStatus(''), 3000);
    }
  }

  async function deletePlan(id) {
    try {
      // Delete from both server and local
      try { await fetch(`/api/planta3d/plans/${id}`, { method: 'DELETE' }); } catch (e) { /* offline ok */ }
      try { await LocalStorage.deletePlan(id); } catch (e) { /* ok */ }

      if (currentPlan && currentPlan.id === id) {
        currentPlan = null;
        ThreeScene.clearGroups();
        Annotations.setPlan(null);
        Editor2D.setPlan(null);
        document.getElementById('plan-name').textContent = 'Nenhum plano carregado';
        document.getElementById('empty-overlay').classList.remove('hidden');
      }
      await loadPlanList();
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  }

  async function savePlanToServer(plan) {
    await fetch(`/api/planta3d/plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    });
  }

  async function savePlan(plan) {
    if (!plan || !plan.id) return;
    // Always save locally first (instant, offline-safe)
    try {
      await LocalStorage.savePlan(plan);
    } catch (err) {
      console.error('Local save failed:', err);
    }
    // Then try server
    try {
      await savePlanToServer(plan);
    } catch (err) {
      console.error('Server save failed (saved locally):', err);
    }
    EventBus.emit('plan:saved', plan);
  }

  function onCanvasClick(event) {
    if (is2DMode) return;
    if (activeTool === 'note' || activeTool === 'measure') {
      Annotations.handleCanvasClick(event, activeTool);
    }
  }

  function setTool(tool) {
    activeTool = tool;
    // Update all tool buttons (both side and bottom toolbars)
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    // Delegate to 2D editor if in 2D mode
    if (is2DMode) {
      Editor2D.setTool(tool);
    }

    const isAnnotationTool = tool === 'note' || tool === 'measure';
    if (!is2DMode) {
      Controls.setOrbitEnabled(!isAnnotationTool);
    }

    // Status messages
    const statusMessages = {
      select: '',
      wall: 'Clique para iniciar parede. Clique novamente para finalizar segmento. ESC para cancelar.',
      door: 'Clique em uma parede para adicionar porta',
      window: 'Clique em uma parede para adicionar janela',
      furniture: 'Selecione um movel no painel e clique para posicionar. R para rotacionar.',
      eraser: 'Clique em um elemento para apagar',
      note: 'Clique no plano para adicionar uma nota',
      measure: 'Clique no primeiro ponto para medir',
      pan: 'Arraste para mover a vista',
      dimension: 'Clique no primeiro ponto, depois no segundo para criar cota. ESC para cancelar.',
      column: 'Clique para posicionar pilar. Q=alternar quadrado/circular. ESC para cancelar.',
      room: 'Clique para adicionar vertices. Duplo-clique ou feche no primeiro ponto para finalizar. ESC para cancelar.',
      stairs: 'Clique para posicionar escada. R=rotacionar. ESC para cancelar.'
    };
    setStatus(statusMessages[tool] || '');

    if (tool === 'measure') Annotations.cancelMeasure();

    EventBus.emit('tool:changed', { tool });
  }

  function setStatus(text) {
    document.getElementById('tool-status').textContent = text;
  }

  function showLoading(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !show);
  }

  function toggleQuickToolsMenu() {
    const menu = document.getElementById('quick-tools-menu');
    menu.classList.toggle('hidden');
  }

  // ---- PNG Export ----

  function exportPNG() {
    if (!currentPlan) {
      alert('Nenhum plano carregado');
      return;
    }

    if (is2DMode) {
      // 2D mode: re-render canvas at 3x resolution without grid
      const edCanvas = Editor2D.getCanvas();
      const vs = Editor2D.getViewState();
      const scale = 3;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = edCanvas.width * scale;
      offCanvas.height = edCanvas.height * scale;
      const offCtx = offCanvas.getContext('2d');

      // White background
      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      offCtx.save();
      offCtx.scale(scale, scale);
      offCtx.translate(vs.pan.x, vs.pan.y);
      offCtx.scale(vs.zoom, vs.zoom);

      // Render without grid using a temporary viewState
      const tempVS = Object.assign({}, vs, {
        showGrid: false,
        selection: null,
        hoverElement: null,
        snapPoints: null,
        drawingWall: null,
        placingFurniture: null,
        drawingDimension: null,
        drawingRoom: null,
        placingColumn: null,
        placingStairs: null
      });
      CanvasRenderer.render(offCtx, offCanvas, currentPlan, tempVS);
      offCtx.restore();

      downloadCanvas(offCanvas, (currentPlan.name || 'planta') + '_2D.png');
    } else {
      // 3D mode: use renderer
      const renderer = ThreeScene.getRenderer();
      renderer.render(ThreeScene.getScene(), ThreeScene.getCamera());
      const dataUrl = renderer.domElement.toDataURL('image/png');
      downloadDataUrl(dataUrl, (currentPlan.name || 'planta') + '_3D.png');
    }

    setStatus('PNG exportado!');
    setTimeout(() => setStatus(''), 2000);
  }

  function downloadCanvas(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  // ---- DXF Import ----

  async function importDXF(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!currentPlan) {
      alert('Carregue ou crie um plano primeiro');
      e.target.value = '';
      return;
    }

    setStatus('Importando DXF...');
    const formData = new FormData();
    formData.append('dxf', file);

    try {
      const res = await fetch('/api/planta3d/import-dxf', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('DXF import failed');
      const data = await res.json();

      // Merge into current plan
      UndoManager.snapshot();

      if (data.walls && data.walls.length > 0) {
        data.walls.forEach(w => {
          w.id = DataModel.generateId('w');
          w.height = currentPlan.floorHeight || 2.8;
          w.thickness = currentPlan.wallThickness || 0.15;
          currentPlan.walls.push(w);
        });
      }

      if (data.rooms && data.rooms.length > 0) {
        data.rooms.forEach(r => {
          r.id = DataModel.generateId('r');
          r.floorMaterial = 'hardwood';
          r.floorColor = '#e8dcc8';
          currentPlan.rooms.push(r);
        });
      }

      refreshViews();
      EventBus.emit('plan:changed', currentPlan);
      setStatus(`DXF importado: ${(data.walls || []).length} paredes, ${(data.rooms || []).length} salas`);
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      console.error('DXF import error:', err);
      alert('Erro ao importar DXF: ' + err.message);
      setStatus('');
    }

    e.target.value = '';
  }

  // ---- Mode switching ----

  function set2DMode(enabled) {
    is2DMode = enabled;
    const editorCanvas = document.getElementById('editor-canvas');
    const threeCanvas = document.getElementById('three-canvas');

    if (is2DMode) {
      editorCanvas.classList.add('active');
      threeCanvas.style.display = 'none';
      Editor2D.setActive(true);
      Editor2D.setPlan(currentPlan);
    } else {
      editorCanvas.classList.remove('active');
      threeCanvas.style.display = 'block';
      Editor2D.setActive(false);
      // Rebuild 3D to reflect any 2D edits
      if (currentPlan) {
        FloorPlan.buildAll(currentPlan);
        centerCameraOnPlan();
      }
      ThreeScene.onResize();
    }

    EventBus.emit('mode:changed', { is2D: is2DMode });
  }

  function is2D() { return is2DMode; }

  // ---- Furniture Panel ----

  function openFurniturePanel() {
    const panel = document.getElementById('furniture-panel');
    panel.classList.remove('hidden');
    // Hide annotations panel to make room
    document.getElementById('annotations-panel').style.display = 'none';
    renderFurnitureCategories();
    renderFurnitureItems();
  }

  function closeFurniturePanel() {
    document.getElementById('furniture-panel').classList.add('hidden');
    document.getElementById('annotations-panel').style.display = '';
  }

  function renderFurnitureCategories() {
    const container = document.getElementById('furniture-categories');
    const cats = FurnitureCatalog.getCategories();

    container.innerHTML = `<button class="furn-cat-btn ${!activeFurnCategory ? 'active' : ''}" data-cat="">Todos</button>` +
      cats.map(c => `<button class="furn-cat-btn ${activeFurnCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('');

    container.querySelectorAll('.furn-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFurnCategory = btn.dataset.cat || null;
        renderFurnitureCategories();
        renderFurnitureItems();
      });
    });
  }

  function renderFurnitureItems(searchQuery) {
    const container = document.getElementById('furniture-items');
    let items;

    if (searchQuery) {
      items = FurnitureCatalog.search(searchQuery);
    } else if (activeFurnCategory) {
      items = FurnitureCatalog.getByCategory(activeFurnCategory);
    } else {
      items = FurnitureCatalog.getAll();
    }

    container.innerHTML = items.map(item => {
      return `<div class="furn-item large-furn-item" data-catalog-id="${item.id}" title="${item.name} (${item.width}x${item.depth}m)">
        <div class="furn-item-thumb" data-id="${item.id}"></div>
        <span class="furn-item-name">${item.name}</span>
        <span class="furn-item-dims">${item.width}x${item.depth}m</span>
      </div>`;
    }).join('');

    // Generate thumbnails
    container.querySelectorAll('.furn-item-thumb').forEach(div => {
      const thumb = FurnitureIcons.getThumbnail(div.dataset.id, 48);
      div.appendChild(thumb);
    });

    // Click to place
    container.querySelectorAll('.furn-item').forEach(el => {
      el.addEventListener('click', () => {
        Editor2D.setFurnitureToPlace(el.dataset.catalogId);
        setStatus(`Clique para posicionar. R=rotacionar, ESC=cancelar`);
      });
    });
  }

  // ---- Properties Panel ----

  function showProperties(hit) {
    if (!hit || !hit.element) return;
    const panel = document.getElementById('properties-panel');
    const content = document.getElementById('properties-content');
    panel.classList.remove('hidden');

    let html = '';
    const el = hit.element;

    switch (hit.type) {
      case 'wall':
        html = buildWallProperties(el);
        break;
      case 'room':
        html = buildRoomProperties(el);
        break;
      case 'furniture':
        html = buildFurnitureProperties(el);
        break;
      case 'door':
        html = buildDoorProperties(el);
        break;
      case 'window':
        html = buildWindowProperties(el);
        break;
      case 'column':
        html = buildColumnProperties(el);
        break;
      case 'stairs':
        html = buildStairsProperties(el);
        break;
      case 'dimension':
        html = buildDimensionProperties(el);
        break;
      default:
        html = `<div class="prop-group"><label>${hit.type}</label><p>ID: ${el.id}</p></div>`;
    }

    content.innerHTML = html;
    wirePropertyInputs(hit);
  }

  function buildWallProperties(wall) {
    const colors = MaterialSystem.getWallColors();
    return `
      <div class="prop-group"><label>Tipo</label><p style="color:var(--text);font-size:13px">Parede</p></div>
      <div class="prop-group"><label>ID</label><p style="color:var(--text-secondary);font-size:12px">${wall.id}</p></div>
      <div class="prop-group"><label>Espessura (m)</label>
        ${buildStepperInput('prop-wall-thickness', wall.thickness || 0.15, 0.01, 0.05, 0.5)}
      </div>
      <div class="prop-group"><label>Altura (m)</label>
        ${buildStepperInput('prop-wall-height', wall.height || 2.8, 0.1, 1, 6)}
      </div>
      <div class="prop-group"><label>Cor</label>
        <div class="color-grid">
          ${colors.map(c => `<div class="color-swatch large-color-swatch ${wall.color === c.color ? 'active' : ''}" data-color="${c.color}" style="background:${c.color}" title="${c.name}"></div>`).join('')}
        </div>
      </div>
    `;
  }

  function buildRoomProperties(room) {
    const materials = MaterialSystem.getFloorMaterials();
    return `
      <div class="prop-group"><label>Tipo</label><p style="color:var(--text);font-size:13px">Sala</p></div>
      <div class="prop-group"><label>Nome</label>
        <input type="text" id="prop-room-name" value="${escHtml(room.name || '')}">
      </div>
      <div class="prop-group"><label>Material do piso</label>
        <div class="material-grid">
          ${materials.map(m => `<div class="material-option large-material-option ${room.floorMaterial === m.id ? 'active' : ''}" data-material="${m.id}">
            <div class="mat-preview" style="background:${m.color}"></div>
            ${m.name}
          </div>`).join('')}
        </div>
      </div>
    `;
  }

  function buildFurnitureProperties(furn) {
    const item = FurnitureCatalog.getItem(furn.catalogId);
    return `
      <div class="prop-group"><label>Movel</label><p style="color:var(--text);font-size:13px">${item ? item.name : furn.catalogId}</p></div>
      <div class="prop-group"><label>Rotacao (graus)</label>
        ${buildStepperInput('prop-furn-rotation', Math.round((furn.rotation || 0) * 180 / Math.PI), 15)}
      </div>
      <div class="prop-group"><label>Posicao X (m)</label>
        ${buildStepperInput('prop-furn-x', furn.position.x.toFixed(2), 0.1)}
      </div>
      <div class="prop-group"><label>Posicao Y (m)</label>
        ${buildStepperInput('prop-furn-y', furn.position.y.toFixed(2), 0.1)}
      </div>
    `;
  }

  function buildDoorProperties(door) {
    return `
      <div class="prop-group"><label>Tipo</label><p style="color:var(--text);font-size:13px">Porta</p></div>
      <div class="prop-group"><label>Largura (m)</label>
        ${buildStepperInput('prop-door-width', door.width || 0.9, 0.1, 0.5, 3)}
      </div>
      <div class="prop-group"><label>Altura (m)</label>
        ${buildStepperInput('prop-door-height', door.height || 2.1, 0.1, 1, 3)}
      </div>
      <div class="prop-group"><label>Tipo</label>
        <select id="prop-door-type">
          <option value="single" ${door.type === 'single' ? 'selected' : ''}>Simples</option>
          <option value="double" ${door.type === 'double' ? 'selected' : ''}>Dupla</option>
          <option value="sliding" ${door.type === 'sliding' ? 'selected' : ''}>Correr</option>
          <option value="folding" ${door.type === 'folding' ? 'selected' : ''}>Sanfonada</option>
        </select>
      </div>
    `;
  }

  function buildWindowProperties(win) {
    return `
      <div class="prop-group"><label>Tipo</label><p style="color:var(--text);font-size:13px">Janela</p></div>
      <div class="prop-group"><label>Largura (m)</label>
        ${buildStepperInput('prop-win-width', win.width || 1.2, 0.1, 0.3, 4)}
      </div>
      <div class="prop-group"><label>Altura (m)</label>
        ${buildStepperInput('prop-win-height', win.height || 1.0, 0.1, 0.3, 3)}
      </div>
      <div class="prop-group"><label>Peitoril (m)</label>
        ${buildStepperInput('prop-win-sill', win.sillHeight || 1.0, 0.1, 0, 2)}
      </div>
    `;
  }

  function buildColumnProperties(col) {
    return `
      <div class="prop-group"><label>Tipo</label><p style="color:var(--text);font-size:13px">Pilar</p></div>
      <div class="prop-group"><label>Forma</label>
        <select id="prop-col-shape">
          <option value="square" ${col.shape !== 'circular' ? 'selected' : ''}>Quadrado</option>
          <option value="circular" ${col.shape === 'circular' ? 'selected' : ''}>Circular</option>
        </select>
      </div>
      <div class="prop-group"><label>Tamanho (m)</label>
        ${buildStepperInput('prop-col-size', col.size || 0.3, 0.05, 0.1, 1.5)}
      </div>
      <div class="prop-group"><label>Altura (m)</label>
        ${buildStepperInput('prop-col-height', col.height || 2.8, 0.1, 1, 10)}
      </div>
      <div class="prop-group"><label>Posicao X (m)</label>
        ${buildStepperInput('prop-col-x', col.position.x.toFixed(2), 0.1)}
      </div>
      <div class="prop-group"><label>Posicao Y (m)</label>
        ${buildStepperInput('prop-col-y', col.position.y.toFixed(2), 0.1)}
      </div>
    `;
  }

  function buildStairsProperties(stair) {
    return `
      <div class="prop-group"><label>Tipo</label><p style="color:var(--text);font-size:13px">Escada</p></div>
      <div class="prop-group"><label>Largura (m)</label>
        ${buildStepperInput('prop-stair-width', stair.width || 1.0, 0.1, 0.5, 3)}
      </div>
      <div class="prop-group"><label>Profundidade (m)</label>
        ${buildStepperInput('prop-stair-depth', stair.depth || 2.5, 0.1, 1, 6)}
      </div>
      <div class="prop-group"><label>Degraus</label>
        ${buildStepperInput('prop-stair-steps', stair.steps || 12, 1, 3, 30)}
      </div>
      <div class="prop-group"><label>Rotacao (graus)</label>
        ${buildStepperInput('prop-stair-rotation', Math.round((stair.rotation || 0) * 180 / Math.PI), 15)}
      </div>
      <div class="prop-group"><label>Tipo</label>
        <select id="prop-stair-type">
          <option value="straight" ${stair.type !== 'L' && stair.type !== 'U' ? 'selected' : ''}>Reta</option>
          <option value="L" ${stair.type === 'L' ? 'selected' : ''}>L</option>
          <option value="U" ${stair.type === 'U' ? 'selected' : ''}>U</option>
        </select>
      </div>
    `;
  }

  function buildDimensionProperties(dim) {
    const dx = dim.end.x - dim.start.x;
    const dy = dim.end.y - dim.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    return `
      <div class="prop-group"><label>Tipo</label><p style="color:var(--text);font-size:13px">Cota</p></div>
      <div class="prop-group"><label>Distancia</label><p style="color:var(--accent-orange);font-size:15px;font-weight:600">${len.toFixed(2)}m</p></div>
      <div class="prop-group"><label>Label</label>
        <input type="text" id="prop-dim-label" value="${escHtml(dim.label || '')}">
      </div>
      <div class="prop-group"><label>Offset (m)</label>
        ${buildStepperInput('prop-dim-offset', dim.offset || -0.5, 0.1)}
      </div>
    `;
  }

  function wirePropertyInputs(hit) {
    const el = hit.element;
    const content = document.getElementById('properties-content');

    // Generic change handler
    const onChange = () => {
      UndoManager.snapshot();
      markDirty();
    };

    const markDirty = () => {
      Editor2D.markDirty();
      EventBus.emit('plan:changed', currentPlan);
    };

    if (hit.type === 'wall') {
      bindInput('prop-wall-thickness', v => { el.thickness = parseFloat(v); onChange(); });
      bindInput('prop-wall-height', v => { el.height = parseFloat(v); onChange(); });
      content.querySelectorAll('.color-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
          UndoManager.snapshot();
          el.color = sw.dataset.color;
          content.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
          sw.classList.add('active');
          markDirty();
          EventBus.emit('material:applied', { type: 'wall', element: el });
        });
      });
    }

    if (hit.type === 'room') {
      bindInput('prop-room-name', v => { el.name = v; onChange(); });
      content.querySelectorAll('.material-option').forEach(opt => {
        opt.addEventListener('click', () => {
          UndoManager.snapshot();
          el.floorMaterial = opt.dataset.material;
          content.querySelectorAll('.material-option').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          markDirty();
          EventBus.emit('material:applied', { type: 'room', element: el });
        });
      });
    }

    if (hit.type === 'furniture') {
      bindInput('prop-furn-rotation', v => { el.rotation = parseFloat(v) * Math.PI / 180; onChange(); });
      bindInput('prop-furn-x', v => { el.position.x = parseFloat(v); onChange(); });
      bindInput('prop-furn-y', v => { el.position.y = parseFloat(v); onChange(); });
    }

    if (hit.type === 'door') {
      bindInput('prop-door-width', v => { el.width = parseFloat(v); onChange(); });
      bindInput('prop-door-height', v => { el.height = parseFloat(v); onChange(); });
      bindInput('prop-door-type', v => { el.type = v; onChange(); });
    }

    if (hit.type === 'window') {
      bindInput('prop-win-width', v => { el.width = parseFloat(v); onChange(); });
      bindInput('prop-win-height', v => { el.height = parseFloat(v); onChange(); });
      bindInput('prop-win-sill', v => { el.sillHeight = parseFloat(v); onChange(); });
    }

    if (hit.type === 'column') {
      bindInput('prop-col-shape', v => { el.shape = v; onChange(); });
      bindInput('prop-col-size', v => { el.size = parseFloat(v); onChange(); });
      bindInput('prop-col-height', v => { el.height = parseFloat(v); onChange(); });
      bindInput('prop-col-x', v => { el.position.x = parseFloat(v); onChange(); });
      bindInput('prop-col-y', v => { el.position.y = parseFloat(v); onChange(); });
    }

    if (hit.type === 'stairs') {
      bindInput('prop-stair-width', v => { el.width = parseFloat(v); onChange(); });
      bindInput('prop-stair-depth', v => { el.depth = parseFloat(v); onChange(); });
      bindInput('prop-stair-steps', v => { el.steps = parseInt(v); onChange(); });
      bindInput('prop-stair-rotation', v => { el.rotation = parseFloat(v) * Math.PI / 180; onChange(); });
      bindInput('prop-stair-type', v => { el.type = v; onChange(); });
    }

    if (hit.type === 'dimension') {
      bindInput('prop-dim-label', v => { el.label = v; onChange(); });
      bindInput('prop-dim-offset', v => { el.offset = parseFloat(v); onChange(); });
    }

    // Wire up stepper buttons
    content.querySelectorAll('.stepper-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.targetId;
        const input = document.getElementById(targetId);
        if (!input) return;

        const step = parseFloat(btn.dataset.step) || 1;
        const min = btn.dataset.min !== '' ? parseFloat(btn.dataset.min) : -Infinity;
        const max = btn.dataset.max !== '' ? parseFloat(btn.dataset.max) : Infinity;
        let currentValue = parseFloat(input.value);

        if (btn.classList.contains('stepper-btn--plus')) {
          currentValue = Math.min(max, currentValue + step);
        } else if (btn.classList.contains('stepper-btn--minus')) {
          currentValue = Math.max(min, currentValue - step);
        }

        input.value = currentValue.toFixed(input.step.includes('.') ? input.step.split('.')[1].length : 0); // Format to match step decimal places
        input.dispatchEvent(new Event('change')); // Trigger change event
      });
    });
  }

  function bindInput(id, handler) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => handler(el.value));
  }

  function closePropertiesPanel() {
    document.getElementById('properties-panel').classList.add('hidden');
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function buildStepperInput(id, value, step, min, max) {
    return `
      <div class="stepper-input">
        <button type="button" class="stepper-btn stepper-btn--minus" data-target-id="${id}" data-step="${step || 1}" data-min="${min !== undefined ? min : ''}">&minus;</button>
        <input type="number" id="${id}" value="${value}" step="${step || 1}" min="${min !== undefined ? min : ''}" max="${max !== undefined ? max : ''}">
        <button type="button" class="stepper-btn stepper-btn--plus" data-target-id="${id}" data-step="${step || 1}" data-max="${max !== undefined ? max : ''}">&plus;</button>
      </div>
    `;
  }

  // Auto-init
  document.addEventListener('DOMContentLoaded', init);

  async function showCustomPrompt(title, defaultValue = '') {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-prompt-modal');
      const modalTitle = document.getElementById('custom-prompt-title');
      const input = document.getElementById('custom-prompt-input');
      const btnConfirm = document.getElementById('custom-prompt-confirm');
      const btnCancel = document.getElementById('custom-prompt-cancel');
      const btnClose = document.getElementById('custom-prompt-close');

      modalTitle.textContent = title;
      input.value = defaultValue;
      modal.classList.remove('hidden');
      input.focus();

      const handleConfirm = () => {
        modal.classList.add('hidden');
        cleanUp();
        resolve(input.value);
      };

      const handleCancel = () => {
        modal.classList.add('hidden');
        cleanUp();
        resolve(null);
      };

      const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
          handleConfirm();
        } else if (e.key === 'Escape') {
          handleCancel();
        }
      };

      btnConfirm.addEventListener('click', handleConfirm);
      btnCancel.addEventListener('click', handleCancel);
      btnClose.addEventListener('click', handleCancel);
      input.addEventListener('keydown', handleKeyDown);

      function cleanUp() {
        btnConfirm.removeEventListener('click', handleConfirm);
        btnCancel.removeEventListener('click', handleCancel);
        btnClose.removeEventListener('click', handleCancel);
        input.removeEventListener('keydown', handleKeyDown);
      }
    });
  }

  async function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('custom-confirm-modal');
      const modalTitle = document.getElementById('custom-confirm-title');
      const modalText = document.getElementById('custom-confirm-text');
      const btnConfirm = document.getElementById('custom-confirm-confirm');
      const btnCancel = document.getElementById('custom-confirm-cancel');
      const btnClose = document.getElementById('custom-confirm-close');

      modalTitle.textContent = title;
      modalText.textContent = message;
      modal.classList.remove('hidden');

      const handleConfirm = () => {
        modal.classList.add('hidden');
        cleanUp();
        resolve(true);
      };

      const handleCancel = () => {
        modal.classList.add('hidden');
        cleanUp();
        resolve(false);
      };

      btnConfirm.addEventListener('click', handleConfirm);
      btnCancel.addEventListener('click', handleCancel);
      btnClose.addEventListener('click', handleCancel);

      function cleanUp() {
        btnConfirm.removeEventListener('click', handleConfirm);
        btnCancel.removeEventListener('click', handleCancel);
        btnClose.removeEventListener('click', handleCancel);
      }
    });
  }

  return { setStatus, set2DMode, is2D, showCustomPrompt, showCustomConfirm };
})();

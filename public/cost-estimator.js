/**
 * cost-estimator.js — FASE 3: Cost Estimation Module for Planta3D
 *
 * Provides automatic measurements, material pricing, furniture costing,
 * budget panel generation, and export capabilities (PDF data, CSV).
 *
 * Globals used: App, EventBus, FloorManager, MaterialSystem, FurnitureCatalog
 */
window.CostEstimator = (() => {
  'use strict';

  // ── CONSTANTS ──

  const STORAGE_KEY = 'p3d_cost_prices';
  const CURRENCY = 'R$';

  // Default prices per m2 for floor materials
  const DEFAULT_FLOOR_PRICES = {
    'hardwood':           180,
    'hardwood-dark':      210,
    'hardwood-light':     170,
    'tile-white':          95,
    'tile-gray':           90,
    'tile-beige':          85,
    'tile-terracotta':     80,
    'carpet-gray':         65,
    'carpet-beige':        70,
    'carpet-blue':         75,
    'concrete':            45,
    'concrete-polished':   90,
    'marble-white':       350,
    'marble-black':       380,
    'marble-carrara':     420,
    'stone':              250,
    'vinyl':               60,
    'laminate':           110
  };

  // Default prices per m2 for wall finishes
  const DEFAULT_WALL_PRICES = {
    'white':        25,
    'off-white':    25,
    'light-gray':   28,
    'warm-gray':    28,
    'beige':        30,
    'cream':        27,
    'light-blue':   32,
    'sage':         32,
    'blush':        30,
    'terracotta':   35,
    'navy':         35,
    'charcoal':     33
  };

  // Default wall paint price when no specific color is set (per m2)
  const DEFAULT_WALL_PAINT_PRICE = 25;

  // Default estimated prices for furniture by category (BRL)
  const DEFAULT_FURNITURE_PRICES = {
    'sofas':        2000,
    'chairs':        450,
    'tables':        800,
    'beds':         1500,
    'storage':      1200,
    'desks':         900,
    'kitchen':       800,
    'bathroom':      600,
    'lighting':      250,
    'electronics':  1500,
    'outdoor':       700,
    'decor':         200,
    'office':        600,
    'laundry':       900,
    'doors':         500,
    'appliances':   1200,
    'plants':        100
  };

  // Override prices for specific high-value furniture items
  const FURNITURE_ITEM_PRICES = {
    'sofa-2seat':     1800,
    'sofa-3seat':     2500,
    'sofa-l':         3500,
    'sofa-corner':    3200,
    'loveseat':       1400,
    'chaise':         1600,
    'futon':          1200,
    'daybed':         2200,
    'recliner':       2000,
    'ottoman':         500,
    'chair-dining':    350,
    'chair-arm':       800,
    'chair-office':    700,
    'stool-bar':       280,
    'stool-low':       180,
    'bench-dining':    600,
    'bench-entry':     500,
    'rocker':          900,
    'bean-bag':        350,
    'folding-chair':   150,
    'table-dining-4':  1200,
    'table-dining-6':  1800,
    'table-dining-8':  2500,
    'table-round':      900,
    'table-coffee':     700,
    'table-side':       350,
    'table-console':    800,
    'table-counter':   1100,
    'table-bedside':    400,
    'table-tv':        1200,
    'table-picnic':     800,
    'table-drop-leaf':  700,
    'bed-single':      1000,
    'bed-double':      1400,
    'bed-queen':       1800,
    'bed-king':        2500,
    'bed-bunk':        1800,
    'crib':             900,
    'bed-sofa':        2200,
    'mattress':         800,
    'wardrobe-2d':     1500,
    'wardrobe-3d':     2200,
    'wardrobe-sliding': 3000,
    'bookcase':         600,
    'bookcase-wide':   1000,
    'shelf-wall':       150,
    'chest-drawers':    900,
    'shoe-rack':        400,
    'cabinet-tall':     800,
    'sideboard':       1400,
    'desk-standard':    800,
    'desk-large':      1200,
    'desk-l':          1600,
    'desk-standing':   2000,
    'desk-vanity':      700,
    'desk-kids':        500,
    'fridge-single':   2000,
    'fridge-double':   3500,
    'stove-4':          900,
    'stove-6':         1400,
    'oven':            1200,
    'microwave':        500,
    'dishwasher':      2000,
    'sink-kitchen':     600,
    'kitchen-island':  2500,
    'pantry-cabinet':   800,
    'counter-section':  500,
    'hood':             800,
    'toilet':           500,
    'sink-bath':        400,
    'sink-double':      800,
    'bathtub':         2500,
    'shower':          1200,
    'shower-rect':     1500,
    'bidet':            600,
    'bath-cabinet':     700,
    'mirror-bath':      300,
    'towel-rack':       150,
    'lamp-floor':       400,
    'lamp-table':       250,
    'lamp-desk':        200,
    'chandelier':       800,
    'pendant':          350,
    'ceiling-fan':      500,
    'sconce':           180,
    'spot':              80,
    'tv-50':           2500,
    'tv-65':           4000,
    'monitor':         1200,
    'computer':        3000,
    'speaker-floor':    800,
    'soundbar':         600,
    'printer':          500,
    'router':           250,
    'chair-garden':     400,
    'table-garden':     700,
    'lounger':          900,
    'umbrella':         500,
    'grill':           2000,
    'hammock':          300,
    'swing':            800,
    'planter-large':    200,
    'rug-small':        300,
    'rug-medium':       600,
    'rug-large':       1200,
    'mirror-floor':     500,
    'picture-frame':    150,
    'clock':            120,
    'vase':              80,
    'curtain':          350,
    'file-cabinet':     400,
    'file-cabinet-tall': 600,
    'whiteboard':       350,
    'meeting-table':   2500,
    'reception-desk':  2000,
    'locker':           500,
    'safe':             800,
    'paper-shredder':   300,
    'washer':          1800,
    'dryer':           1500,
    'washer-dryer':    2500,
    'laundry-sink':     400,
    'ironing-board':    150,
    'drying-rack':      120,
    'door-single':      500,
    'door-double':      900,
    'door-sliding':     700,
    'door-folding':     400,
    'door-pocket':      600,
    'door-glass':       800,
    'ac-split':        2000,
    'ac-window':       1200,
    'heater':           500,
    'water-heater':     800,
    'fan-stand':        250,
    'vacuum':           600,
    'dehumidifier':     500,
    'purifier':         400,
    'plant-small':       50,
    'plant-medium':     100,
    'plant-tall':       180,
    'plant-tree':       250,
    'cactus':            40,
    'bonsai':           120,
    'hanging-plant':     60,
    'flower-pot':        50
  };

  // ── STATE ──

  let userPrices = null;
  let panelElement = null;
  let metricsCache = null;
  let metricsDirty = true;

  // ── INITIALIZATION ──

  function init() {
    loadPrices();
    wireEvents();
  }

  function wireEvents() {
    EventBus.on('plan:changed', () => { invalidateCache(); });
    EventBus.on('floor:changed', () => { invalidateCache(); });
    EventBus.on('floor:added', () => { invalidateCache(); });
    EventBus.on('floor:removed', () => { invalidateCache(); });
  }

  function invalidateCache() {
    metricsDirty = true;
    metricsCache = null;
  }

  // ── PRICE DATABASE (localStorage) ──

  function loadPrices() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        userPrices = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('CostEstimator: failed to load prices from localStorage', e);
    }
    if (!userPrices) {
      userPrices = {
        floor: { ...DEFAULT_FLOOR_PRICES },
        wall: { ...DEFAULT_WALL_PRICES },
        furniture: { ...FURNITURE_ITEM_PRICES },
        furnitureCategory: { ...DEFAULT_FURNITURE_PRICES },
        laborCostPerM2: 0,
        laborCostFixed: 0
      };
    }
  }

  function savePrices() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userPrices));
    } catch (e) {
      console.warn('CostEstimator: failed to save prices to localStorage', e);
    }
  }

  function getFloorPrice(materialId) {
    if (userPrices.floor && userPrices.floor[materialId] !== undefined) {
      return userPrices.floor[materialId];
    }
    return DEFAULT_FLOOR_PRICES[materialId] || 0;
  }

  function setFloorPrice(materialId, price) {
    if (!userPrices.floor) userPrices.floor = {};
    userPrices.floor[materialId] = Math.max(0, Number(price) || 0);
    savePrices();
    invalidateCache();
  }

  function getWallPrice(colorId) {
    if (userPrices.wall && userPrices.wall[colorId] !== undefined) {
      return userPrices.wall[colorId];
    }
    return DEFAULT_WALL_PRICES[colorId] || DEFAULT_WALL_PAINT_PRICE;
  }

  function setWallPrice(colorId, price) {
    if (!userPrices.wall) userPrices.wall = {};
    userPrices.wall[colorId] = Math.max(0, Number(price) || 0);
    savePrices();
    invalidateCache();
  }

  function getFurniturePrice(catalogId, category) {
    // Check item-specific override first
    if (userPrices.furniture && userPrices.furniture[catalogId] !== undefined) {
      return userPrices.furniture[catalogId];
    }
    // Then built-in item prices
    if (FURNITURE_ITEM_PRICES[catalogId] !== undefined) {
      return FURNITURE_ITEM_PRICES[catalogId];
    }
    // Fall back to category default
    if (category) {
      if (userPrices.furnitureCategory && userPrices.furnitureCategory[category] !== undefined) {
        return userPrices.furnitureCategory[category];
      }
      return DEFAULT_FURNITURE_PRICES[category] || 0;
    }
    return 0;
  }

  function setFurniturePrice(catalogId, price) {
    if (!userPrices.furniture) userPrices.furniture = {};
    userPrices.furniture[catalogId] = Math.max(0, Number(price) || 0);
    savePrices();
    invalidateCache();
  }

  function setLaborCost(perM2, fixed) {
    if (perM2 !== undefined) userPrices.laborCostPerM2 = Math.max(0, Number(perM2) || 0);
    if (fixed !== undefined) userPrices.laborCostFixed = Math.max(0, Number(fixed) || 0);
    savePrices();
    invalidateCache();
  }

  function getLaborCost() {
    return {
      perM2: userPrices.laborCostPerM2 || 0,
      fixed: userPrices.laborCostFixed || 0
    };
  }

  function resetPrices() {
    userPrices = {
      floor: { ...DEFAULT_FLOOR_PRICES },
      wall: { ...DEFAULT_WALL_PRICES },
      furniture: { ...FURNITURE_ITEM_PRICES },
      furnitureCategory: { ...DEFAULT_FURNITURE_PRICES },
      laborCostPerM2: 0,
      laborCostFixed: 0
    };
    savePrices();
    invalidateCache();
  }

  // ── GEOMETRY CALCULATIONS ──

  /**
   * Shoelace formula: compute area of a simple polygon from vertices [{x,y}].
   * Returns area in m2 (coordinates are in meters).
   */
  function calcPolygonArea(vertices) {
    if (!vertices || vertices.length < 3) return 0;
    let area = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2);
  }

  /**
   * Compute the perimeter of a polygon from vertices [{x,y}].
   */
  function calcPolygonPerimeter(vertices) {
    if (!vertices || vertices.length < 2) return 0;
    let perimeter = 0;
    const n = vertices.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const dx = vertices[j].x - vertices[i].x;
      const dy = vertices[j].y - vertices[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  /**
   * Compute the length of a wall from its start/end coordinates.
   * Supports both {start:{x,y}, end:{x,y}} and legacy {x1,y1,x2,y2} formats.
   */
  function calcWallLength(wall) {
    let dx, dy;
    if (wall.start && wall.end) {
      dx = wall.end.x - wall.start.x;
      dy = wall.end.y - wall.start.y;
    } else if (wall.x1 !== undefined) {
      dx = wall.x2 - wall.x1;
      dy = wall.y2 - wall.y1;
    } else {
      return 0;
    }
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Compute wall surface area (length * height) for a single wall.
   */
  function calcWallSurfaceArea(wall, defaultHeight) {
    const length = calcWallLength(wall);
    const height = wall.height || defaultHeight || 2.8;
    return length * height;
  }

  /**
   * Get the room vertices, supporting both 'vertices' and 'points' fields.
   */
  function getRoomVertices(room) {
    return room.vertices || room.points || [];
  }

  // ── PLAN ANALYSIS ──

  /**
   * Gather all floors' data from the plan. If the plan has a floors array,
   * iterate over all floors. Otherwise use top-level arrays.
   */
  function getAllFloorData(plan) {
    if (!plan) return [];
    if (plan.floors && Array.isArray(plan.floors) && plan.floors.length > 0) {
      return plan.floors;
    }
    // Flat plan: treat as single floor
    return [{
      name: 'Terreo',
      level: 0,
      height: plan.floorHeight || 2.8,
      walls: plan.walls || [],
      rooms: plan.rooms || [],
      doors: plan.doors || [],
      windows: plan.windows || [],
      furniture: plan.furniture || []
    }];
  }

  /**
   * Compute per-room measurements for a single floor.
   */
  function analyzeFloor(floor, defaultHeight) {
    const floorHeight = floor.height || defaultHeight || 2.8;
    const rooms = floor.rooms || [];
    const walls = floor.walls || [];
    const doors = floor.doors || [];
    const windows = floor.windows || [];
    const furniture = floor.furniture || [];

    // Room analysis
    const roomDetails = rooms.map(room => {
      const verts = getRoomVertices(room);
      const area = calcPolygonArea(verts);
      const perimeter = calcPolygonPerimeter(verts);
      return {
        id: room.id,
        name: room.name || 'Sem nome',
        area: area,
        perimeter: perimeter,
        floorMaterial: room.floorMaterial || null,
        wallColor: room.wallColor || null
      };
    });

    // Wall analysis
    let wallPerimeter = 0;
    let wallSurfaceTotal = 0;
    const wallDetails = walls.map(wall => {
      const length = calcWallLength(wall);
      const surface = calcWallSurfaceArea(wall, floorHeight);
      wallPerimeter += length;
      wallSurfaceTotal += surface;
      return {
        id: wall.id,
        length: length,
        surface: surface,
        thickness: wall.thickness,
        color: wall.color || null
      };
    });

    const totalArea = roomDetails.reduce((sum, r) => sum + r.area, 0);

    return {
      name: floor.name || 'Pavimento',
      level: floor.level || 0,
      rooms: roomDetails,
      walls: wallDetails,
      doorCount: doors.length,
      windowCount: windows.length,
      furnitureCount: furniture.length,
      furniture: furniture,
      totalArea: totalArea,
      wallPerimeter: wallPerimeter,
      wallSurface: wallSurfaceTotal,
      floorHeight: floorHeight
    };
  }

  /**
   * Full project analysis across all floors.
   */
  function analyzePlan(plan) {
    if (!plan) {
      return {
        floors: [],
        totalArea: 0,
        wallPerimeter: 0,
        wallSurface: 0,
        doorCount: 0,
        windowCount: 0,
        furnitureCount: 0
      };
    }

    const floorDataList = getAllFloorData(plan);
    const defaultHeight = plan.floorHeight || 2.8;
    const floors = floorDataList.map(f => analyzeFloor(f, defaultHeight));

    return {
      floors: floors,
      totalArea: floors.reduce((s, f) => s + f.totalArea, 0),
      wallPerimeter: floors.reduce((s, f) => s + f.wallPerimeter, 0),
      wallSurface: floors.reduce((s, f) => s + f.wallSurface, 0),
      doorCount: floors.reduce((s, f) => s + f.doorCount, 0),
      windowCount: floors.reduce((s, f) => s + f.windowCount, 0),
      furnitureCount: floors.reduce((s, f) => s + f.furnitureCount, 0)
    };
  }

  // ── COSTING ──

  /**
   * Compute the full budget breakdown for a plan.
   */
  function computeBudget(plan) {
    const analysis = analyzePlan(plan);
    const labor = getLaborCost();

    // Floor material costs (aggregated across all rooms of all floors)
    const floorMaterialMap = new Map();
    analysis.floors.forEach(floor => {
      floor.rooms.forEach(room => {
        const matId = room.floorMaterial;
        if (!matId) return;
        const entry = floorMaterialMap.get(matId) || { area: 0, pricePerM2: 0, name: '' };
        entry.area += room.area;
        entry.pricePerM2 = getFloorPrice(matId);
        const mat = (typeof MaterialSystem !== 'undefined') ? MaterialSystem.getFloorMaterial(matId) : null;
        entry.name = mat ? mat.name : matId;
        floorMaterialMap.set(matId, entry);
      });
    });

    const floorCosts = [];
    let totalFloorCost = 0;
    floorMaterialMap.forEach((entry, matId) => {
      const cost = entry.area * entry.pricePerM2;
      totalFloorCost += cost;
      floorCosts.push({
        materialId: matId,
        name: entry.name,
        area: entry.area,
        pricePerM2: entry.pricePerM2,
        totalCost: cost
      });
    });

    // Wall paint/finish costs (aggregated by color across all floors)
    const wallColorMap = new Map();
    analysis.floors.forEach(floor => {
      floor.walls.forEach(wall => {
        const colorId = wall.color || '_default';
        const entry = wallColorMap.get(colorId) || { surface: 0, pricePerM2: 0, name: '' };
        entry.surface += wall.surface;
        if (colorId === '_default') {
          entry.pricePerM2 = DEFAULT_WALL_PAINT_PRICE;
          entry.name = 'Pintura padrao';
        } else {
          entry.pricePerM2 = getWallPrice(colorId);
          const wc = (typeof MaterialSystem !== 'undefined') ? MaterialSystem.getWallColor(colorId) : null;
          entry.name = wc ? wc.name : colorId;
        }
        wallColorMap.set(colorId, entry);
      });
    });

    const wallCosts = [];
    let totalWallCost = 0;
    wallColorMap.forEach((entry, colorId) => {
      const cost = entry.surface * entry.pricePerM2;
      totalWallCost += cost;
      wallCosts.push({
        colorId: colorId,
        name: entry.name,
        surface: entry.surface,
        pricePerM2: entry.pricePerM2,
        totalCost: cost
      });
    });

    // Furniture costs (aggregated by catalogId)
    const furnitureMap = new Map();
    analysis.floors.forEach(floor => {
      (floor.furniture || []).forEach(f => {
        const catId = f.catalogId || f.type || f.id || 'unknown';
        const entry = furnitureMap.get(catId) || { count: 0, unitPrice: 0, name: '', category: '' };
        entry.count += 1;
        const catItem = (typeof FurnitureCatalog !== 'undefined') ? FurnitureCatalog.getItem(catId) : null;
        entry.name = catItem ? catItem.name : (f.name || catId);
        entry.category = catItem ? catItem.category : (f.category || '');
        entry.unitPrice = getFurniturePrice(catId, entry.category);
        furnitureMap.set(catId, entry);
      });
    });

    const furnitureCosts = [];
    let totalFurnitureCost = 0;
    furnitureMap.forEach((entry, catId) => {
      const cost = entry.count * entry.unitPrice;
      totalFurnitureCost += cost;
      furnitureCosts.push({
        catalogId: catId,
        name: entry.name,
        category: entry.category,
        count: entry.count,
        unitPrice: entry.unitPrice,
        totalCost: cost
      });
    });

    // Labor costs
    const laborByArea = analysis.totalArea * labor.perM2;
    const laborTotal = laborByArea + labor.fixed;

    // Grand total
    const grandTotal = totalFloorCost + totalWallCost + totalFurnitureCost + laborTotal;

    return {
      analysis: analysis,
      floorCosts: floorCosts,
      totalFloorCost: totalFloorCost,
      wallCosts: wallCosts,
      totalWallCost: totalWallCost,
      furnitureCosts: furnitureCosts,
      totalFurnitureCost: totalFurnitureCost,
      labor: {
        perM2: labor.perM2,
        fixed: labor.fixed,
        byArea: laborByArea,
        total: laborTotal
      },
      grandTotal: grandTotal
    };
  }

  // ── PUBLIC METRICS API ──

  /**
   * Returns current project metrics (cached for performance).
   * {totalArea, wallPerimeter, doorCount, windowCount, totalCost}
   */
  function getMetrics(plan) {
    if (!plan) {
      return {
        totalArea: 0,
        wallPerimeter: 0,
        wallSurface: 0,
        doorCount: 0,
        windowCount: 0,
        furnitureCount: 0,
        totalCost: 0
      };
    }

    if (!metricsDirty && metricsCache) {
      return metricsCache;
    }

    const budget = computeBudget(plan);
    metricsCache = {
      totalArea: budget.analysis.totalArea,
      wallPerimeter: budget.analysis.wallPerimeter,
      wallSurface: budget.analysis.wallSurface,
      doorCount: budget.analysis.doorCount,
      windowCount: budget.analysis.windowCount,
      furnitureCount: budget.analysis.furnitureCount,
      totalCost: budget.grandTotal
    };
    metricsDirty = false;
    return metricsCache;
  }

  // ── STATUS BAR METRICS ──

  /**
   * Update the status bar with real-time metrics.
   * Call this after plan changes to reflect current measurements.
   */
  function updateStatusBar(plan) {
    const m = getMetrics(plan);
    const parts = [];
    if (m.totalArea > 0) parts.push(`Area: ${m.totalArea.toFixed(1)}m\u00B2`);
    if (m.wallPerimeter > 0) parts.push(`Perimetro: ${m.wallPerimeter.toFixed(1)}m`);
    if (m.doorCount > 0) parts.push(`Portas: ${m.doorCount}`);
    if (m.windowCount > 0) parts.push(`Janelas: ${m.windowCount}`);
    if (m.totalCost > 0) parts.push(`Total: ${CURRENCY} ${formatNumber(m.totalCost)}`);

    const statusEl = document.getElementById('tool-status');
    if (statusEl && parts.length > 0) {
      statusEl.textContent = parts.join('  |  ');
    }
  }

  // ── MEASUREMENTS PANEL (dynamically injected) ──

  /**
   * Build and return the budget/measurements panel HTML string.
   */
  function buildPanelHTML(plan) {
    const budget = computeBudget(plan);
    const a = budget.analysis;

    // Summary card
    let html = `
    <div class="ce-panel">
      <div class="ce-header">
        <h3 class="ce-title">Orcamento e Medicoes</h3>
        <button class="ce-close-btn" id="ce-close-btn" title="Fechar">&times;</button>
      </div>

      <div class="ce-summary">
        <div class="ce-summary-card">
          <div class="ce-summary-value">${a.totalArea.toFixed(1)} m\u00B2</div>
          <div class="ce-summary-label">Area Total</div>
        </div>
        <div class="ce-summary-card">
          <div class="ce-summary-value">${a.wallPerimeter.toFixed(1)} m</div>
          <div class="ce-summary-label">Perimetro Paredes</div>
        </div>
        <div class="ce-summary-card">
          <div class="ce-summary-value">${a.doorCount}</div>
          <div class="ce-summary-label">Portas</div>
        </div>
        <div class="ce-summary-card">
          <div class="ce-summary-value">${a.windowCount}</div>
          <div class="ce-summary-label">Janelas</div>
        </div>
      </div>`;

    // Per-floor breakdown
    a.floors.forEach((floor, fi) => {
      html += `
      <div class="ce-section">
        <h4 class="ce-section-title">${escapeHtml(floor.name)} (Nivel ${floor.level})</h4>
        <table class="ce-table">
          <thead>
            <tr>
              <th>Ambiente</th>
              <th>Area (m\u00B2)</th>
              <th>Perimetro (m)</th>
              <th>Revestimento</th>
            </tr>
          </thead>
          <tbody>`;

      if (floor.rooms.length === 0) {
        html += `<tr><td colspan="4" class="ce-empty">Nenhum ambiente</td></tr>`;
      } else {
        floor.rooms.forEach(room => {
          const matName = room.floorMaterial
            ? ((typeof MaterialSystem !== 'undefined' && MaterialSystem.getFloorMaterial(room.floorMaterial))
              ? MaterialSystem.getFloorMaterial(room.floorMaterial).name : room.floorMaterial)
            : '-';
          html += `
            <tr>
              <td>${escapeHtml(room.name)}</td>
              <td>${room.area.toFixed(2)}</td>
              <td>${room.perimeter.toFixed(2)}</td>
              <td>${escapeHtml(matName)}</td>
            </tr>`;
        });
      }

      html += `
          </tbody>
        </table>
        <div class="ce-floor-summary">
          Area: ${floor.totalArea.toFixed(1)} m\u00B2 &nbsp;|&nbsp;
          Paredes: ${floor.walls.length} (${floor.wallPerimeter.toFixed(1)}m) &nbsp;|&nbsp;
          Portas: ${floor.doorCount} &nbsp;|&nbsp;
          Janelas: ${floor.windowCount} &nbsp;|&nbsp;
          Moveis: ${floor.furnitureCount}
        </div>
      </div>`;
    });

    // Floor material costs
    html += `
      <div class="ce-section">
        <h4 class="ce-section-title">Custos de Revestimento (Piso)</h4>
        <table class="ce-table ce-cost-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Area (m\u00B2)</th>
              <th>Preco/m\u00B2</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>`;

    if (budget.floorCosts.length === 0) {
      html += `<tr><td colspan="4" class="ce-empty">Nenhum revestimento definido</td></tr>`;
    } else {
      budget.floorCosts.forEach(fc => {
        html += `
            <tr>
              <td>${escapeHtml(fc.name)}</td>
              <td>${fc.area.toFixed(2)}</td>
              <td>
                <input type="number" class="ce-price-input" data-price-type="floor" data-price-id="${escapeAttr(fc.materialId)}"
                       value="${fc.pricePerM2.toFixed(0)}" min="0" step="1" title="Editar preco por m2">
              </td>
              <td class="ce-cost">${CURRENCY} ${formatNumber(fc.totalCost)}</td>
            </tr>`;
      });
    }

    html += `
          </tbody>
          <tfoot>
            <tr class="ce-total-row">
              <td colspan="3">Total Pisos</td>
              <td class="ce-cost">${CURRENCY} ${formatNumber(budget.totalFloorCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    // Wall costs
    html += `
      <div class="ce-section">
        <h4 class="ce-section-title">Custos de Pintura (Paredes)</h4>
        <table class="ce-table ce-cost-table">
          <thead>
            <tr>
              <th>Acabamento</th>
              <th>Superficie (m\u00B2)</th>
              <th>Preco/m\u00B2</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>`;

    if (budget.wallCosts.length === 0) {
      html += `<tr><td colspan="4" class="ce-empty">Nenhuma parede definida</td></tr>`;
    } else {
      budget.wallCosts.forEach(wc => {
        html += `
            <tr>
              <td>${escapeHtml(wc.name)}</td>
              <td>${wc.surface.toFixed(2)}</td>
              <td>
                <input type="number" class="ce-price-input" data-price-type="wall" data-price-id="${escapeAttr(wc.colorId)}"
                       value="${wc.pricePerM2.toFixed(0)}" min="0" step="1" title="Editar preco por m2">
              </td>
              <td class="ce-cost">${CURRENCY} ${formatNumber(wc.totalCost)}</td>
            </tr>`;
      });
    }

    html += `
          </tbody>
          <tfoot>
            <tr class="ce-total-row">
              <td colspan="3">Total Paredes</td>
              <td class="ce-cost">${CURRENCY} ${formatNumber(budget.totalWallCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    // Furniture costs
    html += `
      <div class="ce-section">
        <h4 class="ce-section-title">Custos de Mobiliario</h4>
        <table class="ce-table ce-cost-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd</th>
              <th>Preco Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>`;

    if (budget.furnitureCosts.length === 0) {
      html += `<tr><td colspan="4" class="ce-empty">Nenhum movel no projeto</td></tr>`;
    } else {
      budget.furnitureCosts.forEach(fc => {
        html += `
            <tr>
              <td>${escapeHtml(fc.name)}</td>
              <td>${fc.count}</td>
              <td>
                <input type="number" class="ce-price-input" data-price-type="furniture" data-price-id="${escapeAttr(fc.catalogId)}"
                       value="${fc.unitPrice.toFixed(0)}" min="0" step="10" title="Editar preco unitario">
              </td>
              <td class="ce-cost">${CURRENCY} ${formatNumber(fc.totalCost)}</td>
            </tr>`;
      });
    }

    html += `
          </tbody>
          <tfoot>
            <tr class="ce-total-row">
              <td colspan="3">Total Mobiliario</td>
              <td class="ce-cost">${CURRENCY} ${formatNumber(budget.totalFurnitureCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    // Labor costs
    html += `
      <div class="ce-section">
        <h4 class="ce-section-title">Mao de Obra</h4>
        <div class="ce-labor-grid">
          <label class="ce-labor-label">
            Custo por m\u00B2:
            <input type="number" class="ce-price-input ce-labor-input" id="ce-labor-per-m2"
                   value="${budget.labor.perM2.toFixed(0)}" min="0" step="1">
          </label>
          <label class="ce-labor-label">
            Custo fixo:
            <input type="number" class="ce-price-input ce-labor-input" id="ce-labor-fixed"
                   value="${budget.labor.fixed.toFixed(0)}" min="0" step="100">
          </label>
          <div class="ce-labor-result">
            Por area: ${CURRENCY} ${formatNumber(budget.labor.byArea)} &nbsp;+&nbsp;
            Fixo: ${CURRENCY} ${formatNumber(budget.labor.fixed)} &nbsp;=&nbsp;
            <strong>${CURRENCY} ${formatNumber(budget.labor.total)}</strong>
          </div>
        </div>
      </div>`;

    // Grand total
    html += `
      <div class="ce-grand-total">
        <div class="ce-grand-total-row">
          <span>Revestimentos (piso)</span>
          <span>${CURRENCY} ${formatNumber(budget.totalFloorCost)}</span>
        </div>
        <div class="ce-grand-total-row">
          <span>Pintura (paredes)</span>
          <span>${CURRENCY} ${formatNumber(budget.totalWallCost)}</span>
        </div>
        <div class="ce-grand-total-row">
          <span>Mobiliario</span>
          <span>${CURRENCY} ${formatNumber(budget.totalFurnitureCost)}</span>
        </div>
        <div class="ce-grand-total-row">
          <span>Mao de obra</span>
          <span>${CURRENCY} ${formatNumber(budget.labor.total)}</span>
        </div>
        <div class="ce-grand-total-row ce-grand-total-final">
          <span>TOTAL GERAL</span>
          <span>${CURRENCY} ${formatNumber(budget.grandTotal)}</span>
        </div>
      </div>

      <div class="ce-actions">
        <button class="ce-btn ce-btn-csv" id="ce-btn-csv" title="Exportar como CSV">Exportar CSV</button>
        <button class="ce-btn ce-btn-reset" id="ce-btn-reset" title="Restaurar precos padrao">Restaurar Precos</button>
      </div>
    </div>`;

    return html;
  }

  /**
   * Build the panel styles (injected once).
   */
  function buildPanelStyles() {
    if (document.getElementById('ce-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'ce-panel-styles';
    style.textContent = `
      .ce-panel {
        position: fixed;
        top: 48px;
        right: 0;
        bottom: 38px;
        width: 420px;
        max-width: 100vw;
        background: #12141a;
        border-left: 1px solid rgba(255,255,255,0.08);
        color: #e0e0e0;
        overflow-y: auto;
        z-index: 900;
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        box-shadow: -4px 0 24px rgba(0,0,0,0.3);
        animation: ceSlideIn 0.2s ease-out;
      }
      @keyframes ceSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .ce-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        position: sticky;
        top: 0;
        background: #12141a;
        z-index: 1;
      }
      .ce-title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #00E5CC;
      }
      .ce-close-btn {
        background: none;
        border: none;
        color: #999;
        font-size: 22px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
      }
      .ce-close-btn:hover { color: #fff; }

      .ce-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 12px 16px;
      }
      .ce-summary-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 6px;
        padding: 10px;
        text-align: center;
      }
      .ce-summary-value {
        font-size: 18px;
        font-weight: 700;
        color: #00E5CC;
      }
      .ce-summary-label {
        font-size: 10px;
        color: #888;
        text-transform: uppercase;
        margin-top: 2px;
      }

      .ce-section {
        padding: 12px 16px;
        border-top: 1px solid rgba(255,255,255,0.04);
      }
      .ce-section-title {
        font-size: 12px;
        font-weight: 600;
        color: #ccc;
        margin: 0 0 8px;
        padding-left: 8px;
        border-left: 3px solid #00E5CC;
      }

      .ce-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      .ce-table th {
        background: rgba(255,255,255,0.04);
        padding: 6px 8px;
        text-align: left;
        border: 1px solid rgba(255,255,255,0.06);
        font-weight: 600;
        color: #aaa;
        font-size: 10px;
        text-transform: uppercase;
      }
      .ce-table td {
        padding: 5px 8px;
        border: 1px solid rgba(255,255,255,0.04);
        color: #ddd;
      }
      .ce-table tr:nth-child(even) td {
        background: rgba(255,255,255,0.02);
      }
      .ce-table .ce-empty {
        color: #666;
        text-align: center;
        font-style: italic;
      }
      .ce-table .ce-cost {
        font-weight: 600;
        color: #00E5CC;
        text-align: right;
        white-space: nowrap;
      }
      .ce-table tfoot .ce-total-row td {
        font-weight: 700;
        background: rgba(0,229,204,0.06);
        border-top: 2px solid rgba(0,229,204,0.2);
      }

      .ce-price-input {
        width: 72px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 3px;
        color: #fff;
        padding: 3px 6px;
        font-size: 11px;
        font-family: 'Space Mono', monospace;
        text-align: right;
      }
      .ce-price-input:focus {
        outline: none;
        border-color: #00E5CC;
        box-shadow: 0 0 0 2px rgba(0,229,204,0.15);
      }

      .ce-floor-summary {
        font-size: 10px;
        color: #888;
        padding: 6px 0 0;
      }

      .ce-labor-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
      }
      .ce-labor-label {
        font-size: 11px;
        color: #aaa;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ce-labor-input {
        width: 90px;
      }
      .ce-labor-result {
        flex-basis: 100%;
        font-size: 11px;
        color: #ccc;
        padding-top: 4px;
      }

      .ce-grand-total {
        padding: 14px 16px;
        border-top: 2px solid rgba(0,229,204,0.15);
        background: rgba(0,229,204,0.03);
      }
      .ce-grand-total-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 12px;
        color: #bbb;
      }
      .ce-grand-total-final {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(0,229,204,0.2);
        font-size: 15px;
        font-weight: 700;
        color: #00E5CC;
      }

      .ce-actions {
        display: flex;
        gap: 8px;
        padding: 14px 16px;
        border-top: 1px solid rgba(255,255,255,0.04);
      }
      .ce-btn {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        background: rgba(255,255,255,0.04);
        color: #ddd;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }
      .ce-btn:hover {
        background: rgba(255,255,255,0.08);
        color: #fff;
      }
      .ce-btn-csv {
        border-color: rgba(0,229,204,0.3);
        color: #00E5CC;
      }
      .ce-btn-csv:hover {
        background: rgba(0,229,204,0.1);
      }
      .ce-btn-reset {
        border-color: rgba(255,100,100,0.3);
        color: #ff8888;
      }
      .ce-btn-reset:hover {
        background: rgba(255,100,100,0.1);
      }

      @media (max-width: 600px) {
        .ce-panel {
          width: 100vw;
          top: 48px;
        }
        .ce-summary {
          grid-template-columns: 1fr 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show the measurements/budget panel in the UI.
   */
  function showPanel(plan) {
    if (!plan) return;
    closePanel();
    buildPanelStyles();

    panelElement = document.createElement('div');
    panelElement.id = 'ce-panel-container';
    panelElement.innerHTML = buildPanelHTML(plan);
    document.body.appendChild(panelElement);

    // Wire panel events
    const closeBtn = document.getElementById('ce-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    const csvBtn = document.getElementById('ce-btn-csv');
    if (csvBtn) csvBtn.addEventListener('click', () => generateCSV(plan));

    const resetBtn = document.getElementById('ce-btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetPrices();
        showPanel(plan);
      });
    }

    // Wire price inputs
    panelElement.querySelectorAll('.ce-price-input[data-price-type]').forEach(input => {
      input.addEventListener('change', () => {
        const type = input.dataset.priceType;
        const id = input.dataset.priceId;
        const val = parseFloat(input.value) || 0;
        if (type === 'floor') setFloorPrice(id, val);
        else if (type === 'wall') setWallPrice(id, val);
        else if (type === 'furniture') setFurniturePrice(id, val);
        // Refresh panel to recalculate
        showPanel(plan);
      });
    });

    // Wire labor inputs
    const laborPerM2 = document.getElementById('ce-labor-per-m2');
    const laborFixed = document.getElementById('ce-labor-fixed');
    if (laborPerM2) {
      laborPerM2.addEventListener('change', () => {
        setLaborCost(parseFloat(laborPerM2.value) || 0, undefined);
        showPanel(plan);
      });
    }
    if (laborFixed) {
      laborFixed.addEventListener('change', () => {
        setLaborCost(undefined, parseFloat(laborFixed.value) || 0);
        showPanel(plan);
      });
    }

    EventBus.emit('costEstimator:panelOpened');
  }

  /**
   * Close/remove the panel from the DOM.
   */
  function closePanel() {
    if (panelElement) {
      panelElement.remove();
      panelElement = null;
      EventBus.emit('costEstimator:panelClosed');
    }
  }

  /**
   * Check whether the panel is currently visible.
   */
  function isPanelOpen() {
    return panelElement !== null;
  }

  // ── EXPORT: PDF DATA ──

  /**
   * Returns a structured budget data object suitable for inclusion
   * in a PDF document (used by pdf-export.js or similar).
   */
  function generateBudgetPDF(plan) {
    const budget = computeBudget(plan);
    const a = budget.analysis;
    const date = new Date().toLocaleDateString('pt-BR');

    return {
      title: 'Orcamento do Projeto',
      date: date,
      summary: {
        totalArea: a.totalArea,
        wallPerimeter: a.wallPerimeter,
        doorCount: a.doorCount,
        windowCount: a.windowCount,
        furnitureCount: a.furnitureCount
      },
      floorBreakdown: a.floors.map(f => ({
        name: f.name,
        rooms: f.rooms.map(r => ({
          name: r.name,
          area: r.area,
          perimeter: r.perimeter,
          material: r.floorMaterial || '-'
        })),
        totalArea: f.totalArea,
        wallPerimeter: f.wallPerimeter,
        doorCount: f.doorCount,
        windowCount: f.windowCount
      })),
      costs: {
        floor: budget.floorCosts.map(fc => ({
          name: fc.name,
          area: fc.area,
          pricePerM2: fc.pricePerM2,
          total: fc.totalCost
        })),
        wall: budget.wallCosts.map(wc => ({
          name: wc.name,
          surface: wc.surface,
          pricePerM2: wc.pricePerM2,
          total: wc.totalCost
        })),
        furniture: budget.furnitureCosts.map(fc => ({
          name: fc.name,
          count: fc.count,
          unitPrice: fc.unitPrice,
          total: fc.totalCost
        })),
        labor: budget.labor,
        totalFloor: budget.totalFloorCost,
        totalWall: budget.totalWallCost,
        totalFurniture: budget.totalFurnitureCost,
        grandTotal: budget.grandTotal
      }
    };
  }

  // ── EXPORT: CSV ──

  /**
   * Generate and trigger download of a CSV budget file.
   */
  function generateCSV(plan) {
    if (!plan) return;
    const budget = computeBudget(plan);
    const lines = [];
    const sep = ';';

    // BOM for Excel UTF-8 compatibility
    lines.push('Orcamento - Planta 3D');
    lines.push(`Data${sep}${new Date().toLocaleDateString('pt-BR')}`);
    lines.push(`Projeto${sep}${csvEscape(plan.name || 'Sem nome')}`);
    lines.push('');

    // Summary
    lines.push('RESUMO');
    lines.push(`Area total (m2)${sep}${budget.analysis.totalArea.toFixed(2)}`);
    lines.push(`Perimetro paredes (m)${sep}${budget.analysis.wallPerimeter.toFixed(2)}`);
    lines.push(`Superficie paredes (m2)${sep}${budget.analysis.wallSurface.toFixed(2)}`);
    lines.push(`Portas${sep}${budget.analysis.doorCount}`);
    lines.push(`Janelas${sep}${budget.analysis.windowCount}`);
    lines.push(`Moveis${sep}${budget.analysis.furnitureCount}`);
    lines.push('');

    // Per-floor breakdown
    budget.analysis.floors.forEach(floor => {
      lines.push(`PAVIMENTO: ${csvEscape(floor.name)}`);
      lines.push(`Ambiente${sep}Area (m2)${sep}Perimetro (m)${sep}Revestimento`);
      floor.rooms.forEach(room => {
        const matName = room.floorMaterial
          ? ((typeof MaterialSystem !== 'undefined' && MaterialSystem.getFloorMaterial(room.floorMaterial))
            ? MaterialSystem.getFloorMaterial(room.floorMaterial).name : room.floorMaterial)
          : '-';
        lines.push(`${csvEscape(room.name)}${sep}${room.area.toFixed(2)}${sep}${room.perimeter.toFixed(2)}${sep}${csvEscape(matName)}`);
      });
      lines.push('');
    });

    // Floor costs
    lines.push('CUSTOS - REVESTIMENTO (PISO)');
    lines.push(`Material${sep}Area (m2)${sep}Preco/m2 (${CURRENCY})${sep}Subtotal (${CURRENCY})`);
    budget.floorCosts.forEach(fc => {
      lines.push(`${csvEscape(fc.name)}${sep}${fc.area.toFixed(2)}${sep}${fc.pricePerM2.toFixed(2)}${sep}${fc.totalCost.toFixed(2)}`);
    });
    lines.push(`Total Pisos${sep}${sep}${sep}${budget.totalFloorCost.toFixed(2)}`);
    lines.push('');

    // Wall costs
    lines.push('CUSTOS - PINTURA (PAREDES)');
    lines.push(`Acabamento${sep}Superficie (m2)${sep}Preco/m2 (${CURRENCY})${sep}Subtotal (${CURRENCY})`);
    budget.wallCosts.forEach(wc => {
      lines.push(`${csvEscape(wc.name)}${sep}${wc.surface.toFixed(2)}${sep}${wc.pricePerM2.toFixed(2)}${sep}${wc.totalCost.toFixed(2)}`);
    });
    lines.push(`Total Paredes${sep}${sep}${sep}${budget.totalWallCost.toFixed(2)}`);
    lines.push('');

    // Furniture costs
    lines.push('CUSTOS - MOBILIARIO');
    lines.push(`Item${sep}Qtd${sep}Preco Unit. (${CURRENCY})${sep}Subtotal (${CURRENCY})`);
    budget.furnitureCosts.forEach(fc => {
      lines.push(`${csvEscape(fc.name)}${sep}${fc.count}${sep}${fc.unitPrice.toFixed(2)}${sep}${fc.totalCost.toFixed(2)}`);
    });
    lines.push(`Total Mobiliario${sep}${sep}${sep}${budget.totalFurnitureCost.toFixed(2)}`);
    lines.push('');

    // Labor
    lines.push('MAO DE OBRA');
    lines.push(`Custo por m2${sep}${budget.labor.perM2.toFixed(2)}`);
    lines.push(`Custo fixo${sep}${budget.labor.fixed.toFixed(2)}`);
    lines.push(`Total mao de obra${sep}${budget.labor.total.toFixed(2)}`);
    lines.push('');

    // Grand total
    lines.push('TOTAL GERAL');
    lines.push(`Revestimentos${sep}${budget.totalFloorCost.toFixed(2)}`);
    lines.push(`Pintura${sep}${budget.totalWallCost.toFixed(2)}`);
    lines.push(`Mobiliario${sep}${budget.totalFurnitureCost.toFixed(2)}`);
    lines.push(`Mao de obra${sep}${budget.labor.total.toFixed(2)}`);
    lines.push(`TOTAL${sep}${budget.grandTotal.toFixed(2)}`);

    // UTF-8 BOM + content
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `orcamento-${(plan.name || 'projeto').replace(/\s+/g, '-').toLowerCase()}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    EventBus.emit('costEstimator:csvExported');
  }

  // ── UTILITY FUNCTIONS ──

  function formatNumber(value) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  }

  function csvEscape(str) {
    if (!str) return '';
    const s = String(str);
    if (s.includes(';') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  // ── PUBLIC API ──

  return {
    init,
    getMetrics,
    computeBudget,
    updateStatusBar,
    showPanel,
    closePanel,
    isPanelOpen,
    generateBudgetPDF,
    generateCSV,

    // Price management
    getFloorPrice,
    setFloorPrice,
    getWallPrice,
    setWallPrice,
    getFurniturePrice,
    setFurniturePrice,
    setLaborCost,
    getLaborCost,
    resetPrices,

    // Geometry (exposed for external use / testing)
    calcPolygonArea,
    calcPolygonPerimeter,
    calcWallLength,
    calcWallSurfaceArea,

    // Analysis
    analyzePlan
  };
})();

/**
 * smart-wizard.js — FASE 8: Smart Wizard for Planta3D
 * Step-by-step guided project creation with auto-generation algorithm
 * and smart furniture/color/proportion suggestions.
 *
 * Globals used: App, EventBus, FurnitureCatalog, DataModel, LocalStorage
 */
window.SmartWizard = (() => {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  //  CONSTANTS & CONFIG
  // ════════════════════════════════════════════════════════════════

  const WALL_THICKNESS = 0.15;
  const FLOOR_HEIGHT = 2.8;
  const DOOR_WIDTH = 0.9;
  const DOOR_HEIGHT = 2.1;
  const WINDOW_WIDTH = 1.2;
  const WINDOW_HEIGHT = 1.0;
  const WINDOW_SILL = 1.0;

  const PROJECT_TYPES = [
    { id: 'casa',        label: 'Casa',           icon: 'M3 10L10 3l7 7v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z', viewBox: '0 0 20 20' },
    { id: 'apartamento', label: 'Apartamento',     icon: 'M3 2h14v16H3zM7 5h2v2H7zM11 5h2v2h-2zM7 9h2v2H7zM11 9h2v2h-2zM7 14h6v4H7z', viewBox: '0 0 20 20' },
    { id: 'comercial',   label: 'Comercial',       icon: 'M2 17V8l8-5 8 5v9zM6 11h3v6H6zM11 11h3v3h-3z', viewBox: '0 0 20 20' },
    { id: 'comodo',      label: 'Comodo unico',    icon: 'M3 4h14v12H3zM6 8h8v5H6z', viewBox: '0 0 20 20' }
  ];

  const STYLES = [
    {
      id: 'moderno',
      label: 'Moderno',
      palette: ['#2C2C2C', '#FFFFFF', '#00B4D8', '#90E0EF', '#CAF0F8'],
      wallColor: '#F5F5F5',
      floorMaterial: 'porcelain',
      floorColor: '#e8e4df'
    },
    {
      id: 'classico',
      label: 'Classico',
      palette: ['#5C4033', '#DEB887', '#FFFFF0', '#8B4513', '#FFF8DC'],
      wallColor: '#FFF8DC',
      floorMaterial: 'hardwood',
      floorColor: '#c4a882'
    },
    {
      id: 'industrial',
      label: 'Industrial',
      palette: ['#36454F', '#808080', '#C0C0C0', '#B87333', '#2F4F4F'],
      wallColor: '#D3D3D3',
      floorMaterial: 'concrete',
      floorColor: '#b0aba5'
    },
    {
      id: 'minimalista',
      label: 'Minimalista',
      palette: ['#FFFFFF', '#F5F5F5', '#333333', '#E0E0E0', '#BDBDBD'],
      wallColor: '#FFFFFF',
      floorMaterial: 'porcelain',
      floorColor: '#f0ece8'
    }
  ];

  const BUDGET_LEVELS = [
    { id: 'economico', label: 'Economico', description: 'Moveis essenciais e compactos', icon: '$' },
    { id: 'medio',     label: 'Medio',     description: 'Bom equilibrio entre qualidade e custo', icon: '$$' },
    { id: 'premium',   label: 'Premium',   description: 'Moveis de alta qualidade e completos', icon: '$$$' }
  ];

  const SIZE_PRESETS = [30, 50, 70, 100, 150, 200];

  /** Standard room dimension ranges in meters [minW, maxW, minD, maxD] */
  const ROOM_SIZE_RANGES = {
    bedroom:   { minW: 3.0, maxW: 4.0, minD: 3.5, maxD: 5.0 },
    kitchen:   { minW: 2.5, maxW: 3.0, minD: 3.0, maxD: 4.0 },
    bathroom:  { minW: 2.0, maxW: 3.0, minD: 2.5, maxD: 3.0 },
    living:    { minW: 4.0, maxW: 6.0, minD: 5.0, maxD: 7.0 },
    office:    { minW: 2.5, maxW: 3.0, minD: 3.0, maxD: 4.0 },
    laundry:   { minW: 1.8, maxW: 2.5, minD: 2.0, maxD: 3.0 },
    dining:    { minW: 3.0, maxW: 4.0, minD: 3.0, maxD: 4.5 },
    hallway:   { minW: 1.2, maxW: 1.5, minD: 2.0, maxD: 4.0 }
  };

  // ════════════════════════════════════════════════════════════════
  //  STATE
  // ════════════════════════════════════════════════════════════════

  let modalEl = null;
  let currentStep = 0;
  const TOTAL_STEPS = 5;
  let wizardConfig = {
    projectType: null,
    roomCount: 3,
    totalSize: 70,
    style: null,
    budget: null
  };

  // ════════════════════════════════════════════════════════════════
  //  8.2  SMART SUGGESTIONS
  // ════════════════════════════════════════════════════════════════

  /**
   * suggestFurniture(roomType) — returns an array of catalog item IDs
   * appropriate for the given room type.
   */
  function suggestFurniture(roomType, budget) {
    budget = budget || 'medio';

    const suggestions = {
      bedroom: {
        economico: ['bed-double', 'table-bedside', 'wardrobe-2d'],
        medio:     ['bed-queen', 'table-bedside', 'table-bedside', 'wardrobe-3d', 'chest-drawers', 'lamp-table'],
        premium:   ['bed-king', 'table-bedside', 'table-bedside', 'wardrobe-sliding', 'chest-drawers', 'desk-vanity', 'lamp-floor', 'lamp-table', 'rug-medium', 'mirror-floor']
      },
      kitchen: {
        economico: ['fridge-single', 'stove-4', 'sink-kitchen', 'counter-section'],
        medio:     ['fridge-single', 'stove-4', 'sink-kitchen', 'counter-section', 'microwave', 'pantry-cabinet'],
        premium:   ['fridge-double', 'stove-6', 'sink-kitchen', 'counter-section', 'counter-section', 'microwave', 'oven', 'dishwasher', 'hood', 'kitchen-island', 'pantry-cabinet']
      },
      bathroom: {
        economico: ['toilet', 'sink-bath', 'shower'],
        medio:     ['toilet', 'sink-bath', 'shower', 'mirror-bath', 'bath-cabinet'],
        premium:   ['toilet', 'sink-double', 'shower-rect', 'mirror-bath', 'bath-cabinet', 'towel-rack', 'bidet']
      },
      living: {
        economico: ['sofa-2seat', 'table-coffee', 'table-tv', 'tv-50'],
        medio:     ['sofa-3seat', 'table-coffee', 'table-tv', 'tv-50', 'bookcase', 'rug-medium', 'lamp-floor'],
        premium:   ['sofa-l', 'table-coffee', 'table-side', 'table-tv', 'tv-65', 'bookcase-wide', 'rug-large', 'lamp-floor', 'chandelier', 'chair-arm', 'table-console', 'plant-tall']
      },
      office: {
        economico: ['desk-standard', 'chair-office', 'bookcase'],
        medio:     ['desk-large', 'chair-office', 'bookcase', 'file-cabinet', 'lamp-desk'],
        premium:   ['desk-l', 'chair-office', 'bookcase-wide', 'file-cabinet-tall', 'lamp-desk', 'monitor', 'whiteboard', 'plant-medium']
      },
      dining: {
        economico: ['table-dining-4', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining'],
        medio:     ['table-dining-6', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining', 'sideboard'],
        premium:   ['table-dining-8', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining', 'chair-dining', 'sideboard', 'chandelier', 'rug-large']
      },
      laundry: {
        economico: ['washer', 'laundry-sink'],
        medio:     ['washer-dryer', 'laundry-sink', 'ironing-board'],
        premium:   ['washer', 'dryer', 'laundry-sink', 'ironing-board', 'drying-rack', 'shelf-wall']
      },
      hallway: {
        economico: [],
        medio:     ['bench-entry', 'shoe-rack'],
        premium:   ['bench-entry', 'shoe-rack', 'mirror-floor', 'plant-medium']
      }
    };

    const roomSuggestions = suggestions[roomType];
    if (!roomSuggestions) return [];
    return roomSuggestions[budget] || roomSuggestions['medio'] || [];
  }

  /**
   * validateProportions(room) — checks whether a room's width/depth ratio
   * is reasonable (between 1:3 and 3:1).
   */
  function validateProportions(room) {
    if (!room || !room.width || !room.depth) return { valid: false, message: 'Dimensoes ausentes' };
    const ratio = room.width / room.depth;
    const issues = [];

    if (ratio > 3 || ratio < 1 / 3) {
      issues.push('Proporcao muito estreita (' + ratio.toFixed(1) + ':1). Considere algo entre 1:3 e 3:1.');
    }
    if (room.width < 1.5) {
      issues.push('Largura muito pequena (' + room.width.toFixed(1) + 'm). Minimo recomendado: 1.5m.');
    }
    if (room.depth < 1.5) {
      issues.push('Profundidade muito pequena (' + room.depth.toFixed(1) + 'm). Minimo recomendado: 1.5m.');
    }

    const area = room.width * room.depth;
    const ranges = ROOM_SIZE_RANGES[room.type];
    if (ranges) {
      const minArea = ranges.minW * ranges.minD;
      const maxArea = ranges.maxW * ranges.maxD;
      if (area < minArea * 0.7) {
        issues.push('Area muito pequena para ' + room.type + ' (' + area.toFixed(1) + 'm2). Minimo recomendado: ' + minArea.toFixed(1) + 'm2.');
      }
      if (area > maxArea * 1.5) {
        issues.push('Area muito grande para ' + room.type + ' (' + area.toFixed(1) + 'm2). Maximo tipico: ' + maxArea.toFixed(1) + 'm2.');
      }
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * suggestColors(style) — returns a color palette object for a given style.
   */
  function suggestColors(styleId) {
    const style = STYLES.find(s => s.id === styleId);
    if (!style) {
      return { palette: ['#F5F5F5', '#E0E0E0', '#333333', '#666666', '#999999'], wallColor: '#F5F5F0', floorColor: '#e8dcc8' };
    }
    return {
      palette: style.palette,
      wallColor: style.wallColor,
      floorColor: style.floorColor,
      floorMaterial: style.floorMaterial
    };
  }

  // ════════════════════════════════════════════════════════════════
  //  8.1  LAYOUT GENERATION ALGORITHM
  // ════════════════════════════════════════════════════════════════

  /**
   * Determine which room types to create based on project type and room count.
   */
  function determineRoomTypes(projectType, roomCount) {
    if (projectType === 'comodo') {
      return [{ type: 'living', name: 'Ambiente' }];
    }

    const rooms = [];

    if (projectType === 'comercial') {
      // Commercial layout: reception, offices, bathroom, meeting room
      rooms.push({ type: 'living', name: 'Recepcao' });
      const officeCount = Math.max(1, roomCount - 2);
      for (let i = 0; i < officeCount; i++) {
        rooms.push({ type: 'office', name: 'Escritorio ' + (i + 1) });
      }
      rooms.push({ type: 'bathroom', name: 'Banheiro' });
      if (roomCount >= 5) {
        rooms.push({ type: 'dining', name: 'Sala de reuniao' });
      }
      return rooms;
    }

    // Residential layout (casa or apartamento)
    // Always include at least: 1 living, 1 kitchen, 1 bathroom
    rooms.push({ type: 'living', name: 'Sala de Estar' });
    rooms.push({ type: 'kitchen', name: 'Cozinha' });
    rooms.push({ type: 'bathroom', name: 'Banheiro' });

    let remaining = roomCount - 3;
    if (remaining < 0) remaining = 0;

    // Add bedrooms
    const bedroomCount = Math.min(remaining, Math.ceil(remaining * 0.6));
    for (let i = 0; i < bedroomCount; i++) {
      rooms.push({ type: 'bedroom', name: 'Quarto ' + (i + 1) });
    }
    remaining -= bedroomCount;

    // Fill remaining with useful rooms
    const extras = ['dining', 'office', 'laundry', 'bathroom'];
    for (let i = 0; i < remaining && i < extras.length; i++) {
      const type = extras[i];
      const names = { dining: 'Sala de Jantar', office: 'Escritorio', laundry: 'Lavanderia', bathroom: 'Banheiro 2' };
      rooms.push({ type, name: names[type] });
    }

    return rooms;
  }

  /**
   * Compute room dimensions to fit the total area, respecting standard sizes.
   */
  function computeRoomDimensions(roomDefs, totalArea) {
    const n = roomDefs.length;
    if (n === 0) return [];

    // Assign proportional weights based on room type
    const weights = {
      living:   1.5,
      kitchen:  1.0,
      bathroom: 0.5,
      bedroom:  1.2,
      office:   0.8,
      dining:   1.0,
      laundry:  0.4,
      hallway:  0.3
    };

    let totalWeight = 0;
    const roomInfos = roomDefs.map(rd => {
      const w = weights[rd.type] || 1.0;
      totalWeight += w;
      return { ...rd, weight: w };
    });

    // Distribute area by weight
    return roomInfos.map(ri => {
      const targetArea = (ri.weight / totalWeight) * totalArea;
      const range = ROOM_SIZE_RANGES[ri.type] || ROOM_SIZE_RANGES.living;

      // Choose dimensions that fit the target area
      const minArea = range.minW * range.minD;
      const maxArea = range.maxW * range.maxD;

      let area = Math.max(minArea, Math.min(maxArea, targetArea));

      // Compute width and depth from area, preferring squarish shapes
      const avgW = (range.minW + range.maxW) / 2;
      const avgD = (range.minD + range.maxD) / 2;
      const ratio = avgW / avgD;

      let width = Math.sqrt(area * ratio);
      let depth = area / width;

      // Clamp to range
      width = Math.max(range.minW, Math.min(range.maxW, width));
      depth = Math.max(range.minD, Math.min(range.maxD, depth));

      // Round to nearest 0.5m for cleaner layouts
      width = Math.round(width * 2) / 2;
      depth = Math.round(depth * 2) / 2;

      return {
        type: ri.type,
        name: ri.name,
        width,
        depth,
        area: width * depth
      };
    });
  }

  /**
   * Place rooms on a grid using a row-based or L-shaped arrangement.
   * Returns rooms with x, y position (top-left corner of each room).
   */
  function placeRooms(roomDims) {
    if (roomDims.length === 0) return [];
    if (roomDims.length === 1) {
      return [{ ...roomDims[0], x: 0, y: 0 }];
    }

    const placed = [];

    // Sort rooms: largest first (living/bedroom first gives better layouts)
    const sorted = [...roomDims].sort((a, b) => b.area - a.area);

    // Decide on layout strategy based on room count
    if (sorted.length <= 4) {
      // Simple row layout
      placeInRows(sorted, placed, 2);
    } else if (sorted.length <= 6) {
      // L-shape: top row + side column
      placeInLShape(sorted, placed);
    } else {
      // Grid-based layout for many rooms
      placeInRows(sorted, placed, 3);
    }

    return placed;
  }

  /**
   * Place rooms in rows with a given number of rooms per row.
   */
  function placeInRows(rooms, placed, roomsPerRow) {
    let curX = 0;
    let curY = 0;
    let rowMaxDepth = 0;
    let colInRow = 0;

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];

      if (colInRow >= roomsPerRow) {
        // New row
        curX = 0;
        curY += rowMaxDepth;
        rowMaxDepth = 0;
        colInRow = 0;
      }

      placed.push({ ...room, x: curX, y: curY });
      curX += room.width;
      rowMaxDepth = Math.max(rowMaxDepth, room.depth);
      colInRow++;
    }
  }

  /**
   * Place rooms in an L-shape arrangement.
   * First row: largest rooms laid horizontally.
   * Second part: remaining rooms stacked vertically on the right side.
   */
  function placeInLShape(rooms, placed) {
    // Split rooms: half in top row, rest in right column
    const topCount = Math.ceil(rooms.length / 2);
    const topRooms = rooms.slice(0, topCount);
    const sideRooms = rooms.slice(topCount);

    // Place top row
    let curX = 0;
    let topMaxDepth = 0;
    for (const room of topRooms) {
      placed.push({ ...room, x: curX, y: 0 });
      curX += room.width;
      topMaxDepth = Math.max(topMaxDepth, room.depth);
    }

    // Compute right column start X — align to the right edge of the top row
    const totalTopWidth = curX;
    // Place side rooms starting from the right portion, below the last top room
    const sideX = totalTopWidth - (sideRooms.length > 0 ? sideRooms[0].width : 0);
    let curY = topMaxDepth;

    for (const room of sideRooms) {
      placed.push({ ...room, x: sideX, y: curY });
      curY += room.depth;
    }
  }

  /**
   * Generate walls around each room. Returns an array of wall objects.
   * Shared walls between adjacent rooms are detected to avoid duplicates.
   */
  function generateWalls(placedRooms, wallColor) {
    const walls = [];
    const wallSet = new Set(); // Track existing wall segments to avoid duplicates

    function wallKey(x1, y1, x2, y2) {
      // Normalize direction so AB and BA match
      if (x1 > x2 || (x1 === x2 && y1 > y2)) {
        return x2.toFixed(2) + ',' + y2.toFixed(2) + '-' + x1.toFixed(2) + ',' + y1.toFixed(2);
      }
      return x1.toFixed(2) + ',' + y1.toFixed(2) + '-' + x2.toFixed(2) + ',' + y2.toFixed(2);
    }

    function addWall(x1, y1, x2, y2) {
      const key = wallKey(x1, y1, x2, y2);
      if (wallSet.has(key)) return null;
      wallSet.add(key);

      const id = DataModel.generateId('w');
      const wall = {
        id,
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: WALL_THICKNESS,
        height: FLOOR_HEIGHT,
        color: wallColor || '#F5F5F0'
      };
      walls.push(wall);
      return wall;
    }

    for (const room of placedRooms) {
      const x = room.x;
      const y = room.y;
      const w = room.width;
      const d = room.depth;

      // Four walls: top, right, bottom, left
      addWall(x, y, x + w, y);         // top
      addWall(x + w, y, x + w, y + d); // right
      addWall(x + w, y + d, x, y + d); // bottom
      addWall(x, y + d, x, y);         // left
    }

    return walls;
  }

  /**
   * Detect which walls are exterior (only border one room).
   */
  function classifyWalls(walls, placedRooms) {
    const classifications = new Map(); // wallId -> { isExterior, adjacentRooms }

    for (const wall of walls) {
      const mx = (wall.start.x + wall.end.x) / 2;
      const my = (wall.start.y + wall.end.y) / 2;
      const adjacent = [];

      for (const room of placedRooms) {
        const eps = 0.05;
        const onLeft   = Math.abs(mx - room.x) < eps && my >= room.y - eps && my <= room.y + room.depth + eps;
        const onRight  = Math.abs(mx - (room.x + room.width)) < eps && my >= room.y - eps && my <= room.y + room.depth + eps;
        const onTop    = Math.abs(my - room.y) < eps && mx >= room.x - eps && mx <= room.x + room.width + eps;
        const onBottom = Math.abs(my - (room.y + room.depth)) < eps && mx >= room.x - eps && mx <= room.x + room.width + eps;

        if (onLeft || onRight || onTop || onBottom) {
          adjacent.push(room);
        }
      }

      classifications.set(wall.id, {
        isExterior: adjacent.length <= 1,
        isInterior: adjacent.length >= 2,
        adjacentRooms: adjacent,
        wall
      });
    }

    return classifications;
  }

  /**
   * Generate doors between adjacent rooms (on interior walls).
   */
  function generateDoors(walls, wallClassifications) {
    const doors = [];
    const usedWalls = new Set();

    for (const [wallId, info] of wallClassifications) {
      if (!info.isInterior) continue;
      if (usedWalls.has(wallId)) continue;

      const wall = info.wall;
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const wallLen = Math.sqrt(dx * dx + dy * dy);

      if (wallLen < DOOR_WIDTH + 0.4) continue; // Wall too short for a door

      const doorPos = (wallLen - DOOR_WIDTH) / 2; // Center the door

      doors.push({
        id: DataModel.generateId('d'),
        wallId: wall.id,
        position: Math.max(0.2, doorPos),
        width: DOOR_WIDTH,
        height: DOOR_HEIGHT,
        type: 'single'
      });

      usedWalls.add(wallId);
    }

    return doors;
  }

  /**
   * Generate windows on exterior walls.
   */
  function generateWindows(walls, wallClassifications) {
    const windows = [];

    for (const [wallId, info] of wallClassifications) {
      if (!info.isExterior) continue;

      const wall = info.wall;
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const wallLen = Math.sqrt(dx * dx + dy * dy);

      if (wallLen < WINDOW_WIDTH + 0.3) continue; // Wall too short

      // Determine room type for this wall to decide window placement
      const room = info.adjacentRooms[0];
      const isBathroom = room && room.type === 'bathroom';

      const winWidth = isBathroom ? 0.6 : WINDOW_WIDTH;
      const winHeight = isBathroom ? 0.6 : WINDOW_HEIGHT;
      const winSill = isBathroom ? 1.5 : WINDOW_SILL;

      // Center the window on the wall
      const winPos = (wallLen - winWidth) / 2;

      // For long walls, place two windows
      if (wallLen > 4 && !isBathroom) {
        const spacing = wallLen / 3;
        windows.push({
          id: DataModel.generateId('win'),
          wallId: wall.id,
          position: spacing - winWidth / 2,
          width: winWidth,
          height: winHeight,
          sillHeight: winSill
        });
        windows.push({
          id: DataModel.generateId('win'),
          wallId: wall.id,
          position: spacing * 2 - winWidth / 2,
          width: winWidth,
          height: winHeight,
          sillHeight: winSill
        });
      } else {
        windows.push({
          id: DataModel.generateId('win'),
          wallId: wall.id,
          position: Math.max(0.15, winPos),
          width: winWidth,
          height: winHeight,
          sillHeight: winSill
        });
      }
    }

    return windows;
  }

  /**
   * Generate room objects with vertices for floor rendering.
   */
  function generateRoomObjects(placedRooms, styleConfig) {
    return placedRooms.map(room => {
      const x = room.x;
      const y = room.y;
      const w = room.width;
      const d = room.depth;

      return {
        id: DataModel.generateId('r'),
        name: room.name,
        type: room.type,
        vertices: [
          { x: x, y: y },
          { x: x + w, y: y },
          { x: x + w, y: y + d },
          { x: x, y: y + d }
        ],
        floorMaterial: styleConfig.floorMaterial || 'hardwood',
        floorColor: styleConfig.floorColor || '#e8dcc8'
      };
    });
  }

  /**
   * Position furniture inside rooms based on room type and style.
   */
  function generateFurniture(placedRooms, budget) {
    const furniture = [];

    for (const room of placedRooms) {
      const items = suggestFurniture(room.type, budget);
      if (items.length === 0) continue;

      const roomCenterX = room.x + room.width / 2;
      const roomCenterY = room.y + room.depth / 2;
      const margin = 0.3; // Distance from wall

      // Place furniture using a simple placement strategy
      const positions = computeFurniturePositions(room, items);

      for (let i = 0; i < items.length; i++) {
        const catalogId = items[i];
        const catalogItem = FurnitureCatalog.getItem(catalogId);
        if (!catalogItem) continue;

        const pos = positions[i] || { x: roomCenterX, y: roomCenterY, rotation: 0 };

        furniture.push({
          id: DataModel.generateId('furn'),
          catalogId: catalogId,
          position: { x: pos.x, y: pos.y },
          rotation: pos.rotation || 0,
          scale: { x: 1, y: 1, z: 1 }
        });
      }
    }

    return furniture;
  }

  /**
   * Compute positions for furniture items within a room.
   * Uses a wall-hugging strategy for large items and center for small items.
   */
  function computeFurniturePositions(room, itemIds) {
    const positions = [];
    const x = room.x;
    const y = room.y;
    const w = room.width;
    const d = room.depth;
    const margin = 0.3;

    // Define placement zones within the room
    const zones = {
      // Against top wall, centered
      topCenter: { x: x + w / 2, y: y + margin, rotation: 0 },
      // Against bottom wall, centered
      bottomCenter: { x: x + w / 2, y: y + d - margin, rotation: Math.PI },
      // Against left wall, centered
      leftCenter: { x: x + margin, y: y + d / 2, rotation: Math.PI / 2 },
      // Against right wall, centered
      rightCenter: { x: x + w - margin, y: y + d / 2, rotation: -Math.PI / 2 },
      // Room center
      center: { x: x + w / 2, y: y + d / 2, rotation: 0 },
      // Corners
      topLeft: { x: x + margin + 0.3, y: y + margin + 0.3, rotation: 0 },
      topRight: { x: x + w - margin - 0.3, y: y + margin + 0.3, rotation: 0 },
      bottomLeft: { x: x + margin + 0.3, y: y + d - margin - 0.3, rotation: Math.PI },
      bottomRight: { x: x + w - margin - 0.3, y: y + d - margin - 0.3, rotation: Math.PI }
    };

    // Room-type-specific placement strategies
    const strategies = {
      bedroom: ['topCenter', 'topLeft', 'topRight', 'rightCenter', 'bottomLeft', 'leftCenter', 'bottomCenter', 'center', 'bottomRight', 'topLeft'],
      kitchen: ['topCenter', 'topLeft', 'topRight', 'rightCenter', 'leftCenter', 'bottomCenter', 'center', 'bottomLeft', 'bottomRight', 'topCenter', 'bottomCenter'],
      bathroom: ['bottomCenter', 'topCenter', 'rightCenter', 'leftCenter', 'topLeft', 'topRight', 'center'],
      living: ['bottomCenter', 'center', 'topCenter', 'topLeft', 'rightCenter', 'leftCenter', 'topRight', 'bottomLeft', 'bottomRight', 'center', 'center', 'center'],
      office: ['topCenter', 'topLeft', 'rightCenter', 'leftCenter', 'bottomLeft', 'center', 'topRight', 'bottomCenter'],
      dining: ['center', 'topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'topCenter', 'bottomCenter', 'topLeft', 'topRight', 'rightCenter', 'leftCenter', 'center'],
      laundry: ['topCenter', 'topRight', 'rightCenter', 'leftCenter', 'bottomCenter', 'center'],
      hallway: ['leftCenter', 'rightCenter', 'topCenter', 'bottomCenter']
    };

    const strategy = strategies[room.type] || strategies.living;

    for (let i = 0; i < itemIds.length; i++) {
      const zoneName = strategy[i % strategy.length];
      const zone = zones[zoneName];
      const catalogItem = FurnitureCatalog.getItem(itemIds[i]);

      if (zone && catalogItem) {
        // Offset slightly for duplicate zone usage
        const jitter = i >= strategy.length ? (i - strategy.length + 1) * 0.4 : 0;
        positions.push({
          x: Math.max(x + margin, Math.min(x + w - margin, zone.x + jitter)),
          y: Math.max(y + margin, Math.min(y + d - margin, zone.y + jitter)),
          rotation: zone.rotation
        });
      } else {
        // Fallback: center with offset
        positions.push({
          x: x + w / 2 + (i * 0.5 - itemIds.length * 0.25),
          y: y + d / 2,
          rotation: 0
        });
      }
    }

    return positions;
  }

  /**
   * generateLayout(config) — Main function that produces a complete floor plan.
   *
   * @param {Object} config
   * @param {string} config.projectType — 'casa' | 'apartamento' | 'comercial' | 'comodo'
   * @param {number} config.roomCount — 1-10
   * @param {number} config.totalSize — Total area in m2
   * @param {string} config.style — 'moderno' | 'classico' | 'industrial' | 'minimalista'
   * @param {string} config.budget — 'economico' | 'medio' | 'premium'
   *
   * @returns {Object} A complete plan object ready for loading.
   */
  function generateLayout(config) {
    const { projectType, roomCount, totalSize, style, budget } = config;

    // 1. Get style configuration
    const styleConfig = suggestColors(style);

    // 2. Determine room types
    const roomDefs = determineRoomTypes(projectType, roomCount);

    // 3. Compute room dimensions
    const roomDims = computeRoomDimensions(roomDefs, totalSize);

    // 4. Place rooms on grid
    const placedRooms = placeRooms(roomDims);

    // 5. Generate walls
    const walls = generateWalls(placedRooms, styleConfig.wallColor);

    // 6. Classify walls (interior vs exterior)
    const wallClassifications = classifyWalls(walls, placedRooms);

    // 7. Generate doors on interior walls
    const doors = generateDoors(walls, wallClassifications);

    // 8. Generate windows on exterior walls
    const windows = generateWindows(walls, wallClassifications);

    // 9. Generate room floor objects
    const rooms = generateRoomObjects(placedRooms, styleConfig);

    // 10. Generate and place furniture
    const furniture = generateFurniture(placedRooms, budget);

    // Build plan name
    const typeNames = { casa: 'Casa', apartamento: 'Apartamento', comercial: 'Espaco Comercial', comodo: 'Ambiente Unico' };
    const planName = (typeNames[projectType] || 'Projeto') + ' — ' + totalSize + 'm2';

    // Create full plan object
    const plan = {
      id: 'plan-' + Date.now(),
      name: planName,
      schemaVersion: 2,
      units: 'meters',
      floorHeight: FLOOR_HEIGHT,
      wallThickness: WALL_THICKNESS,
      walls,
      rooms,
      doors,
      windows,
      dimensions: [],
      annotations: [],
      furniture,
      stairs: [],
      columns: []
    };

    return plan;
  }

  // ════════════════════════════════════════════════════════════════
  //  MODAL UI — MULTI-STEP WIZARD
  // ════════════════════════════════════════════════════════════════

  function open() {
    currentStep = 0;
    wizardConfig = {
      projectType: null,
      roomCount: 3,
      totalSize: 70,
      style: null,
      budget: null
    };
    createModal();
    renderStep();
    modalEl.classList.remove('hidden');
    EventBus.emit('wizard:opened');
  }

  function close() {
    if (modalEl) {
      modalEl.classList.add('hidden');
      setTimeout(() => {
        if (modalEl && modalEl.parentNode) {
          modalEl.parentNode.removeChild(modalEl);
        }
        modalEl = null;
      }, 300);
    }
    EventBus.emit('wizard:closed');
  }

  function createModal() {
    // Remove existing modal if present
    const existing = document.getElementById('smart-wizard-modal');
    if (existing) existing.parentNode.removeChild(existing);

    const overlay = document.createElement('div');
    overlay.id = 'smart-wizard-modal';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="sw-card">
        <div class="sw-header">
          <h2 class="sw-title">Smart Wizard</h2>
          <button class="sw-close" title="Fechar">&times;</button>
        </div>
        <div class="sw-progress">
          <div class="sw-progress-bar">
            <div class="sw-progress-fill" style="width: 0%"></div>
          </div>
          <div class="sw-step-labels"></div>
        </div>
        <div class="sw-body"></div>
        <div class="sw-footer">
          <button class="sw-btn sw-btn--secondary sw-btn-back" style="visibility:hidden">Voltar</button>
          <button class="sw-btn sw-btn--primary sw-btn-next">Proximo</button>
        </div>
      </div>
    `;

    // Inject styles
    injectStyles();

    // Wire close button
    overlay.querySelector('.sw-close').addEventListener('click', close);

    // Wire backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    // Wire navigation
    overlay.querySelector('.sw-btn-back').addEventListener('click', prevStep);
    overlay.querySelector('.sw-btn-next').addEventListener('click', nextStep);

    // ESC key
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', onEsc);
      }
    };
    document.addEventListener('keydown', onEsc);

    document.body.appendChild(overlay);
    modalEl = overlay;
  }

  function updateProgress() {
    if (!modalEl) return;
    const pct = ((currentStep + 1) / TOTAL_STEPS) * 100;
    modalEl.querySelector('.sw-progress-fill').style.width = pct + '%';

    const stepNames = ['Tipo', 'Comodos', 'Tamanho', 'Estilo', 'Orcamento'];
    const labelsEl = modalEl.querySelector('.sw-step-labels');
    labelsEl.innerHTML = stepNames.map((name, i) => {
      let cls = 'sw-step-label';
      if (i < currentStep) cls += ' sw-step-label--done';
      if (i === currentStep) cls += ' sw-step-label--active';
      return '<span class="' + cls + '">' + name + '</span>';
    }).join('');
  }

  function renderStep() {
    if (!modalEl) return;
    updateProgress();

    const body = modalEl.querySelector('.sw-body');
    const backBtn = modalEl.querySelector('.sw-btn-back');
    const nextBtn = modalEl.querySelector('.sw-btn-next');

    backBtn.style.visibility = currentStep > 0 ? 'visible' : 'hidden';

    if (currentStep === TOTAL_STEPS - 1) {
      nextBtn.textContent = 'Gerar Projeto';
      nextBtn.classList.add('sw-btn--generate');
    } else {
      nextBtn.textContent = 'Proximo';
      nextBtn.classList.remove('sw-btn--generate');
    }

    switch (currentStep) {
      case 0: renderStepProjectType(body); break;
      case 1: renderStepRoomCount(body); break;
      case 2: renderStepTotalSize(body); break;
      case 3: renderStepStyle(body); break;
      case 4: renderStepBudget(body); break;
    }
  }

  function nextStep() {
    // Validate current step
    if (!validateCurrentStep()) return;

    if (currentStep === TOTAL_STEPS - 1) {
      // Generate
      executeGeneration();
      return;
    }

    currentStep++;
    renderStep();
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      renderStep();
    }
  }

  function validateCurrentStep() {
    switch (currentStep) {
      case 0:
        if (!wizardConfig.projectType) {
          showStepError('Selecione um tipo de projeto');
          return false;
        }
        break;
      case 3:
        if (!wizardConfig.style) {
          showStepError('Selecione um estilo');
          return false;
        }
        break;
      case 4:
        if (!wizardConfig.budget) {
          showStepError('Selecione um nivel de orcamento');
          return false;
        }
        break;
    }
    return true;
  }

  function showStepError(msg) {
    if (!modalEl) return;
    let errorEl = modalEl.querySelector('.sw-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'sw-error';
      modalEl.querySelector('.sw-body').appendChild(errorEl);
    }
    errorEl.textContent = msg;
    setTimeout(() => { if (errorEl.parentNode) errorEl.remove(); }, 3000);
  }

  // ── STEP 1: Project Type ──

  function renderStepProjectType(body) {
    body.innerHTML = `
      <h3 class="sw-step-title">Que tipo de projeto voce quer criar?</h3>
      <p class="sw-step-desc">Escolha o tipo de edificacao para gerar um layout otimizado.</p>
      <div class="sw-cards-grid sw-cards-grid--2x2">
        ${PROJECT_TYPES.map(pt => `
          <div class="sw-option-card ${wizardConfig.projectType === pt.id ? 'sw-option-card--selected' : ''}" data-value="${pt.id}">
            <div class="sw-option-icon">
              <svg viewBox="${pt.viewBox}" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="${pt.icon}"/>
              </svg>
            </div>
            <span class="sw-option-label">${pt.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    body.querySelectorAll('.sw-option-card').forEach(card => {
      card.addEventListener('click', () => {
        wizardConfig.projectType = card.dataset.value;
        body.querySelectorAll('.sw-option-card').forEach(c => c.classList.remove('sw-option-card--selected'));
        card.classList.add('sw-option-card--selected');
      });
    });
  }

  // ── STEP 2: Room Count ──

  function renderStepRoomCount(body) {
    const isSingle = wizardConfig.projectType === 'comodo';
    const min = isSingle ? 1 : 1;
    const max = isSingle ? 1 : 10;
    const val = isSingle ? 1 : wizardConfig.roomCount;

    body.innerHTML = `
      <h3 class="sw-step-title">Quantos comodos?</h3>
      <p class="sw-step-desc">${isSingle ? 'Comodo unico selecionado.' : 'Inclui quartos, salas, cozinha, banheiros, etc.'}</p>
      <div class="sw-slider-group">
        <div class="sw-slider-value">${val}</div>
        <input type="range" class="sw-slider" min="${min}" max="${max}" value="${val}" step="1" ${isSingle ? 'disabled' : ''}>
        <div class="sw-slider-labels">
          <span>${min}</span>
          <span>${max}</span>
        </div>
      </div>
      <div class="sw-room-preview" id="sw-room-preview"></div>
    `;

    if (isSingle) {
      wizardConfig.roomCount = 1;
    }

    const slider = body.querySelector('.sw-slider');
    const valueDisplay = body.querySelector('.sw-slider-value');

    function updatePreview() {
      const count = parseInt(slider.value);
      wizardConfig.roomCount = count;
      valueDisplay.textContent = count;

      const roomDefs = determineRoomTypes(wizardConfig.projectType, count);
      const previewEl = body.querySelector('#sw-room-preview');
      previewEl.innerHTML = '<div class="sw-room-tags">' +
        roomDefs.map(rd => '<span class="sw-room-tag">' + rd.name + '</span>').join('') +
        '</div>';
    }

    slider.addEventListener('input', updatePreview);
    updatePreview();
  }

  // ── STEP 3: Total Size ──

  function renderStepTotalSize(body) {
    body.innerHTML = `
      <h3 class="sw-step-title">Qual a area total?</h3>
      <p class="sw-step-desc">Area total do projeto em metros quadrados. Escolha um valor predefinido ou insira manualmente.</p>
      <div class="sw-size-input-group">
        <input type="number" class="sw-size-input" value="${wizardConfig.totalSize}" min="10" max="500" step="1">
        <span class="sw-size-unit">m&sup2;</span>
      </div>
      <div class="sw-presets">
        ${SIZE_PRESETS.map(s => `
          <button class="sw-preset-btn ${wizardConfig.totalSize === s ? 'sw-preset-btn--active' : ''}" data-size="${s}">${s} m&sup2;</button>
        `).join('')}
      </div>
      <div class="sw-size-feedback" id="sw-size-feedback"></div>
    `;

    const input = body.querySelector('.sw-size-input');

    function updateFeedback() {
      const size = parseInt(input.value) || 70;
      wizardConfig.totalSize = Math.max(10, Math.min(500, size));
      const fb = body.querySelector('#sw-size-feedback');
      const roomDefs = determineRoomTypes(wizardConfig.projectType, wizardConfig.roomCount);
      const avgPerRoom = (wizardConfig.totalSize / roomDefs.length).toFixed(1);
      fb.textContent = roomDefs.length + ' comodos, ~' + avgPerRoom + ' m\u00B2 por comodo';

      // Update preset buttons
      body.querySelectorAll('.sw-preset-btn').forEach(btn => {
        btn.classList.toggle('sw-preset-btn--active', parseInt(btn.dataset.size) === wizardConfig.totalSize);
      });
    }

    input.addEventListener('input', updateFeedback);

    body.querySelectorAll('.sw-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const size = parseInt(btn.dataset.size);
        wizardConfig.totalSize = size;
        input.value = size;
        updateFeedback();
      });
    });

    updateFeedback();
  }

  // ── STEP 4: Style ──

  function renderStepStyle(body) {
    body.innerHTML = `
      <h3 class="sw-step-title">Qual estilo voce prefere?</h3>
      <p class="sw-step-desc">O estilo define cores, materiais e tipo de mobiliario.</p>
      <div class="sw-cards-grid sw-cards-grid--2x2">
        ${STYLES.map(st => `
          <div class="sw-option-card sw-style-card ${wizardConfig.style === st.id ? 'sw-option-card--selected' : ''}" data-value="${st.id}">
            <div class="sw-palette-preview">
              ${st.palette.map(c => '<div class="sw-palette-swatch" style="background:' + c + '"></div>').join('')}
            </div>
            <span class="sw-option-label">${st.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    body.querySelectorAll('.sw-option-card').forEach(card => {
      card.addEventListener('click', () => {
        wizardConfig.style = card.dataset.value;
        body.querySelectorAll('.sw-option-card').forEach(c => c.classList.remove('sw-option-card--selected'));
        card.classList.add('sw-option-card--selected');
      });
    });
  }

  // ── STEP 5: Budget Level ──

  function renderStepBudget(body) {
    // Build a preview summary
    const roomDefs = determineRoomTypes(wizardConfig.projectType, wizardConfig.roomCount);
    const styleLabel = (STYLES.find(s => s.id === wizardConfig.style) || {}).label || wizardConfig.style;
    const typeLabel = (PROJECT_TYPES.find(p => p.id === wizardConfig.projectType) || {}).label || wizardConfig.projectType;

    body.innerHTML = `
      <h3 class="sw-step-title">Nivel de orcamento</h3>
      <p class="sw-step-desc">Afeta a quantidade e qualidade dos moveis incluidos.</p>
      <div class="sw-cards-grid sw-cards-grid--3">
        ${BUDGET_LEVELS.map(bl => `
          <div class="sw-option-card sw-budget-card ${wizardConfig.budget === bl.id ? 'sw-option-card--selected' : ''}" data-value="${bl.id}">
            <div class="sw-budget-icon">${bl.icon}</div>
            <span class="sw-option-label">${bl.label}</span>
            <span class="sw-option-desc">${bl.description}</span>
          </div>
        `).join('')}
      </div>
      <div class="sw-summary">
        <h4 class="sw-summary-title">Resumo do projeto</h4>
        <div class="sw-summary-grid">
          <div class="sw-summary-item"><span class="sw-summary-label">Tipo</span><span class="sw-summary-value">${typeLabel}</span></div>
          <div class="sw-summary-item"><span class="sw-summary-label">Comodos</span><span class="sw-summary-value">${wizardConfig.roomCount}</span></div>
          <div class="sw-summary-item"><span class="sw-summary-label">Area</span><span class="sw-summary-value">${wizardConfig.totalSize} m\u00B2</span></div>
          <div class="sw-summary-item"><span class="sw-summary-label">Estilo</span><span class="sw-summary-value">${styleLabel}</span></div>
        </div>
        <div class="sw-summary-rooms">
          ${roomDefs.map(rd => '<span class="sw-room-tag">' + rd.name + '</span>').join('')}
        </div>
      </div>
    `;

    body.querySelectorAll('.sw-option-card').forEach(card => {
      card.addEventListener('click', () => {
        wizardConfig.budget = card.dataset.value;
        body.querySelectorAll('.sw-option-card').forEach(c => c.classList.remove('sw-option-card--selected'));
        card.classList.add('sw-option-card--selected');
      });
    });
  }

  // ── GENERATION ──

  async function executeGeneration() {
    if (!modalEl) return;

    const body = modalEl.querySelector('.sw-body');
    const footer = modalEl.querySelector('.sw-footer');
    footer.style.display = 'none';

    body.innerHTML = `
      <div class="sw-generating">
        <div class="sw-spinner"></div>
        <h3 class="sw-step-title">Gerando seu projeto...</h3>
        <p class="sw-step-desc">Criando paredes, posicionando moveis e aplicando estilo.</p>
      </div>
    `;

    // Simulate brief generation delay for UX
    await new Promise(r => setTimeout(r, 800));

    try {
      const plan = generateLayout(wizardConfig);
      DataModel.migratePlan(plan);

      // Save plan
      if (typeof LocalStorage !== 'undefined' && LocalStorage.savePlan) {
        await LocalStorage.savePlan(plan);
      }

      // Try server save
      try {
        await fetch('/api/planta3d/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: plan.name })
        });
        await fetch('/api/planta3d/plans/' + plan.id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plan)
        });
      } catch (e) {
        // Offline is okay — local storage has the plan
      }

      body.innerHTML = `
        <div class="sw-success">
          <div class="sw-success-icon">
            <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="var(--accent, #00E5CC)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="24" cy="24" r="20"/>
              <path d="M14 24l7 7 13-13"/>
            </svg>
          </div>
          <h3 class="sw-step-title">Projeto gerado com sucesso!</h3>
          <p class="sw-step-desc">${plan.walls.length} paredes, ${plan.rooms.length} comodos, ${plan.doors.length} portas, ${plan.windows.length} janelas e ${plan.furniture.length} moveis.</p>
          <button class="sw-btn sw-btn--primary sw-btn-load">Abrir Projeto</button>
        </div>
      `;

      body.querySelector('.sw-btn-load').addEventListener('click', () => {
        close();
        // Reload the page to load the new plan
        window.location.reload();
      });

      EventBus.emit('wizard:generated', plan);

    } catch (err) {
      console.error('SmartWizard generation error:', err);
      body.innerHTML = `
        <div class="sw-error-state">
          <h3 class="sw-step-title">Erro ao gerar projeto</h3>
          <p class="sw-step-desc">${err.message || 'Ocorreu um erro inesperado.'}</p>
          <button class="sw-btn sw-btn--secondary sw-btn-retry">Tentar novamente</button>
        </div>
      `;
      footer.style.display = '';
      body.querySelector('.sw-btn-retry').addEventListener('click', () => {
        currentStep = 0;
        renderStep();
        footer.style.display = '';
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  STYLES INJECTION
  // ════════════════════════════════════════════════════════════════

  let stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'smart-wizard-styles';
    style.textContent = `
      /* ── Smart Wizard Modal ── */

      #smart-wizard-modal {
        z-index: 10001;
      }

      .sw-card {
        background: var(--bg-card, #181B23);
        border: 1px solid var(--border-strong, rgba(255,255,255,0.12));
        border-radius: var(--radius-xl, 16px);
        width: 100%;
        max-width: 620px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: var(--shadow-xl, 0 20px 60px rgba(0,0,0,0.6));
        display: flex;
        flex-direction: column;
        animation: swSlideIn 0.3s var(--ease, cubic-bezier(0.22,1,0.36,1));
      }

      @keyframes swSlideIn {
        from { opacity: 0; transform: translateY(24px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Header */
      .sw-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px 12px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.06));
      }

      .sw-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--white, #F0F2F5);
        letter-spacing: -0.3px;
      }

      .sw-close {
        width: 32px;
        height: 32px;
        border: none;
        background: var(--bg-hover, #252A36);
        color: var(--text-secondary, #7D8590);
        border-radius: var(--radius, 8px);
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s;
      }
      .sw-close:hover {
        background: var(--red, #F85149);
        color: #fff;
      }

      /* Progress */
      .sw-progress {
        padding: 16px 24px 8px;
      }

      .sw-progress-bar {
        height: 4px;
        background: var(--bg-active, #2D3344);
        border-radius: 2px;
        overflow: hidden;
      }

      .sw-progress-fill {
        height: 100%;
        background: var(--accent, #00E5CC);
        border-radius: 2px;
        transition: width 0.4s var(--ease, cubic-bezier(0.22,1,0.36,1));
      }

      .sw-step-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
      }

      .sw-step-label {
        font-size: 11px;
        color: var(--text-muted, #4E5562);
        font-weight: 500;
        transition: color 0.2s;
      }
      .sw-step-label--active {
        color: var(--accent, #00E5CC);
        font-weight: 600;
      }
      .sw-step-label--done {
        color: var(--text-secondary, #7D8590);
      }

      /* Body */
      .sw-body {
        padding: 20px 24px;
        min-height: 280px;
        flex: 1;
      }

      .sw-step-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--white, #F0F2F5);
        margin-bottom: 4px;
      }

      .sw-step-desc {
        font-size: 13px;
        color: var(--text-secondary, #7D8590);
        margin-bottom: 20px;
        line-height: 1.5;
      }

      /* Option Cards Grid */
      .sw-cards-grid {
        display: grid;
        gap: 12px;
      }
      .sw-cards-grid--2x2 {
        grid-template-columns: repeat(2, 1fr);
      }
      .sw-cards-grid--3 {
        grid-template-columns: repeat(3, 1fr);
      }

      .sw-option-card {
        background: var(--bg-elevated, #1E222C);
        border: 2px solid var(--border, rgba(255,255,255,0.06));
        border-radius: var(--radius-lg, 12px);
        padding: 20px 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s var(--ease, cubic-bezier(0.22,1,0.36,1));
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }
      .sw-option-card:hover {
        border-color: var(--border-strong, rgba(255,255,255,0.12));
        background: var(--bg-hover, #252A36);
        transform: translateY(-2px);
      }
      .sw-option-card--selected {
        border-color: var(--accent, #00E5CC) !important;
        background: var(--accent-soft, rgba(0,229,204,0.08)) !important;
        box-shadow: 0 0 0 1px var(--accent, #00E5CC), 0 4px 16px rgba(0,229,204,0.1);
      }

      .sw-option-icon {
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-active, #2D3344);
        border-radius: var(--radius, 8px);
      }
      .sw-option-card--selected .sw-option-icon {
        background: rgba(0,229,204,0.15);
      }
      .sw-option-icon svg {
        color: var(--text, #C8CCD4);
      }
      .sw-option-card--selected .sw-option-icon svg {
        color: var(--accent, #00E5CC);
      }

      .sw-option-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--text, #C8CCD4);
      }
      .sw-option-card--selected .sw-option-label {
        color: var(--accent, #00E5CC);
      }

      .sw-option-desc {
        font-size: 11px;
        color: var(--text-secondary, #7D8590);
        line-height: 1.4;
      }

      /* Palette Preview */
      .sw-palette-preview {
        display: flex;
        gap: 4px;
        margin-bottom: 4px;
      }
      .sw-palette-swatch {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.1);
      }

      /* Budget Icon */
      .sw-budget-icon {
        font-size: 22px;
        font-weight: 800;
        color: var(--accent-orange, #FF9500);
        font-family: 'Space Mono', monospace;
      }
      .sw-option-card--selected .sw-budget-icon {
        color: var(--accent, #00E5CC);
      }

      /* Slider */
      .sw-slider-group {
        text-align: center;
        margin-bottom: 24px;
      }

      .sw-slider-value {
        font-size: 48px;
        font-weight: 800;
        color: var(--accent, #00E5CC);
        font-family: 'Space Mono', monospace;
        line-height: 1;
        margin-bottom: 16px;
      }

      .sw-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: var(--bg-active, #2D3344);
        outline: none;
        cursor: pointer;
      }
      .sw-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--accent, #00E5CC);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,229,204,0.3);
        transition: transform 0.15s;
      }
      .sw-slider::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .sw-slider::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--accent, #00E5CC);
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 8px rgba(0,229,204,0.3);
      }
      .sw-slider:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .sw-slider-labels {
        display: flex;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 12px;
        color: var(--text-muted, #4E5562);
      }

      /* Room preview tags */
      .sw-room-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: center;
      }

      .sw-room-tag {
        background: var(--bg-active, #2D3344);
        color: var(--text, #C8CCD4);
        padding: 4px 10px;
        border-radius: var(--radius-full, 50px);
        font-size: 12px;
        font-weight: 500;
        border: 1px solid var(--border, rgba(255,255,255,0.06));
      }

      /* Size Input */
      .sw-size-input-group {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin-bottom: 20px;
      }

      .sw-size-input {
        width: 120px;
        padding: 12px 16px;
        font-size: 24px;
        font-weight: 700;
        font-family: 'Space Mono', monospace;
        text-align: center;
        background: var(--bg-elevated, #1E222C);
        border: 2px solid var(--border-strong, rgba(255,255,255,0.12));
        border-radius: var(--radius, 8px);
        color: var(--accent, #00E5CC);
        outline: none;
        transition: border-color 0.2s;
      }
      .sw-size-input:focus {
        border-color: var(--accent, #00E5CC);
      }
      /* Hide arrows on number input */
      .sw-size-input::-webkit-inner-spin-button,
      .sw-size-input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .sw-size-input[type=number] {
        -moz-appearance: textfield;
      }

      .sw-size-unit {
        font-size: 18px;
        font-weight: 600;
        color: var(--text-secondary, #7D8590);
      }

      /* Presets */
      .sw-presets {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;
        margin-bottom: 16px;
      }

      .sw-preset-btn {
        padding: 8px 16px;
        background: var(--bg-elevated, #1E222C);
        border: 1px solid var(--border, rgba(255,255,255,0.06));
        border-radius: var(--radius-full, 50px);
        color: var(--text, #C8CCD4);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }
      .sw-preset-btn:hover {
        border-color: var(--border-strong, rgba(255,255,255,0.12));
        background: var(--bg-hover, #252A36);
      }
      .sw-preset-btn--active {
        background: var(--accent-soft, rgba(0,229,204,0.08)) !important;
        border-color: var(--accent, #00E5CC) !important;
        color: var(--accent, #00E5CC) !important;
      }

      .sw-size-feedback {
        text-align: center;
        font-size: 13px;
        color: var(--text-secondary, #7D8590);
        padding: 8px;
        background: var(--bg-elevated, #1E222C);
        border-radius: var(--radius, 8px);
      }

      /* Summary */
      .sw-summary {
        margin-top: 24px;
        padding: 16px;
        background: var(--bg-elevated, #1E222C);
        border-radius: var(--radius-lg, 12px);
        border: 1px solid var(--border, rgba(255,255,255,0.06));
      }

      .sw-summary-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary, #7D8590);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 12px;
      }

      .sw-summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }

      .sw-summary-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
      }
      .sw-summary-label {
        font-size: 13px;
        color: var(--text-secondary, #7D8590);
      }
      .sw-summary-value {
        font-size: 13px;
        font-weight: 600;
        color: var(--white, #F0F2F5);
      }

      .sw-summary-rooms {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding-top: 8px;
        border-top: 1px solid var(--border, rgba(255,255,255,0.06));
      }

      /* Footer */
      .sw-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px 20px;
        border-top: 1px solid var(--border, rgba(255,255,255,0.06));
      }

      .sw-btn {
        padding: 10px 24px;
        border: none;
        border-radius: var(--radius, 8px);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s var(--ease, cubic-bezier(0.22,1,0.36,1));
        font-family: inherit;
      }

      .sw-btn--primary {
        background: var(--accent, #00E5CC);
        color: var(--bg, #0C0E13);
      }
      .sw-btn--primary:hover {
        background: var(--accent-hover, #00C9B3);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,229,204,0.25);
      }
      .sw-btn--generate {
        background: linear-gradient(135deg, var(--accent, #00E5CC), var(--blue, #58A6FF));
        padding: 12px 32px;
        font-size: 15px;
      }
      .sw-btn--generate:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,229,204,0.3);
      }

      .sw-btn--secondary {
        background: var(--bg-hover, #252A36);
        color: var(--text, #C8CCD4);
        border: 1px solid var(--border, rgba(255,255,255,0.06));
      }
      .sw-btn--secondary:hover {
        background: var(--bg-active, #2D3344);
      }

      /* Error */
      .sw-error {
        background: rgba(248,81,73,0.1);
        border: 1px solid rgba(248,81,73,0.3);
        color: var(--red, #F85149);
        padding: 8px 14px;
        border-radius: var(--radius, 8px);
        font-size: 13px;
        margin-top: 12px;
        text-align: center;
        animation: swShake 0.4s ease;
      }

      @keyframes swShake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }

      /* Generating / Success / Error States */
      .sw-generating,
      .sw-success,
      .sw-error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40px 20px;
        min-height: 280px;
      }

      .sw-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid var(--bg-active, #2D3344);
        border-top-color: var(--accent, #00E5CC);
        border-radius: 50%;
        animation: swSpin 0.8s linear infinite;
        margin-bottom: 24px;
      }

      @keyframes swSpin {
        to { transform: rotate(360deg); }
      }

      .sw-success-icon {
        margin-bottom: 20px;
        animation: swPop 0.5s var(--ease, cubic-bezier(0.22,1,0.36,1));
      }

      @keyframes swPop {
        0% { transform: scale(0); opacity: 0; }
        60% { transform: scale(1.15); }
        100% { transform: scale(1); opacity: 1; }
      }

      .sw-success .sw-btn,
      .sw-error-state .sw-btn {
        margin-top: 20px;
      }

      /* ── Mobile adjustments ── */
      @media (max-width: 640px) {
        .sw-card {
          max-width: 100%;
          max-height: 95vh;
          border-radius: var(--radius-lg, 12px);
          margin: 8px;
        }
        .sw-cards-grid--2x2 {
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .sw-cards-grid--3 {
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .sw-option-card {
          padding: 14px 10px;
        }
        .sw-slider-value {
          font-size: 36px;
        }
        .sw-header {
          padding: 16px 16px 10px;
        }
        .sw-body {
          padding: 16px;
        }
        .sw-footer {
          padding: 12px 16px 16px;
        }
        .sw-palette-swatch {
          width: 22px;
          height: 22px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // ════════════════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════════════════

  function init() {
    // Listen for external triggers
    EventBus.on('wizard:open', open);
  }

  // ════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ════════════════════════════════════════════════════════════════

  return {
    init,
    open,
    close,
    generateLayout,
    suggestFurniture,
    validateProportions,
    suggestColors,
    determineRoomTypes,
    computeRoomDimensions
  };
})();

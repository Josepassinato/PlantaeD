/**
 * material-system.js — Floor/wall materials, procedural textures, Three.js material factories
 */
const MaterialSystem = (() => {

  const floorMaterials = [
    { id: 'hardwood', name: 'Madeira', color: '#B8956A', roughness: 0.7 },
    { id: 'hardwood-dark', name: 'Madeira escura', color: '#8B6914', roughness: 0.7 },
    { id: 'hardwood-light', name: 'Madeira clara', color: '#DEB887', roughness: 0.7 },
    { id: 'tile-white', name: 'Porcelanato branco', color: '#F0EDE8', roughness: 0.4 },
    { id: 'tile-gray', name: 'Porcelanato cinza', color: '#C0C0C0', roughness: 0.4 },
    { id: 'tile-beige', name: 'Ceramica bege', color: '#D2B48C', roughness: 0.5 },
    { id: 'tile-terracotta', name: 'Terracota', color: '#CC6644', roughness: 0.6 },
    { id: 'carpet-gray', name: 'Carpete cinza', color: '#A0A0A0', roughness: 0.95 },
    { id: 'carpet-beige', name: 'Carpete bege', color: '#C8B898', roughness: 0.95 },
    { id: 'carpet-blue', name: 'Carpete azul', color: '#6688AA', roughness: 0.95 },
    { id: 'concrete', name: 'Concreto', color: '#A0A0A0', roughness: 0.85 },
    { id: 'concrete-polished', name: 'Concreto polido', color: '#B0B0B0', roughness: 0.3 },
    { id: 'marble-white', name: 'Marmore branco', color: '#F0EDE8', roughness: 0.2 },
    { id: 'marble-black', name: 'Marmore preto', color: '#333333', roughness: 0.2 },
    { id: 'marble-carrara', name: 'Marmore carrara', color: '#E8E0D8', roughness: 0.2 },
    { id: 'stone', name: 'Pedra natural', color: '#A09080', roughness: 0.8 },
    { id: 'vinyl', name: 'Vinilico', color: '#C8B898', roughness: 0.5 },
    { id: 'laminate', name: 'Laminado', color: '#C0A070', roughness: 0.4 }
  ];

  const wallColors = [
    { id: 'white', name: 'Branco', color: '#F5F0E8' },
    { id: 'off-white', name: 'Off-white', color: '#FAF0E6' },
    { id: 'light-gray', name: 'Cinza claro', color: '#D3D3D3' },
    { id: 'warm-gray', name: 'Cinza quente', color: '#C0B8A8' },
    { id: 'beige', name: 'Bege', color: '#D2C4A8' },
    { id: 'cream', name: 'Creme', color: '#FFF8DC' },
    { id: 'light-blue', name: 'Azul claro', color: '#B0C4DE' },
    { id: 'sage', name: 'Verde sage', color: '#B2C2A8' },
    { id: 'blush', name: 'Rosa claro', color: '#E8C8C8' },
    { id: 'terracotta', name: 'Terracota', color: '#CC8866' },
    { id: 'navy', name: 'Azul marinho', color: '#2C3E6B' },
    { id: 'charcoal', name: 'Carvao', color: '#404040' }
  ];

  function getFloorMaterials() { return floorMaterials; }
  function getFloorMaterial(id) { return floorMaterials.find(m => m.id === id) || null; }
  function getWallColors() { return wallColors; }
  function getWallColor(id) { return wallColors.find(c => c.id === id) || null; }

  // ---- Procedural texture generators (Canvas 2D) ----

  function generateTexture(type, width, height) {
    width = width || 256;
    height = height || 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    switch (type) {
      case 'hardwood':
      case 'hardwood-dark':
      case 'hardwood-light':
        drawWoodTexture(ctx, width, height, type);
        break;
      case 'tile-white':
      case 'tile-gray':
      case 'tile-beige':
      case 'tile-terracotta':
        drawTileTexture(ctx, width, height, type);
        break;
      case 'carpet-gray':
      case 'carpet-beige':
      case 'carpet-blue':
        drawCarpetTexture(ctx, width, height, type);
        break;
      case 'concrete':
      case 'concrete-polished':
        drawConcreteTexture(ctx, width, height, type);
        break;
      case 'marble-white':
      case 'marble-black':
      case 'marble-carrara':
        drawMarbleTexture(ctx, width, height, type);
        break;
      case 'stone':
        drawStoneTexture(ctx, width, height);
        break;
      case 'brick':
        drawBrickTexture(ctx, width, height);
        break;
      default:
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(0, 0, width, height);
    }

    return canvas;
  }

  function drawWoodTexture(ctx, w, h, type) {
    const mat = getFloorMaterial(type) || { color: '#B8956A' };
    ctx.fillStyle = mat.color;
    ctx.fillRect(0, 0, w, h);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    const plankW = w / 4;
    for (let x = 0; x < w; x += plankW) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      // Grain within plank
      for (let i = 0; i < 8; i++) {
        const gy = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(x + 2, gy);
        ctx.bezierCurveTo(x + plankW * 0.3, gy + (Math.random() - 0.5) * 10,
          x + plankW * 0.7, gy + (Math.random() - 0.5) * 10,
          x + plankW - 2, gy + (Math.random() - 0.5) * 4);
        ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
        ctx.stroke();
      }
    }
  }

  function drawTileTexture(ctx, w, h, type) {
    const mat = getFloorMaterial(type) || { color: '#F0EDE8' };
    ctx.fillStyle = mat.color;
    ctx.fillRect(0, 0, w, h);

    const tileSize = w / 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += tileSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += tileSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // Slight color variation per tile
    for (let x = 0; x < w; x += tileSize) {
      for (let y = 0; y < h; y += tileSize) {
        const v = (Math.random() - 0.5) * 10;
        ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      }
    }
  }

  function drawCarpetTexture(ctx, w, h, type) {
    const mat = getFloorMaterial(type) || { color: '#A0A0A0' };
    ctx.fillStyle = mat.color;
    ctx.fillRect(0, 0, w, h);

    // Noise pattern
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function drawConcreteTexture(ctx, w, h, type) {
    const mat = getFloorMaterial(type) || { color: '#A0A0A0' };
    ctx.fillStyle = mat.color;
    ctx.fillRect(0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 30;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function drawMarbleTexture(ctx, w, h, type) {
    const mat = getFloorMaterial(type) || { color: '#F0EDE8' };
    ctx.fillStyle = mat.color;
    ctx.fillRect(0, 0, w, h);

    // Veins
    ctx.strokeStyle = 'rgba(128,128,128,0.15)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let x = Math.random() * w, y = 0;
      ctx.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += (Math.random() - 0.5) * w * 0.3;
        y += h / 8 + (Math.random() - 0.5) * h * 0.05;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawStoneTexture(ctx, w, h) {
    ctx.fillStyle = '#A09080';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 10 + Math.random() * 30;
      const v = Math.random() * 40 - 20;
      ctx.fillStyle = `rgba(${128 + v}, ${112 + v}, ${96 + v}, 0.5)`;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBrickTexture(ctx, w, h) {
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(0, 0, w, h);

    const bw = w / 4, bh = h / 8;
    for (let row = 0; row < 8; row++) {
      const offset = (row % 2) * bw * 0.5;
      for (let col = -1; col < 5; col++) {
        const x = col * bw + offset;
        const v = Math.random() * 30;
        ctx.fillStyle = `rgb(${170 + v}, ${80 + v * 0.5}, ${60 + v * 0.3})`;
        ctx.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
      }
    }
  }

  // ---- Three.js material factories ----

  function createThreeFloorMaterial(materialId) {
    const mat = getFloorMaterial(materialId);
    if (!mat) return null;

    const texCanvas = generateTexture(materialId);
    const texture = new THREE.CanvasTexture(texCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    return new THREE.MeshStandardMaterial({
      map: texture,
      color: mat.color,
      roughness: mat.roughness,
      metalness: 0,
      side: THREE.DoubleSide
    });
  }

  function createThreeWallMaterial(colorOrId) {
    const wc = getWallColor(colorOrId);
    const color = wc ? wc.color : colorOrId;

    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
      metalness: 0
    });
  }

  /** Get 2D fill color/pattern for canvas rendering */
  function get2DFloorStyle(ctx, materialId, scale) {
    const mat = getFloorMaterial(materialId);
    return mat ? mat.color : '#e8dcc8';
  }

  return {
    getFloorMaterials, getFloorMaterial, getWallColors, getWallColor,
    generateTexture, createThreeFloorMaterial, createThreeWallMaterial,
    get2DFloorStyle
  };
})();

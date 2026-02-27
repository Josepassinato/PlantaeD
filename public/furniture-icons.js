/**
 * furniture-icons.js — 2D top-down canvas rendering per furniture type
 */
const FurnitureIcons = (() => {
  const cache = {};

  /**
   * Draw a furniture item from top-down view onto a 2D canvas context
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} catalogId
   * @param {number} x - center x in world coords
   * @param {number} y - center y in world coords
   * @param {number} width - world width
   * @param {number} depth - world depth
   * @param {number} rotation - radians
   * @param {string} color - override color
   */
  function draw(ctx, catalogId, x, y, width, depth, rotation, color) {
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);

    const hw = width / 2;
    const hd = depth / 2;
    const c = color || '#8B7355';

    // Get the category for specialized rendering
    const item = FurnitureCatalog.getItem(catalogId);
    const cat = item ? item.category : '';

    switch (cat) {
      case 'beds':
        drawBed(ctx, hw, hd, c);
        break;
      case 'sofas':
        drawSofa(ctx, hw, hd, c, catalogId);
        break;
      case 'chairs':
        drawChair(ctx, hw, hd, c);
        break;
      case 'tables':
        drawTable(ctx, hw, hd, c, catalogId);
        break;
      case 'bathroom':
        drawBathroom(ctx, hw, hd, c, catalogId);
        break;
      case 'kitchen':
        drawKitchen(ctx, hw, hd, c, catalogId);
        break;
      case 'plants':
        drawPlant(ctx, hw, hd, c);
        break;
      case 'lighting':
        drawLight(ctx, hw, hd, c);
        break;
      default:
        drawGeneric(ctx, hw, hd, c);
    }

    ctx.restore();
  }

  function drawBed(ctx, hw, hd, c) {
    // Mattress
    ctx.fillStyle = c;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.02;
    roundRect(ctx, -hw, -hd, hw * 2, hd * 2, 0.05);
    ctx.fill();
    ctx.stroke();

    // Pillow(s)
    ctx.fillStyle = '#F5F0EB';
    const pillowW = hw * 0.4;
    const pillowH = hd * 0.15;
    const pillowY = -hd + pillowH * 0.8;
    if (hw > 0.6) {
      // Two pillows
      roundRect(ctx, -hw + 0.05, pillowY, pillowW, pillowH, 0.03);
      ctx.fill();
      roundRect(ctx, hw - pillowW - 0.05, pillowY, pillowW, pillowH, 0.03);
      ctx.fill();
    } else {
      roundRect(ctx, -hw + 0.05, pillowY, hw * 2 - 0.1, pillowH, 0.03);
      ctx.fill();
    }

    // Headboard
    ctx.fillStyle = darken(c, 0.3);
    ctx.fillRect(-hw, -hd, hw * 2, 0.06);
  }

  function drawSofa(ctx, hw, hd, c, catalogId) {
    // Back
    ctx.fillStyle = darken(c, 0.2);
    roundRect(ctx, -hw, -hd, hw * 2, 0.12, 0.03);
    ctx.fill();

    // Seat
    ctx.fillStyle = c;
    roundRect(ctx, -hw, -hd + 0.1, hw * 2, hd * 2 - 0.1, 0.05);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.02;
    ctx.stroke();

    // Arms
    ctx.fillStyle = darken(c, 0.15);
    roundRect(ctx, -hw, -hd, 0.1, hd * 2, 0.03);
    ctx.fill();
    roundRect(ctx, hw - 0.1, -hd, 0.1, hd * 2, 0.03);
    ctx.fill();

    // Cushion lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.01;
    const seats = catalogId && catalogId.includes('3seat') ? 3 : 2;
    const seatW = (hw * 2 - 0.2) / seats;
    for (let i = 1; i < seats; i++) {
      ctx.beginPath();
      ctx.moveTo(-hw + 0.1 + i * seatW, -hd + 0.2);
      ctx.lineTo(-hw + 0.1 + i * seatW, hd - 0.05);
      ctx.stroke();
    }
  }

  function drawChair(ctx, hw, hd, c) {
    // Seat
    ctx.fillStyle = c;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.02;
    roundRect(ctx, -hw, -hd, hw * 2, hd * 2, 0.04);
    ctx.fill();
    ctx.stroke();

    // Back
    ctx.fillStyle = darken(c, 0.2);
    roundRect(ctx, -hw + 0.02, -hd, hw * 2 - 0.04, 0.06, 0.02);
    ctx.fill();
  }

  function drawTable(ctx, hw, hd, c, catalogId) {
    ctx.fillStyle = c;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.02;

    if (catalogId && catalogId.includes('round')) {
      ctx.beginPath();
      ctx.ellipse(0, 0, hw, hd, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      roundRect(ctx, -hw, -hd, hw * 2, hd * 2, 0.03);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawBathroom(ctx, hw, hd, c, catalogId) {
    ctx.fillStyle = c;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.02;

    if (catalogId === 'toilet') {
      // Bowl
      ctx.beginPath();
      ctx.ellipse(0, hd * 0.2, hw * 0.8, hd * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Tank
      roundRect(ctx, -hw * 0.7, -hd, hw * 1.4, hd * 0.5, 0.03);
      ctx.fill();
      ctx.stroke();
    } else if (catalogId === 'bathtub') {
      roundRect(ctx, -hw, -hd, hw * 2, hd * 2, hw * 0.5);
      ctx.fill();
      ctx.stroke();
      // Inner
      ctx.fillStyle = lighten(c, 0.1);
      roundRect(ctx, -hw + 0.05, -hd + 0.05, hw * 2 - 0.1, hd * 2 - 0.1, hw * 0.4);
      ctx.fill();
    } else if (catalogId && catalogId.includes('shower')) {
      roundRect(ctx, -hw, -hd, hw * 2, hd * 2, 0.03);
      ctx.fill();
      ctx.stroke();
      // Drain circle
      ctx.beginPath();
      ctx.arc(0, 0, 0.05, 0, Math.PI * 2);
      ctx.strokeStyle = '#888';
      ctx.stroke();
    } else {
      // Generic sink/bidet
      roundRect(ctx, -hw, -hd, hw * 2, hd * 2, 0.05);
      ctx.fill();
      ctx.stroke();
      // Basin
      ctx.beginPath();
      ctx.ellipse(0, 0, hw * 0.6, hd * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.stroke();
    }
  }

  function drawKitchen(ctx, hw, hd, c, catalogId) {
    ctx.fillStyle = c;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.02;
    roundRect(ctx, -hw, -hd, hw * 2, hd * 2, 0.03);
    ctx.fill();
    ctx.stroke();

    if (catalogId && catalogId.includes('stove')) {
      // Burners
      const burners = catalogId.includes('6') ? 6 : 4;
      const cols = burners <= 4 ? 2 : 3;
      const rows = 2;
      const sx = hw * 2 / (cols + 1);
      const sy = hd * 2 / (rows + 1);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 0.015;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r * cols + c >= burners) break;
          const bx = -hw + sx * (c + 1);
          const by = -hd + sy * (r + 1);
          ctx.beginPath();
          ctx.arc(bx, by, 0.07, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    } else if (catalogId && catalogId.includes('sink')) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, 0, hw * 0.5, hd * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (catalogId && catalogId.includes('fridge')) {
      // Door line
      ctx.beginPath();
      ctx.moveTo(-hw, 0);
      ctx.lineTo(hw, 0);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.stroke();
    }
  }

  function drawPlant(ctx, hw, hd, c) {
    // Pot
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(hw, hd) * 0.6, 0, Math.PI * 2);
    ctx.fill();
    // Foliage
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(hw, hd), 0, Math.PI * 2);
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawLight(ctx, hw, hd, c) {
    ctx.fillStyle = c;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(hw, hd), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Inner
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(hw, hd) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGeneric(ctx, hw, hd, c) {
    ctx.fillStyle = c;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.02;
    roundRect(ctx, -hw, -hd, hw * 2, hd * 2, 0.03);
    ctx.fill();
    ctx.stroke();

    // X cross to indicate furniture
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 0.01;
    ctx.beginPath();
    ctx.moveTo(-hw, -hd);
    ctx.lineTo(hw, hd);
    ctx.moveTo(hw, -hd);
    ctx.lineTo(-hw, hd);
    ctx.stroke();
  }

  /** Generate a thumbnail canvas for catalog panel */
  function getThumbnail(catalogId, size) {
    size = size || 48;
    const key = catalogId + '-' + size;
    if (cache[key]) return cache[key];

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const item = FurnitureCatalog.getItem(catalogId);
    if (!item) return canvas;

    // Scale to fit
    const maxDim = Math.max(item.width, item.depth);
    const scale = (size - 8) / maxDim;

    ctx.translate(size / 2, size / 2);
    ctx.scale(scale, scale);

    draw(ctx, catalogId, 0, 0, item.width, item.depth, 0, item.color);

    cache[key] = canvas;
    return canvas;
  }

  // Helpers
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function darken(hex, amount) {
    const rgb = hexToRgb(hex);
    return `rgb(${Math.max(0, rgb.r * (1 - amount)) | 0}, ${Math.max(0, rgb.g * (1 - amount)) | 0}, ${Math.max(0, rgb.b * (1 - amount)) | 0})`;
  }

  function lighten(hex, amount) {
    const rgb = hexToRgb(hex);
    return `rgb(${Math.min(255, rgb.r + (255 - rgb.r) * amount) | 0}, ${Math.min(255, rgb.g + (255 - rgb.g) * amount) | 0}, ${Math.min(255, rgb.b + (255 - rgb.b) * amount) | 0})`;
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return {
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16)
    };
  }

  return { draw, getThumbnail };
})();

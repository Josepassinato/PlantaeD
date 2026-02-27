/**
 * pdf-export.js — Professional PDF generation from plan data
 * Generates multi-page PDF with 2D floor plan, 3D view, dimensions, and BoM
 * Uses browser print API with a styled print layout
 */
const PDFExport = (() => {

  /**
   * Generate and trigger download of a PDF-ready HTML document
   */
  function exportPDF(plan, options) {
    if (!plan) return;
    options = options || {};

    const clientName = options.clientName || '';
    const projectDate = new Date().toLocaleDateString('pt-BR');
    const planName = plan.name || 'Projeto';

    // Capture 2D view
    const canvas2D = capture2DView(plan);
    // Capture 3D view
    const canvas3D = capture3DView();

    // Calculate areas
    const rooms = plan.rooms || [];
    const totalArea = rooms.reduce((sum, r) => sum + calcArea(r.vertices || []), 0);

    // Build BoM (Bill of Materials)
    const bom = buildBoM(plan);

    // Build HTML document for printing
    const html = buildPrintHTML({
      planName,
      clientName,
      projectDate,
      canvas2D,
      canvas3D,
      rooms,
      totalArea,
      bom,
      plan
    });

    // Open in new window and print
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permita pop-ups para exportar PDF');
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for images to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }

  function capture2DView(plan) {
    try {
      const edCanvas = Editor2D.getCanvas();
      if (!edCanvas) return null;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = 1200;
      offCanvas.height = 800;
      const ctx = offCanvas.getContext('2d');

      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);

      // Get view state and render
      const vs = Editor2D.getViewState();
      ctx.save();
      ctx.translate(offCanvas.width / 2, offCanvas.height / 2);
      ctx.scale(vs.zoom * 0.8, vs.zoom * 0.8);
      ctx.translate(-vs.pan.x / vs.zoom, -vs.pan.y / vs.zoom);

      const tempVS = Object.assign({}, vs, {
        showGrid: false,
        selection: null,
        hoverElement: null,
        snapPoints: null
      });
      CanvasRenderer.render(ctx, offCanvas, plan, tempVS);
      ctx.restore();

      return offCanvas.toDataURL('image/png');
    } catch (e) {
      console.warn('2D capture failed:', e);
      return null;
    }
  }

  function capture3DView() {
    try {
      const renderer = ThreeScene.getRenderer();
      const scene = ThreeScene.getScene();
      const camera = ThreeScene.getCamera();
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    } catch (e) {
      console.warn('3D capture failed:', e);
      return null;
    }
  }

  function buildBoM(plan) {
    const items = [];

    // Walls
    const walls = plan.walls || [];
    if (walls.length > 0) {
      let totalWallLength = 0;
      walls.forEach(w => {
        const dx = w.end.x - w.start.x;
        const dy = w.end.y - w.start.y;
        totalWallLength += Math.sqrt(dx * dx + dy * dy);
      });
      items.push({
        category: 'Estrutura',
        name: 'Paredes',
        quantity: walls.length,
        unit: 'un',
        detail: `${totalWallLength.toFixed(1)}m lineares`
      });
    }

    // Doors
    const doors = plan.doors || [];
    if (doors.length > 0) {
      items.push({
        category: 'Aberturas',
        name: 'Portas',
        quantity: doors.length,
        unit: 'un',
        detail: doors.map(d => `${d.width || 0.9}m`).join(', ')
      });
    }

    // Windows
    const windows = plan.windows || [];
    if (windows.length > 0) {
      items.push({
        category: 'Aberturas',
        name: 'Janelas',
        quantity: windows.length,
        unit: 'un',
        detail: windows.map(w => `${w.width || 1.2}x${w.height || 1.0}m`).join(', ')
      });
    }

    // Furniture
    const furniture = plan.furniture || [];
    const furnMap = new Map();
    furniture.forEach(f => {
      const item = FurnitureCatalog.getItem(f.catalogId);
      const name = item ? item.name : f.catalogId;
      furnMap.set(name, (furnMap.get(name) || 0) + 1);
    });
    furnMap.forEach((qty, name) => {
      items.push({ category: 'Mobiliario', name, quantity: qty, unit: 'un', detail: '' });
    });

    // Floor materials
    const rooms = plan.rooms || [];
    const matMap = new Map();
    rooms.forEach(r => {
      if (r.floorMaterial) {
        const area = calcArea(r.vertices || []);
        const mat = MaterialSystem.getFloorMaterial(r.floorMaterial);
        const name = mat ? mat.name : r.floorMaterial;
        matMap.set(name, (matMap.get(name) || 0) + area);
      }
    });
    matMap.forEach((area, name) => {
      items.push({ category: 'Revestimento', name, quantity: 1, unit: '', detail: `${area.toFixed(1)}m²` });
    });

    // Columns
    if ((plan.columns || []).length > 0) {
      items.push({ category: 'Estrutura', name: 'Pilares', quantity: plan.columns.length, unit: 'un', detail: '' });
    }

    // Stairs
    if ((plan.stairs || []).length > 0) {
      items.push({ category: 'Estrutura', name: 'Escadas', quantity: plan.stairs.length, unit: 'un', detail: '' });
    }

    return items;
  }

  function buildPrintHTML(data) {
    const roomRows = data.rooms.map(r => {
      const area = calcArea(r.vertices || []);
      const mat = MaterialSystem.getFloorMaterial(r.floorMaterial);
      return `<tr>
        <td>${r.name || 'Sem nome'}</td>
        <td>${area.toFixed(2)} m²</td>
        <td>${mat ? mat.name : '-'}</td>
      </tr>`;
    }).join('');

    const bomRows = data.bom.map(b => `<tr>
      <td>${b.category}</td>
      <td>${b.name}</td>
      <td>${b.quantity} ${b.unit}</td>
      <td>${b.detail}</td>
    </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${data.planName} — Planta 3D</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; font-size: 11px; color: #333; line-height: 1.5; }
    .page { page-break-after: always; padding: 10mm 0; }
    .page:last-child { page-break-after: avoid; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #00B8A3; padding-bottom: 8px; margin-bottom: 16px; }
    .header-left h1 { font-size: 20px; color: #00B8A3; margin: 0; }
    .header-left p { font-size: 11px; color: #666; }
    .header-right { text-align: right; font-size: 10px; color: #999; }
    .header-right .brand { font-size: 16px; font-weight: bold; color: #00B8A3; }
    .section-title { font-size: 14px; font-weight: 600; color: #333; margin: 16px 0 8px; border-left: 3px solid #00B8A3; padding-left: 8px; }
    .plan-image { width: 100%; max-height: 400px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; margin: 8px 0; }
    .views-row { display: flex; gap: 12px; }
    .views-row img { width: 50%; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
    th { background: #f5f5f5; padding: 6px 8px; text-align: left; border: 1px solid #ddd; font-weight: 600; }
    td { padding: 5px 8px; border: 1px solid #ddd; }
    tr:nth-child(even) td { background: #fafafa; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
    .summary-card { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 4px; padding: 10px; text-align: center; }
    .summary-card .value { font-size: 20px; font-weight: 700; color: #00B8A3; }
    .summary-card .label { font-size: 9px; color: #888; text-transform: uppercase; }
    .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 9px; color: #aaa; display: flex; justify-content: space-between; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <!-- PAGE 1: Overview -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>${data.planName}</h1>
        <p>${data.clientName ? 'Cliente: ' + data.clientName + ' | ' : ''}Data: ${data.projectDate}</p>
      </div>
      <div class="header-right">
        <div class="brand">P3D</div>
        <div>Planta 3D — SOMA-ID</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${data.totalArea.toFixed(1)} m²</div>
        <div class="label">Area Total</div>
      </div>
      <div class="summary-card">
        <div class="value">${data.rooms.length}</div>
        <div class="label">Ambientes</div>
      </div>
      <div class="summary-card">
        <div class="value">${(data.plan.walls || []).length}</div>
        <div class="label">Paredes</div>
      </div>
    </div>

    <h3 class="section-title">Planta Baixa (2D)</h3>
    ${data.canvas2D ? `<img src="${data.canvas2D}" class="plan-image" alt="Planta 2D">` : '<p style="color:#999">Vista 2D nao disponivel</p>'}

    <h3 class="section-title">Perspectiva 3D</h3>
    ${data.canvas3D ? `<img src="${data.canvas3D}" class="plan-image" alt="Vista 3D">` : '<p style="color:#999">Vista 3D nao disponivel</p>'}

    <div class="footer">
      <span>Gerado por Planta 3D — SOMA-ID</span>
      <span>${data.projectDate}</span>
    </div>
  </div>

  <!-- PAGE 2: Details -->
  <div class="page">
    <div class="header">
      <div class="header-left">
        <h1>${data.planName} — Detalhes</h1>
      </div>
      <div class="header-right">
        <div class="brand">P3D</div>
      </div>
    </div>

    <h3 class="section-title">Ambientes</h3>
    <table>
      <thead><tr><th>Ambiente</th><th>Area</th><th>Revestimento</th></tr></thead>
      <tbody>${roomRows || '<tr><td colspan="3">Nenhum ambiente definido</td></tr>'}</tbody>
    </table>

    <h3 class="section-title">Lista de Materiais (BoM)</h3>
    <table>
      <thead><tr><th>Categoria</th><th>Item</th><th>Quantidade</th><th>Detalhe</th></tr></thead>
      <tbody>${bomRows || '<tr><td colspan="4">Nenhum item</td></tr>'}</tbody>
    </table>

    <div class="footer">
      <span>Gerado por Planta 3D — SOMA-ID</span>
      <span>${data.projectDate}</span>
    </div>
  </div>
</body>
</html>`;
  }

  function calcArea(vertices) {
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

  return { exportPDF };
})();

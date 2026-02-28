/**
 * share-manager.js — Sharing, Comments, Professional Export (Fase 6)
 */
window.ShareManager = (() => {
  let panel = null;
  let activeTab = 'share';

  function init() {
    EventBus.on('plan:changed', () => { if (panel) refreshPanel(); });
    // Check if opened as shared viewer
    if (isViewerMode()) loadSharedPlan();
  }

  // ─── SHARING (6.1) ───
  function generateShareLink(plan) {
    if (!plan) return '';
    try {
      const minimal = {
        n: plan.name,
        w: (plan.walls || []).map(w => [r(w.x1),r(w.y1),r(w.x2),r(w.y2)]),
        r: (plan.rooms || []).map(rm => ({ p: rm.points?.map(p => [r(p.x),r(p.y)]), n: rm.name, m: rm.material })),
        d: (plan.doors || []).length,
        wi: (plan.windows || []).length,
        f: (plan.furniture || []).map(f => [f.type, r(f.x), r(f.y), r(f.rotation||0)].join(',')).slice(0, 20)
      };
      const json = JSON.stringify(minimal);
      const encoded = btoa(unescape(encodeURIComponent(json)));
      return `${location.origin}${location.pathname}#share=${encoded}`;
    } catch (e) {
      return location.href;
    }
  }

  function r(n) { return Math.round((n || 0) * 100) / 100; }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  function generateQRCode(text, size) {
    size = size || 150;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Simple QR-like pattern (visual placeholder — real QR needs library)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    const modules = 25;
    const cellSize = size / modules;
    // Generate deterministic pattern from text hash
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;

    // Finder patterns (corners)
    drawFinderPattern(ctx, 0, 0, cellSize);
    drawFinderPattern(ctx, (modules - 7) * cellSize, 0, cellSize);
    drawFinderPattern(ctx, 0, (modules - 7) * cellSize, cellSize);

    // Data pattern
    const rng = mulberry32(Math.abs(hash));
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if (isFinderArea(x, y, modules)) continue;
        if (rng() > 0.5) {
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
    return canvas;
  }

  function drawFinderPattern(ctx, x, y, cell) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, 7 * cell, 7 * cell);
    ctx.fillStyle = '#FFF';
    ctx.fillRect(x + cell, y + cell, 5 * cell, 5 * cell);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell);
  }

  function isFinderArea(x, y, modules) {
    return (x < 8 && y < 8) || (x >= modules - 8 && y < 8) || (x < 8 && y >= modules - 8);
  }

  function mulberry32(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // ─── COMMENTS (6.2) ───
  function addComment(x, y, text, author) {
    const plan = App.getPlan?.();
    if (!plan) return null;
    if (!plan.comments) plan.comments = [];
    const comment = {
      id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      x, y, text,
      author: author || 'Anonimo',
      timestamp: new Date().toISOString(),
      status: 'open'
    };
    plan.comments.push(comment);
    EventBus.emit('comment:added', comment);
    return comment;
  }

  function resolveComment(id) {
    const plan = App.getPlan?.();
    if (!plan?.comments) return;
    const c = plan.comments.find(c => c.id === id);
    if (c) { c.status = 'resolved'; EventBus.emit('comment:updated', c); }
  }

  function deleteComment(id) {
    const plan = App.getPlan?.();
    if (!plan?.comments) return;
    plan.comments = plan.comments.filter(c => c.id !== id);
    EventBus.emit('comment:removed', { id });
  }

  function getComments() {
    return App.getPlan?.()?.comments || [];
  }

  function renderComments(ctx, plan, scale, offset) {
    if (!plan?.comments) return;
    plan.comments.forEach((c, i) => {
      const sx = c.x * scale + offset.x;
      const sy = c.y * scale + offset.y;
      const isResolved = c.status === 'resolved';

      // Pin shape
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = isResolved ? '#3FB950' : '#00E5CC';
      ctx.globalAlpha = isResolved ? 0.5 : 1;
      ctx.beginPath();
      ctx.arc(0, -14, 10, Math.PI, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Number
      ctx.fillStyle = '#000';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i + 1, 0, -14);
      ctx.restore();
    });
  }

  // ─── DXF EXPORT (6.3) ───
  function exportDXF(plan) {
    if (!plan) return;
    let dxf = '0\nSECTION\n2\nHEADER\n0\nENDSEC\n';
    dxf += '0\nSECTION\n2\nENTITIES\n';

    // Walls as LINE entities
    (plan.walls || []).forEach(w => {
      dxf += `0\nLINE\n8\nWALLS\n`;
      dxf += `10\n${w.x1}\n20\n${w.y1}\n30\n0\n`;
      dxf += `11\n${w.x2}\n21\n${w.y2}\n31\n0\n`;
    });

    // Rooms as LWPOLYLINE
    (plan.rooms || []).forEach(rm => {
      const pts = rm.points || [];
      if (pts.length < 3) return;
      dxf += `0\nLWPOLYLINE\n8\nROOMS\n70\n1\n90\n${pts.length}\n`;
      pts.forEach(p => { dxf += `10\n${p.x}\n20\n${p.y}\n`; });
    });

    dxf += '0\nENDSEC\n0\nEOF\n';

    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (plan.name || 'planta').replace(/\s+/g, '_') + '.dxf';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── WHATSAPP SHARE ───
  function shareViaWhatsApp(plan) {
    if (!plan) return;
    const metrics = window.CostEstimator?.getMetrics?.(plan) || {};
    const text = encodeURIComponent(
      `*${plan.name || 'Projeto Planta 3D'}*\n` +
      `Area: ${metrics.totalArea?.toFixed(1) || '?'} m²\n` +
      `Comodos: ${(plan.rooms || []).length}\n` +
      `Moveis: ${(plan.furniture || []).length}\n\n` +
      `Visualize: ${generateShareLink(plan)}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  // ─── VIEWER MODE ───
  function isViewerMode() {
    return location.hash.startsWith('#share=');
  }

  function loadSharedPlan() {
    try {
      const encoded = location.hash.replace('#share=', '');
      const json = decodeURIComponent(escape(atob(encoded)));
      const data = JSON.parse(json);
      // Reconstruct minimal plan
      const plan = {
        id: 'shared-' + Date.now(),
        name: data.n || 'Projeto Compartilhado',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: (data.w || []).map(w => ({ x1: w[0], y1: w[1], x2: w[2], y2: w[3], thickness: 0.15 })),
        rooms: (data.r || []).map(r => ({ points: (r.p || []).map(p => ({ x: p[0], y: p[1] })), name: r.n, material: r.m })),
        doors: [], windows: [], furniture: [], columns: [], stairs: [], dimensions: [], annotations: [], floors: []
      };
      if (window.App?.loadPlanDirectly) App.loadPlanDirectly(plan);
    } catch (e) {
      console.warn('Failed to load shared plan:', e);
    }
  }

  // ─── SHARE PANEL ───
  function showPanel() {
    const plan = App.getPlan?.();
    if (!plan) return;

    if (panel) panel.remove();
    panel = document.createElement('div');
    panel.className = 'modal-overlay';
    panel.id = 'share-panel';

    const link = generateShareLink(plan);
    const comments = getComments();
    const commentRows = comments.map((c, i) => `
      <div class="field-note-item" data-id="${c.id}">
        <div class="field-note-dot" style="background:${c.status === 'resolved' ? '#3FB950' : '#00E5CC'}"></div>
        <div class="field-note-content">
          <div class="field-note-text"><strong>${c.author}</strong>: ${c.text}</div>
          <div class="field-note-meta">${new Date(c.timestamp).toLocaleString('pt-BR')} · ${c.status === 'resolved' ? 'Resolvido' : 'Aberto'}</div>
        </div>
        <button class="panel-close-btn" onclick="ShareManager.resolveComment('${c.id}')" title="Resolver" style="width:20px;height:20px">&#10003;</button>
        <button class="panel-close-btn btn-delete" onclick="ShareManager.deleteComment('${c.id}')" title="Excluir" style="width:20px;height:20px">&times;</button>
      </div>
    `).join('') || '<div class="empty-state" style="padding:20px">Nenhum comentario</div>';

    panel.innerHTML = `
      <div class="modal-card share-modal" style="max-width:520px">
        <div class="modal-header">
          <h2>Compartilhar & Exportar</h2>
          <button class="modal-close" id="share-close">&times;</button>
        </div>
        <div class="share-tabs">
          <button class="share-tab active" data-tab="share">Compartilhar</button>
          <button class="share-tab" data-tab="comments">Comentarios (${comments.length})</button>
          <button class="share-tab" data-tab="export">Exportar</button>
        </div>
        <div class="share-tab-content active" data-tab="share">
          <div class="share-link-row">
            <input class="share-link-input" value="${link}" readonly id="share-link-input">
            <button class="share-copy-btn" id="share-copy-btn">Copiar</button>
          </div>
          <div class="share-qr" id="share-qr"></div>
          <button class="share-whatsapp-btn" id="share-whatsapp">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 0 0 .917.918l4.458-1.495A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.4 0-4.627-.772-6.44-2.082l-.45-.338-3.173 1.063 1.064-3.173-.338-.45A9.953 9.953 0 0 1 2 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
            Enviar via WhatsApp
          </button>
        </div>
        <div class="share-tab-content" data-tab="comments">
          <div style="padding:10px">
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <input type="text" id="comment-text" class="modal-input" placeholder="Adicionar comentario..." style="flex:1">
              <button class="modal-btn-confirm" id="comment-add">Adicionar</button>
            </div>
          </div>
          ${commentRows}
        </div>
        <div class="share-tab-content" data-tab="export">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px">
            <button class="modal-btn-confirm" id="export-pdf" style="padding:14px">PDF Profissional</button>
            <button class="modal-btn-cancel" id="export-dxf" style="padding:14px">DXF (AutoCAD)</button>
            <button class="modal-btn-cancel" id="export-csv" style="padding:14px">CSV (Orcamento)</button>
            <button class="modal-btn-cancel" id="export-png" style="padding:14px">PNG (Imagem)</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(panel);

    // QR Code
    const qrCanvas = generateQRCode(link, 120);
    document.getElementById('share-qr')?.appendChild(qrCanvas);

    // Events
    document.getElementById('share-close')?.addEventListener('click', closePanel);
    panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });

    document.getElementById('share-copy-btn')?.addEventListener('click', () => {
      copyToClipboard(link);
      const btn = document.getElementById('share-copy-btn');
      if (btn) { btn.textContent = 'Copiado!'; setTimeout(() => btn.textContent = 'Copiar', 2000); }
    });

    document.getElementById('share-whatsapp')?.addEventListener('click', () => shareViaWhatsApp(plan));

    document.getElementById('comment-add')?.addEventListener('click', () => {
      const input = document.getElementById('comment-text');
      if (input?.value.trim()) {
        addComment(2, 2, input.value.trim(), 'Voce');
        input.value = '';
        refreshPanel();
      }
    });

    // Tab switching
    panel.querySelectorAll('.share-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        panel.querySelectorAll('.share-tab').forEach(t => t.classList.remove('active'));
        panel.querySelectorAll('.share-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        panel.querySelector(`.share-tab-content[data-tab="${tab.dataset.tab}"]`)?.classList.add('active');
      });
    });

    // Export buttons
    document.getElementById('export-pdf')?.addEventListener('click', () => {
      if (window.PDFExport) PDFExport.exportPDF();
      closePanel();
    });
    document.getElementById('export-dxf')?.addEventListener('click', () => { exportDXF(plan); closePanel(); });
    document.getElementById('export-csv')?.addEventListener('click', () => {
      if (window.CostEstimator) CostEstimator.generateCSV(plan);
      closePanel();
    });
    document.getElementById('export-png')?.addEventListener('click', () => {
      if (window.App?.exportPNG) App.exportPNG();
      closePanel();
    });
  }

  function closePanel() {
    if (panel) { panel.remove(); panel = null; }
  }

  function refreshPanel() {
    if (panel) { closePanel(); showPanel(); }
  }

  return {
    init, generateShareLink, copyToClipboard, generateQRCode,
    addComment, resolveComment, deleteComment, getComments, renderComments,
    exportDXF, shareViaWhatsApp, isViewerMode, loadSharedPlan,
    showPanel, closePanel
  };
})();

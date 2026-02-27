/**
 * material-editor.js — Advanced material editing panel
 * Allows users to customize PBR properties: color, roughness, metalness, texture
 */
const MaterialEditor = (() => {
  let panelEl = null;
  let currentTarget = null; // { type: 'wall'|'room'|'furniture', element, mesh }

  function init() {
    createPanel();
  }

  function createPanel() {
    panelEl = document.createElement('div');
    panelEl.id = 'material-editor-panel';
    panelEl.className = 'material-editor hidden';
    panelEl.innerHTML = `
      <div class="material-editor-header">
        <span class="material-editor-title">Editor de Material</span>
        <button id="material-editor-close" class="panel-close-btn" title="Fechar">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>
        </button>
      </div>
      <div class="material-editor-body" id="material-editor-body"></div>
    `;
    document.body.appendChild(panelEl);

    panelEl.querySelector('#material-editor-close').addEventListener('click', close);
  }

  function open(target) {
    if (!panelEl) init();
    currentTarget = target;
    panelEl.classList.remove('hidden');
    renderControls();
  }

  function close() {
    if (panelEl) panelEl.classList.add('hidden');
    currentTarget = null;
  }

  function renderControls() {
    const body = panelEl.querySelector('#material-editor-body');
    if (!currentTarget) { body.innerHTML = ''; return; }

    const el = currentTarget.element;
    const type = currentTarget.type;

    let html = '';

    // Color picker
    const currentColor = el.color || el.floorColor || '#CCCCCC';
    html += `
      <div class="me-group">
        <label>Cor</label>
        <div class="me-color-row">
          <input type="color" id="me-color" value="${currentColor}" class="me-color-input">
          <input type="text" id="me-color-hex" value="${currentColor}" class="me-hex-input" maxlength="7">
        </div>
      </div>
    `;

    // Roughness slider
    const roughness = el.roughness !== undefined ? el.roughness : 0.8;
    html += `
      <div class="me-group">
        <label>Rugosidade <span class="me-value" id="me-rough-val">${roughness.toFixed(2)}</span></label>
        <input type="range" id="me-roughness" min="0" max="1" step="0.05" value="${roughness}" class="me-slider">
        <div class="me-slider-labels"><span>Liso</span><span>Rugoso</span></div>
      </div>
    `;

    // Metalness slider
    const metalness = el.metalness !== undefined ? el.metalness : 0;
    html += `
      <div class="me-group">
        <label>Metalico <span class="me-value" id="me-metal-val">${metalness.toFixed(2)}</span></label>
        <input type="range" id="me-metalness" min="0" max="1" step="0.05" value="${metalness}" class="me-slider">
        <div class="me-slider-labels"><span>Fosco</span><span>Metal</span></div>
      </div>
    `;

    // Preset materials (quick select)
    if (type === 'room') {
      const materials = MaterialSystem.getFloorMaterials();
      html += `
        <div class="me-group">
          <label>Material Preset</label>
          <div class="me-preset-grid">
            ${materials.map(m => `
              <button class="me-preset ${el.floorMaterial === m.id ? 'active' : ''}" data-material="${m.id}" title="${m.name}">
                <div class="me-preset-swatch" style="background:${m.color}"></div>
                <span>${m.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (type === 'wall') {
      const colors = MaterialSystem.getWallColors();
      html += `
        <div class="me-group">
          <label>Preset de Parede</label>
          <div class="me-preset-grid">
            ${colors.map(c => `
              <button class="me-preset ${el.color === c.color ? 'active' : ''}" data-wall-color="${c.color}" title="${c.name}">
                <div class="me-preset-swatch" style="background:${c.color}"></div>
                <span>${c.name}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    body.innerHTML = html;
    wireEditorEvents();
  }

  function wireEditorEvents() {
    const el = currentTarget.element;

    // Color
    const colorInput = document.getElementById('me-color');
    const hexInput = document.getElementById('me-color-hex');
    if (colorInput && hexInput) {
      colorInput.addEventListener('input', (e) => {
        applyColor(e.target.value);
        hexInput.value = e.target.value;
      });
      hexInput.addEventListener('change', (e) => {
        let v = e.target.value;
        if (!v.startsWith('#')) v = '#' + v;
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          applyColor(v);
          colorInput.value = v;
        }
      });
    }

    // Roughness
    const roughSlider = document.getElementById('me-roughness');
    if (roughSlider) {
      roughSlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        el.roughness = v;
        document.getElementById('me-rough-val').textContent = v.toFixed(2);
        emitChange();
      });
    }

    // Metalness
    const metalSlider = document.getElementById('me-metalness');
    if (metalSlider) {
      metalSlider.addEventListener('input', (e) => {
        const v = parseFloat(e.target.value);
        el.metalness = v;
        document.getElementById('me-metal-val').textContent = v.toFixed(2);
        emitChange();
      });
    }

    // Floor material presets
    document.querySelectorAll('.me-preset[data-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        el.floorMaterial = btn.dataset.material;
        document.querySelectorAll('.me-preset[data-material]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        emitChange();
      });
    });

    // Wall color presets
    document.querySelectorAll('.me-preset[data-wall-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyColor(btn.dataset.wallColor);
        colorInput.value = btn.dataset.wallColor;
        hexInput.value = btn.dataset.wallColor;
        document.querySelectorAll('.me-preset[data-wall-color]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function applyColor(color) {
    if (!currentTarget) return;
    const el = currentTarget.element;
    if (currentTarget.type === 'room') {
      el.floorColor = color;
    } else {
      el.color = color;
    }
    emitChange();
  }

  function emitChange() {
    EventBus.emit('material:applied', { type: currentTarget.type, element: currentTarget.element });
    EventBus.emit('plan:changed', window._currentPlan);
  }

  function isOpen() {
    return panelEl && !panelEl.classList.contains('hidden');
  }

  return { init, open, close, isOpen };
})();

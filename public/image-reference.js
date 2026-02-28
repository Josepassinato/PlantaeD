/**
 * image-reference.js — FASE 5: Upload Image Reference & Style Gallery for Planta3D
 *
 * 5.1  Upload image as background (JPG, PNG, PDF)
 *      - Drag-and-drop + file picker modal
 *      - Canvas rendering with opacity, scale, position
 *      - Lock/unlock, remove background
 *
 * 5.2  Style gallery with predefined palettes
 *      - 8 interior design presets
 *      - Apply color palette to project materials
 */
window.ImageReference = (() => {

  // ── Image cache ──────────────────────────────────────────────
  let cachedImage = null;   // HTMLImageElement (decoded, ready to draw)
  let cachedDataUrl = null; // for cache-invalidation check

  // ── Drag state (background image repositioning) ─────────────
  let isDragging = false;
  let dragStartScreen = null;
  let dragStartImagePos = null;

  // ── Modal DOM reference ─────────────────────────────────────
  let modalEl = null;

  // ── Style presets ───────────────────────────────────────────
  const STYLE_PRESETS = [
    {
      id: 'moderno',
      name: 'Moderno',
      description: 'Linhas limpas, tons neutros com acentos vibrantes',
      colors: ['#FFFFFF', '#F5F5F5', '#333333', '#00BCD4'],
      wallColor: '#F5F5F5',
      floorMaterial: 'tile-white',
      floorColor: '#F0EDE8',
      accentColor: '#00BCD4'
    },
    {
      id: 'classico',
      name: 'Classico',
      description: 'Tons quentes, madeira nobre, elegancia atemporal',
      colors: ['#F5E6D3', '#8B7355', '#D4A574', '#654321'],
      wallColor: '#F5E6D3',
      floorMaterial: 'hardwood',
      floorColor: '#B8956A',
      accentColor: '#654321'
    },
    {
      id: 'industrial',
      name: 'Industrial',
      description: 'Concreto aparente, metal, rusticidade urbana',
      colors: ['#4A4A4A', '#8C8C8C', '#B87333', '#2C2C2C'],
      wallColor: '#8C8C8C',
      floorMaterial: 'concrete',
      floorColor: '#A0A0A0',
      accentColor: '#B87333'
    },
    {
      id: 'minimalista',
      name: 'Minimalista',
      description: 'Pureza, funcionalidade, menos e mais',
      colors: ['#FFFFFF', '#E0E0E0', '#9E9E9E', '#212121'],
      wallColor: '#FFFFFF',
      floorMaterial: 'concrete-polished',
      floorColor: '#B0B0B0',
      accentColor: '#212121'
    },
    {
      id: 'rustico',
      name: 'Rustico',
      description: 'Tons terrosos, madeira, aconchego rural',
      colors: ['#8B6914', '#A0522D', '#DEB887', '#556B2F'],
      wallColor: '#DEB887',
      floorMaterial: 'hardwood-dark',
      floorColor: '#8B6914',
      accentColor: '#556B2F'
    },
    {
      id: 'escandinavo',
      name: 'Escandinavo',
      description: 'Luminoso, acolhedor, materiais naturais',
      colors: ['#FAFAFA', '#E8DCC8', '#A8C5D6', '#6B8E7B'],
      wallColor: '#FAFAFA',
      floorMaterial: 'hardwood-light',
      floorColor: '#DEB887',
      accentColor: '#A8C5D6'
    },
    {
      id: 'tropical',
      name: 'Tropical',
      description: 'Vibrante, verde exuberante, energia natural',
      colors: ['#2E7D32', '#FFC107', '#FF5722', '#00897B'],
      wallColor: '#FAFAFA',
      floorMaterial: 'hardwood',
      floorColor: '#B8956A',
      accentColor: '#2E7D32'
    },
    {
      id: 'boho',
      name: 'Boho',
      description: 'Eclético, quente, texturas misturadas',
      colors: ['#D4A574', '#C2185B', '#FF8F00', '#5D4037'],
      wallColor: '#FAF0E6',
      floorMaterial: 'carpet-beige',
      floorColor: '#C8B898',
      accentColor: '#C2185B'
    }
  ];

  // ── Accepted MIME types ─────────────────────────────────────
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.pdf';

  // ════════════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════════════

  function init() {
    EventBus.on('plan:loaded', _onPlanLoaded);
    EventBus.on('plan:changed', _onPlanChanged);
  }

  function _onPlanLoaded(plan) {
    if (plan && plan.backgroundImage && plan.backgroundImage.dataUrl) {
      _ensureCachedImage(plan.backgroundImage.dataUrl);
    } else {
      cachedImage = null;
      cachedDataUrl = null;
    }
  }

  function _onPlanChanged(plan) {
    if (!plan) return;
    if (plan.backgroundImage && plan.backgroundImage.dataUrl) {
      _ensureCachedImage(plan.backgroundImage.dataUrl);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  5.1  UPLOAD IMAGE AS BACKGROUND
  // ════════════════════════════════════════════════════════════

  /**
   * Show the upload / style-gallery modal.
   */
  function showUploadModal() {
    if (modalEl) {
      modalEl.classList.remove('hidden');
      _refreshModalState();
      return;
    }
    _createModal();
  }

  /**
   * Read a File, convert to data-URL, and store in plan.backgroundImage.
   */
  function loadImage(file) {
    if (!file) return;

    const plan = _getPlan();
    if (!plan) return;

    // PDF: render first page to canvas, then convert to data URL
    if (file.type === 'application/pdf') {
      _loadPdfAsImage(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      _applyImageToPlan(dataUrl);
    };
    reader.onerror = () => {
      console.error('ImageReference: failed to read file');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Render a PDF first page to a canvas, convert to PNG data URL.
   * Uses a simple approach: create an <img> with an object URL.
   * For full PDF support, a library like pdf.js would be needed,
   * but we keep it lightweight by treating the PDF as an embedded
   * object rendered as an image via createObjectURL.
   */
  function _loadPdfAsImage(file) {
    // Attempt using the browser's rendering capability
    const objectUrl = URL.createObjectURL(file);

    // Create a temporary canvas to render the PDF
    // Since direct PDF->Canvas without pdf.js is limited,
    // we use the object URL as the image source.
    // Modern browsers may support this for simple PDFs.
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(objectUrl);
      _applyImageToPlan(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback: store the PDF object URL as-is and warn the user
      console.warn('ImageReference: PDF rendering not supported natively. Storing as reference.');
      // Read as data URL directly — will show as broken image but data is preserved
      const reader = new FileReader();
      reader.onload = (ev) => {
        _applyImageToPlan(ev.target.result);
      };
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  }

  /**
   * Store data URL in the plan and cache the Image object.
   */
  function _applyImageToPlan(dataUrl) {
    const plan = _getPlan();
    if (!plan) return;

    const img = new Image();
    img.onload = () => {
      const canvas = Editor2D.getCanvas();
      const viewState = Editor2D.getViewState();
      const zoom = viewState ? viewState.zoom : 60;

      // Default: fit image to canvas view (convert pixel size to world meters)
      const imgWorldW = img.naturalWidth / zoom;
      const imgWorldH = img.naturalHeight / zoom;

      // Compute a scale so the image fits comfortably (80% of visible area)
      const canvasWorldW = canvas ? canvas.width / zoom : 20;
      const canvasWorldH = canvas ? canvas.height / zoom : 15;
      const fitScale = Math.min(
        (canvasWorldW * 0.8) / imgWorldW,
        (canvasWorldH * 0.8) / imgWorldH,
        1
      );

      plan.backgroundImage = {
        dataUrl: dataUrl,
        x: 0,
        y: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
        opacity: 0.4,
        scale: fitScale,
        locked: false
      };

      cachedImage = img;
      cachedDataUrl = dataUrl;

      Editor2D.markDirty();
      EventBus.emit('plan:changed', plan);
      _refreshModalState();
    };
    img.onerror = () => {
      console.error('ImageReference: failed to decode image data');
    };
    img.src = dataUrl;
  }

  /**
   * Ensure cachedImage is loaded for a given data URL.
   */
  function _ensureCachedImage(dataUrl) {
    if (cachedDataUrl === dataUrl && cachedImage) return;

    const img = new Image();
    img.onload = () => {
      cachedImage = img;
      cachedDataUrl = dataUrl;
      Editor2D.markDirty();
    };
    img.src = dataUrl;
  }

  /**
   * Remove the background image from the plan.
   */
  function removeBackground() {
    const plan = _getPlan();
    if (!plan) return;
    plan.backgroundImage = null;
    cachedImage = null;
    cachedDataUrl = null;
    Editor2D.markDirty();
    EventBus.emit('plan:changed', plan);
    _refreshModalState();
  }

  /**
   * Set background opacity (0 to 1).
   */
  function setOpacity(value) {
    const plan = _getPlan();
    if (!plan || !plan.backgroundImage) return;
    plan.backgroundImage.opacity = Math.max(0, Math.min(1, value));
    Editor2D.markDirty();
  }

  /**
   * Set background scale (positive float).
   */
  function setScale(value) {
    const plan = _getPlan();
    if (!plan || !plan.backgroundImage) return;
    plan.backgroundImage.scale = Math.max(0.01, value);
    Editor2D.markDirty();
  }

  /**
   * Fit the background image to fill the visible canvas.
   */
  function fitToCanvas() {
    const plan = _getPlan();
    if (!plan || !plan.backgroundImage || !cachedImage) return;
    const canvas = Editor2D.getCanvas();
    const viewState = Editor2D.getViewState();
    if (!canvas || !viewState) return;

    const zoom = viewState.zoom;
    const canvasWorldW = canvas.width / zoom;
    const canvasWorldH = canvas.height / zoom;
    const imgWorldW = plan.backgroundImage.width / zoom;
    const imgWorldH = plan.backgroundImage.height / zoom;

    plan.backgroundImage.scale = Math.min(
      (canvasWorldW * 0.9) / imgWorldW,
      (canvasWorldH * 0.9) / imgWorldH
    );
    plan.backgroundImage.x = 0;
    plan.backgroundImage.y = 0;
    Editor2D.markDirty();
    EventBus.emit('plan:changed', plan);
  }

  /**
   * Toggle lock state.
   */
  function toggleLock() {
    const plan = _getPlan();
    if (!plan || !plan.backgroundImage) return;
    plan.backgroundImage.locked = !plan.backgroundImage.locked;
    _refreshModalState();
    return plan.backgroundImage.locked;
  }

  // ════════════════════════════════════════════════════════════
  //  BACKGROUND DRAG (reposition)
  // ════════════════════════════════════════════════════════════

  /**
   * Call from Editor2D mouse-down to test if we should start dragging
   * the background image. Returns true if drag started.
   */
  function handleMouseDown(worldX, worldY, screenX, screenY) {
    const plan = _getPlan();
    if (!plan || !plan.backgroundImage || plan.backgroundImage.locked) return false;
    if (!cachedImage) return false;

    const bg = plan.backgroundImage;
    const zoom = Editor2D.getViewState().zoom;
    const imgW = (bg.width / zoom) * bg.scale;
    const imgH = (bg.height / zoom) * bg.scale;
    const left = bg.x - imgW / 2;
    const top = bg.y - imgH / 2;

    if (worldX >= left && worldX <= left + imgW && worldY >= top && worldY <= top + imgH) {
      isDragging = true;
      dragStartScreen = { x: screenX, y: screenY };
      dragStartImagePos = { x: bg.x, y: bg.y };
      return true;
    }
    return false;
  }

  function handleMouseMove(screenX, screenY) {
    if (!isDragging) return false;

    const plan = _getPlan();
    if (!plan || !plan.backgroundImage) { isDragging = false; return false; }

    const viewState = Editor2D.getViewState();
    const zoom = viewState.zoom;
    const dx = (screenX - dragStartScreen.x) / zoom;
    const dy = (screenY - dragStartScreen.y) / zoom;
    plan.backgroundImage.x = dragStartImagePos.x + dx;
    plan.backgroundImage.y = dragStartImagePos.y + dy;
    Editor2D.markDirty();
    return true;
  }

  function handleMouseUp() {
    if (!isDragging) return false;
    isDragging = false;
    dragStartScreen = null;
    dragStartImagePos = null;

    const plan = _getPlan();
    if (plan) EventBus.emit('plan:changed', plan);
    return true;
  }

  // ════════════════════════════════════════════════════════════
  //  2  RENDER ON 2D CANVAS
  // ════════════════════════════════════════════════════════════

  /**
   * Draw the background image on the 2D canvas.
   * Must be called BEFORE walls/rooms/furniture so they render on top.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} plan
   * @param {number} canvasScale  — viewState.zoom (pixels per meter)
   * @param {{ x: number, y: number }} offset — viewState.pan
   */
  function renderBackground(ctx, plan, canvasScale, offset) {
    if (!plan || !plan.backgroundImage) return;
    const bg = plan.backgroundImage;
    if (!bg.dataUrl || bg.opacity <= 0) return;

    // Ensure image is cached
    if (!cachedImage || cachedDataUrl !== bg.dataUrl) {
      _ensureCachedImage(bg.dataUrl);
      return; // will draw on next frame once loaded
    }

    const imgW = (bg.width / canvasScale) * bg.scale;
    const imgH = (bg.height / canvasScale) * bg.scale;

    // The canvas context is already translated & scaled by Editor2D
    // so we draw in world coordinates.
    const drawX = bg.x - imgW / 2;
    const drawY = bg.y - imgH / 2;

    const prevAlpha = ctx.globalAlpha;
    ctx.globalAlpha = bg.opacity;
    ctx.drawImage(cachedImage, drawX, drawY, imgW, imgH);
    ctx.globalAlpha = prevAlpha;

    // Draw border when unlocked (visual affordance for dragging)
    if (!bg.locked) {
      ctx.strokeStyle = 'rgba(0, 229, 204, 0.35)';
      ctx.lineWidth = 2 / canvasScale;
      ctx.setLineDash([6 / canvasScale, 4 / canvasScale]);
      ctx.strokeRect(drawX, drawY, imgW, imgH);
      ctx.setLineDash([]);

      // Scale handles at corners
      const handleSize = 6 / canvasScale;
      ctx.fillStyle = 'rgba(0, 229, 204, 0.7)';
      const corners = [
        [drawX, drawY],
        [drawX + imgW, drawY],
        [drawX + imgW, drawY + imgH],
        [drawX, drawY + imgH]
      ];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      });
    }
  }

  // ════════════════════════════════════════════════════════════
  //  5.2  STYLE GALLERY
  // ════════════════════════════════════════════════════════════

  /**
   * Show a standalone style gallery modal.
   */
  function showStyleGallery() {
    showUploadModal();
    // Scroll to style section after render
    setTimeout(() => {
      const section = modalEl && modalEl.querySelector('.imgref-style-gallery');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /**
   * Apply a style preset to the current project.
   */
  function applyStyle(styleName) {
    const plan = _getPlan();
    if (!plan) return;

    const preset = STYLE_PRESETS.find(s => s.id === styleName || s.name === styleName);
    if (!preset) {
      console.warn('ImageReference: unknown style preset', styleName);
      return;
    }

    // Apply wall color to all walls
    if (plan.walls && plan.walls.length > 0) {
      plan.walls.forEach(w => {
        w.color = preset.wallColor;
      });
    }

    // Apply floor material/color to all rooms
    if (plan.rooms && plan.rooms.length > 0) {
      plan.rooms.forEach(r => {
        r.floorMaterial = preset.floorMaterial;
        r.floorColor = preset.floorColor;
      });
    }

    // Store active style reference
    plan.activeStyle = preset.id;

    Editor2D.markDirty();
    EventBus.emit('plan:changed', plan);
    EventBus.emit('style:applied', { preset });

    _refreshModalState();
  }

  /**
   * Get available style presets.
   */
  function getStylePresets() {
    return STYLE_PRESETS;
  }

  // ════════════════════════════════════════════════════════════
  //  4  MODAL HTML (dynamically injected)
  // ════════════════════════════════════════════════════════════

  function _createModal() {
    modalEl = document.createElement('div');
    modalEl.id = 'imgref-modal';
    modalEl.className = 'modal-overlay';
    modalEl.innerHTML = `
      <div class="modal-card imgref-modal-card">
        <div class="modal-header">
          <h2>Imagem de Referencia & Estilos</h2>
          <button class="modal-close" id="imgref-modal-close">&times;</button>
        </div>
        <div class="modal-body imgref-modal-body">

          <!-- UPLOAD SECTION -->
          <div class="imgref-section">
            <h3 class="imgref-section-title">Imagem de Fundo</h3>

            <div class="imgref-dropzone" id="imgref-dropzone">
              <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor"
                   stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="imgref-dropzone-icon">
                <rect x="6" y="6" width="36" height="36" rx="4"/>
                <circle cx="18" cy="18" r="4" fill="rgba(0,229,204,0.2)"/>
                <path d="M6 32l10-10 8 8 4-4 14 14"/>
              </svg>
              <p class="imgref-dropzone-text">Arraste uma imagem aqui</p>
              <p class="imgref-dropzone-sub">ou</p>
              <label class="imgref-file-btn" for="imgref-file-input">
                Escolher arquivo
              </label>
              <input type="file" id="imgref-file-input" accept="${ACCEPTED_EXTENSIONS}" style="display:none">
              <p class="imgref-dropzone-hint">JPG, PNG ou PDF</p>
            </div>

            <!-- Preview & controls (shown when image loaded) -->
            <div class="imgref-preview-section hidden" id="imgref-preview-section">
              <div class="imgref-preview-box">
                <img id="imgref-preview-img" alt="Preview" class="imgref-preview-img">
              </div>

              <div class="imgref-controls">
                <div class="imgref-control-group">
                  <label class="imgref-label">
                    Opacidade
                    <span class="imgref-value" id="imgref-opacity-val">40%</span>
                  </label>
                  <input type="range" id="imgref-opacity" min="0" max="100" value="40" class="imgref-slider">
                </div>

                <div class="imgref-control-group">
                  <label class="imgref-label">
                    Escala
                    <span class="imgref-value" id="imgref-scale-val">100%</span>
                  </label>
                  <input type="range" id="imgref-scale" min="1" max="500" value="100" class="imgref-slider">
                </div>

                <div class="imgref-control-row">
                  <label class="imgref-lock-label">
                    <input type="checkbox" id="imgref-lock" class="imgref-checkbox">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                         stroke-width="1.5" class="imgref-lock-icon imgref-lock-unlocked">
                      <rect x="3" y="7" width="10" height="7" rx="1.5"/>
                      <path d="M5 7V5a3 3 0 0 1 6 0"/>
                    </svg>
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor"
                         stroke-width="1.5" class="imgref-lock-icon imgref-lock-locked hidden">
                      <rect x="3" y="7" width="10" height="7" rx="1.5"/>
                      <path d="M5 7V5a3 3 0 0 1 6 0v2"/>
                    </svg>
                    <span id="imgref-lock-text">Desbloqueado</span>
                  </label>

                  <button class="imgref-btn imgref-btn-fit" id="imgref-fit" title="Ajustar ao canvas">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5">
                      <rect x="1" y="1" width="14" height="14" rx="2"/>
                      <path d="M5 3H3v2M11 3h2v2M5 13H3v-2M11 13h2v-2"/>
                    </svg>
                    Ajustar
                  </button>
                </div>

                <button class="imgref-btn imgref-btn-remove" id="imgref-remove">
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"
                       stroke-linecap="round">
                    <line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/>
                  </svg>
                  Remover imagem de fundo
                </button>
              </div>
            </div>
          </div>

          <!-- STYLE GALLERY SECTION -->
          <div class="imgref-section imgref-style-gallery">
            <h3 class="imgref-section-title">Galeria de Estilos</h3>
            <div class="imgref-style-grid" id="imgref-style-grid">
              ${STYLE_PRESETS.map(s => `
                <button class="imgref-style-card" data-style="${s.id}" title="${s.description}">
                  <div class="imgref-style-swatches">
                    ${s.colors.map(c => `<div class="imgref-swatch" style="background:${c}"></div>`).join('')}
                  </div>
                  <span class="imgref-style-name">${s.name}</span>
                </button>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
    `;

    // Inject styles
    _injectStyles();

    document.body.appendChild(modalEl);
    _wireModalEvents();
    _refreshModalState();
  }

  function _wireModalEvents() {
    // Close
    modalEl.querySelector('#imgref-modal-close').addEventListener('click', _closeModal);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) _closeModal();
    });

    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape' && modalEl && !modalEl.classList.contains('hidden')) {
        _closeModal();
      }
    };
    document.addEventListener('keydown', escHandler);

    // File input
    const fileInput = modalEl.querySelector('#imgref-file-input');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) loadImage(file);
      fileInput.value = ''; // reset so same file can be re-selected
    });

    // Drag-and-drop zone
    const dropzone = modalEl.querySelector('#imgref-dropzone');
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('imgref-dropzone--active');
    });
    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.classList.remove('imgref-dropzone--active');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('imgref-dropzone--active');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file && _isAcceptedFile(file)) {
        loadImage(file);
      }
    });

    // Opacity slider
    const opacitySlider = modalEl.querySelector('#imgref-opacity');
    opacitySlider.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10);
      setOpacity(pct / 100);
      modalEl.querySelector('#imgref-opacity-val').textContent = pct + '%';
    });

    // Scale slider
    const scaleSlider = modalEl.querySelector('#imgref-scale');
    scaleSlider.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10);
      setScale(pct / 100);
      modalEl.querySelector('#imgref-scale-val').textContent = pct + '%';
    });

    // Lock checkbox
    const lockCb = modalEl.querySelector('#imgref-lock');
    lockCb.addEventListener('change', () => {
      const plan = _getPlan();
      if (plan && plan.backgroundImage) {
        plan.backgroundImage.locked = lockCb.checked;
        _updateLockUI(lockCb.checked);
      }
    });

    // Fit button
    modalEl.querySelector('#imgref-fit').addEventListener('click', fitToCanvas);

    // Remove button
    modalEl.querySelector('#imgref-remove').addEventListener('click', removeBackground);

    // Style cards
    modalEl.querySelectorAll('.imgref-style-card').forEach(card => {
      card.addEventListener('click', () => {
        const styleId = card.dataset.style;
        applyStyle(styleId);
      });
    });
  }

  function _closeModal() {
    if (modalEl) modalEl.classList.add('hidden');
  }

  function _refreshModalState() {
    if (!modalEl) return;

    const plan = _getPlan();
    const bg = plan && plan.backgroundImage;
    const dropzone = modalEl.querySelector('#imgref-dropzone');
    const previewSection = modalEl.querySelector('#imgref-preview-section');

    if (bg && bg.dataUrl) {
      dropzone.classList.add('hidden');
      previewSection.classList.remove('hidden');

      // Preview image
      const previewImg = modalEl.querySelector('#imgref-preview-img');
      previewImg.src = bg.dataUrl;

      // Opacity
      const opPct = Math.round((bg.opacity || 0.4) * 100);
      modalEl.querySelector('#imgref-opacity').value = opPct;
      modalEl.querySelector('#imgref-opacity-val').textContent = opPct + '%';

      // Scale
      const scPct = Math.round((bg.scale || 1) * 100);
      modalEl.querySelector('#imgref-scale').value = scPct;
      modalEl.querySelector('#imgref-scale-val').textContent = scPct + '%';

      // Lock
      const lockCb = modalEl.querySelector('#imgref-lock');
      lockCb.checked = !!bg.locked;
      _updateLockUI(!!bg.locked);
    } else {
      dropzone.classList.remove('hidden');
      previewSection.classList.add('hidden');
    }

    // Active style highlight
    const activeStyle = plan && plan.activeStyle;
    modalEl.querySelectorAll('.imgref-style-card').forEach(card => {
      card.classList.toggle('imgref-style-card--active', card.dataset.style === activeStyle);
    });
  }

  function _updateLockUI(locked) {
    if (!modalEl) return;
    const textEl = modalEl.querySelector('#imgref-lock-text');
    const unlockedIcon = modalEl.querySelector('.imgref-lock-unlocked');
    const lockedIcon = modalEl.querySelector('.imgref-lock-locked');
    if (locked) {
      textEl.textContent = 'Bloqueado';
      unlockedIcon.classList.add('hidden');
      lockedIcon.classList.remove('hidden');
    } else {
      textEl.textContent = 'Desbloqueado';
      unlockedIcon.classList.remove('hidden');
      lockedIcon.classList.add('hidden');
    }
  }

  function _isAcceptedFile(file) {
    return ACCEPTED_TYPES.includes(file.type);
  }

  // ════════════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════════════

  function _getPlan() {
    // Try Editor2D first, then global
    const edPlan = Editor2D.getPlan && Editor2D.getPlan();
    if (edPlan) return edPlan;
    return window._currentPlan || null;
  }

  // ════════════════════════════════════════════════════════════
  //  INJECTED CSS
  // ════════════════════════════════════════════════════════════

  let stylesInjected = false;

  function _injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'imgref-styles';
    style.textContent = `

/* ── Modal overrides ────────────────────────────── */
.imgref-modal-card {
  max-width: 560px;
  max-height: 85vh;
  overflow-y: auto;
}

.imgref-modal-body {
  padding: 0 !important;
}

/* ── Sections ───────────────────────────────────── */
.imgref-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.imgref-section:last-child {
  border-bottom: none;
}
.imgref-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

/* ── Drop zone ──────────────────────────────────── */
.imgref-dropzone {
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  transition: all var(--speed) var(--ease);
  background: var(--bg-elevated);
}
.imgref-dropzone:hover,
.imgref-dropzone--active {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.imgref-dropzone.hidden {
  display: none;
}
.imgref-dropzone-icon {
  opacity: 0.4;
  margin-bottom: 10px;
}
.imgref-dropzone--active .imgref-dropzone-icon {
  opacity: 0.8;
  color: var(--accent);
}
.imgref-dropzone-text {
  font-size: 14px;
  color: var(--text);
  margin-bottom: 4px;
}
.imgref-dropzone-sub {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.imgref-dropzone-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
}

/* ── File button ────────────────────────────────── */
.imgref-file-btn {
  display: inline-block;
  padding: 8px 20px;
  background: var(--accent);
  color: #0C0E13;
  font-size: 13px;
  font-weight: 600;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--speed);
}
.imgref-file-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

/* ── Preview ────────────────────────────────────── */
.imgref-preview-section.hidden {
  display: none;
}
.imgref-preview-box {
  width: 100%;
  max-height: 160px;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--bg);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.imgref-preview-img {
  max-width: 100%;
  max-height: 160px;
  object-fit: contain;
}

/* ── Controls ───────────────────────────────────── */
.imgref-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.imgref-control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.imgref-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.imgref-value {
  color: var(--accent);
  font-family: 'Space Mono', monospace;
  font-size: 11px;
}

/* ── Slider ─────────────────────────────────────── */
.imgref-slider {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--bg-hover);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.imgref-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg-card);
  box-shadow: 0 0 4px rgba(0,229,204,0.4);
}
.imgref-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--bg-card);
  box-shadow: 0 0 4px rgba(0,229,204,0.4);
}

/* ── Control row ────────────────────────────────── */
.imgref-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

/* ── Lock ───────────────────────────────────────── */
.imgref-lock-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text);
  cursor: pointer;
  user-select: none;
}
.imgref-checkbox {
  display: none;
}
.imgref-lock-icon {
  flex-shrink: 0;
}
.imgref-lock-icon.hidden {
  display: none;
}

/* ── Buttons ────────────────────────────────────── */
.imgref-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--speed);
}
.imgref-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
}
.imgref-btn-remove {
  width: 100%;
  justify-content: center;
  margin-top: 4px;
  border-color: rgba(248,81,73,0.3);
  color: var(--red);
}
.imgref-btn-remove:hover {
  background: rgba(248,81,73,0.1);
  border-color: var(--red);
  color: var(--red);
}

/* ── Style gallery grid ─────────────────────────── */
.imgref-style-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.imgref-style-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-elevated);
  cursor: pointer;
  transition: all var(--speed) var(--ease);
}
.imgref-style-card:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.imgref-style-card--active {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 1px var(--accent), var(--shadow-md);
}
.imgref-style-swatches {
  display: flex;
  gap: 3px;
  height: 28px;
  align-items: stretch;
}
.imgref-swatch {
  width: 22px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.08);
  transition: transform var(--speed);
}
.imgref-style-card:hover .imgref-swatch {
  transform: scaleY(1.1);
}
.imgref-style-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  text-align: center;
}
.imgref-style-card--active .imgref-style-name {
  color: var(--accent);
}

/* ── Responsive ─────────────────────────────────── */
@media (max-width: 600px) {
  .imgref-modal-card {
    max-width: 100%;
    max-height: 90vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .imgref-style-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .imgref-dropzone {
    padding: 24px 16px;
  }
}
`;
    document.head.appendChild(style);
  }

  // ════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ════════════════════════════════════════════════════════════

  return {
    init,
    showUploadModal,
    loadImage,
    removeBackground,
    setOpacity,
    setScale,
    fitToCanvas,
    toggleLock,
    renderBackground,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    showStyleGallery,
    applyStyle,
    getStylePresets
  };

})();

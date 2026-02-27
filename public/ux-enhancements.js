/**
 * ux-enhancements.js — Welcome screen, onboarding tour, help modal, templates
 * Non-invasive: hooks into existing App/Controls/EventBus without modifying them
 */
(() => {
  const ONBOARDING_KEY = 'p3d_onboarding_done';

  // ── WELCOME SCREEN BUTTONS ──

  function initWelcome() {
    const welcomeNew = document.getElementById('welcome-new');
    const welcomeOpen = document.getElementById('welcome-open');
    const welcomeExample = document.getElementById('welcome-example');

    if (welcomeNew) {
      welcomeNew.addEventListener('click', () => {
        document.getElementById('btn-new-plan').click();
      });
    }

    if (welcomeOpen) {
      welcomeOpen.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('open');
      });
    }

    if (welcomeExample) {
      welcomeExample.addEventListener('click', loadExample);
    }

    // Template cards
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        createFromTemplate(card.dataset.template);
      });
    });
  }

  async function loadExample() {
    // Try to load first existing plan as example
    try {
      const res = await fetch('/api/planta3d/plans');
      const plans = await res.json();
      if (plans.length > 0) {
        // Simulate loading first plan
        const planRes = await fetch(`/api/planta3d/plans/${plans[0].id}`);
        if (planRes.ok) {
          // Trigger the sidebar to show, then auto-click first plan
          document.getElementById('sidebar').classList.add('open');
          setTimeout(() => {
            const firstItem = document.querySelector('#plan-list li');
            if (firstItem) firstItem.click();
          }, 300);
          return;
        }
      }
    } catch (e) { /* ignore */ }

    // Fallback: create a sample plan
    createFromTemplate('sala');
  }

  async function createFromTemplate(templateName) {
    const templates = {
      cozinha: {
        name: 'Cozinha — Novo Projeto',
        walls: [
          { id: 't-w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w2', start: { x: 4, y: 0 }, end: { x: 4, y: 3 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w3', start: { x: 4, y: 3 }, end: { x: 0, y: 3 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w4', start: { x: 0, y: 3 }, end: { x: 0, y: 0 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' }
        ],
        rooms: [{ id: 't-r1', name: 'Cozinha', points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], floorMaterial: 'tile', floorColor: '#e0ddd4' }],
        doors: [{ id: 't-d1', wallId: 't-w3', position: 0.4, width: 0.9, height: 2.1, type: 'single' }],
        windows: [{ id: 't-j1', wallId: 't-w1', position: 0.5, width: 1.2, height: 1.0, sillHeight: 1.0 }],
        furniture: [],
        columns: [],
        stairs: [],
        dimensions: [],
        annotations: { notes: [], measurements: [] }
      },
      quarto: {
        name: 'Quarto — Novo Projeto',
        walls: [
          { id: 't-w1', start: { x: 0, y: 0 }, end: { x: 4, y: 0 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w2', start: { x: 4, y: 0 }, end: { x: 4, y: 3.5 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w3', start: { x: 4, y: 3.5 }, end: { x: 0, y: 3.5 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w4', start: { x: 0, y: 3.5 }, end: { x: 0, y: 0 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' }
        ],
        rooms: [{ id: 't-r1', name: 'Quarto', points: [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3.5 }, { x: 0, y: 3.5 }], floorMaterial: 'hardwood', floorColor: '#c4a882' }],
        doors: [{ id: 't-d1', wallId: 't-w4', position: 0.3, width: 0.8, height: 2.1, type: 'single' }],
        windows: [{ id: 't-j1', wallId: 't-w2', position: 0.5, width: 1.5, height: 1.2, sillHeight: 0.9 }],
        furniture: [],
        columns: [],
        stairs: [],
        dimensions: [],
        annotations: { notes: [], measurements: [] }
      },
      sala: {
        name: 'Sala de Estar — Novo Projeto',
        walls: [
          { id: 't-w1', start: { x: 0, y: 0 }, end: { x: 5, y: 0 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w2', start: { x: 5, y: 0 }, end: { x: 5, y: 4 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w3', start: { x: 5, y: 4 }, end: { x: 0, y: 4 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w4', start: { x: 0, y: 4 }, end: { x: 0, y: 0 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' }
        ],
        rooms: [{ id: 't-r1', name: 'Sala de Estar', points: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 4 }, { x: 0, y: 4 }], floorMaterial: 'hardwood', floorColor: '#c4a882' }],
        doors: [{ id: 't-d1', wallId: 't-w3', position: 0.3, width: 1.0, height: 2.1, type: 'double' }],
        windows: [
          { id: 't-j1', wallId: 't-w1', position: 0.35, width: 1.8, height: 1.4, sillHeight: 0.8 },
          { id: 't-j2', wallId: 't-w2', position: 0.5, width: 1.2, height: 1.2, sillHeight: 0.9 }
        ],
        furniture: [],
        columns: [],
        stairs: [],
        dimensions: [],
        annotations: { notes: [], measurements: [] }
      },
      banheiro: {
        name: 'Banheiro — Novo Projeto',
        walls: [
          { id: 't-w1', start: { x: 0, y: 0 }, end: { x: 2.5, y: 0 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w2', start: { x: 2.5, y: 0 }, end: { x: 2.5, y: 2 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w3', start: { x: 2.5, y: 2 }, end: { x: 0, y: 2 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' },
          { id: 't-w4', start: { x: 0, y: 2 }, end: { x: 0, y: 0 }, thickness: 0.15, height: 2.8, color: '#F5F5F0' }
        ],
        rooms: [{ id: 't-r1', name: 'Banheiro', points: [{ x: 0, y: 0 }, { x: 2.5, y: 0 }, { x: 2.5, y: 2 }, { x: 0, y: 2 }], floorMaterial: 'tile', floorColor: '#d6d3cd' }],
        doors: [{ id: 't-d1', wallId: 't-w4', position: 0.5, width: 0.7, height: 2.1, type: 'single' }],
        windows: [{ id: 't-j1', wallId: 't-w2', position: 0.5, width: 0.6, height: 0.6, sillHeight: 1.5 }],
        furniture: [],
        columns: [],
        stairs: [],
        dimensions: [],
        annotations: { notes: [], measurements: [] }
      }
    };

    const tpl = templates[templateName];
    if (!tpl) return;

    try {
      const res = await fetch('/api/planta3d/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tpl.name })
      });
      const plan = await res.json();

      // Merge template data into plan
      const merged = Object.assign({}, plan, {
        walls: tpl.walls,
        rooms: tpl.rooms,
        doors: tpl.doors,
        windows: tpl.windows,
        furniture: tpl.furniture,
        columns: tpl.columns,
        stairs: tpl.stairs,
        dimensions: tpl.dimensions,
        annotations: tpl.annotations
      });

      // Save the merged plan
      await fetch(`/api/planta3d/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged)
      });

      // Reload the page to load the new plan cleanly
      window.location.reload();
    } catch (err) {
      console.error('Template creation failed:', err);
      alert('Erro ao criar projeto a partir do template');
    }
  }

  // ── SAVE BUTTON ──

  function initSaveButton() {
    const saveBtn = document.getElementById('btn-save-plan');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', () => {
      // Trigger a plan save via the EventBus if a plan is loaded
      if (typeof EventBus !== 'undefined') {
        EventBus.emit('plan:changed', null); // trigger autosave
      }
      // Visual feedback
      saveBtn.style.background = 'var(--green)';
      saveBtn.style.color = 'var(--bg)';
      saveBtn.style.borderColor = 'var(--green)';
      const origText = saveBtn.querySelector('.btn-text');
      if (origText) {
        const prev = origText.textContent;
        origText.textContent = 'Salvo!';
        setTimeout(() => {
          origText.textContent = prev;
          saveBtn.style.background = '';
          saveBtn.style.color = '';
          saveBtn.style.borderColor = '';
        }, 1500);
      } else {
        setTimeout(() => {
          saveBtn.style.background = '';
          saveBtn.style.color = '';
          saveBtn.style.borderColor = '';
        }, 1500);
      }
    });
  }

  // ── ZOOM INDICATOR ──

  function initZoomIndicator() {
    const indicator = document.getElementById('zoom-indicator');
    if (!indicator) return;

    // Update zoom on EventBus events
    if (typeof EventBus !== 'undefined') {
      EventBus.on('mode:changed', updateZoom);
    }

    // Periodically update zoom (simple approach for orbit camera changes)
    setInterval(updateZoom, 500);

    function updateZoom() {
      try {
        if (typeof App !== 'undefined' && App.is2D && App.is2D()) {
          // 2D mode — get editor zoom
          if (typeof Editor2D !== 'undefined' && Editor2D.getViewState) {
            const vs = Editor2D.getViewState();
            if (vs && vs.zoom) {
              indicator.textContent = Math.round(vs.zoom * 100) + '%';
              return;
            }
          }
        }
        // 3D mode — approximate from camera distance
        if (typeof ThreeScene !== 'undefined' && ThreeScene.getCamera) {
          const cam = ThreeScene.getCamera();
          if (cam) {
            const dist = cam.position.length();
            const pct = Math.round(Math.max(10, Math.min(500, (15 / dist) * 100)));
            indicator.textContent = pct + '%';
            return;
          }
        }
      } catch (e) { /* ignore */ }
      indicator.textContent = '100%';
    }
  }

  // ── ONBOARDING TOUR ──

  const TOUR_STEPS = [
    {
      title: 'Bem-vindo ao Planta 3D!',
      text: 'Aqui voce cria plantas de ambientes para seus projetos de marcenaria. Vamos fazer um tour rapido pelo editor.'
    },
    {
      title: 'Barra de ferramentas',
      text: 'A esquerda ficam as ferramentas de desenho. Clique em "Parede" para comecar a desenhar, "Porta" e "Janela" para adicionar aberturas, e "Mobiliar" para colocar moveis.'
    },
    {
      title: 'Visualizacao 2D e 3D',
      text: 'Use o botao "3D" no topo para alternar entre a planta baixa (2D) e a vista em perspectiva (3D). Na vista 2D voce desenha, na 3D voce visualiza o resultado.'
    },
    {
      title: 'Salvar e exportar',
      text: 'Seu projeto salva automaticamente. Use "Salvar" para forcar o salvamento, "PNG" para exportar imagem, e "DXF" para importar arquivos do AutoCAD. Bom projeto!'
    }
  ];

  function initOnboarding() {
    if (localStorage.getItem(ONBOARDING_KEY)) return;

    const overlay = document.getElementById('onboarding-overlay');
    const card = document.getElementById('onboarding-card');
    if (!overlay || !card) return;

    let step = 0;

    function render() {
      const s = TOUR_STEPS[step];
      card.querySelector('.onboarding-title').textContent = s.title;
      card.querySelector('.onboarding-text').textContent = s.text;

      // Progress dots
      const indicator = card.querySelector('.onboarding-step-indicator');
      indicator.innerHTML = TOUR_STEPS.map((_, i) => {
        let cls = 'onboarding-step-dot';
        if (i === step) cls += ' active';
        else if (i < step) cls += ' done';
        return `<span class="${cls}"></span>`;
      }).join('');

      // Button text
      const nextBtn = card.querySelector('.onboarding-next');
      nextBtn.textContent = step === TOUR_STEPS.length - 1 ? 'Comecar!' : 'Proximo';
    }

    function next() {
      step++;
      if (step >= TOUR_STEPS.length) {
        finish();
        return;
      }
      render();
    }

    function finish() {
      localStorage.setItem(ONBOARDING_KEY, '1');
      overlay.classList.add('hidden');
    }

    card.querySelector('.onboarding-next').addEventListener('click', next);
    card.querySelector('.onboarding-skip').addEventListener('click', finish);

    // Show after a small delay so the page settles
    setTimeout(() => {
      overlay.classList.remove('hidden');
      render();
    }, 800);
  }

  // ── HELP MODAL ──

  function initHelpModal() {
    const helpBtn = document.getElementById('btn-help-global');
    const modal = document.getElementById('help-modal');
    const closeBtn = document.getElementById('help-modal-close');
    if (!helpBtn || !modal) return;

    helpBtn.addEventListener('click', () => {
      modal.classList.toggle('hidden');
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
      });
    }

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
      }
    });
  }

  // ── INIT ──

  document.addEventListener('DOMContentLoaded', () => {
    initWelcome();
    initSaveButton();
    initZoomIndicator();
    initHelpModal();

    // Delay onboarding to not overlap with welcome screen
    setTimeout(initOnboarding, 1200);
  });
})();

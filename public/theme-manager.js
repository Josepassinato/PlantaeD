/**
 * theme-manager.js — FASE 1.4 + FASE 9
 * Theme switching (dark/light), bottom navigation, glassmorphism, micro-animations
 * Non-invasive: integrates with EventBus, App, and existing CSS custom properties
 */
window.ThemeManager = (() => {
  'use strict';

  /* ════════════════════════════════════════════════════════════
     CONSTANTS
     ════════════════════════════════════════════════════════════ */

  const STORAGE_KEY = 'p3d_theme';
  const THEME_DARK = 'dark';
  const THEME_LIGHT = 'light';
  const MOBILE_BREAKPOINT = 768;
  const BOTTOM_NAV_HEIGHT = 56;

  /** Dark theme values — mirrors the existing :root defaults in style.css */
  const DARK_VARS = {
    '--bg':             '#0C0E13',
    '--bg-surface':     '#12141A',
    '--bg-card':        '#181B23',
    '--bg-elevated':    '#1E222C',
    '--bg-hover':       '#252A36',
    '--bg-active':      '#2D3344',
    '--white':          '#F0F2F5',
    '--text':           '#C8CCD4',
    '--text-secondary': '#7D8590',
    '--text-muted':     '#4E5562',
    '--accent':         '#00E5CC',
    '--accent-hover':   '#00C9B3',
    '--accent-glow':    'rgba(0, 229, 204, 0.15)',
    '--accent-soft':    'rgba(0, 229, 204, 0.08)',
    '--border':         'rgba(255, 255, 255, 0.06)',
    '--border-strong':  'rgba(255, 255, 255, 0.12)',
    '--border-accent':  'rgba(0, 229, 204, 0.3)',
    '--shadow-sm':      '0 1px 3px rgba(0,0,0,0.3)',
    '--shadow-md':      '0 4px 16px rgba(0,0,0,0.4)',
    '--shadow-lg':      '0 8px 32px rgba(0,0,0,0.5)'
  };

  /** Light theme values */
  const LIGHT_VARS = {
    '--bg':             '#F8F9FA',
    '--bg-surface':     '#FFFFFF',
    '--bg-card':        '#F0F1F3',
    '--bg-elevated':    '#E8E9EB',
    '--bg-hover':       '#DFE0E2',
    '--bg-active':      '#D4D5D7',
    '--white':          '#1A1A2E',
    '--text':           '#374151',
    '--text-secondary': '#6B7280',
    '--text-muted':     '#9CA3AF',
    '--accent':         '#0891B2',
    '--accent-hover':   '#0E7490',
    '--accent-glow':    'rgba(8, 145, 178, 0.15)',
    '--accent-soft':    'rgba(8, 145, 178, 0.08)',
    '--border':         'rgba(0, 0, 0, 0.08)',
    '--border-strong':  'rgba(0, 0, 0, 0.15)',
    '--border-accent':  'rgba(8, 145, 178, 0.3)',
    '--shadow-sm':      '0 1px 3px rgba(0,0,0,0.08)',
    '--shadow-md':      '0 4px 16px rgba(0,0,0,0.1)',
    '--shadow-lg':      '0 8px 32px rgba(0,0,0,0.12)'
  };

  /* ════════════════════════════════════════════════════════════
     STATE
     ════════════════════════════════════════════════════════════ */

  let currentTheme = THEME_DARK;
  let bottomNavEl = null;
  let activeTab = 'home';
  let systemMediaQuery = null;

  /* ════════════════════════════════════════════════════════════
     THEME ENGINE (FASE 1.4)
     ════════════════════════════════════════════════════════════ */

  /**
   * Reads stored preference, falls back to system preference, defaults to dark.
   * @returns {'dark'|'light'}
   */
  function resolvePreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === THEME_LIGHT || stored === THEME_DARK) return stored;

    // Honour OS-level preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return THEME_LIGHT;
    }
    return THEME_DARK;
  }

  /**
   * Apply a full set of CSS custom property overrides to :root
   * @param {Object} vars — key/value map of CSS custom properties
   */
  function setCSSVars(vars) {
    const root = document.documentElement;
    const keys = Object.keys(vars);
    for (let i = 0; i < keys.length; i++) {
      root.style.setProperty(keys[i], vars[keys[i]]);
    }
  }

  /**
   * Core theme application — sets CSS vars, data attribute, meta theme-color
   * @param {'dark'|'light'} theme
   * @param {boolean} [persist=true] — write to localStorage
   */
  function applyTheme(theme, persist) {
    if (persist === undefined) persist = true;
    currentTheme = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;

    // 1. CSS custom properties
    setCSSVars(currentTheme === THEME_LIGHT ? LIGHT_VARS : DARK_VARS);

    // 2. data-theme attribute for conditional CSS selectors
    document.documentElement.setAttribute('data-theme', currentTheme);

    // 3. Update <meta name="theme-color"> for mobile browser chrome
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', currentTheme === THEME_LIGHT ? '#F8F9FA' : '#0C0E13');
    }

    // 4. Persist
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, currentTheme); } catch (_) { /* quota */ }
    }

    // 5. Notify rest of the app via EventBus
    if (typeof EventBus !== 'undefined') {
      EventBus.emit('theme:changed', { theme: currentTheme });
    }

    // 6. Update toggle button icon if present
    updateToggleIcon();
  }

  /**
   * Toggle between dark and light themes
   */
  function toggleTheme() {
    applyTheme(currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK);
  }

  /**
   * Get the current theme name
   * @returns {'dark'|'light'}
   */
  function getTheme() {
    return currentTheme;
  }

  /**
   * Listen for OS-level color scheme changes and update if user has no stored pref
   */
  function watchSystemPreference() {
    if (!window.matchMedia) return;
    systemMediaQuery = window.matchMedia('(prefers-color-scheme: light)');

    var handler = function () {
      // Only auto-switch if user hasn't explicitly chosen
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(systemMediaQuery.matches ? THEME_LIGHT : THEME_DARK, false);
      }
    };

    // Modern browsers
    if (systemMediaQuery.addEventListener) {
      systemMediaQuery.addEventListener('change', handler);
    } else if (systemMediaQuery.addListener) {
      systemMediaQuery.addListener(handler);
    }
  }

  /* ════════════════════════════════════════════════════════════
     THEME TOGGLE BUTTON
     ════════════════════════════════════════════════════════════ */

  /** SVG icon for sun (shown in dark mode — click to go light) */
  var SVG_SUN = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="10" cy="10" r="3.5"/>'
    + '<line x1="10" y1="2" x2="10" y2="4.5"/>'
    + '<line x1="10" y1="15.5" x2="10" y2="18"/>'
    + '<line x1="2" y1="10" x2="4.5" y2="10"/>'
    + '<line x1="15.5" y1="10" x2="18" y2="10"/>'
    + '<line x1="4.34" y1="4.34" x2="6.11" y2="6.11"/>'
    + '<line x1="13.89" y1="13.89" x2="15.66" y2="15.66"/>'
    + '<line x1="4.34" y1="15.66" x2="6.11" y2="13.89"/>'
    + '<line x1="13.89" y1="6.11" x2="15.66" y2="4.34"/>'
    + '</svg>';

  /** SVG icon for moon (shown in light mode — click to go dark) */
  var SVG_MOON = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M17.5 10.5a7.5 7.5 0 1 1-8-8 5.5 5.5 0 0 0 8 8z"/>'
    + '</svg>';

  /**
   * Inject the theme toggle button into the header (next to help button)
   */
  function createToggleButton() {
    var existing = document.getElementById('btn-theme-toggle');
    if (existing) return existing;

    var btn = document.createElement('button');
    btn.id = 'btn-theme-toggle';
    btn.className = 'header-btn';
    btn.title = 'Alternar tema claro/escuro';
    btn.setAttribute('aria-label', 'Alternar tema');
    btn.innerHTML = currentTheme === THEME_DARK ? SVG_SUN : SVG_MOON;

    btn.addEventListener('click', function () {
      // Micro-animation: button press
      btn.style.transform = 'scale(0.9)';
      setTimeout(function () { btn.style.transform = ''; }, 150);
      toggleTheme();
    });

    // Insert before the help button or at end of header-right
    var headerRight = document.querySelector('.header-right');
    var helpBtn = document.getElementById('btn-help-global');
    if (headerRight && helpBtn) {
      headerRight.insertBefore(btn, helpBtn);
    } else if (headerRight) {
      headerRight.appendChild(btn);
    }

    return btn;
  }

  /**
   * Update the icon inside the toggle button to reflect current theme
   */
  function updateToggleIcon() {
    var btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;
    btn.innerHTML = currentTheme === THEME_DARK ? SVG_SUN : SVG_MOON;
    btn.title = currentTheme === THEME_DARK
      ? 'Mudar para tema claro'
      : 'Mudar para tema escuro';
  }

  /* ════════════════════════════════════════════════════════════
     GLASSMORPHISM HELPER (FASE 9 — enhancement)
     ════════════════════════════════════════════════════════════ */

  /**
   * Apply glassmorphism styling to one or more elements.
   * Adds backdrop blur, semi-transparent background, and subtle border.
   *
   * @param {string|Element|NodeList} target — CSS selector, element, or NodeList
   * @param {Object} [options]
   * @param {number} [options.blur=16]     — backdrop blur in px
   * @param {number} [options.opacity=0.7] — background opacity (0-1)
   * @param {boolean} [options.border=true] — add subtle border
   */
  function applyGlass(target, options) {
    var opts = Object.assign({ blur: 16, opacity: 0.7, border: true }, options || {});
    var elements;

    if (typeof target === 'string') {
      elements = document.querySelectorAll(target);
    } else if (target instanceof Element) {
      elements = [target];
    } else if (target && target.length !== undefined) {
      elements = target;
    } else {
      return;
    }

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var bgBase = currentTheme === THEME_LIGHT
        ? 'rgba(255, 255, 255, ' + opts.opacity + ')'
        : 'rgba(18, 20, 26, ' + opts.opacity + ')';

      el.style.backdropFilter = 'blur(' + opts.blur + 'px)';
      el.style.webkitBackdropFilter = 'blur(' + opts.blur + 'px)';
      el.style.background = bgBase;

      if (opts.border) {
        el.style.borderColor = currentTheme === THEME_LIGHT
          ? 'rgba(0, 0, 0, 0.08)'
          : 'rgba(255, 255, 255, 0.06)';
      }
    }
  }

  /**
   * Auto-apply glassmorphism to sidebar, right panels, and modals
   */
  function enhanceGlassmorphism() {
    applyGlass('#sidebar', { blur: 16, opacity: 0.82 });
    applyGlass('.right-panels aside:not(.hidden)', { blur: 16, opacity: 0.82 });
    applyGlass('.modal-card', { blur: 20, opacity: 0.85, border: true });
    applyGlass('#header', { blur: 16, opacity: 0.8 });
  }

  /* ════════════════════════════════════════════════════════════
     BOTTOM NAVIGATION (FASE 1.3)
     ════════════════════════════════════════════════════════════ */

  /** Tab definitions — id, label, icon SVG path content */
  var NAV_TABS = [
    {
      id: 'home',
      label: 'Inicio',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M3 12l2-2m0 0l7-7 7 7m-14 0v9a1 1 0 0 0 1 1h3m10-10l2 2m-2-2v9a1 1 0 0 1-1 1h-3m-4 0a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2z"/>'
        + '</svg>'
    },
    {
      id: 'projects',
      label: 'Projetos',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
        + '</svg>'
    },
    {
      id: 'editor',
      label: 'Editor',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>'
        + '</svg>'
    },
    {
      id: 'catalog',
      label: 'Catalogo',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
        + '<rect x="3" y="3" width="7" height="7" rx="1"/>'
        + '<rect x="14" y="3" width="7" height="7" rx="1"/>'
        + '<rect x="3" y="14" width="7" height="7" rx="1"/>'
        + '<rect x="14" y="14" width="7" height="7" rx="1"/>'
        + '</svg>'
    },
    {
      id: 'settings',
      label: 'Config',
      icon: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
        + '<circle cx="12" cy="12" r="3"/>'
        + '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.05 1.51 1.08H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z"/>'
        + '</svg>'
    }
  ];

  /**
   * Build and inject the bottom navigation bar (mobile only).
   * Only appended to the DOM when viewport <= MOBILE_BREAKPOINT.
   */
  function renderBottomNav() {
    // Don't create duplicates
    if (document.getElementById('p3d-bottom-nav')) return;

    var nav = document.createElement('nav');
    nav.id = 'p3d-bottom-nav';
    nav.className = 'p3d-bottom-nav';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Navegacao principal');

    var html = '';
    for (var i = 0; i < NAV_TABS.length; i++) {
      var tab = NAV_TABS[i];
      var isActive = tab.id === activeTab;
      html += '<button class="p3d-nav-tab' + (isActive ? ' active' : '') + '"'
        + ' data-tab="' + tab.id + '"'
        + ' role="tab"'
        + ' aria-selected="' + isActive + '"'
        + ' aria-label="' + tab.label + '"'
        + '>'
        + '<span class="p3d-nav-icon">' + tab.icon + '</span>'
        + '<span class="p3d-nav-label">' + tab.label + '</span>'
        + (isActive ? '<span class="p3d-nav-indicator"></span>' : '')
        + '</button>';
    }
    nav.innerHTML = html;

    // Event delegation
    nav.addEventListener('click', function (e) {
      var tabBtn = e.target.closest('.p3d-nav-tab');
      if (!tabBtn) return;

      var tabId = tabBtn.getAttribute('data-tab');
      if (tabId === activeTab) return;

      setActiveTab(tabId);
    });

    document.body.appendChild(nav);
    bottomNavEl = nav;
  }

  /**
   * Set the active tab in the bottom nav and trigger the associated view/action
   * @param {string} tabId
   */
  function setActiveTab(tabId) {
    activeTab = tabId;

    if (!bottomNavEl) return;

    // Update button states
    var buttons = bottomNavEl.querySelectorAll('.p3d-nav-tab');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var isActive = btn.getAttribute('data-tab') === activeTab;
      if (isActive) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        // Add indicator if missing
        if (!btn.querySelector('.p3d-nav-indicator')) {
          var indicator = document.createElement('span');
          indicator.className = 'p3d-nav-indicator';
          btn.appendChild(indicator);
        }
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
        var ind = btn.querySelector('.p3d-nav-indicator');
        if (ind) ind.remove();
      }
    }

    // Dispatch actions per tab
    handleTabAction(tabId);
  }

  /**
   * Execute the action associated with a tab switch
   * @param {string} tabId
   */
  function handleTabAction(tabId) {
    switch (tabId) {
      case 'home':
        // Show welcome / dashboard — close all panels
        closeSidebar();
        closeFurniturePanel();
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('nav:home');
        }
        break;

      case 'projects':
        // Open the project sidebar
        closeFurniturePanel();
        openSidebar();
        break;

      case 'editor':
        // Ensure we're on the canvas / editor view
        closeSidebar();
        closeFurniturePanel();
        if (typeof App !== 'undefined' && App.setTool) {
          App.setTool('select');
        }
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('nav:editor');
        }
        break;

      case 'catalog':
        // Open furniture catalog panel
        closeSidebar();
        openFurniturePanel();
        break;

      case 'settings':
        // Open settings — for now show a simple settings panel
        closeSidebar();
        closeFurniturePanel();
        showSettingsPanel();
        break;
    }
  }

  /* ── Sidebar / Panel helpers ── */

  function openSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('open');
  }

  function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  function openFurniturePanel() {
    var panel = document.getElementById('furniture-panel');
    if (panel) panel.classList.remove('hidden');
    // Trigger furniture tool if App is available
    if (typeof App !== 'undefined' && App.setTool) {
      App.setTool('furniture');
    }
  }

  function closeFurniturePanel() {
    var panel = document.getElementById('furniture-panel');
    if (panel) panel.classList.add('hidden');
  }

  /**
   * Minimal settings panel — shows theme toggle and basic preferences
   */
  function showSettingsPanel() {
    var existing = document.getElementById('p3d-settings-overlay');
    if (existing) {
      existing.classList.remove('hidden');
      return;
    }

    var overlay = document.createElement('div');
    overlay.id = 'p3d-settings-overlay';
    overlay.className = 'modal-overlay p3d-modal-animated';

    var themeLabel = currentTheme === THEME_DARK ? 'Escuro' : 'Claro';

    overlay.innerHTML =
      '<div class="modal-card p3d-glass-card">'
      + '  <div class="modal-header">'
      + '    <h2>Configuracoes</h2>'
      + '    <button class="modal-close" id="p3d-settings-close">&times;</button>'
      + '  </div>'
      + '  <div class="modal-body" style="padding:16px;">'
      + '    <div class="p3d-setting-row">'
      + '      <span class="p3d-setting-label">Tema</span>'
      + '      <button id="p3d-settings-theme-btn" class="p3d-setting-toggle">'
      + '        <span class="p3d-setting-toggle-icon">' + (currentTheme === THEME_DARK ? SVG_SUN : SVG_MOON) + '</span>'
      + '        <span class="p3d-setting-toggle-text">' + themeLabel + '</span>'
      + '      </button>'
      + '    </div>'
      + '    <div class="p3d-setting-row" style="margin-top:12px;">'
      + '      <span class="p3d-setting-label">Versao</span>'
      + '      <span style="color:var(--text-muted);font-size:12px;">P3D 1.4</span>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(overlay);

    // Close button
    document.getElementById('p3d-settings-close').addEventListener('click', function () {
      overlay.classList.add('hidden');
    });

    // Backdrop close
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.add('hidden');
    });

    // Theme toggle inside settings
    document.getElementById('p3d-settings-theme-btn').addEventListener('click', function () {
      toggleTheme();
      var btn = document.getElementById('p3d-settings-theme-btn');
      if (btn) {
        btn.querySelector('.p3d-setting-toggle-icon').innerHTML =
          currentTheme === THEME_DARK ? SVG_SUN : SVG_MOON;
        btn.querySelector('.p3d-setting-toggle-text').textContent =
          currentTheme === THEME_DARK ? 'Escuro' : 'Claro';
      }
    });
  }

  /**
   * Remove bottom nav if viewport grows beyond mobile breakpoint;
   * re-create it if viewport shrinks back.
   */
  function handleResize() {
    var isMobile = window.innerWidth <= MOBILE_BREAKPOINT;

    if (isMobile && !document.getElementById('p3d-bottom-nav')) {
      renderBottomNav();
    } else if (!isMobile && document.getElementById('p3d-bottom-nav')) {
      var nav = document.getElementById('p3d-bottom-nav');
      if (nav) nav.remove();
      bottomNavEl = null;
    }
  }

  /* ════════════════════════════════════════════════════════════
     MICRO-ANIMATIONS (FASE 9)
     ════════════════════════════════════════════════════════════ */

  /**
   * Inject the animation stylesheet that provides:
   * - Button press scale
   * - Panel slide-in
   * - Modal fade+scale
   * - Skeleton loading for project cards
   * - Bottom nav styles
   */
  function injectAnimationStyles() {
    if (document.getElementById('p3d-theme-styles')) return;

    var style = document.createElement('style');
    style.id = 'p3d-theme-styles';
    style.textContent = ''

      /* ── Bottom Navigation ── */
      + '.p3d-bottom-nav {'
      + '  display: none;'
      + '  position: fixed;'
      + '  bottom: 0;'
      + '  left: 0;'
      + '  right: 0;'
      + '  height: ' + BOTTOM_NAV_HEIGHT + 'px;'
      + '  padding-bottom: env(safe-area-inset-bottom, 0px);'
      + '  background: var(--bg-surface);'
      + '  border-top: 1px solid var(--border);'
      + '  align-items: center;'
      + '  justify-content: space-around;'
      + '  z-index: 950;'
      + '  backdrop-filter: blur(16px);'
      + '  -webkit-backdrop-filter: blur(16px);'
      + '}'

      + '@media (max-width: ' + MOBILE_BREAKPOINT + 'px) {'
      + '  .p3d-bottom-nav { display: flex; }'
      + '}'

      /* ── Tab button ── */
      + '.p3d-nav-tab {'
      + '  display: flex;'
      + '  flex-direction: column;'
      + '  align-items: center;'
      + '  justify-content: center;'
      + '  gap: 2px;'
      + '  flex: 1;'
      + '  height: 100%;'
      + '  background: none;'
      + '  border: none;'
      + '  color: var(--text-muted);'
      + '  cursor: pointer;'
      + '  position: relative;'
      + '  padding: 6px 0;'
      + '  transition: color 0.2s var(--ease), transform 0.15s var(--ease);'
      + '  -webkit-tap-highlight-color: transparent;'
      + '}'
      + '.p3d-nav-tab:active {'
      + '  transform: scale(0.92);'
      + '}'
      + '.p3d-nav-tab.active {'
      + '  color: var(--accent);'
      + '}'

      /* ── Tab icon ── */
      + '.p3d-nav-icon {'
      + '  display: flex;'
      + '  align-items: center;'
      + '  justify-content: center;'
      + '  width: 28px;'
      + '  height: 28px;'
      + '  transition: transform 0.2s var(--ease);'
      + '}'
      + '.p3d-nav-tab.active .p3d-nav-icon {'
      + '  transform: translateY(-1px);'
      + '}'

      /* ── Tab label ── */
      + '.p3d-nav-label {'
      + '  font-size: 10px;'
      + '  font-weight: 500;'
      + '  letter-spacing: 0.2px;'
      + '  line-height: 1;'
      + '}'

      /* ── Active indicator dot ── */
      + '.p3d-nav-indicator {'
      + '  position: absolute;'
      + '  top: 2px;'
      + '  left: 50%;'
      + '  transform: translateX(-50%);'
      + '  width: 4px;'
      + '  height: 4px;'
      + '  border-radius: 50%;'
      + '  background: var(--accent);'
      + '  animation: p3dNavDotIn 0.3s var(--ease);'
      + '}'

      + '@keyframes p3dNavDotIn {'
      + '  from { transform: translateX(-50%) scale(0); opacity: 0; }'
      + '  to   { transform: translateX(-50%) scale(1); opacity: 1; }'
      + '}'

      /* ── Micro-animation: button press scale ── */
      + '.header-btn:active,'
      + '.tool-btn:active,'
      + '.small-btn:active,'
      + '.welcome-btn:active {'
      + '  transform: scale(0.95);'
      + '}'

      /* ── Micro-animation: panel slide-in from right ── */
      + '@keyframes p3dSlideInRight {'
      + '  from { transform: translateX(100%); opacity: 0; }'
      + '  to   { transform: translateX(0); opacity: 1; }'
      + '}'
      + '.right-panels aside:not(.hidden) {'
      + '  animation: p3dSlideInRight 0.3s var(--ease);'
      + '}'

      /* ── Micro-animation: sidebar slide-in from left ── */
      + '@keyframes p3dSlideInLeft {'
      + '  from { transform: translateX(-100%); }'
      + '  to   { transform: translateX(0); }'
      + '}'
      + '#sidebar.open {'
      + '  animation: p3dSlideInLeft 0.3s var(--ease);'
      + '}'

      /* ── Micro-animation: modal fade + scale ── */
      + '@keyframes p3dModalIn {'
      + '  from { opacity: 0; transform: scale(0.92); }'
      + '  to   { opacity: 1; transform: scale(1); }'
      + '}'
      + '.p3d-modal-animated .modal-card {'
      + '  animation: p3dModalIn 0.25s var(--ease);'
      + '}'

      /* ── Glassmorphism helper class ── */
      + '.p3d-glass-card {'
      + '  backdrop-filter: blur(20px);'
      + '  -webkit-backdrop-filter: blur(20px);'
      + '  border: 1px solid var(--border);'
      + '}'

      /* ── Skeleton loading for project cards ── */
      + '@keyframes p3dSkeleton {'
      + '  0%   { background-position: -200% 0; }'
      + '  100% { background-position: 200% 0; }'
      + '}'
      + '.p3d-skeleton {'
      + '  background: linear-gradient(90deg,'
      + '    var(--bg-card) 25%,'
      + '    var(--bg-elevated) 37%,'
      + '    var(--bg-card) 63%);'
      + '  background-size: 200% 100%;'
      + '  animation: p3dSkeleton 1.5s ease-in-out infinite;'
      + '  border-radius: var(--radius);'
      + '}'
      + '.p3d-skeleton-card {'
      + '  height: 60px;'
      + '  margin: 8px 16px;'
      + '  border-radius: var(--radius);'
      + '}'

      /* ── Settings panel rows ── */
      + '.p3d-setting-row {'
      + '  display: flex;'
      + '  align-items: center;'
      + '  justify-content: space-between;'
      + '  padding: 10px 0;'
      + '  border-bottom: 1px solid var(--border);'
      + '}'
      + '.p3d-setting-label {'
      + '  font-size: 13px;'
      + '  font-weight: 500;'
      + '  color: var(--text);'
      + '}'
      + '.p3d-setting-toggle {'
      + '  display: flex;'
      + '  align-items: center;'
      + '  gap: 6px;'
      + '  padding: 6px 12px;'
      + '  background: var(--bg-elevated);'
      + '  border: 1px solid var(--border-strong);'
      + '  border-radius: var(--radius-full);'
      + '  color: var(--text);'
      + '  font-size: 12px;'
      + '  cursor: pointer;'
      + '  transition: background 0.2s var(--ease), transform 0.15s var(--ease);'
      + '}'
      + '.p3d-setting-toggle:hover {'
      + '  background: var(--bg-hover);'
      + '}'
      + '.p3d-setting-toggle:active {'
      + '  transform: scale(0.95);'
      + '}'
      + '.p3d-setting-toggle-icon {'
      + '  display: flex;'
      + '  align-items: center;'
      + '}'

      /* ── Theme transition (smooth color change across the whole page) ── */
      + '[data-theme] * {'
      + '  transition-property: background-color, border-color, color, box-shadow;'
      + '  transition-duration: 0.3s;'
      + '  transition-timing-function: var(--ease);'
      + '}'
      /* Exclude canvas and performance-sensitive elements from transitions */
      + 'canvas, [data-theme] canvas, .spinner {'
      + '  transition: none !important;'
      + '}';

    document.head.appendChild(style);
  }

  /**
   * Create skeleton placeholders inside the plan list while loading
   * @param {number} [count=3] — number of skeleton cards
   * @returns {DocumentFragment}
   */
  function createSkeletonCards(count) {
    count = count || 3;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var card = document.createElement('div');
      card.className = 'p3d-skeleton p3d-skeleton-card';
      frag.appendChild(card);
    }
    return frag;
  }

  /**
   * Show skeleton loading in the plan list sidebar
   */
  function showSkeletonLoading() {
    var list = document.getElementById('plan-list');
    if (!list) return;

    // Only show if list is currently empty
    if (list.children.length > 0) return;

    var skeletons = createSkeletonCards(3);
    list.appendChild(skeletons);
  }

  /**
   * Remove skeleton cards from the plan list
   */
  function clearSkeletonLoading() {
    var list = document.getElementById('plan-list');
    if (!list) return;

    var skeletons = list.querySelectorAll('.p3d-skeleton-card');
    for (var i = 0; i < skeletons.length; i++) {
      skeletons[i].remove();
    }
  }

  /* ════════════════════════════════════════════════════════════
     INITIALIZATION
     ════════════════════════════════════════════════════════════ */

  /**
   * Main entry point — called once on DOMContentLoaded or manually.
   * - Resolves and applies theme from localStorage / system preference
   * - Creates the toggle button in the header
   * - Renders bottom nav if on mobile
   * - Injects animation styles
   * - Sets up resize listener
   */
  function init() {
    // 1. Inject animation + bottom nav styles first (before any rendering)
    injectAnimationStyles();

    // 2. Resolve and apply theme
    var preference = resolvePreference();
    applyTheme(preference, false);

    // 3. Watch OS dark/light changes
    watchSystemPreference();

    // 4. Create toggle button in header
    createToggleButton();

    // 5. Render bottom nav if mobile
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      renderBottomNav();
    }

    // 6. Enhance glassmorphism on current panels
    enhanceGlassmorphism();

    // 7. Show skeleton loading in sidebar (will auto-clear when plans load)
    showSkeletonLoading();

    // 8. Listen for resize to manage bottom nav lifecycle
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 150);
    });

    // 9. Listen for theme changes to re-apply glassmorphism
    if (typeof EventBus !== 'undefined') {
      EventBus.on('theme:changed', function () {
        enhanceGlassmorphism();
      });

      // Clear skeletons when plans are loaded
      EventBus.on('plans:loaded', clearSkeletonLoading);
      EventBus.on('plan:loaded', clearSkeletonLoading);
    }

    // 10. Clear skeleton after timeout fallback (in case event never fires)
    setTimeout(clearSkeletonLoading, 4000);
  }

  /* ════════════════════════════════════════════════════════════
     AUTO-INIT
     ════════════════════════════════════════════════════════════ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ════════════════════════════════════════════════════════════
     PUBLIC API
     ════════════════════════════════════════════════════════════ */

  return {
    init: init,
    toggleTheme: toggleTheme,
    applyTheme: applyTheme,
    getTheme: getTheme,
    applyGlass: applyGlass,
    renderBottomNav: renderBottomNav,
    setActiveTab: setActiveTab,
    createSkeletonCards: createSkeletonCards,
    showSkeletonLoading: showSkeletonLoading,
    clearSkeletonLoading: clearSkeletonLoading,
    THEME_DARK: THEME_DARK,
    THEME_LIGHT: THEME_LIGHT
  };
})();

/**
 * controls.js — OrbitControls wrapper, 2D/3D toggle, view presets, grid, fullscreen
 */
const Controls = (() => {
  let is3D = true;
  let gridVisible = true;

  function init() {
    // 2D/3D toggle
    document.getElementById('btn-2d3d').addEventListener('click', toggle2D3D);

    // Grid toggle
    document.getElementById('btn-grid').addEventListener('click', toggleGrid);

    // Fullscreen
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

    // View presets
    document.getElementById('btn-view-top').addEventListener('click', () => setView('top'));
    document.getElementById('btn-view-front').addEventListener('click', () => setView('front'));
    document.getElementById('btn-view-3d').addEventListener('click', () => setView('3d'));

    // Zoom
    document.getElementById('btn-zoom-in').addEventListener('click', () => zoom(0.7));
    document.getElementById('btn-zoom-out').addEventListener('click', () => zoom(1.4));

    // Mobile sidebar toggles
    document.getElementById('btn-sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('annotations-panel').classList.remove('open');
    });
    document.getElementById('btn-annotations-toggle').addEventListener('click', () => {
      document.getElementById('annotations-panel').classList.toggle('open');
      document.getElementById('sidebar').classList.remove('open');
    });
  }

  function toggle2D3D() {
    is3D = !is3D;
    const btn = document.getElementById('btn-2d3d');
    btn.textContent = is3D ? '3D' : '2D';

    if (is3D) {
      ThreeScene.setCamera('3d');
      App.set2DMode(false);
      setView('3d');
    } else {
      ThreeScene.setCamera('2d');
      App.set2DMode(true);
      setView('top');
    }
  }

  function toggleGrid() {
    gridVisible = !gridVisible;
    const btn = document.getElementById('btn-grid');
    btn.classList.toggle('active', gridVisible);
    ThreeScene.toggleGrid(gridVisible);
    // Also toggle 2D editor grid
    if (typeof Editor2D !== 'undefined' && Editor2D.toggleGrid) {
      Editor2D.toggleGrid(gridVisible);
    }
    App.setStatus(gridVisible ? 'Grade ativada' : 'Grade desativada');
    setTimeout(() => App.setStatus(''), 1500);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  function setView(view) {
    const target = ThreeScene.getControls().target.clone();

    switch (view) {
      case 'top':
        ThreeScene.animateCameraTo(
          { x: target.x, y: 20, z: target.z },
          target
        );
        break;
      case 'front':
        ThreeScene.animateCameraTo(
          { x: target.x, y: 3, z: target.z + 15 },
          target
        );
        break;
      case '3d':
        ThreeScene.animateCameraTo(
          { x: target.x + 10, y: 8, z: target.z + 10 },
          target
        );
        break;
    }
  }

  function zoom(factor) {
    const cam = ThreeScene.getCamera();
    const controls = ThreeScene.getControls();
    const dir = new THREE.Vector3().subVectors(cam.position, controls.target);
    dir.multiplyScalar(factor);
    ThreeScene.animateCameraTo(
      { x: controls.target.x + dir.x, y: controls.target.y + dir.y, z: controls.target.z + dir.z },
      controls.target,
      300
    );
  }

  function setOrbitEnabled(enabled) {
    const controls = ThreeScene.getControls();
    controls.enabled = enabled;
  }

  return { init, toggle2D3D, setView, setOrbitEnabled };
})();

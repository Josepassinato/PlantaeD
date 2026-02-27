/**
 * walkthrough.js — First-person walkthrough mode
 * WASD/Arrow keys to move, mouse to look around
 */
const Walkthrough = (() => {
  let active = false;
  let camera, scene, renderer;
  let moveSpeed = 3.0; // meters per second
  let lookSpeed = 0.003;
  let eyeHeight = 1.6; // meters

  // Movement state
  const keys = { forward: false, backward: false, left: false, right: false, up: false, down: false };
  let yaw = 0;
  let pitch = 0;
  let lastTime = 0;
  let animFrameId = null;

  // Pointer lock
  let canvas = null;

  // Previous camera state for restore
  let savedCameraPos = null;
  let savedCameraTarget = null;
  let savedControlsEnabled = null;

  // UI elements
  let overlayEl = null;
  let instructionsEl = null;

  function init() {
    createUI();
  }

  function createUI() {
    // Walkthrough overlay with instructions
    overlayEl = document.createElement('div');
    overlayEl.id = 'walkthrough-overlay';
    overlayEl.className = 'walkthrough-overlay hidden';
    overlayEl.innerHTML = `
      <div class="walkthrough-hud">
        <div class="walkthrough-crosshair">+</div>
        <div class="walkthrough-controls-hint">
          <span>WASD / Setas: Mover</span>
          <span>Mouse: Olhar</span>
          <span>ESC: Sair</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);

    // Instructions shown before pointer lock
    instructionsEl = document.createElement('div');
    instructionsEl.id = 'walkthrough-instructions';
    instructionsEl.className = 'walkthrough-instructions hidden';
    instructionsEl.innerHTML = `
      <div class="walkthrough-instructions-card">
        <h3>Modo Walkthrough</h3>
        <p>Navegue pelo ambiente em primeira pessoa</p>
        <div class="walkthrough-key-hints">
          <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou <kbd>&uarr;</kbd><kbd>&larr;</kbd><kbd>&darr;</kbd><kbd>&rarr;</kbd> para mover</div>
          <div><kbd>Mouse</kbd> para olhar ao redor</div>
          <div><kbd>Q</kbd> subir &middot; <kbd>E</kbd> descer</div>
          <div><kbd>Shift</kbd> para correr</div>
          <div><kbd>ESC</kbd> para sair</div>
        </div>
        <button id="walkthrough-start-btn" class="walkthrough-start-btn">Clique para iniciar</button>
      </div>
    `;
    document.body.appendChild(instructionsEl);
  }

  function enter() {
    if (active) return;

    camera = ThreeScene.getPerspCamera();
    scene = ThreeScene.getScene();
    renderer = ThreeScene.getRenderer();
    canvas = renderer.domElement;

    // Save current state
    savedCameraPos = camera.position.clone();
    savedCameraTarget = ThreeScene.getControls().target.clone();
    savedControlsEnabled = true;

    // Disable orbit controls
    ThreeScene.getControls().enabled = false;

    // Position camera at eye height in center of plan
    const center = getPlanCenter();
    camera.position.set(center.x, eyeHeight, center.z);

    // Set initial look direction
    yaw = 0;
    pitch = 0;
    camera.rotation.order = 'YXZ';

    active = true;

    // Show instructions
    instructionsEl.classList.remove('hidden');
    const startBtn = document.getElementById('walkthrough-start-btn');
    startBtn.onclick = () => {
      instructionsEl.classList.add('hidden');
      overlayEl.classList.remove('hidden');
      requestPointerLock();
    };

    // Event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);

    EventBus.emit('walkthrough:enter');
  }

  function exit() {
    if (!active) return;
    active = false;

    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // Hide UI
    overlayEl.classList.add('hidden');
    instructionsEl.classList.add('hidden');

    // Restore camera
    if (savedCameraPos) {
      camera.position.copy(savedCameraPos);
      camera.rotation.set(0, 0, 0);
      camera.rotation.order = 'XYZ';
    }

    // Re-enable orbit controls
    const controls = ThreeScene.getControls();
    controls.enabled = true;
    if (savedCameraTarget) {
      controls.target.copy(savedCameraTarget);
    }
    controls.update();

    // Remove listeners
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    document.removeEventListener('pointerlockerror', onPointerLockError);

    // Stop animation
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    // Reset keys
    keys.forward = keys.backward = keys.left = keys.right = keys.up = keys.down = false;

    EventBus.emit('walkthrough:exit');
  }

  function requestPointerLock() {
    canvas.requestPointerLock();
  }

  function onPointerLockChange() {
    if (document.pointerLockElement === canvas) {
      document.addEventListener('mousemove', onMouseMove);
      lastTime = performance.now();
      animate();
    } else {
      document.removeEventListener('mousemove', onMouseMove);
      if (active) {
        // Pointer lock was lost but we're still in walkthrough
        overlayEl.classList.add('hidden');
        instructionsEl.classList.remove('hidden');
      }
    }
  }

  function onPointerLockError() {
    console.warn('Pointer lock failed');
    // Fall back to non-pointer-lock mode
    overlayEl.classList.remove('hidden');
    instructionsEl.classList.add('hidden');
    document.addEventListener('mousemove', onMouseMoveFallback);
    lastTime = performance.now();
    animate();
  }

  let isMouseDown = false;
  function onMouseMoveFallback(e) {
    // Fallback: use mouse movement without pointer lock (click-drag)
    if (!active) return;
    if (e.buttons !== 1) return;
    onMouseMove(e);
  }

  function onMouseMove(e) {
    if (!active) return;
    yaw -= e.movementX * lookSpeed;
    pitch -= e.movementY * lookSpeed;
    pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch));

    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  function onKeyDown(e) {
    if (!active) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.forward = true; break;
      case 'KeyS': case 'ArrowDown': keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft': keys.left = true; break;
      case 'KeyD': case 'ArrowRight': keys.right = true; break;
      case 'KeyQ': keys.up = true; break;
      case 'KeyE': keys.down = true; break;
      case 'ShiftLeft': case 'ShiftRight': moveSpeed = 6.0; break;
      case 'Escape':
        e.preventDefault();
        exit();
        break;
    }
  }

  function onKeyUp(e) {
    if (!active) return;
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': keys.forward = false; break;
      case 'KeyS': case 'ArrowDown': keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft': keys.left = false; break;
      case 'KeyD': case 'ArrowRight': keys.right = false; break;
      case 'KeyQ': keys.up = false; break;
      case 'KeyE': keys.down = false; break;
      case 'ShiftLeft': case 'ShiftRight': moveSpeed = 3.0; break;
    }
  }

  function animate() {
    if (!active) return;
    animFrameId = requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1); // cap at 100ms
    lastTime = now;

    // Movement direction relative to camera facing
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const velocity = new THREE.Vector3();

    if (keys.forward) velocity.add(forward);
    if (keys.backward) velocity.sub(forward);
    if (keys.right) velocity.add(right);
    if (keys.left) velocity.sub(right);

    if (velocity.length() > 0) {
      velocity.normalize().multiplyScalar(moveSpeed * dt);
      camera.position.add(velocity);
    }

    // Vertical movement
    if (keys.up) camera.position.y += moveSpeed * dt * 0.5;
    if (keys.down) camera.position.y = Math.max(0.3, camera.position.y - moveSpeed * dt * 0.5);

    renderer.render(scene, camera);
  }

  function getPlanCenter() {
    // Try to find center from current plan walls
    const plan = window._currentPlan || {};
    const walls = plan.walls || [];
    if (walls.length === 0) return { x: 5, z: 5 };

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    walls.forEach(w => {
      minX = Math.min(minX, w.start.x, w.end.x);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      minZ = Math.min(minZ, w.start.y, w.end.y);
      maxZ = Math.max(maxZ, w.start.y, w.end.y);
    });
    return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
  }

  function isActive() { return active; }

  function toggle() {
    if (active) exit(); else enter();
  }

  return { init, enter, exit, toggle, isActive };
})();

/**
 * three-scene.js — Renderer, cameras, lights, grid, animation loop
 */
const ThreeScene = (() => {
  let renderer, perspCamera, orthoCamera, activeCamera;
  let scene, gridHelper, ambientLight, dirLight, hemiLight;
  let orbitControls;
  let animationId;
  let canvasEl;

  // Materials (reusable)
  const materials = {
    wall: new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.9, metalness: 0 }),
    wallEdge: new THREE.LineBasicMaterial({ color: 0x888888 }),
    floor: new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
    door: new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.7, metalness: 0.1 }),
    doorFrame: new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.6, metalness: 0.1 }),
    window: new THREE.MeshStandardMaterial({ color: 0x64b5f6, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.4 }),
    windowFrame: new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.5, metalness: 0.3 }),
    dimension: new THREE.LineBasicMaterial({ color: 0xff5722 }),
    annotationNote: new THREE.MeshBasicMaterial({ color: 0xff9800 }),
    annotationMeasure: new THREE.LineBasicMaterial({ color: 0x29b6f6, linewidth: 2 }),
    column: new THREE.MeshStandardMaterial({ color: 0xa0a0a0, roughness: 0.6, metalness: 0.1 }),
    columnEdge: new THREE.LineBasicMaterial({ color: 0x666666 }),
    stair: new THREE.MeshStandardMaterial({ color: 0xc8b89a, roughness: 0.8, metalness: 0 }),
    stairEdge: new THREE.LineBasicMaterial({ color: 0x8a7a6a }),
  };

  // Scene groups
  const groups = {
    walls: new THREE.Group(),
    floors: new THREE.Group(),
    doors: new THREE.Group(),
    windows: new THREE.Group(),
    furniture: new THREE.Group(),
    labels: new THREE.Group(),
    dimensions: new THREE.Group(),
    annotations: new THREE.Group(),
    columns: new THREE.Group(),
    stairs: new THREE.Group(),
  };

  function init(canvas) {
    canvasEl = canvas;
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0f0f1a);

    // Scene
    scene = new THREE.Scene();

    // Cameras
    perspCamera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500);
    perspCamera.position.set(12, 10, 12);

    const aspect = w / h;
    const frustum = 12;
    orthoCamera = new THREE.OrthographicCamera(
      -frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 500
    );
    orthoCamera.position.set(0, 50, 0);
    orthoCamera.lookAt(0, 0, 0);

    activeCamera = perspCamera;

    // Lights
    ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.3);
    scene.add(hemiLight);

    // Grid
    gridHelper = new THREE.GridHelper(40, 40, 0x2a3a5e, 0x1a2a4e);
    scene.add(gridHelper);

    // Add groups to scene
    Object.values(groups).forEach(g => scene.add(g));

    // OrbitControls
    orbitControls = new THREE.OrbitControls(activeCamera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
    orbitControls.minDistance = 1;
    orbitControls.maxDistance = 100;
    orbitControls.target.set(3, 0, 3);

    // Resize
    window.addEventListener('resize', onResize);

    // Start loop
    animate();
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    orbitControls.update();
    renderer.render(scene, activeCamera);
  }

  function onResize() {
    const container = canvasEl.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;

    renderer.setSize(w, h);

    perspCamera.aspect = w / h;
    perspCamera.updateProjectionMatrix();

    const aspect = w / h;
    const frustum = 12;
    orthoCamera.left = -frustum * aspect;
    orthoCamera.right = frustum * aspect;
    orthoCamera.top = frustum;
    orthoCamera.bottom = -frustum;
    orthoCamera.updateProjectionMatrix();
  }

  function setCamera(type) {
    if (type === '2d') {
      activeCamera = orthoCamera;
      orbitControls.object = orthoCamera;
      orbitControls.enableRotate = false;
      orbitControls.mouseButtons = {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };
    } else {
      activeCamera = perspCamera;
      orbitControls.object = perspCamera;
      orbitControls.enableRotate = true;
      orbitControls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      };
    }
    orbitControls.update();
  }

  function clearGroups() {
    Object.values(groups).forEach(g => {
      while (g.children.length) {
        const child = g.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material && child.material.map) child.material.map.dispose();
        g.remove(child);
      }
    });
  }

  function animateCameraTo(pos, target, duration) {
    duration = duration || 800;
    const cam = activeCamera;
    const startPos = cam.position.clone();
    const startTarget = orbitControls.target.clone();
    const endPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    const endTarget = new THREE.Vector3(target.x, target.y, target.z);
    const startTime = performance.now();

    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      cam.position.lerpVectors(startPos, endPos, ease);
      orbitControls.target.lerpVectors(startTarget, endTarget, ease);
      orbitControls.update();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function toggleGrid(show) {
    gridHelper.visible = show;
  }

  function getRenderer() { return renderer; }
  function getScene() { return scene; }
  function getCamera() { return activeCamera; }
  function getPerspCamera() { return perspCamera; }
  function getOrthoCamera() { return orthoCamera; }
  function getControls() { return orbitControls; }
  function getMaterials() { return materials; }
  function getGroups() { return groups; }

  return {
    init, setCamera, clearGroups, animateCameraTo, toggleGrid, onResize,
    getRenderer, getScene, getCamera, getPerspCamera, getOrthoCamera,
    getControls, getMaterials, getGroups
  };
})();

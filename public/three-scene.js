/**
 * three-scene.js — Renderer, cameras, lights, grid, animation loop
 * Enhanced with better lighting, environment, and performance modes
 */
const ThreeScene = (() => {
  let renderer, perspCamera, orthoCamera, activeCamera;
  let scene, gridHelper, ambientLight, dirLight, hemiLight, fillLight;
  let orbitControls;
  let animationId;
  let canvasEl;
  let performanceMode = false;
  let envMap = null;
  let presentationMode = false;
  let daylightValue = 0.5; // 0=night, 0.5=day, 1=sunset

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

  // Detect mobile device for performance optimizations
  const _isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

  function init(canvas) {
    canvasEl = canvas;
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer — reduce quality on mobile for better performance
    const maxPixelRatio = _isMobile ? 1.5 : 2;
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !_isMobile,  // Disable AA on mobile for performance
      alpha: false,
      powerPreference: _isMobile ? 'low-power' : 'high-performance'
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = _isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0f0f1a);

    // PBR tone mapping for more realistic look
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

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

    // Lights — Enhanced for better visual quality
    ambientLight = new THREE.AmbientLight(0xffffff, _isMobile ? 0.5 : 0.4);
    scene.add(ambientLight);

    // Main directional light (sun)
    dirLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
    dirLight.position.set(15, 25, 10);
    dirLight.castShadow = true;
    const shadowSize = _isMobile ? 1024 : 2048;
    dirLight.shadow.mapSize.set(shadowSize, shadowSize);
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    // Fill light (softer, from opposite side)
    fillLight = new THREE.DirectionalLight(0xc8d8f0, 0.3);
    fillLight.position.set(-10, 15, -8);
    scene.add(fillLight);

    // Hemisphere light (sky/ground ambient)
    hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.35);
    scene.add(hemiLight);

    // Generate a simple environment map for reflections
    generateEnvMap();

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

    // Better touch handling for OrbitControls
    if (_isMobile) {
      orbitControls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
      };
      orbitControls.rotateSpeed = 0.5;
      orbitControls.panSpeed = 0.8;
    }

    // Resize
    window.addEventListener('resize', onResize);

    // Orientation change (mobile)
    window.addEventListener('orientationchange', () => {
      setTimeout(onResize, 100);
    });

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

  /** Generate a procedural gradient environment map for subtle reflections */
  function generateEnvMap() {
    if (_isMobile) return; // Skip on mobile for performance
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.5, '#E0E8F0');
    grad.addColorStop(1, '#F5F0E8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    envMap = tex;
    scene.environment = envMap;
  }

  /** Toggle performance mode (reduced quality for slower devices) */
  function setPerformanceMode(enabled) {
    performanceMode = enabled;
    if (enabled) {
      renderer.shadowMap.enabled = false;
      renderer.setPixelRatio(1);
      if (fillLight) fillLight.visible = false;
      scene.environment = null;
    } else {
      renderer.shadowMap.enabled = true;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, _isMobile ? 1.5 : 2));
      if (fillLight) fillLight.visible = true;
      scene.environment = envMap;
    }
  }

  function isPerformanceMode() { return performanceMode; }

  // ═══ FASE 4: Advanced Rendering ═══

  /** Daylight slider — controls sun position, intensity, and scene atmosphere */
  function setDaylight(value) {
    daylightValue = Math.max(0, Math.min(1, value));

    if (!dirLight || !ambientLight || !hemiLight) return;

    if (daylightValue <= 0.3) {
      // Night — dark ambient, dim moon-like light
      const t = daylightValue / 0.3;
      ambientLight.intensity = 0.08 + t * 0.2;
      ambientLight.color.setHex(0x1a1a3e);
      dirLight.intensity = 0.1 + t * 0.3;
      dirLight.color.setHex(0x6677aa);
      dirLight.position.set(-10, 5 + t * 15, -5);
      hemiLight.intensity = 0.05 + t * 0.15;
      hemiLight.color.setHex(0x1a2040);
      hemiLight.groundColor.setHex(0x0a0a15);
      if (fillLight) fillLight.intensity = 0.05;
      renderer.setClearColor(new THREE.Color(0x050510));
      renderer.toneMappingExposure = 0.4 + t * 0.4;
    } else if (daylightValue <= 0.7) {
      // Daytime — bright natural light
      const t = (daylightValue - 0.3) / 0.4;
      ambientLight.intensity = 0.28 + t * 0.15;
      ambientLight.color.setHex(0xffffff);
      dirLight.intensity = 0.7 + t * 0.4;
      dirLight.color.setHex(0xfff5e6);
      dirLight.position.set(15, 20 + t * 10, 10);
      hemiLight.intensity = 0.25 + t * 0.15;
      hemiLight.color.setHex(0xb1e1ff);
      hemiLight.groundColor.setHex(0xb97a20);
      if (fillLight) fillLight.intensity = 0.2 + t * 0.15;
      renderer.setClearColor(new THREE.Color(0x0f0f1a));
      renderer.toneMappingExposure = 0.9 + t * 0.4;
    } else {
      // Sunset — warm golden light
      const t = (daylightValue - 0.7) / 0.3;
      ambientLight.intensity = 0.35 - t * 0.15;
      ambientLight.color.setHex(0xffddaa);
      dirLight.intensity = 0.8 - t * 0.3;
      dirLight.color.setHex(0xff8844);
      dirLight.position.set(20, 5 + (1 - t) * 10, 15);
      hemiLight.intensity = 0.3 - t * 0.1;
      hemiLight.color.setHex(0xff9955);
      hemiLight.groundColor.setHex(0x553311);
      if (fillLight) fillLight.intensity = 0.15 - t * 0.1;
      renderer.setClearColor(new THREE.Color().lerpColors(
        new THREE.Color(0x0f0f1a), new THREE.Color(0x1a0a05), t
      ));
      renderer.toneMappingExposure = 1.1 - t * 0.3;
    }

    dirLight.shadow.camera.updateProjectionMatrix();
  }

  function getDaylight() { return daylightValue; }

  /** Glass material for windows — enhanced transparency and refraction */
  function getGlassMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      roughness: 0.05,
      metalness: 0.0,
      transparent: true,
      opacity: 0.25,
      transmission: 0.9,
      thickness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      side: THREE.DoubleSide,
      envMapIntensity: 1.0,
    });
  }

  /** Emissive material for ceiling lights, lamps, etc. */
  function getEmissiveMaterial(color, intensity) {
    return new THREE.MeshStandardMaterial({
      color: color || 0xfff5e0,
      emissive: color || 0xfff5e0,
      emissiveIntensity: intensity || 1.5,
      roughness: 0.3,
      metalness: 0.0,
    });
  }

  /** Toggle presentation mode — hide UI, max quality, better camera */
  function setPresentationMode(enabled) {
    presentationMode = enabled;

    if (enabled) {
      // Max quality
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.shadowMap.enabled = true;
      dirLight.shadow.mapSize.set(4096, 4096);
      dirLight.shadow.camera.updateProjectionMatrix();
      renderer.toneMappingExposure = 1.4;

      // Hide grid
      gridHelper.visible = false;

      // Better camera angle
      animateCameraTo(
        { x: 10, y: 8, z: 10 },
        { x: 3, y: 0, z: 3 },
        1200
      );
    } else {
      // Restore normal quality
      const maxPixelRatio = _isMobile ? 1.5 : 2;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
      renderer.shadowMap.type = _isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
      const shadowSize = _isMobile ? 1024 : 2048;
      dirLight.shadow.mapSize.set(shadowSize, shadowSize);
      dirLight.shadow.camera.updateProjectionMatrix();
      renderer.toneMappingExposure = 1.2;
      gridHelper.visible = true;
    }
  }

  function isPresentationMode() { return presentationMode; }

  function getRenderer() { return renderer; }
  function getScene() { return scene; }
  function getCamera() { return activeCamera; }
  function getPerspCamera() { return perspCamera; }
  function getOrthoCamera() { return orthoCamera; }
  function getControls() { return orbitControls; }
  function getMaterials() { return materials; }
  function getGroups() { return groups; }

  function isMobile() { return _isMobile; }

  return {
    init, setCamera, clearGroups, animateCameraTo, toggleGrid, onResize,
    getRenderer, getScene, getCamera, getPerspCamera, getOrthoCamera,
    getControls, getMaterials, getGroups, isMobile,
    setPerformanceMode, isPerformanceMode,
    // Fase 4: Advanced rendering
    setDaylight, getDaylight,
    getGlassMaterial, getEmissiveMaterial,
    setPresentationMode, isPresentationMode
  };
})();

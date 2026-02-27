/**
 * furniture-models-3d.js — Procedural Three.js 3D geometry per furniture type
 */
const FurnitureModels3D = (() => {

  /**
   * Create a 3D model group for a furniture item
   * @param {Object} furnitureData - { catalogId, position, rotation, scale, color }
   * @returns {THREE.Group}
   */
  function createModel(furnitureData) {
    const item = FurnitureCatalog.getItem(furnitureData.catalogId);
    if (!item) return createBox(furnitureData, 0.5, 0.5, 0.5, '#888888');

    const w = item.width * (furnitureData.scale ? furnitureData.scale.x : 1);
    const h = item.height * (furnitureData.scale ? furnitureData.scale.y : 1);
    const d = item.depth * (furnitureData.scale ? furnitureData.scale.z || furnitureData.scale.y : 1);
    const color = furnitureData.color || item.color;

    const cat = item.category;

    switch (cat) {
      case 'beds': return createBed(furnitureData, w, h, d, color);
      case 'sofas': return createSofa(furnitureData, w, h, d, color);
      case 'chairs': return createChairModel(furnitureData, w, h, d, color);
      case 'tables': return createTableModel(furnitureData, w, h, d, color, item.id);
      case 'bathroom': return createBathroomModel(furnitureData, w, h, d, color, item.id);
      case 'kitchen': return createKitchenModel(furnitureData, w, h, d, color, item.id);
      case 'plants': return createPlantModel(furnitureData, w, h, d, color);
      default: return createBox(furnitureData, w, h, d, color);
    }
  }

  function createBox(data, w, h, d, color) {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    positionGroup(group, data);
    return group;
  }

  function createBed(data, w, h, d, color) {
    const group = new THREE.Group();

    // Mattress
    const mattGeo = new THREE.BoxGeometry(w, h * 0.5, d);
    const mattMat = new THREE.MeshStandardMaterial({ color: '#F5F0EB', roughness: 0.9 });
    const mattress = new THREE.Mesh(mattGeo, mattMat);
    mattress.position.y = h * 0.35;
    mattress.castShadow = true;
    group.add(mattress);

    // Frame
    const frameGeo = new THREE.BoxGeometry(w + 0.04, h * 0.2, d + 0.04);
    const frameMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = h * 0.1;
    frame.castShadow = true;
    group.add(frame);

    // Headboard
    const hbGeo = new THREE.BoxGeometry(w + 0.04, h * 0.8, 0.05);
    const headboard = new THREE.Mesh(hbGeo, frameMat);
    headboard.position.set(0, h * 0.4, -d / 2);
    headboard.castShadow = true;
    group.add(headboard);

    // Pillows
    const pillowMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.9 });
    const pillowCount = w > 1.2 ? 2 : 1;
    const pillowW = (w - 0.1) / pillowCount - 0.05;
    for (let i = 0; i < pillowCount; i++) {
      const pGeo = new THREE.BoxGeometry(pillowW, 0.08, 0.3);
      const pillow = new THREE.Mesh(pGeo, pillowMat);
      const px = pillowCount === 1 ? 0 : (i === 0 ? -w / 4 : w / 4);
      pillow.position.set(px, h * 0.65, -d / 2 + 0.25);
      group.add(pillow);
    }

    positionGroup(group, data);
    return group;
  }

  function createSofa(data, w, h, d, color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: darkenColor(color, 0.2), roughness: 0.8 });

    // Seat
    const seatGeo = new THREE.BoxGeometry(w - 0.12, h * 0.4, d - 0.1);
    const seat = new THREE.Mesh(seatGeo, mat);
    seat.position.set(0, h * 0.25, 0.05);
    seat.castShadow = true;
    group.add(seat);

    // Back
    const backGeo = new THREE.BoxGeometry(w - 0.12, h * 0.55, 0.12);
    const back = new THREE.Mesh(backGeo, darkMat);
    back.position.set(0, h * 0.5, -d / 2 + 0.06);
    back.castShadow = true;
    group.add(back);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.1, h * 0.5, d);
    const armL = new THREE.Mesh(armGeo, darkMat);
    armL.position.set(-w / 2 + 0.05, h * 0.3, 0);
    armL.castShadow = true;
    group.add(armL);
    const armR = armL.clone();
    armR.position.x = w / 2 - 0.05;
    group.add(armR);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, h * 0.1, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: '#444', roughness: 0.5 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(sx * (w / 2 - 0.08), h * 0.05, sz * (d / 2 - 0.08));
      group.add(leg);
    });

    positionGroup(group, data);
    return group;
  }

  function createChairModel(data, w, h, d, color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });

    // Seat
    const seatGeo = new THREE.BoxGeometry(w, 0.04, d);
    const seat = new THREE.Mesh(seatGeo, mat);
    seat.position.y = h * 0.5;
    seat.castShadow = true;
    group.add(seat);

    // Back
    const backGeo = new THREE.BoxGeometry(w, h * 0.45, 0.03);
    const back = new THREE.Mesh(backGeo, mat);
    back.position.set(0, h * 0.75, -d / 2 + 0.015);
    back.castShadow = true;
    group.add(back);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.015, 0.015, h * 0.5, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: darkenColor(color, 0.3), roughness: 0.5 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(sx * (w / 2 - 0.03), h * 0.25, sz * (d / 2 - 0.03));
      group.add(leg);
    });

    positionGroup(group, data);
    return group;
  }

  function createTableModel(data, w, h, d, color, itemId) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 });

    if (itemId && itemId.includes('round')) {
      // Round tabletop
      const topGeo = new THREE.CylinderGeometry(w / 2, w / 2, 0.04, 24);
      const top = new THREE.Mesh(topGeo, mat);
      top.position.y = h - 0.02;
      top.castShadow = true;
      group.add(top);

      // Center pedestal
      const pedGeo = new THREE.CylinderGeometry(0.04, 0.06, h - 0.04, 12);
      const ped = new THREE.Mesh(pedGeo, new THREE.MeshStandardMaterial({ color: darkenColor(color, 0.2), roughness: 0.5 }));
      ped.position.y = (h - 0.04) / 2;
      group.add(ped);
    } else {
      // Rectangular tabletop
      const topGeo = new THREE.BoxGeometry(w, 0.04, d);
      const top = new THREE.Mesh(topGeo, mat);
      top.position.y = h - 0.02;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      // 4 Legs
      const legGeo = new THREE.BoxGeometry(0.04, h - 0.04, 0.04);
      const legMat = new THREE.MeshStandardMaterial({ color: darkenColor(color, 0.15), roughness: 0.5 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(sx * (w / 2 - 0.04), (h - 0.04) / 2, sz * (d / 2 - 0.04));
        group.add(leg);
      });
    }

    positionGroup(group, data);
    return group;
  }

  function createBathroomModel(data, w, h, d, color, itemId) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.1 });

    if (itemId === 'toilet') {
      // Bowl
      const bowlGeo = new THREE.CylinderGeometry(w / 2 * 0.8, w / 2 * 0.7, h * 0.8, 16);
      const bowl = new THREE.Mesh(bowlGeo, mat);
      bowl.position.set(0, h * 0.4, d * 0.1);
      bowl.castShadow = true;
      group.add(bowl);

      // Tank
      const tankGeo = new THREE.BoxGeometry(w * 0.8, h * 0.6, d * 0.3);
      const tank = new THREE.Mesh(tankGeo, mat);
      tank.position.set(0, h * 0.5, -d / 2 + d * 0.15);
      tank.castShadow = true;
      group.add(tank);
    } else if (itemId === 'bathtub') {
      const tubGeo = new THREE.BoxGeometry(w, h, d);
      const tub = new THREE.Mesh(tubGeo, mat);
      tub.position.y = h / 2;
      tub.castShadow = true;
      group.add(tub);
    } else {
      // Generic bathroom fixture
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = h / 2;
      mesh.castShadow = true;
      group.add(mesh);
    }

    positionGroup(group, data);
    return group;
  }

  function createKitchenModel(data, w, h, d, color, itemId) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.2 });

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Top surface slightly different
    if (itemId && (itemId.includes('stove') || itemId.includes('sink') || itemId.includes('counter'))) {
      const topGeo = new THREE.BoxGeometry(w + 0.02, 0.03, d + 0.02);
      const topMat = new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.3, metalness: 0.3 });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = h + 0.015;
      group.add(top);
    }

    positionGroup(group, data);
    return group;
  }

  function createPlantModel(data, w, h, d, color) {
    const group = new THREE.Group();

    // Pot
    const potGeo = new THREE.CylinderGeometry(w / 3, w / 4, h * 0.3, 12);
    const potMat = new THREE.MeshStandardMaterial({ color: '#8B4513', roughness: 0.8 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = h * 0.15;
    pot.castShadow = true;
    group.add(pot);

    // Foliage (sphere cluster)
    const foliageMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 });
    const leafR = Math.min(w, d) / 2;
    const leafGeo = new THREE.SphereGeometry(leafR, 12, 12);
    const leaf = new THREE.Mesh(leafGeo, foliageMat);
    leaf.position.y = h * 0.55;
    leaf.scale.y = (h * 0.6) / (leafR * 2);
    leaf.castShadow = true;
    group.add(leaf);

    positionGroup(group, data);
    return group;
  }

  // ---- Helpers ----

  function positionGroup(group, data) {
    if (data.position) {
      group.position.set(data.position.x, 0, data.position.y);
    }
    if (data.rotation) {
      group.rotation.y = -data.rotation;
    }
    group.userData = { type: 'furniture', id: data.id, catalogId: data.catalogId };
  }

  function darkenColor(hex, amount) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount)) | 0;
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount)) | 0;
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount)) | 0;
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
  }

  return { createModel };
})();

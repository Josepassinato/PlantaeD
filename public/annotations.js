/**
 * annotations.js — Note markers, measurement tool, annotations panel
 */
const Annotations = (() => {
  let currentPlan = null;
  let measureStart = null;
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function init() {
    document.getElementById('btn-export-annotations').addEventListener('click', exportAnnotations);
  }

  function setPlan(plan) {
    currentPlan = plan;
    renderPanel();
  }

  function handleCanvasClick(event, tool) {
    if (!currentPlan) return;
    if (tool !== 'note' && tool !== 'measure') return;

    const canvas = document.getElementById('three-canvas');
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, ThreeScene.getCamera());

    // Intersect with floor plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    if (!intersection) return;

    if (tool === 'note') {
      placeNote(intersection);
    } else if (tool === 'measure') {
      handleMeasureClick(intersection);
    }
  }

  function placeNote(point) {
    const text = prompt('Texto da nota:');
    if (!text) return;

    const ann = {
      id: 'a-' + Date.now(),
      type: 'note',
      position: { x: point.x, y: point.z, z: 1.4 },
      text: text,
      color: '#ff9800'
    };

    currentPlan.annotations = currentPlan.annotations || [];
    currentPlan.annotations.push(ann);
    buildAnnotation3D(ann);
    saveAnnotations();
    renderPanel();
  }

  function handleMeasureClick(point) {
    if (!measureStart) {
      measureStart = point.clone();
      App.setStatus('Clique no segundo ponto para medir');

      // Show temp marker
      const geo = new THREE.SphereGeometry(0.08, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0x29b6f6 });
      const marker = new THREE.Mesh(geo, mat);
      marker.position.copy(point);
      marker.position.y = 0.1;
      marker.userData = { temp: true };
      ThreeScene.getGroups().annotations.add(marker);
    } else {
      const start = measureStart;
      const end = point.clone();
      measureStart = null;

      // Remove temp marker
      const group = ThreeScene.getGroups().annotations;
      for (let i = group.children.length - 1; i >= 0; i--) {
        if (group.children[i].userData.temp) group.remove(group.children[i]);
      }

      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      const ann = {
        id: 'a-' + Date.now(),
        type: 'measurement',
        start: { x: start.x, y: start.z },
        end: { x: end.x, y: end.z },
        value: Math.round(dist * 100) / 100,
        unit: 'm'
      };

      currentPlan.annotations = currentPlan.annotations || [];
      currentPlan.annotations.push(ann);
      buildAnnotation3D(ann);
      saveAnnotations();
      renderPanel();
      App.setStatus('');
    }
  }

  function buildAnnotation3D(ann) {
    const group = ThreeScene.getGroups().annotations;

    if (ann.type === 'note') {
      // Orange sphere marker
      const geo = new THREE.SphereGeometry(0.12, 12, 12);
      const mat = new THREE.MeshBasicMaterial({ color: ann.color || 0xff9800 });
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(ann.position.x, ann.position.z || 1.4, ann.position.y);
      sphere.userData = { type: 'annotation', id: ann.id, annType: 'note' };

      // Pin line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(ann.position.x, 0, ann.position.y),
        new THREE.Vector3(ann.position.x, ann.position.z || 1.4, ann.position.y)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: ann.color || 0xff9800 });
      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = { parentId: ann.id };

      // Text sprite
      const sprite = FloorPlan.createLabelSprite(ann.text, 0.6, ann.color || '#ff9800');
      sprite.position.set(ann.position.x, (ann.position.z || 1.4) + 0.4, ann.position.y);
      sprite.userData = { parentId: ann.id };

      group.add(line);
      group.add(sphere);
      group.add(sprite);
    }

    if (ann.type === 'measurement') {
      const y = 0.1;
      const p1 = new THREE.Vector3(ann.start.x, y, ann.start.y);
      const p2 = new THREE.Vector3(ann.end.x, y, ann.end.y);

      // Line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x29b6f6 });
      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = { type: 'annotation', id: ann.id, annType: 'measurement' };

      // End markers
      [p1, p2].forEach(p => {
        const geo = new THREE.SphereGeometry(0.06, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0x29b6f6 });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.position.copy(p);
        sphere.userData = { parentId: ann.id };
        group.add(sphere);
      });

      // Label at midpoint
      const mid = new THREE.Vector3().lerpVectors(p1, p2, 0.5);
      const label = `${ann.value}${ann.unit || 'm'}`;
      const sprite = FloorPlan.createLabelSprite(label, 0.5, '#29b6f6');
      sprite.position.set(mid.x, 0.5, mid.z);
      sprite.userData = { parentId: ann.id };

      group.add(line);
      group.add(sprite);
    }
  }

  function deleteAnnotation(id) {
    if (!currentPlan) return;
    currentPlan.annotations = (currentPlan.annotations || []).filter(a => a.id !== id);

    // Remove 3D objects
    const group = ThreeScene.getGroups().annotations;
    for (let i = group.children.length - 1; i >= 0; i--) {
      const child = group.children[i];
      if (child.userData.id === id || child.userData.parentId === id) {
        if (child.geometry) child.geometry.dispose();
        group.remove(child);
      }
    }

    saveAnnotations();
    renderPanel();
  }

  function flyToAnnotation(ann) {
    let target;
    if (ann.type === 'note') {
      target = { x: ann.position.x, y: 0, z: ann.position.y };
    } else if (ann.type === 'measurement') {
      target = {
        x: (ann.start.x + ann.end.x) / 2,
        y: 0,
        z: (ann.start.y + ann.end.y) / 2
      };
    }
    if (!target) return;

    ThreeScene.animateCameraTo(
      { x: target.x + 5, y: 5, z: target.z + 5 },
      target,
      600
    );
  }

  function renderPanel() {
    const list = document.getElementById('annotations-list');
    const empty = document.getElementById('annotations-empty');
    const annotations = (currentPlan && currentPlan.annotations) || [];

    if (annotations.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    list.innerHTML = annotations.map(ann => {
      const typeLabel = ann.type === 'note' ? 'Nota' : 'Medida';
      const typeClass = ann.type;
      const content = ann.type === 'note'
        ? `<div class="ann-text">${escHtml(ann.text)}</div>`
        : `<div class="ann-value">${ann.value}${ann.unit || 'm'}</div>`;

      return `
        <div class="annotation-item" data-id="${ann.id}">
          <div class="ann-header">
            <span class="ann-type ${typeClass}">${typeLabel}</span>
            <button class="ann-delete" data-id="${ann.id}" title="Excluir">&times;</button>
          </div>
          ${content}
        </div>
      `;
    }).join('');

    // Event listeners
    list.querySelectorAll('.annotation-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('ann-delete')) return;
        const ann = annotations.find(a => a.id === el.dataset.id);
        if (ann) flyToAnnotation(ann);
      });
    });

    list.querySelectorAll('.ann-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteAnnotation(btn.dataset.id);
      });
    });
  }

  async function saveAnnotations() {
    if (!currentPlan) return;
    try {
      await fetch(`/api/planta3d/plans/${currentPlan.id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations: currentPlan.annotations })
      });
    } catch (err) {
      console.error('Failed to save annotations:', err);
    }
  }

  function exportAnnotations() {
    if (!currentPlan || !currentPlan.annotations || currentPlan.annotations.length === 0) {
      alert('Nenhuma anotação para exportar');
      return;
    }
    const data = JSON.stringify(currentPlan.annotations, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations-${currentPlan.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function cancelMeasure() {
    measureStart = null;
    const group = ThreeScene.getGroups().annotations;
    for (let i = group.children.length - 1; i >= 0; i--) {
      if (group.children[i].userData.temp) group.remove(group.children[i]);
    }
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, setPlan, handleCanvasClick, buildAnnotation3D, cancelMeasure, renderPanel };
})();

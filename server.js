const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const DxfParser = require('dxf-parser');

const app = express();
const PORT = process.env.PORT || 3400;
const PLANS_DIR = path.join(__dirname, 'data', 'plans');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

// Ensure directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({ dest: UPLOADS_DIR, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

if (!fs.existsSync(PLANS_DIR)) {
  fs.mkdirSync(PLANS_DIR, { recursive: true });
}

// --- API Routes ---

// List all plans
app.get('/api/planta3d/plans', (req, res) => {
  try {
    const files = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.json'));
    const plans = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(PLANS_DIR, f), 'utf8'));
      const stat = fs.statSync(path.join(PLANS_DIR, f));
      return { id: data.id, name: data.name, updatedAt: stat.mtime.toISOString() };
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single plan
app.get('/api/planta3d/plans/:id', (req, res) => {
  try {
    const filePath = path.join(PLANS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Plan not found' });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create plan
app.post('/api/planta3d/plans', (req, res) => {
  try {
    const plan = req.body;
    if (!plan.id) plan.id = 'plan-' + Date.now();
    if (!plan.name) plan.name = 'Novo Plano';
    // Defaults
    plan.units = plan.units || 'meters';
    plan.floorHeight = plan.floorHeight || 2.8;
    plan.wallThickness = plan.wallThickness || 0.15;
    plan.walls = plan.walls || [];
    plan.rooms = plan.rooms || [];
    plan.doors = plan.doors || [];
    plan.windows = plan.windows || [];
    plan.dimensions = plan.dimensions || [];
    plan.annotations = plan.annotations || [];
    plan.furniture = plan.furniture || [];
    plan.stairs = plan.stairs || [];
    plan.columns = plan.columns || [];
    plan.schemaVersion = plan.schemaVersion || 2;

    const filePath = path.join(PLANS_DIR, `${plan.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(plan, null, 2));
    res.status(201).json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update plan
app.put('/api/planta3d/plans/:id', (req, res) => {
  try {
    const filePath = path.join(PLANS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Plan not found' });
    const plan = { ...req.body, id: req.params.id };
    fs.writeFileSync(filePath, JSON.stringify(plan, null, 2));
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete plan
app.delete('/api/planta3d/plans/:id', (req, res) => {
  try {
    const filePath = path.join(PLANS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Plan not found' });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get annotations for a plan
app.get('/api/planta3d/plans/:id/annotations', (req, res) => {
  try {
    const filePath = path.join(PLANS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Plan not found' });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data.annotations || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save annotations for a plan
app.post('/api/planta3d/plans/:id/annotations', (req, res) => {
  try {
    const filePath = path.join(PLANS_DIR, `${req.params.id}.json`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Plan not found' });
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.annotations = req.body.annotations || req.body;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json(data.annotations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DXF Import
app.post('/api/planta3d/import-dxf', upload.single('dxf'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const content = fs.readFileSync(req.file.path, 'utf8');
    const parser = new DxfParser();
    const dxf = parser.parseSync(content);

    // Cleanup uploaded file
    fs.unlinkSync(req.file.path);

    if (!dxf || !dxf.entities) {
      return res.status(400).json({ error: 'Invalid DXF file' });
    }

    const walls = [];
    const rooms = [];

    dxf.entities.forEach(entity => {
      if (entity.type === 'LINE') {
        // Convert LINE to wall
        if (entity.vertices && entity.vertices.length >= 2) {
          const v0 = entity.vertices[0];
          const v1 = entity.vertices[1];
          walls.push({
            start: { x: v0.x / 1000, y: v0.y / 1000 },  // mm to meters
            end: { x: v1.x / 1000, y: v1.y / 1000 }
          });
        }
      } else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
        const verts = entity.vertices || [];
        if (verts.length < 2) return;

        const isClosed = entity.shape || (entity.type === 'LWPOLYLINE' && entity.shape);

        // Generate walls from polyline segments
        for (let i = 0; i < verts.length - 1; i++) {
          walls.push({
            start: { x: verts[i].x / 1000, y: verts[i].y / 1000 },
            end: { x: verts[i + 1].x / 1000, y: verts[i + 1].y / 1000 }
          });
        }

        // Close the polyline
        if (isClosed && verts.length >= 3) {
          walls.push({
            start: { x: verts[verts.length - 1].x / 1000, y: verts[verts.length - 1].y / 1000 },
            end: { x: verts[0].x / 1000, y: verts[0].y / 1000 }
          });

          // Closed polyline = room
          rooms.push({
            name: entity.layer || 'Sala',
            vertices: verts.map(v => ({ x: v.x / 1000, y: v.y / 1000 }))
          });
        }
      }
    });

    // If coordinates seem too large (already in meters), don't divide by 1000
    if (walls.length > 0) {
      const maxCoord = Math.max(
        ...walls.map(w => Math.max(Math.abs(w.start.x), Math.abs(w.start.y), Math.abs(w.end.x), Math.abs(w.end.y)))
      );
      // If max coord < 0.1, values were probably already in meters - scale up
      if (maxCoord < 0.1 && walls.length > 0) {
        walls.forEach(w => {
          w.start.x *= 1000; w.start.y *= 1000;
          w.end.x *= 1000; w.end.y *= 1000;
        });
        rooms.forEach(r => {
          r.vertices.forEach(v => { v.x *= 1000; v.y *= 1000; });
        });
      }
      // If max coord > 100, values are in mm - already divided by 1000 above, should be fine
      // If max coord is between 0.1 and 100 - reasonable meter values
    }

    res.json({ walls, rooms, entityCount: dxf.entities.length });
  } catch (err) {
    // Cleanup on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('DXF parse error:', err);
    res.status(500).json({ error: 'Failed to parse DXF: ' + err.message });
  }
});

// Tutorial page
app.get('/tutorial', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tutorial.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Planta 3D running on port ${PORT}`);
});

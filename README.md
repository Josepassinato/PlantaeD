# Planta 3D

Visualizador 3D interativo de plantas arquitetônicas com editor 2D integrado.

## Features

### Phase 1 — Core
- Visualização 3D/2D com toggle
- Editor de ambientes (paredes, portas, janelas)
- Dimensões e medidas
- Anotações e notas
- OrbitControls + fly-to
- Export JSON
- PWA (offline)

### Phase 2 — Advanced
- PBR rendering com materiais realistas
- Editor de materiais (textura, cor, roughness, metalness)
- Exportação PDF com layout profissional
- Multi-floor (gerenciamento de andares)
- Walkthrough mode (navegação em primeira pessoa)
- Touch gestures para mobile
- Persistência via localStorage

## Stack

- **3D Engine:** Three.js r152
- **Frontend:** Vanilla HTML/CSS/JS
- **Backend:** Express.js
- **PDF:** jsPDF
- **Dados:** JSON files

## Rodando

```bash
npm install
node server.js
# http://localhost:3400
```

## API

- `GET /api/planta3d/plans` — listar planos
- `GET /api/planta3d/plans/:id` — obter plano
- `POST /api/planta3d/plans` — criar plano
- `PUT /api/planta3d/plans/:id` — atualizar plano
- `DELETE /api/planta3d/plans/:id` — remover plano

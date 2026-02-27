# CLAUDE.md — Planta 3D (SOMA-ID)

## Visao Geral do Projeto

**Planta 3D** e um editor web de plantas arquitetonicas para marcenaria, parte do sistema SOMA-ID. Permite criar, editar e visualizar plantas baixas em 2D e 3D, com suporte a paredes, portas, janelas, moveis, escadas, pilares, cotas e anotacoes. A interface e em portugues brasileiro.

- **Stack**: Node.js + Express (backend), Vanilla JS + Three.js (frontend), sem framework de build
- **Linguagem da UI**: Portugues brasileiro (pt-BR)
- **Porta padrao**: 3400
- **PWA**: Sim, com Service Worker e manifest.json

## Estrutura do Projeto

```
PlantaeD/
├── server.js                  # Servidor Express — API REST + static files
├── package.json               # Dependencias: express, multer, dxf-parser
├── ecosystem.config.js        # Configuracao PM2 para producao
├── .gitignore                 # Ignora node_modules/
├── data/
│   ├── plans/                 # Planos salvos como JSON (file-based storage)
│   │   └── sample.json        # Plano de exemplo: "Apartamento 2Q - 65m²"
│   └── uploads/               # Diretorio temporario para uploads DXF
├── public/                    # Frontend — arquivos estaticos servidos pelo Express
│   ├── index.html             # SPA principal — toda a UI HTML
│   ├── style.css              # Estilos globais (dark theme, #0C0E13 bg, #00E5CC accent)
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker (network-first, cache v5)
│   ├── OrbitControls.js       # Three.js OrbitControls (vendored)
│   │
│   │── # Camada Foundation
│   ├── event-bus.js           # Pub/sub global (EventBus)
│   ├── data-model.js          # Schema, migracao, validacao, geracao de IDs (DataModel)
│   ├── undo-manager.js        # Undo/redo por snapshots JSON (UndoManager)
│   ├── canvas-interaction.js  # Coordenadas screen↔world, snap, snap magnetico (CanvasInteraction)
│   ├── hit-testing.js         # Deteccao de clique em elementos 2D (HitTesting)
│   │
│   │── # Camada Data
│   ├── furniture-catalog.js   # 140+ moveis em 17 categorias (FurnitureCatalog)
│   ├── material-system.js     # Materiais de piso/parede, texturas procedurais (MaterialSystem)
│   ├── furniture-icons.js     # Thumbnails SVG dos moveis (FurnitureIcons)
│   ├── furniture-models-3d.js # Geometria 3D dos moveis (FurnitureModels3D)
│   │
│   │── # Camada Rendering
│   ├── canvas-renderer.js     # Renderizacao 2D pura no canvas (CanvasRenderer)
│   ├── three-scene.js         # Cena Three.js — renderer, cameras, luzes, grupos (ThreeScene)
│   ├── floor-plan.js          # Construtores de geometria 3D — paredes, pisos, etc. (FloorPlan)
│   │
│   │── # Camada Infrastructure
│   ├── plugin-manager.js      # Sistema de plugins extensivel (PluginManager)
│   │
│   │── # Camada UI/Controls
│   ├── controls.js            # OrbitControls wrapper, views, zoom, fullscreen (Controls)
│   ├── annotations.js         # Notas e medicoes 3D (Annotations)
│   ├── editor-2d.js           # Editor 2D central — canvas, mouse/touch, ferramentas (Editor2D)
│   │
│   │── # Camada App
│   ├── app.js                 # Hub principal — estado global, API, toolbar, integracao (App)
│   └── ux-enhancements.js     # Welcome screen, onboarding tour, atalhos de teclado
```

## Arquitetura

### Modulos Globais (IIFE Pattern)

Todos os modulos frontend usam o padrao **IIFE** (Immediately Invoked Function Expression) que expoe um singleton global:

```js
const NomeDoModulo = (() => {
  // estado privado
  function metodoPublico() { ... }
  return { metodoPublico };
})();
```

**Modulos principais e seus globais:**
- `EventBus` — pub/sub (on, off, emit, once, clear)
- `DataModel` — schema v2, migracao, validacao, geracao de IDs
- `UndoManager` — pilha de snapshots JSON (max 50)
- `CanvasInteraction` — conversao screen↔world, snap a grid (0.25m), snap magnetico
- `HitTesting` — deteccao de hit em paredes, portas, janelas, moveis, etc.
- `FurnitureCatalog` — catalogo de 140+ moveis (getAll, search, getByCategory)
- `MaterialSystem` — 18 materiais de piso, 12 cores de parede, texturas procedurais
- `FurnitureIcons` — gerador de thumbnails SVG/canvas
- `FurnitureModels3D` — geometria Three.js para moveis
- `CanvasRenderer` — renderizacao 2D (grid, paredes, portas, janelas, moveis, etc.)
- `ThreeScene` — cena Three.js (renderer, cameras, luzes, grupos, materiais)
- `FloorPlan` — construtores de mesh 3D (buildAll, buildWallMesh, etc.)
- `PluginManager` — registro e ciclo de vida de plugins
- `Controls` — wrapper de OrbitControls, views, zoom, fullscreen
- `Annotations` — notas/medicoes 3D com raycasting
- `Editor2D` — editor 2D completo com state machine de ferramentas
- `App` — hub central, estado global (currentPlan, activeTool, is2DMode)

### Ordem de Carregamento dos Scripts (index.html)

A ordem e critica — modulos dependem de globais definidos antes deles:

1. `three.min.js` (CDN) + `OrbitControls.js`
2. Foundation: `event-bus.js`, `data-model.js`, `undo-manager.js`, `canvas-interaction.js`, `hit-testing.js`
3. Data: `furniture-catalog.js`, `material-system.js`, `furniture-icons.js`, `furniture-models-3d.js`
4. Rendering: `canvas-renderer.js`
5. Infrastructure: `plugin-manager.js`
6. Existing: `three-scene.js`, `floor-plan.js`, `controls.js`, `annotations.js`
7. Editor: `editor-2d.js`
8. App: `app.js` (ultimo, orquestra tudo)
9. UX: `ux-enhancements.js`

### Comunicacao entre Modulos

Os modulos se comunicam via **EventBus** (pub/sub). Eventos principais:

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `plan:loaded` | plan object | Plano carregado da API |
| `plan:changed` | plan object | Qualquer alteracao no plano (trigger auto-save 1.5s) |
| `plan:saved` | plan object | Plano salvo com sucesso na API |
| `tool:changed` | `{ tool }` | Ferramenta ativa mudou |
| `mode:changed` | `{ is2D }` | Modo 2D/3D alternado |
| `element:selected` | hit object | Elemento selecionado (abre painel de propriedades) |
| `element:deselected` | — | Selecao removida |
| `undo:changed` | `{ canUndo, canRedo }` | Estado do undo/redo mudou |
| `snap:toggled` | `{ enabled }` | Snap ativado/desativado |
| `material:applied` | `{ type, element }` | Material/cor aplicado a elemento |
| `plugin:registered` | `{ name }` | Plugin registrado |

## API REST

Base path: `/api/planta3d`

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | `/api/planta3d/plans` | Listar todos os planos |
| GET | `/api/planta3d/plans/:id` | Obter plano por ID |
| POST | `/api/planta3d/plans` | Criar novo plano |
| PUT | `/api/planta3d/plans/:id` | Atualizar plano |
| DELETE | `/api/planta3d/plans/:id` | Excluir plano |
| GET | `/api/planta3d/plans/:id/annotations` | Obter anotacoes |
| POST | `/api/planta3d/plans/:id/annotations` | Salvar anotacoes |
| POST | `/api/planta3d/import-dxf` | Importar arquivo DXF (multipart form) |

**Persistencia**: File-based, planos salvos como JSON em `data/plans/{id}.json`.

**Upload de DXF**: Via `multer`, limite de 10MB, arquivo temporario em `data/uploads/`, removido apos parse.

## Modelo de Dados (Plan Schema v2)

```json
{
  "id": "plan-1234567890",
  "name": "Nome do Plano",
  "schemaVersion": 2,
  "units": "meters",
  "floorHeight": 2.8,
  "wallThickness": 0.15,
  "walls": [{ "id": "w-xxx", "start": {"x":0,"y":0}, "end": {"x":5,"y":0}, "height": 2.8, "thickness": 0.15, "color": "#F5F0E8" }],
  "rooms": [{ "id": "r-xxx", "name": "Sala", "vertices": [...], "floorMaterial": "hardwood", "floorColor": "#e8dcc8" }],
  "doors": [{ "id": "d-xxx", "wallId": "w-xxx", "position": 0.5, "width": 0.9, "height": 2.1, "type": "single" }],
  "windows": [{ "id": "win-xxx", "wallId": "w-xxx", "position": 0.5, "width": 1.2, "height": 1.0, "sillHeight": 1.0 }],
  "furniture": [{ "id": "furn-xxx", "catalogId": "sofa-3seat", "position": {"x":2,"y":3}, "rotation": 0, "scale": {"x":1,"y":1,"z":1} }],
  "columns": [{ "id": "col-xxx", "position": {"x":1,"y":1}, "shape": "square", "size": 0.3, "height": 2.8 }],
  "stairs": [{ "id": "stair-xxx", "position": {"x":0,"y":0}, "width": 1.0, "depth": 2.5, "steps": 12, "rotation": 0, "type": "straight" }],
  "dimensions": [{ "id": "dim-xxx", "start": {"x":0,"y":0}, "end": {"x":5,"y":0}, "label": "", "offset": -0.5 }],
  "annotations": [{ "id": "a-xxx", "type": "note|measure", "text": "...", "position": {"x":0,"y":0,"z":0} }]
}
```

### Convencao de Coordenadas

- **JSON/2D**: `{x, y}` — coordenadas em metros no plano 2D
- **Three.js/3D**: `{x, 0, z}` — o `y` do JSON vira `z` no Three.js, Y e a altura
- **IDs**: Formato `{prefixo}-{timestamp_base36}-{counter}` (ex: `w-lzk3f4a-1`)

## Ferramentas do Editor 2D

| Tecla | Ferramenta | Descricao |
|-------|-----------|-----------|
| V | select | Selecionar e mover elementos |
| W | wall | Desenhar paredes ponto a ponto |
| D | door | Adicionar porta em parede existente |
| J | window | Adicionar janela em parede existente |
| F | furniture | Abrir catalogo de moveis |
| O | room | Desenhar sala (vertices, duplo-clique fecha) |
| P | column | Posicionar pilar (Q alterna quadrado/circular) |
| T | stairs | Posicionar escada (R rotaciona) |
| E | eraser | Apagar elemento clicado |
| N | note | Adicionar nota/anotacao |
| M | measure | Medir distancia entre dois pontos |
| C | dimension | Adicionar cota fixa |
| R | — | Rotacionar movel/escada selecionado |
| S | — | Toggle snap on/off |
| ESC | — | Cancelar acao atual |
| Ctrl+Z | — | Desfazer |
| Ctrl+Shift+Z | — | Refazer |

## Comandos de Desenvolvimento

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm start          # node server.js (porta 3400)

# Producao com PM2
pm2 start ecosystem.config.js
```

**Nao ha**: framework de build, bundler, transpiler, testes automatizados, linter, TypeScript. Todo o codigo frontend e vanilla JS servido diretamente como arquivos estaticos.

## Convencoes de Codigo

### Estilo Geral
- **Modulos**: Padrao IIFE com `const NomeModulo = (() => { ... return { ... }; })();`
- **Sem imports/exports ES6**: Tudo via globais no escopo `window`
- **Sem classes**: Funcoes e closures
- **IDs HTML**: kebab-case (ex: `btn-save-plan`, `editor-canvas`)
- **Variaveis JS**: camelCase
- **Constantes**: UPPER_SNAKE_CASE (ex: `GRID_SIZE`, `SNAP_THRESHOLD`)
- **Strings de UI**: Portugues brasileiro sem acentos nos arquivos fonte (ex: "Anotacoes", "Mobiliar")
- **Comentarios**: Em ingles nos JSDoc, misturado portugues/ingles no resto

### CSS
- **Theme**: Dark mode fixo (#0C0E13 background, #00E5CC accent/teal, #F0E6D3 texto)
- **CSS Variables**: `--bg`, `--surface`, `--accent`, `--text`, etc. (definidas em :root no style.css)
- **Mobile-first**: Responsivo com breakpoints, barra inferior de ferramentas para mobile
- **Naming**: Prefixos semanticos (`.tool-btn`, `.prop-group`, `.furn-item`, `.welcome-*`)

### Ao Adicionar Novas Funcionalidades
1. Criar novo arquivo JS em `public/` com padrao IIFE
2. Adicionar `<script>` no `index.html` **na ordem correta de dependencia**
3. Adicionar ao array `PRECACHE` em `sw.js` para cache offline
4. Usar `EventBus` para comunicacao entre modulos (nao chamar modulos diretamente quando possivel)
5. Para novos elementos no plano: adicionar array no schema (`DataModel.migratePlan`), renderer 2D (`CanvasRenderer`), construtor 3D (`FloorPlan`), hit testing (`HitTesting`), e ferramenta no `Editor2D`
6. Atualizar `CACHE_NAME` no `sw.js` ao fazer mudancas nos arquivos estaticos

### Ao Modificar a API
- Rotas seguem padrao REST em `/api/planta3d/...`
- Persistencia e file-based (JSON em `data/plans/`)
- Sem banco de dados — cuidado com concorrencia (leitura sincrona com `readFileSync`)
- IDs de plano gerados no formato `plan-{timestamp}`

## Dependencias

### Backend (package.json)
- `express` ^4.18.2 — servidor HTTP e rotas
- `multer` ^1.4.5 — upload de arquivos (DXF)
- `dxf-parser` ^1.1.2 — parse de arquivos AutoCAD DXF

### Frontend (CDN)
- `three.js` 0.152.2 — renderizacao 3D (via unpkg CDN)
- `OrbitControls.js` — vendored localmente em public/

### Fontes
- Inter (400-700) — texto principal
- Space Mono (400, 700) — monospace (logo, badges)

## Pontos de Atencao

- **Sem testes automatizados**: Testar manualmente no navegador apos mudancas
- **Sem bundler**: Cada arquivo JS e um request HTTP separado
- **Service Worker**: Atualizar `CACHE_NAME` em `sw.js` ao modificar arquivos estaticos, senao usuarios podem ver versao em cache
- **File-based storage**: Sem transacoes, sem lock — `readFileSync`/`writeFileSync` podem causar race conditions sob carga
- **Three.js vendored**: OrbitControls.js e local, three.js via CDN — manter versoes sincronizadas
- **Coordenadas**: JSON usa `{x, y}`, Three.js usa `{x, height, z}` — o `y` do plano 2D vira `z` no 3D
- **Auto-save**: Mudancas sao salvas automaticamente apos 1.5s de inatividade (debounce em `plan:changed`)
- **Mobile**: Touch events completos com long press, double tap, pinch zoom, e inertia

# PLANO DE APERFEICOAMENTO — Planta3D v2.0
## "O melhor de cada app, unificado"

> Inspirado em: MSMV Design | AI Decor (YSpira) | iMeshh | RENDR
> Data: 28/02/2026

---

## FASE 1 — UI/UX PREMIUM (Prioridade Alta)
**Inspiracao: MSMV Design + AI Decor**
**Impacto: ALTO | Dificuldade: MEDIA | Tempo estimado: 2-3 dias**

### 1.1 — Redesign da Tela Inicial (Onboarding)
- [ ] Modal "Start New Project" com cards visuais (igual AI Decor):
  - "Criar do zero" (editor em branco)
  - "Upload de planta" (foto/imagem como referencia de fundo)
  - "Importar DXF" (AutoCAD)
  - "Usar template" (plantas pre-prontas)
  - "Abrir projeto salvo"
- [ ] Background com gradient moderno (rosa/roxo ou azul/cyan)
- [ ] Logo e branding "Planta3D" com tipografia premium

### 1.2 — Dashboard "Meus Projetos"
- [ ] Grid visual com thumbnails (screenshot automatico de cada projeto)
- [ ] Cards com: nome, data, miniatura, badge "Novo"
- [ ] Filtros: Recentes, Favoritos, Por tipo
- [ ] Busca por nome de projeto
- [ ] Acoes rapidas: Duplicar, Renomear, Excluir, Exportar

### 1.3 — Bottom Navigation Mobile (App-like)
- [ ] Barra fixa inferior com 5 icones:
  - Home (dashboard)
  - Projetos
  - Ferramentas (editor)
  - Catalogo (moveis)
  - Perfil/Config
- [ ] Transicoes suaves entre telas
- [ ] Feedback haptico visual nos botoes

### 1.4 — Tema e Visual
- [ ] Manter tema escuro como padrao
- [ ] Adicionar opcao de tema claro
- [ ] Gradient accent colors (cyan→purple ou rose→orange)
- [ ] Glassmorphism nos paineis (backdrop-filter: blur)
- [ ] Micro-animacoes nos botoes e transicoes
- [ ] Loading skeleton enquanto carrega projetos

---

## FASE 2 — BIBLIOTECA DE ASSETS PROFISSIONAL (Prioridade Alta)
**Inspiracao: iMeshh**
**Impacto: ALTISSIMO | Dificuldade: MEDIA | Tempo estimado: 3-4 dias**

### 2.1 — Expansao do Catalogo de Moveis
- [ ] Reorganizar em categorias visuais com icones:
  - Sala de Estar, Quarto, Cozinha, Banheiro, Escritorio, Area Externa
- [ ] Adicionar subcategorias com filtros
- [ ] Preview 3D do movel antes de inserir (mini viewer)
- [ ] Dimensoes editaveis (largura x profundidade x altura)
- [ ] Campo de busca no catalogo

### 2.2 — Biblioteca de Texturas PBR Expandida
- [ ] +30 texturas de piso (madeiras, marmores, ceramicas, pedras, cimentos)
- [ ] +20 texturas de parede (tintas, papeis de parede, tijolos, azulejos)
- [ ] Preview visual em grid (quadrados coloridos com textura)
- [ ] Texturas procedurais melhoradas com mais realismo
- [ ] Upload de textura customizada (imagem do usuario)

### 2.3 — Templates de Ambientes Prontos
- [ ] 10+ templates de plantas pre-prontas:
  - Apartamento Studio (25-35m2)
  - Apartamento 1 quarto (45-55m2)
  - Apartamento 2 quartos (65-80m2)
  - Casa terrea 2 quartos
  - Casa terrea 3 quartos
  - Cozinha americana
  - Banheiro padrao
  - Escritorio home office
  - Sala comercial
  - Loft
- [ ] Cada template ja com moveis posicionados
- [ ] Editavel apos carregar

---

## FASE 3 — ESTIMATIVA DE CUSTOS (Prioridade Media-Alta)
**Inspiracao: MSMV Design**
**Impacto: ALTO | Dificuldade: MEDIA | Tempo estimado: 2 dias**

### 3.1 — Sistema de Precos nos Materiais
- [ ] Cada material/textura com preco por m2 (editavel)
- [ ] Calculo automatico de area de piso por comodo
- [ ] Calculo automatico de area de parede por comodo
- [ ] Cada movel com preco estimado (editavel)

### 3.2 — Painel de Orcamento
- [ ] Painel lateral "Orcamento" com:
  - Lista de materiais com quantidades e precos
  - Lista de moveis com precos
  - Custo de mao de obra (input manual)
  - Total geral
- [ ] Exportar orcamento como PDF
- [ ] Exportar como planilha CSV

### 3.3 — Medicao Inteligente
- [ ] Area total do projeto (automatica)
- [ ] Area por comodo (automatica)
- [ ] Perimetro de paredes (automatico)
- [ ] Quantidade de portas e janelas
- [ ] Resumo de metragens no status bar

---

## FASE 4 — RENDERIZACAO AVANCADA (Prioridade Media)
**Inspiracao: iMeshh + MSMV Design**
**Impacto: ALTO | Dificuldade: ALTA | Tempo estimado: 3-4 dias**

### 4.1 — Iluminacao Realista
- [ ] Luz natural direcional com hora do dia (slider)
- [ ] Luzes internas por comodo (point lights automaticas)
- [ ] Luzes dos moveis (luminarias funcionais)
- [ ] Sombras suaves com PCSS ou VSM
- [ ] Ambient Occlusion (SSAO post-processing)

### 4.2 — Materiais Avancados
- [ ] Vidro transparente para janelas (MeshPhysicalMaterial)
- [ ] Espelhos com reflexao (CubeCamera ou SSR)
- [ ] Agua para piscinas/banheiras
- [ ] Emissivos para telas de TV e luminarias
- [ ] Normal maps procedurais para mais detalhe

### 4.3 — Modo de Apresentacao
- [ ] Camera path automatica (flythrough do projeto)
- [ ] Pontos de vista salvos (bookmarks de camera)
- [ ] Screenshot em alta resolucao (4K)
- [ ] Comparacao antes/depois (split view)
- [ ] Modo galeria com multiplos angulos

---

## FASE 5 — UPLOAD DE IMAGEM / REFERENCIA (Prioridade Media)
**Inspiracao: AI Decor**
**Impacto: MEDIO-ALTO | Dificuldade: MEDIA | Tempo estimado: 1-2 dias**

### 5.1 — Upload de Foto como Referencia
- [ ] Botao "Upload Planta" no modal inicial
- [ ] Aceitar JPG/PNG de planta baixa desenhada a mao
- [ ] Exibir como background do canvas 2D (opacity ajustavel)
- [ ] Permitir escala e posicionamento da imagem
- [ ] Desenhar por cima da referencia com snap

### 5.2 — Galeria de Inspiracao
- [ ] Grid de imagens de referencia (estilos de decoracao)
- [ ] Categorias: Moderno, Classico, Industrial, Minimalista, Rustico
- [ ] Paleta de cores extraida da imagem
- [ ] Aplicar estilo de cores ao projeto

---

## FASE 6 — COLABORACAO E COMPARTILHAMENTO (Prioridade Media)
**Inspiracao: MSMV Design**
**Impacto: ALTO | Dificuldade: ALTA | Tempo estimado: 3-4 dias**

### 6.1 — Compartilhamento por Link
- [ ] Gerar link publico do projeto (somente visualizacao)
- [ ] Viewer 3D embeddable (iframe)
- [ ] QR Code para abrir no celular
- [ ] Protecao por senha (opcional)

### 6.2 — Sistema de Comentarios
- [ ] Pins de comentario no projeto (click para adicionar)
- [ ] Nome do comentador
- [ ] Timestamp
- [ ] Status: Aberto/Resolvido
- [ ] Notificacao visual de novos comentarios

### 6.3 — Exportacao Profissional
- [ ] PDF multi-pagina melhorado:
  - Capa com logo e dados do projeto
  - Planta 2D com cotas
  - Renders 3D de cada comodo
  - Lista de materiais com precos
  - Orcamento detalhado
- [ ] Exportar para WhatsApp (link + preview)
- [ ] Export DXF (alem do import que ja existe)

---

## FASE 7 — MEDICAO PRECISA E FIELD NOTES (Prioridade Media)
**Inspiracao: RENDR**
**Impacto: ALTO | Dificuldade: MEDIA | Tempo estimado: 2 dias**

### 7.1 — Medicoes Automaticas
- [ ] Calculo automatico de area de cada comodo (m2)
- [ ] Perimetro total de paredes (metros lineares)
- [ ] Contagem automatica de portas e janelas
- [ ] Area total do projeto
- [ ] Exibir metragens em tempo real no status bar
- [ ] Painel "Resumo de Medicoes" com todas as metricas

### 7.2 — Field Notes (Anotacoes de Campo)
- [ ] Markup direto sobre a planta (setas, circulos, destaques)
- [ ] Pins com texto em qualquer ponto do projeto
- [ ] Foto anexada a uma anotacao (referencia visual)
- [ ] Cores diferentes para tipos de nota (alerta, info, pendencia)
- [ ] Exportar notas junto com o PDF

### 7.3 — Dimensionamento Preciso
- [ ] Input numerico exato para paredes (digitar comprimento)
- [ ] Input numerico para posicao de moveis (x, y)
- [ ] Cotas automaticas em todas as paredes
- [ ] Angulos exibidos nos cantos
- [ ] Snap magnetico melhorado (endpoints, midpoints, perpendicular)

---

## FASE 8 — SMART WIZARD (Prioridade Baixa-Media)
**Inspiracao: AI Decor + MSMV Design**
**Impacto: MEDIO | Dificuldade: MEDIA | Tempo estimado: 2 dias**

### 8.1 — Assistente de Criacao Guiado
- [ ] Step 1: "Que tipo de projeto?" (Casa, Apto, Comercial, Comodo unico)
- [ ] Step 2: "Quantos comodos?" (slider ou botoes)
- [ ] Step 3: "Qual o tamanho total?" (m2)
- [ ] Step 4: "Qual estilo?" (Moderno, Classico, Industrial, Minimalista)
- [ ] Step 5: "Orcamento?" (Economico, Medio, Premium)
- [ ] Gerar planta automaticamente com base nas respostas
- [ ] Moveis sugeridos automaticamente por estilo

### 8.2 — Sugestoes Inteligentes
- [ ] Ao criar comodo, sugerir moveis tipicos (ex: quarto → cama + criado-mudo)
- [ ] Alertar proporcoes incorretas (comodo muito estreito, porta mal posicionada)
- [ ] Sugerir cores harmonicas baseadas na paleta escolhida

---

## FASE 9 — PWA E PERFORMANCE (Prioridade Continua)
**Impacto: MEDIO | Dificuldade: BAIXA-MEDIA | Tempo estimado: 1-2 dias**

### 9.1 — PWA Completo
- [ ] Splash screen com logo
- [ ] Icone do app refinado (multiplas resolucoes)
- [ ] Cache offline melhorado (Service Worker atualizado)
- [ ] Push notifications (lembrete para salvar)

### 9.2 — Performance
- [ ] Lazy loading de modulos (furniture, walkthrough, pdf)
- [ ] LOD (Level of Detail) para moveis distantes
- [ ] Spatial indexing (quadtree) para hit-testing
- [ ] Web Workers para calculo de orcamento e export
- [ ] Compressao de thumbnails/screenshots

---

## RESUMO DE PRIORIDADES

| Fase | Feature | Impacto | Dificuldade | Inspiracao |
|------|---------|---------|-------------|------------|
| 1 | UI/UX Premium | ALTO | MEDIA | MSMV + AI Decor |
| 2 | Biblioteca Assets | ALTISSIMO | MEDIA | iMeshh |
| 3 | Estimativa Custos | ALTO | MEDIA | MSMV |
| 4 | Renderizacao Avancada | ALTO | ALTA | iMeshh + MSMV |
| 5 | Upload Referencia | MEDIO-ALTO | MEDIA | AI Decor |
| 6 | Colaboracao | ALTO | ALTA | MSMV + RENDR |
| 7 | Medicao Precisa + Field Notes | ALTO | MEDIA | RENDR |
| 8 | Smart Wizard | MEDIO | MEDIA | AI Decor + MSMV |
| 9 | PWA + Performance | MEDIO | BAIXA | Geral |

---

## ORDEM DE EXECUCAO RECOMENDADA

```
SPRINT 1 (Semana 1):
  → Fase 1.1 + 1.2 + 1.3 (UI/UX — Onboarding + Dashboard + Bottom Nav)
  → Fase 2.3 (Templates prontos)

SPRINT 2 (Semana 2):
  → Fase 2.1 + 2.2 (Catalogo expandido + Texturas PBR)
  → Fase 1.4 (Visual polish — glassmorphism, animacoes)

SPRINT 3 (Semana 3):
  → Fase 3 completa (Estimativa de custos)
  → Fase 5.1 (Upload de foto como referencia)

SPRINT 4 (Semana 4):
  → Fase 7 completa (Medicao precisa + Field Notes — RENDR)
  → Fase 4.1 + 4.2 (Iluminacao + Materiais avancados)

SPRINT 5 (Semana 5):
  → Fase 4.3 (Modo apresentacao)
  → Fase 6.1 + 6.3 (Compartilhamento + PDF profissional + Export DXF)

SPRINT 6 (Semana 6):
  → Fase 8.1 (Smart Wizard)
  → Fase 6.2 (Comentarios)

SPRINT 7 (Semana 7):
  → Fase 8.2 (Sugestoes inteligentes)
  → Fase 9 (PWA + Performance)
```

---

## RESULTADO FINAL ESPERADO

O Planta3D v2.0 sera uma ferramenta que combina:
- **A facilidade** do AI Decor (onboarding, wizard, upload de foto)
- **A completude** do MSMV Design (editor, orcamento, colaboracao, PDF)
- **A qualidade visual** do iMeshh (assets profissionais, texturas PBR, renderizacao)
- **A precisao** do RENDR (medicoes automaticas, field notes, dimensionamento exato, export DXF)

Tudo isso em uma PWA gratuita, mobile-first, que roda no navegador sem precisar baixar nada.

---

## APPS ANALISADOS (Referencia)

| App | URL | Foco | O que pegamos |
|-----|-----|------|---------------|
| MSMV Design | msmvdesign.com | Editor 3D web para cozinhas | Dashboard, orcamento, colaboracao, PDF |
| AI Decor (YSpira) | yspiradigital.com | IA foto→redesign mobile | Onboarding, wizard, upload foto, bottom nav |
| iMeshh | imeshh.com | Assets 3D pro para Blender | Texturas PBR, catalogo expandido, templates |
| RENDR | rendr.com | LiDAR scan → planta baixa | Medicoes precisas, field notes, export DXF |

/**
 * onboarding.js — Start New Project Modal + Dashboard + Template Library (Fase 1.1, 1.2, 2.3)
 */
window.Onboarding = (() => {
  let container = null;

  const TEMPLATES = {
    studio: {
      name: 'Apartamento Studio',
      size: '30m²',
      plan: () => ({
        name: 'Studio 30m²',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:6,y2:0,thickness:0.15},{x1:6,y1:0,x2:6,y2:5,thickness:0.15},
          {x1:6,y1:5,x2:0,y2:5,thickness:0.15},{x1:0,y1:5,x2:0,y2:0,thickness:0.15},
          {x1:4,y1:0,x2:4,y2:3,thickness:0.12}
        ],
        rooms: [
          {points:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],name:'Living/Quarto',material:'hardwood-light'},
          {points:[{x:4,y:0},{x:6,y:0},{x:6,y:3},{x:4,y:3}],name:'Banheiro',material:'porcelain-white'},
          {points:[{x:0,y:3},{x:6,y:3},{x:6,y:5},{x:0,y:5}],name:'Cozinha',material:'porcelain-gray'}
        ],
        doors:[{wallIndex:4,position:0.5,width:0.8}],
        windows:[{wallIndex:2,position:0.4,width:1.2}],
        furniture:[
          {type:'double-bed',category:'beds',x:1.5,y:1.2,width:1.6,depth:2,rotation:0,name:'Cama Casal'},
          {type:'wardrobe-2door',category:'storage',x:3.5,y:0.4,width:1,depth:0.6,rotation:0,name:'Armario'},
          {type:'toilet',category:'bathroom',x:4.5,y:0.5,width:0.4,depth:0.6,rotation:0,name:'Vaso'},
          {type:'shower-square',category:'bathroom',x:5.3,y:0.5,width:0.9,depth:0.9,rotation:0,name:'Chuveiro'},
          {type:'counter',category:'kitchen',x:3,y:4.5,width:2,depth:0.6,rotation:0,name:'Bancada'},
          {type:'fridge-single',category:'kitchen',x:0.5,y:4.3,width:0.7,depth:0.7,rotation:0,name:'Geladeira'},
          {type:'stove-4burner',category:'kitchen',x:1.5,y:4.3,width:0.6,depth:0.6,rotation:0,name:'Fogao'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    apt1q: {
      name: 'Apartamento 1 Quarto',
      size: '50m²',
      plan: () => ({
        name: 'Apt 1 Quarto 50m²',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:8,y2:0,thickness:0.15},{x1:8,y1:0,x2:8,y2:6.25,thickness:0.15},
          {x1:8,y1:6.25,x2:0,y2:6.25,thickness:0.15},{x1:0,y1:6.25,x2:0,y2:0,thickness:0.15},
          {x1:4,y1:0,x2:4,y2:4,thickness:0.12},{x1:4,y1:4,x2:8,y2:4,thickness:0.12},
          {x1:6,y1:4,x2:6,y2:6.25,thickness:0.12}
        ],
        rooms: [
          {points:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],name:'Sala',material:'hardwood-medium'},
          {points:[{x:4,y:0},{x:8,y:0},{x:8,y:4},{x:4,y:4}],name:'Quarto',material:'hardwood-light'},
          {points:[{x:0,y:4},{x:6,y:4},{x:6,y:6.25},{x:0,y:6.25}],name:'Cozinha',material:'porcelain-white'},
          {points:[{x:6,y:4},{x:8,y:4},{x:8,y:6.25},{x:6,y:6.25}],name:'Banheiro',material:'porcelain-gray'}
        ],
        doors:[{wallIndex:4,position:0.7,width:0.8},{wallIndex:5,position:0.3,width:0.8},{wallIndex:6,position:0.5,width:0.7}],
        windows:[{wallIndex:0,position:0.3,width:1.5},{wallIndex:1,position:0.3,width:1.2}],
        furniture:[
          {type:'sofa-3seat',category:'sofas',x:1.5,y:1,width:2,depth:0.9,rotation:0,name:'Sofa'},
          {type:'coffee-table',category:'tables',x:1.5,y:2.5,width:1,depth:0.6,rotation:0,name:'Mesa Centro'},
          {type:'tv-65',category:'electronics',x:0.3,y:2,width:1.5,depth:0.1,rotation:Math.PI/2,name:'TV'},
          {type:'queen-bed',category:'beds',x:6,y:1.5,width:1.6,depth:2,rotation:0,name:'Cama Queen'},
          {type:'wardrobe-3door',category:'storage',x:5,y:0.4,width:1.5,depth:0.6,rotation:0,name:'Guarda-roupa'},
          {type:'fridge-double',category:'kitchen',x:0.5,y:5.5,width:0.9,depth:0.8,rotation:0,name:'Geladeira'},
          {type:'stove-4burner',category:'kitchen',x:2,y:5.5,width:0.6,depth:0.6,rotation:0,name:'Fogao'},
          {type:'sink-single',category:'bathroom',x:6.5,y:4.5,width:0.5,depth:0.4,rotation:0,name:'Pia Banheiro'},
          {type:'toilet',category:'bathroom',x:7.3,y:4.5,width:0.4,depth:0.6,rotation:0,name:'Vaso'},
          {type:'shower-square',category:'bathroom',x:7,y:5.5,width:0.9,depth:0.9,rotation:0,name:'Chuveiro'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    apt2q: {
      name: 'Apartamento 2 Quartos',
      size: '70m²',
      plan: () => ({
        name: 'Apt 2 Quartos 70m²',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:10,y2:0,thickness:0.15},{x1:10,y1:0,x2:10,y2:7,thickness:0.15},
          {x1:10,y1:7,x2:0,y2:7,thickness:0.15},{x1:0,y1:7,x2:0,y2:0,thickness:0.15},
          {x1:5,y1:0,x2:5,y2:4,thickness:0.12},{x1:0,y1:4,x2:7,y2:4,thickness:0.12},
          {x1:7,y1:4,x2:7,y2:7,thickness:0.12},{x1:7,y1:4,x2:10,y2:4,thickness:0.12}
        ],
        rooms: [
          {points:[{x:0,y:0},{x:5,y:0},{x:5,y:4},{x:0,y:4}],name:'Quarto 1',material:'hardwood-light'},
          {points:[{x:5,y:0},{x:10,y:0},{x:10,y:4},{x:5,y:4}],name:'Quarto 2',material:'hardwood-medium'},
          {points:[{x:0,y:4},{x:7,y:4},{x:7,y:7},{x:0,y:7}],name:'Sala/Cozinha',material:'hardwood-light'},
          {points:[{x:7,y:4},{x:10,y:4},{x:10,y:7},{x:7,y:7}],name:'Banheiro',material:'porcelain-white'}
        ],
        doors:[{wallIndex:4,position:0.8,width:0.8},{wallIndex:5,position:0.2,width:0.8},{wallIndex:5,position:0.7,width:0.8},{wallIndex:6,position:0.5,width:0.7}],
        windows:[{wallIndex:0,position:0.25,width:1.5},{wallIndex:0,position:0.7,width:1.5},{wallIndex:2,position:0.35,width:2}],
        furniture:[
          {type:'queen-bed',category:'beds',x:2,y:1.5,width:1.6,depth:2,rotation:0,name:'Cama Q1'},
          {type:'double-bed',category:'beds',x:7.5,y:1.5,width:1.4,depth:1.9,rotation:0,name:'Cama Q2'},
          {type:'sofa-3seat',category:'sofas',x:3,y:5,width:2.2,depth:0.9,rotation:0,name:'Sofa'},
          {type:'dining-table-4',category:'tables',x:1.5,y:5.5,width:1.2,depth:0.8,rotation:0,name:'Mesa Jantar'},
          {type:'fridge-single',category:'kitchen',x:0.5,y:6.3,width:0.7,depth:0.7,rotation:0,name:'Geladeira'},
          {type:'toilet',category:'bathroom',x:8,y:4.5,width:0.4,depth:0.6,rotation:0,name:'Vaso'},
          {type:'shower-rect',category:'bathroom',x:9,y:5.5,width:1,depth:0.8,rotation:0,name:'Chuveiro'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    cozinha: {
      name: 'Cozinha Americana',
      size: '15m²',
      plan: () => ({
        name: 'Cozinha Americana',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:5,y2:0,thickness:0.15},{x1:5,y1:0,x2:5,y2:3,thickness:0.15},
          {x1:5,y1:3,x2:0,y2:3,thickness:0.15},{x1:0,y1:3,x2:0,y2:0,thickness:0.15}
        ],
        rooms:[{points:[{x:0,y:0},{x:5,y:0},{x:5,y:3},{x:0,y:3}],name:'Cozinha',material:'porcelain-white'}],
        doors:[{wallIndex:2,position:0.1,width:0.9}],
        windows:[{wallIndex:1,position:0.5,width:1}],
        furniture:[
          {type:'fridge-double',category:'kitchen',x:0.5,y:0.5,width:0.9,depth:0.8,rotation:0,name:'Geladeira'},
          {type:'counter',category:'kitchen',x:2,y:0.4,width:2,depth:0.6,rotation:0,name:'Bancada'},
          {type:'stove-4burner',category:'kitchen',x:3.5,y:0.4,width:0.6,depth:0.6,rotation:0,name:'Fogao'},
          {type:'sink',category:'kitchen',x:4.3,y:0.4,width:0.6,depth:0.5,rotation:0,name:'Pia'},
          {type:'island',category:'kitchen',x:2.5,y:2,width:1.5,depth:0.7,rotation:0,name:'Ilha'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    banheiro: {
      name: 'Banheiro',
      size: '6m²',
      plan: () => ({
        name: 'Banheiro Completo',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:3,y2:0,thickness:0.15},{x1:3,y1:0,x2:3,y2:2,thickness:0.15},
          {x1:3,y1:2,x2:0,y2:2,thickness:0.15},{x1:0,y1:2,x2:0,y2:0,thickness:0.15}
        ],
        rooms:[{points:[{x:0,y:0},{x:3,y:0},{x:3,y:2},{x:0,y:2}],name:'Banheiro',material:'porcelain-white'}],
        doors:[{wallIndex:2,position:0.2,width:0.7}],
        windows:[{wallIndex:1,position:0.5,width:0.6}],
        furniture:[
          {type:'toilet',category:'bathroom',x:0.4,y:0.4,width:0.4,depth:0.65,rotation:0,name:'Vaso'},
          {type:'sink-single',category:'bathroom',x:1.2,y:0.3,width:0.5,depth:0.4,rotation:0,name:'Pia'},
          {type:'shower-square',category:'bathroom',x:2.3,y:0.5,width:0.9,depth:0.9,rotation:0,name:'Chuveiro'},
          {type:'towel-rack',category:'bathroom',x:0.2,y:1.5,width:0.6,depth:0.1,rotation:0,name:'Toalheiro'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    escritorio: {
      name: 'Home Office',
      size: '12m²',
      plan: () => ({
        name: 'Home Office',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:4,y2:0,thickness:0.15},{x1:4,y1:0,x2:4,y2:3,thickness:0.15},
          {x1:4,y1:3,x2:0,y2:3,thickness:0.15},{x1:0,y1:3,x2:0,y2:0,thickness:0.15}
        ],
        rooms:[{points:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],name:'Escritorio',material:'hardwood-light'}],
        doors:[{wallIndex:3,position:0.5,width:0.8}],
        windows:[{wallIndex:1,position:0.5,width:1.2}],
        furniture:[
          {type:'l-desk',category:'desks',x:3,y:0.5,width:1.6,depth:1.4,rotation:0,name:'Mesa L'},
          {type:'office-chair',category:'chairs',x:2.5,y:1,width:0.6,depth:0.6,rotation:0,name:'Cadeira'},
          {type:'bookshelf-wide',category:'storage',x:0.5,y:0.3,width:1.2,depth:0.35,rotation:0,name:'Estante'},
          {type:'filing-cabinet',category:'office',x:0.5,y:1.5,width:0.5,depth:0.5,rotation:0,name:'Gaveteiro'},
          {type:'monitor',category:'electronics',x:3.2,y:0.4,width:0.6,depth:0.2,rotation:0,name:'Monitor'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    sala: {
      name: 'Sala de Estar',
      size: '20m²',
      plan: () => ({
        name: 'Sala de Estar',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:5,y2:0,thickness:0.15},{x1:5,y1:0,x2:5,y2:4,thickness:0.15},
          {x1:5,y1:4,x2:0,y2:4,thickness:0.15},{x1:0,y1:4,x2:0,y2:0,thickness:0.15}
        ],
        rooms:[{points:[{x:0,y:0},{x:5,y:0},{x:5,y:4},{x:0,y:4}],name:'Sala',material:'hardwood-medium'}],
        doors:[{wallIndex:3,position:0.5,width:0.9}],
        windows:[{wallIndex:2,position:0.5,width:2}],
        furniture:[
          {type:'sofa-3seat',category:'sofas',x:2.5,y:1,width:2.2,depth:0.9,rotation:0,name:'Sofa'},
          {type:'coffee-table',category:'tables',x:2.5,y:2.2,width:1,depth:0.6,rotation:0,name:'Mesa Centro'},
          {type:'tv-65',category:'electronics',x:0.3,y:2,width:1.5,depth:0.1,rotation:Math.PI/2,name:'TV 65"'},
          {type:'tv-rack',category:'tables',x:0.4,y:2,width:1.5,depth:0.45,rotation:Math.PI/2,name:'Rack TV'},
          {type:'armchair',category:'chairs',x:4.2,y:1,width:0.8,depth:0.8,rotation:0,name:'Poltrona'},
          {type:'floor-lamp',category:'lighting',x:4.5,y:0.3,width:0.3,depth:0.3,rotation:0,name:'Luminaria'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    comercial: {
      name: 'Sala Comercial',
      size: '40m²',
      plan: () => ({
        name: 'Sala Comercial',
        schemaVersion: 2, units: 'meters', floorHeight: 3, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:8,y2:0,thickness:0.15},{x1:8,y1:0,x2:8,y2:5,thickness:0.15},
          {x1:8,y1:5,x2:0,y2:5,thickness:0.15},{x1:0,y1:5,x2:0,y2:0,thickness:0.15},
          {x1:6,y1:0,x2:6,y2:3,thickness:0.12}
        ],
        rooms:[
          {points:[{x:0,y:0},{x:6,y:0},{x:6,y:5},{x:0,y:5}],name:'Escritorio',material:'vinyl'},
          {points:[{x:6,y:0},{x:8,y:0},{x:8,y:3},{x:6,y:3}],name:'Recepcao',material:'porcelain-white'}
        ],
        doors:[{wallIndex:4,position:0.8,width:0.9},{wallIndex:0,position:0.1,width:1}],
        windows:[{wallIndex:2,position:0.3,width:2},{wallIndex:2,position:0.7,width:2}],
        furniture:[
          {type:'desk',category:'desks',x:2,y:1.5,width:1.4,depth:0.7,rotation:0,name:'Mesa 1'},
          {type:'desk',category:'desks',x:4,y:1.5,width:1.4,depth:0.7,rotation:0,name:'Mesa 2'},
          {type:'office-chair',category:'chairs',x:2,y:2.5,width:0.6,depth:0.6,rotation:0,name:'Cadeira 1'},
          {type:'office-chair',category:'chairs',x:4,y:2.5,width:0.6,depth:0.6,rotation:0,name:'Cadeira 2'},
          {type:'bookshelf-wide',category:'storage',x:0.5,y:0.3,width:1.5,depth:0.4,rotation:0,name:'Estante'},
          {type:'sofa-2seat',category:'sofas',x:7,y:1,width:1.4,depth:0.7,rotation:0,name:'Sofa Recepcao'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    loft: {
      name: 'Loft',
      size: '45m²',
      plan: () => ({
        name: 'Loft 45m²',
        schemaVersion: 2, units: 'meters', floorHeight: 3.5, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:9,y2:0,thickness:0.15},{x1:9,y1:0,x2:9,y2:5,thickness:0.15},
          {x1:9,y1:5,x2:0,y2:5,thickness:0.15},{x1:0,y1:5,x2:0,y2:0,thickness:0.15},
          {x1:7,y1:3,x2:9,y2:3,thickness:0.12}
        ],
        rooms:[
          {points:[{x:0,y:0},{x:9,y:0},{x:9,y:3},{x:7,y:3},{x:7,y:5},{x:0,y:5}],name:'Living',material:'concrete-polished'},
          {points:[{x:7,y:3},{x:9,y:3},{x:9,y:5},{x:7,y:5}],name:'Banheiro',material:'porcelain-gray'}
        ],
        doors:[{wallIndex:4,position:0.5,width:0.7}],
        windows:[{wallIndex:2,position:0.3,width:3},{wallIndex:0,position:0.5,width:2}],
        furniture:[
          {type:'queen-bed',category:'beds',x:1.5,y:1.5,width:1.6,depth:2,rotation:0,name:'Cama'},
          {type:'sofa-3seat',category:'sofas',x:5,y:1.5,width:2.2,depth:0.9,rotation:0,name:'Sofa'},
          {type:'dining-table-4',category:'tables',x:5,y:4,width:1.2,depth:0.8,rotation:0,name:'Mesa'},
          {type:'counter',category:'kitchen',x:1,y:4.3,width:2.5,depth:0.6,rotation:0,name:'Cozinha'},
          {type:'toilet',category:'bathroom',x:7.5,y:3.5,width:0.4,depth:0.6,rotation:0,name:'Vaso'},
          {type:'shower-square',category:'bathroom',x:8.3,y:3.5,width:0.8,depth:0.8,rotation:0,name:'Chuveiro'}
        ],
        columns:[{x:3,y:2.5,size:0.3},{x:6,y:2.5,size:0.3}],
        stairs:[],dimensions:[],annotations:[],floors:[]
      })
    },
    casa2q: {
      name: 'Casa 2 Quartos',
      size: '80m²',
      plan: () => ({
        name: 'Casa 2 Quartos 80m²',
        schemaVersion: 2, units: 'meters', floorHeight: 2.8, wallThickness: 0.15,
        walls: [
          {x1:0,y1:0,x2:10,y2:0,thickness:0.15},{x1:10,y1:0,x2:10,y2:8,thickness:0.15},
          {x1:10,y1:8,x2:0,y2:8,thickness:0.15},{x1:0,y1:8,x2:0,y2:0,thickness:0.15},
          {x1:5,y1:0,x2:5,y2:5,thickness:0.12},{x1:0,y1:5,x2:10,y2:5,thickness:0.12},
          {x1:7,y1:5,x2:7,y2:8,thickness:0.12}
        ],
        rooms:[
          {points:[{x:0,y:0},{x:5,y:0},{x:5,y:5},{x:0,y:5}],name:'Quarto 1',material:'hardwood-light'},
          {points:[{x:5,y:0},{x:10,y:0},{x:10,y:5},{x:5,y:5}],name:'Quarto 2',material:'hardwood-medium'},
          {points:[{x:0,y:5},{x:7,y:5},{x:7,y:8},{x:0,y:8}],name:'Sala/Cozinha',material:'hardwood-light'},
          {points:[{x:7,y:5},{x:10,y:5},{x:10,y:8},{x:7,y:8}],name:'Banheiro',material:'porcelain-white'}
        ],
        doors:[{wallIndex:4,position:0.85,width:0.8},{wallIndex:5,position:0.15,width:0.8},{wallIndex:5,position:0.55,width:0.8},{wallIndex:6,position:0.5,width:0.7}],
        windows:[{wallIndex:0,position:0.25,width:1.5},{wallIndex:0,position:0.7,width:1.5},{wallIndex:2,position:0.3,width:2}],
        furniture:[
          {type:'queen-bed',category:'beds',x:2.5,y:2,width:1.6,depth:2,rotation:0,name:'Cama Q1'},
          {type:'double-bed',category:'beds',x:7.5,y:2,width:1.4,depth:1.9,rotation:0,name:'Cama Q2'},
          {type:'wardrobe-2door',category:'storage',x:0.5,y:0.4,width:1.2,depth:0.6,rotation:0,name:'Armario 1'},
          {type:'wardrobe-2door',category:'storage',x:5.5,y:0.4,width:1.2,depth:0.6,rotation:0,name:'Armario 2'},
          {type:'sofa-3seat',category:'sofas',x:3,y:6,width:2.2,depth:0.9,rotation:0,name:'Sofa'},
          {type:'tv-65',category:'electronics',x:0.3,y:6.5,width:1.5,depth:0.1,rotation:Math.PI/2,name:'TV'},
          {type:'dining-table-6',category:'tables',x:3.5,y:7.3,width:1.8,depth:0.9,rotation:0,name:'Mesa Jantar'},
          {type:'fridge-single',category:'kitchen',x:5.5,y:7.3,width:0.7,depth:0.7,rotation:0,name:'Geladeira'},
          {type:'toilet',category:'bathroom',x:8,y:5.5,width:0.4,depth:0.6,rotation:0,name:'Vaso'},
          {type:'shower-square',category:'bathroom',x:9,y:6,width:0.9,depth:0.9,rotation:0,name:'Chuveiro'}
        ],
        columns:[],stairs:[],dimensions:[],annotations:[],floors:[]
      })
    }
  };

  function init() {
    container = document.createElement('div');
    container.id = 'onboarding-container';
    document.body.appendChild(container);
  }

  function showStartModal() {
    const templateCards = Object.entries(TEMPLATES).map(([key, t]) =>
      `<button class="template-card" data-template="${key}">
        <div class="template-icon"><svg viewBox="0 0 32 32" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="4" y="4" width="24" height="24" rx="2"/><line x1="4" y1="16" x2="28" y2="16" opacity="0.3"/><line x1="16" y1="4" x2="16" y2="28" opacity="0.3"/></svg></div>
        <span>${t.name}</span>
        <small style="font-size:10px;color:var(--text-muted)">${t.size}</small>
      </button>`
    ).join('');

    container.innerHTML = `
      <div class="start-modal-overlay" id="start-modal">
        <div class="start-modal">
          <div class="start-modal-header">
            <div class="start-modal-logo">Planta 3D</div>
            <div class="start-modal-tagline">Crie plantas de ambientes em 2D e 3D</div>
          </div>
          <div class="start-cards">
            <div class="start-card" data-action="new">
              <div class="start-card-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
              <div class="start-card-title">Criar do Zero</div>
              <div class="start-card-sub">Projeto em branco</div>
            </div>
            <div class="start-card" data-action="upload">
              <div class="start-card-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/><path d="M21 15l-5-5L5 21"/></svg></div>
              <div class="start-card-title">Upload Planta</div>
              <div class="start-card-sub">Foto como referencia</div>
            </div>
            <div class="start-card" data-action="dxf">
              <div class="start-card-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></div>
              <div class="start-card-title">Importar DXF</div>
              <div class="start-card-sub">AutoCAD / CAD</div>
            </div>
            <div class="start-card" data-action="wizard">
              <div class="start-card-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div>
              <div class="start-card-title">Assistente</div>
              <div class="start-card-sub">Wizard guiado</div>
            </div>
            <div class="start-card" data-action="open">
              <div class="start-card-icon"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
              <div class="start-card-title">Abrir Projeto</div>
              <div class="start-card-sub">Projetos salvos</div>
            </div>
          </div>
          <div class="welcome-templates" style="margin-top:8px">
            <h3 class="welcome-section-title" style="text-align:center;color:var(--text-secondary);font-size:13px;margin-bottom:12px">Ou comece com um template</h3>
            <div class="template-grid" style="grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px">${templateCards}</div>
          </div>
        </div>
      </div>`;

    // Events
    container.querySelectorAll('.start-card').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action;
        hideStartModal();
        if (action === 'new') App.createNewPlan();
        else if (action === 'upload' && window.ImageReference) ImageReference.showUploadModal();
        else if (action === 'upload') App.createNewPlan();
        else if (action === 'dxf') document.getElementById('dxf-file-input')?.click();
        else if (action === 'wizard' && window.SmartWizard) SmartWizard.show();
        else if (action === 'wizard') App.createNewPlan();
        else if (action === 'open') document.getElementById('btn-sidebar-toggle')?.click();
      });
    });

    container.querySelectorAll('.template-card[data-template]').forEach(card => {
      card.addEventListener('click', () => {
        loadTemplate(card.dataset.template);
        hideStartModal();
      });
    });
  }

  function hideStartModal() {
    const modal = document.getElementById('start-modal');
    if (modal) modal.classList.add('hidden');
  }

  function loadTemplate(name) {
    const tmpl = TEMPLATES[name];
    if (!tmpl) return;
    const plan = tmpl.plan();
    plan.id = 'plan-' + Date.now();
    if (window.App) {
      App.loadPlanDirectly(plan);
    }
  }

  function showDashboard(plans) {
    const cards = (plans || []).map(p => {
      const date = p.lastModified ? new Date(p.lastModified).toLocaleDateString('pt-BR') : '';
      const roomCount = (p.rooms || []).length;
      return `<div class="project-card" data-id="${p.id}">
        <div class="project-card-thumb"><svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.3"><rect x="4" y="4" width="24" height="24" rx="2"/><line x1="4" y1="16" x2="28" y2="16"/><line x1="16" y1="4" x2="16" y2="28"/></svg></div>
        <div class="project-card-body">
          <div class="project-card-name">${p.name || 'Sem nome'}</div>
          <div class="project-card-date">${date} ${roomCount ? '· ' + roomCount + ' comodos' : ''}</div>
        </div>
        <div class="project-card-actions">
          <button class="btn-open" title="Abrir">Abrir</button>
          <button class="btn-duplicate" title="Duplicar">Duplicar</button>
          <button class="btn-delete" title="Excluir">Excluir</button>
        </div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <div class="dashboard-overlay" id="dashboard">
        <div class="dashboard-header">
          <h1 class="dashboard-title">Meus Projetos</h1>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="text" class="dashboard-search" placeholder="Buscar projeto..." id="dashboard-search">
            <button class="modal-btn-confirm" id="dashboard-new">+ Novo</button>
            <button class="modal-btn-cancel" id="dashboard-close">Fechar</button>
          </div>
        </div>
        <div class="dashboard-grid" id="dashboard-grid">
          <div class="project-card project-card-new" id="dashboard-new-card">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span style="font-size:13px;font-weight:600">Novo Projeto</span>
          </div>
          ${cards}
        </div>
      </div>`;

    // Events
    document.getElementById('dashboard-close')?.addEventListener('click', hideDashboard);
    document.getElementById('dashboard-new')?.addEventListener('click', () => { hideDashboard(); App.createNewPlan(); });
    document.getElementById('dashboard-new-card')?.addEventListener('click', () => { hideDashboard(); App.createNewPlan(); });

    container.querySelectorAll('.project-card[data-id]').forEach(card => {
      card.querySelector('.btn-open')?.addEventListener('click', (e) => { e.stopPropagation(); hideDashboard(); App.openPlan(card.dataset.id); });
      card.querySelector('.btn-duplicate')?.addEventListener('click', (e) => { e.stopPropagation(); App.duplicatePlan?.(card.dataset.id); });
      card.querySelector('.btn-delete')?.addEventListener('click', (e) => { e.stopPropagation(); App.deletePlan?.(card.dataset.id); showDashboard(App.getPlans?.()); });
      card.addEventListener('click', () => { hideDashboard(); App.openPlan(card.dataset.id); });
    });

    const search = document.getElementById('dashboard-search');
    if (search) {
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        container.querySelectorAll('.project-card[data-id]').forEach(c => {
          const name = c.querySelector('.project-card-name')?.textContent.toLowerCase() || '';
          c.style.display = name.includes(q) ? '' : 'none';
        });
      });
    }
  }

  function hideDashboard() {
    const d = document.getElementById('dashboard');
    if (d) d.classList.add('hidden');
  }

  function getTemplates() { return TEMPLATES; }

  return { init, showStartModal, hideStartModal, showDashboard, hideDashboard, loadTemplate, getTemplates };
})();

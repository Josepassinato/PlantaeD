/**
 * furniture-catalog.js — 140+ furniture items across 17 categories
 * Dimensions in meters, adapted from OpenPlan3D reference
 */
const FurnitureCatalog = (() => {

  const categories = [
    { id: 'sofas', name: 'Sofas', icon: '\u{1FA91}' },
    { id: 'chairs', name: 'Cadeiras', icon: '\u{1FA91}' },
    { id: 'tables', name: 'Mesas', icon: '\u{1F4CB}' },
    { id: 'beds', name: 'Camas', icon: '\u{1F6CF}' },
    { id: 'storage', name: 'Armarios', icon: '\u{1F4E6}' },
    { id: 'desks', name: 'Escrivaninhas', icon: '\u{1F4BB}' },
    { id: 'kitchen', name: 'Cozinha', icon: '\u{1F373}' },
    { id: 'bathroom', name: 'Banheiro', icon: '\u{1F6BF}' },
    { id: 'lighting', name: 'Iluminacao', icon: '\u{1F4A1}' },
    { id: 'electronics', name: 'Eletronicos', icon: '\u{1F4FA}' },
    { id: 'outdoor', name: 'Externo', icon: '\u{1F333}' },
    { id: 'decor', name: 'Decoracao', icon: '\u{1F3A8}' },
    { id: 'office', name: 'Escritorio', icon: '\u{1F4BC}' },
    { id: 'laundry', name: 'Lavanderia', icon: '\u{1F9FA}' },
    { id: 'doors', name: 'Portas', icon: '\u{1F6AA}' },
    { id: 'appliances', name: 'Eletrodomesticos', icon: '\u{2699}' },
    { id: 'plants', name: 'Plantas', icon: '\u{1FAB4}' }
  ];

  // item: { id, name, category, width, depth, height, color, description }
  const items = [
    // SOFAS (10)
    { id: 'sofa-2seat', name: 'Sofa 2 lugares', category: 'sofas', width: 1.6, depth: 0.85, height: 0.85, color: '#8B7355' },
    { id: 'sofa-3seat', name: 'Sofa 3 lugares', category: 'sofas', width: 2.2, depth: 0.85, height: 0.85, color: '#8B7355' },
    { id: 'sofa-l', name: 'Sofa L', category: 'sofas', width: 2.4, depth: 2.4, height: 0.85, color: '#6B5B45' },
    { id: 'sofa-corner', name: 'Sofa de canto', category: 'sofas', width: 2.6, depth: 1.6, height: 0.85, color: '#7B6B55' },
    { id: 'loveseat', name: 'Namoradeira', category: 'sofas', width: 1.4, depth: 0.8, height: 0.8, color: '#9B8B75' },
    { id: 'chaise', name: 'Chaise longue', category: 'sofas', width: 1.7, depth: 0.7, height: 0.75, color: '#8B7B65' },
    { id: 'futon', name: 'Futon', category: 'sofas', width: 1.9, depth: 0.9, height: 0.45, color: '#5B4B35' },
    { id: 'daybed', name: 'Daybed', category: 'sofas', width: 2.0, depth: 0.85, height: 0.65, color: '#A0907A' },
    { id: 'recliner', name: 'Poltrona reclinavel', category: 'sofas', width: 0.85, depth: 0.9, height: 1.0, color: '#6B4B35' },
    { id: 'ottoman', name: 'Pufe', category: 'sofas', width: 0.6, depth: 0.6, height: 0.45, color: '#8B7B65' },

    // CHAIRS (10)
    { id: 'chair-dining', name: 'Cadeira jantar', category: 'chairs', width: 0.45, depth: 0.45, height: 0.9, color: '#A08060' },
    { id: 'chair-arm', name: 'Poltrona', category: 'chairs', width: 0.7, depth: 0.7, height: 0.9, color: '#7B6B55' },
    { id: 'chair-office', name: 'Cadeira escritorio', category: 'chairs', width: 0.6, depth: 0.6, height: 1.1, color: '#333333' },
    { id: 'stool-bar', name: 'Banqueta alta', category: 'chairs', width: 0.4, depth: 0.4, height: 0.75, color: '#555555' },
    { id: 'stool-low', name: 'Banqueta baixa', category: 'chairs', width: 0.35, depth: 0.35, height: 0.45, color: '#A08060' },
    { id: 'bench-dining', name: 'Banco jantar', category: 'chairs', width: 1.2, depth: 0.35, height: 0.45, color: '#A08060' },
    { id: 'bench-entry', name: 'Banco entrada', category: 'chairs', width: 1.0, depth: 0.4, height: 0.5, color: '#7B6B55' },
    { id: 'rocker', name: 'Cadeira de balanco', category: 'chairs', width: 0.6, depth: 0.8, height: 1.1, color: '#A08060' },
    { id: 'bean-bag', name: 'Puff grande', category: 'chairs', width: 0.8, depth: 0.8, height: 0.7, color: '#CC4444' },
    { id: 'folding-chair', name: 'Cadeira dobravel', category: 'chairs', width: 0.45, depth: 0.45, height: 0.8, color: '#888888' },

    // TABLES (12)
    { id: 'table-dining-4', name: 'Mesa jantar 4 lug', category: 'tables', width: 1.2, depth: 0.8, height: 0.76, color: '#A08060' },
    { id: 'table-dining-6', name: 'Mesa jantar 6 lug', category: 'tables', width: 1.6, depth: 0.9, height: 0.76, color: '#A08060' },
    { id: 'table-dining-8', name: 'Mesa jantar 8 lug', category: 'tables', width: 2.2, depth: 1.0, height: 0.76, color: '#8B7050' },
    { id: 'table-round', name: 'Mesa redonda', category: 'tables', width: 1.0, depth: 1.0, height: 0.76, color: '#A08060' },
    { id: 'table-coffee', name: 'Mesa de centro', category: 'tables', width: 1.1, depth: 0.6, height: 0.45, color: '#5B4B35' },
    { id: 'table-side', name: 'Mesa lateral', category: 'tables', width: 0.5, depth: 0.5, height: 0.55, color: '#7B6B55' },
    { id: 'table-console', name: 'Aparador', category: 'tables', width: 1.2, depth: 0.35, height: 0.8, color: '#6B5B45' },
    { id: 'table-counter', name: 'Bancada bar', category: 'tables', width: 1.5, depth: 0.5, height: 1.05, color: '#5B4B35' },
    { id: 'table-bedside', name: 'Criado-mudo', category: 'tables', width: 0.45, depth: 0.4, height: 0.55, color: '#8B7B65' },
    { id: 'table-tv', name: 'Rack TV', category: 'tables', width: 1.8, depth: 0.45, height: 0.5, color: '#4B3B25' },
    { id: 'table-picnic', name: 'Mesa picnic', category: 'tables', width: 1.5, depth: 0.7, height: 0.76, color: '#A08060' },
    { id: 'table-drop-leaf', name: 'Mesa dobravel', category: 'tables', width: 0.9, depth: 0.6, height: 0.76, color: '#8B7050' },

    // BEDS (8)
    { id: 'bed-single', name: 'Cama solteiro', category: 'beds', width: 1.0, depth: 2.0, height: 0.55, color: '#E8E0D8' },
    { id: 'bed-double', name: 'Cama casal', category: 'beds', width: 1.4, depth: 2.0, height: 0.55, color: '#E8E0D8' },
    { id: 'bed-queen', name: 'Cama queen', category: 'beds', width: 1.6, depth: 2.0, height: 0.55, color: '#D8D0C8' },
    { id: 'bed-king', name: 'Cama king', category: 'beds', width: 1.93, depth: 2.03, height: 0.55, color: '#D8D0C8' },
    { id: 'bed-bunk', name: 'Beliche', category: 'beds', width: 1.0, depth: 2.0, height: 1.7, color: '#A08060' },
    { id: 'crib', name: 'Berco', category: 'beds', width: 0.7, depth: 1.3, height: 0.9, color: '#F0E8E0' },
    { id: 'bed-sofa', name: 'Sofa-cama', category: 'beds', width: 1.8, depth: 0.9, height: 0.8, color: '#8B7B65' },
    { id: 'mattress', name: 'Colchao', category: 'beds', width: 1.4, depth: 2.0, height: 0.25, color: '#F5F0EB' },

    // STORAGE (10)
    { id: 'wardrobe-2d', name: 'Guarda-roupa 2P', category: 'storage', width: 1.0, depth: 0.6, height: 2.2, color: '#8B7050' },
    { id: 'wardrobe-3d', name: 'Guarda-roupa 3P', category: 'storage', width: 1.5, depth: 0.6, height: 2.2, color: '#7B6040' },
    { id: 'wardrobe-sliding', name: 'Armario portas correr', category: 'storage', width: 2.0, depth: 0.6, height: 2.4, color: '#6B5030' },
    { id: 'bookcase', name: 'Estante livros', category: 'storage', width: 0.8, depth: 0.3, height: 1.8, color: '#A08060' },
    { id: 'bookcase-wide', name: 'Estante larga', category: 'storage', width: 1.5, depth: 0.35, height: 1.8, color: '#8B7050' },
    { id: 'shelf-wall', name: 'Prateleira', category: 'storage', width: 0.8, depth: 0.25, height: 0.04, color: '#A08060' },
    { id: 'chest-drawers', name: 'Comoda', category: 'storage', width: 0.8, depth: 0.45, height: 0.85, color: '#8B7B65' },
    { id: 'shoe-rack', name: 'Sapateira', category: 'storage', width: 0.8, depth: 0.3, height: 1.0, color: '#7B6B55' },
    { id: 'cabinet-tall', name: 'Armario alto', category: 'storage', width: 0.6, depth: 0.4, height: 1.8, color: '#6B5B45' },
    { id: 'sideboard', name: 'Buffet', category: 'storage', width: 1.4, depth: 0.45, height: 0.85, color: '#5B4B35' },

    // DESKS (6)
    { id: 'desk-standard', name: 'Escrivaninha', category: 'desks', width: 1.2, depth: 0.6, height: 0.76, color: '#8B7050' },
    { id: 'desk-large', name: 'Mesa escritorio', category: 'desks', width: 1.6, depth: 0.8, height: 0.76, color: '#7B6040' },
    { id: 'desk-l', name: 'Mesa L', category: 'desks', width: 1.6, depth: 1.4, height: 0.76, color: '#6B5B45' },
    { id: 'desk-standing', name: 'Mesa regulavel', category: 'desks', width: 1.4, depth: 0.7, height: 1.1, color: '#555555' },
    { id: 'desk-vanity', name: 'Penteadeira', category: 'desks', width: 1.0, depth: 0.45, height: 0.76, color: '#F0E8E0' },
    { id: 'desk-kids', name: 'Mesa infantil', category: 'desks', width: 0.8, depth: 0.5, height: 0.55, color: '#6699CC' },

    // KITCHEN (12)
    { id: 'fridge-single', name: 'Geladeira', category: 'kitchen', width: 0.6, depth: 0.65, height: 1.7, color: '#E0E0E0' },
    { id: 'fridge-double', name: 'Geladeira duplex', category: 'kitchen', width: 0.85, depth: 0.7, height: 1.8, color: '#D0D0D0' },
    { id: 'stove-4', name: 'Fogao 4 bocas', category: 'kitchen', width: 0.55, depth: 0.6, height: 0.85, color: '#C0C0C0' },
    { id: 'stove-6', name: 'Fogao 6 bocas', category: 'kitchen', width: 0.75, depth: 0.6, height: 0.85, color: '#B0B0B0' },
    { id: 'oven', name: 'Forno embutido', category: 'kitchen', width: 0.6, depth: 0.55, height: 0.6, color: '#333333' },
    { id: 'microwave', name: 'Micro-ondas', category: 'kitchen', width: 0.5, depth: 0.4, height: 0.3, color: '#C0C0C0' },
    { id: 'dishwasher', name: 'Lava-louca', category: 'kitchen', width: 0.6, depth: 0.6, height: 0.85, color: '#D0D0D0' },
    { id: 'sink-kitchen', name: 'Pia cozinha', category: 'kitchen', width: 0.8, depth: 0.5, height: 0.85, color: '#E0E0E0' },
    { id: 'kitchen-island', name: 'Ilha cozinha', category: 'kitchen', width: 1.5, depth: 0.8, height: 0.9, color: '#8B7050' },
    { id: 'pantry-cabinet', name: 'Armario despensa', category: 'kitchen', width: 0.6, depth: 0.5, height: 2.0, color: '#A08060' },
    { id: 'counter-section', name: 'Bancada secao', category: 'kitchen', width: 0.6, depth: 0.6, height: 0.85, color: '#D0C8B8' },
    { id: 'hood', name: 'Coifa', category: 'kitchen', width: 0.6, depth: 0.5, height: 0.3, color: '#999999' },

    // BATHROOM (10)
    { id: 'toilet', name: 'Vaso sanitario', category: 'bathroom', width: 0.4, depth: 0.65, height: 0.4, color: '#F5F5F5' },
    { id: 'sink-bath', name: 'Pia banheiro', category: 'bathroom', width: 0.55, depth: 0.45, height: 0.85, color: '#F0F0F0' },
    { id: 'sink-double', name: 'Pia dupla', category: 'bathroom', width: 1.2, depth: 0.5, height: 0.85, color: '#F0F0F0' },
    { id: 'bathtub', name: 'Banheira', category: 'bathroom', width: 0.75, depth: 1.7, height: 0.6, color: '#F5F5F5' },
    { id: 'shower', name: 'Box chuveiro', category: 'bathroom', width: 0.9, depth: 0.9, height: 2.0, color: '#DDEEFF' },
    { id: 'shower-rect', name: 'Box retangular', category: 'bathroom', width: 1.2, depth: 0.8, height: 2.0, color: '#DDEEFF' },
    { id: 'bidet', name: 'Bide', category: 'bathroom', width: 0.38, depth: 0.6, height: 0.38, color: '#F5F5F5' },
    { id: 'bath-cabinet', name: 'Gabinete banheiro', category: 'bathroom', width: 0.8, depth: 0.4, height: 0.55, color: '#8B7050' },
    { id: 'mirror-bath', name: 'Espelho banheiro', category: 'bathroom', width: 0.6, depth: 0.05, height: 0.8, color: '#C0D0E0' },
    { id: 'towel-rack', name: 'Toalheiro', category: 'bathroom', width: 0.6, depth: 0.1, height: 0.7, color: '#999999' },

    // LIGHTING (8)
    { id: 'lamp-floor', name: 'Luminaria piso', category: 'lighting', width: 0.3, depth: 0.3, height: 1.6, color: '#FFE4B5' },
    { id: 'lamp-table', name: 'Abajur mesa', category: 'lighting', width: 0.25, depth: 0.25, height: 0.5, color: '#FFE4B5' },
    { id: 'lamp-desk', name: 'Luminaria mesa', category: 'lighting', width: 0.2, depth: 0.2, height: 0.45, color: '#888888' },
    { id: 'chandelier', name: 'Lustre', category: 'lighting', width: 0.6, depth: 0.6, height: 0.5, color: '#FFD700' },
    { id: 'pendant', name: 'Pendente', category: 'lighting', width: 0.35, depth: 0.35, height: 0.4, color: '#333333' },
    { id: 'ceiling-fan', name: 'Ventilador teto', category: 'lighting', width: 1.2, depth: 1.2, height: 0.3, color: '#A08060' },
    { id: 'sconce', name: 'Arandela', category: 'lighting', width: 0.15, depth: 0.15, height: 0.25, color: '#FFE4B5' },
    { id: 'spot', name: 'Spot', category: 'lighting', width: 0.1, depth: 0.1, height: 0.12, color: '#FFFFFF' },

    // ELECTRONICS (8)
    { id: 'tv-50', name: 'TV 50"', category: 'electronics', width: 1.12, depth: 0.07, height: 0.65, color: '#222222' },
    { id: 'tv-65', name: 'TV 65"', category: 'electronics', width: 1.45, depth: 0.07, height: 0.84, color: '#222222' },
    { id: 'monitor', name: 'Monitor', category: 'electronics', width: 0.6, depth: 0.2, height: 0.45, color: '#333333' },
    { id: 'computer', name: 'Gabinete PC', category: 'electronics', width: 0.2, depth: 0.45, height: 0.45, color: '#222222' },
    { id: 'speaker-floor', name: 'Caixa de som', category: 'electronics', width: 0.3, depth: 0.35, height: 0.9, color: '#333333' },
    { id: 'soundbar', name: 'Soundbar', category: 'electronics', width: 0.9, depth: 0.1, height: 0.07, color: '#222222' },
    { id: 'printer', name: 'Impressora', category: 'electronics', width: 0.45, depth: 0.35, height: 0.2, color: '#444444' },
    { id: 'router', name: 'Roteador', category: 'electronics', width: 0.2, depth: 0.15, height: 0.05, color: '#222222' },

    // OUTDOOR (8)
    { id: 'chair-garden', name: 'Cadeira jardim', category: 'outdoor', width: 0.6, depth: 0.6, height: 0.85, color: '#2E8B57' },
    { id: 'table-garden', name: 'Mesa jardim', category: 'outdoor', width: 1.0, depth: 1.0, height: 0.72, color: '#A08060' },
    { id: 'lounger', name: 'Espreguicadeira', category: 'outdoor', width: 0.7, depth: 1.9, height: 0.35, color: '#F5F5DC' },
    { id: 'umbrella', name: 'Guarda-sol', category: 'outdoor', width: 2.5, depth: 2.5, height: 2.3, color: '#CD853F' },
    { id: 'grill', name: 'Churrasqueira', category: 'outdoor', width: 1.2, depth: 0.6, height: 1.0, color: '#444444' },
    { id: 'hammock', name: 'Rede', category: 'outdoor', width: 1.4, depth: 3.5, height: 1.3, color: '#8FBC8F' },
    { id: 'swing', name: 'Balanco', category: 'outdoor', width: 1.5, depth: 0.6, height: 1.8, color: '#A08060' },
    { id: 'planter-large', name: 'Vaso grande', category: 'outdoor', width: 0.5, depth: 0.5, height: 0.6, color: '#8B4513' },

    // DECOR (8)
    { id: 'rug-small', name: 'Tapete pequeno', category: 'decor', width: 1.2, depth: 0.8, height: 0.02, color: '#B39978' },
    { id: 'rug-medium', name: 'Tapete medio', category: 'decor', width: 2.0, depth: 1.4, height: 0.02, color: '#A08060' },
    { id: 'rug-large', name: 'Tapete grande', category: 'decor', width: 3.0, depth: 2.0, height: 0.02, color: '#8B7050' },
    { id: 'mirror-floor', name: 'Espelho corpo inteiro', category: 'decor', width: 0.5, depth: 0.05, height: 1.6, color: '#C0D0E0' },
    { id: 'picture-frame', name: 'Quadro', category: 'decor', width: 0.6, depth: 0.03, height: 0.45, color: '#DAA520' },
    { id: 'clock', name: 'Relogio parede', category: 'decor', width: 0.3, depth: 0.05, height: 0.3, color: '#333333' },
    { id: 'vase', name: 'Vaso decorativo', category: 'decor', width: 0.2, depth: 0.2, height: 0.35, color: '#CD853F' },
    { id: 'curtain', name: 'Cortina', category: 'decor', width: 1.5, depth: 0.1, height: 2.4, color: '#D2B48C' },

    // OFFICE (8)
    { id: 'file-cabinet', name: 'Gaveteiro', category: 'office', width: 0.4, depth: 0.5, height: 0.7, color: '#888888' },
    { id: 'file-cabinet-tall', name: 'Arquivo alto', category: 'office', width: 0.45, depth: 0.6, height: 1.35, color: '#888888' },
    { id: 'whiteboard', name: 'Quadro branco', category: 'office', width: 1.2, depth: 0.05, height: 0.9, color: '#F5F5F5' },
    { id: 'meeting-table', name: 'Mesa reuniao', category: 'office', width: 2.4, depth: 1.2, height: 0.76, color: '#7B6040' },
    { id: 'reception-desk', name: 'Recepcao', category: 'office', width: 1.8, depth: 0.7, height: 1.1, color: '#6B5B45' },
    { id: 'locker', name: 'Locker', category: 'office', width: 0.3, depth: 0.5, height: 1.8, color: '#999999' },
    { id: 'safe', name: 'Cofre', category: 'office', width: 0.4, depth: 0.4, height: 0.5, color: '#555555' },
    { id: 'paper-shredder', name: 'Fragmentadora', category: 'office', width: 0.35, depth: 0.25, height: 0.55, color: '#666666' },

    // LAUNDRY (6)
    { id: 'washer', name: 'Maquina lavar', category: 'laundry', width: 0.6, depth: 0.6, height: 0.85, color: '#E0E0E0' },
    { id: 'dryer', name: 'Secadora', category: 'laundry', width: 0.6, depth: 0.6, height: 0.85, color: '#D8D8D8' },
    { id: 'washer-dryer', name: 'Lava e seca', category: 'laundry', width: 0.6, depth: 0.65, height: 0.85, color: '#E0E0E0' },
    { id: 'laundry-sink', name: 'Tanque', category: 'laundry', width: 0.55, depth: 0.55, height: 0.85, color: '#F0F0F0' },
    { id: 'ironing-board', name: 'Tabua passar', category: 'laundry', width: 0.35, depth: 1.2, height: 0.9, color: '#C0C0C0' },
    { id: 'drying-rack', name: 'Varal de chao', category: 'laundry', width: 0.55, depth: 1.3, height: 1.0, color: '#AAAAAA' },

    // DOORS (internal furniture-style openings) (6)
    { id: 'door-single', name: 'Porta simples', category: 'doors', width: 0.9, depth: 0.08, height: 2.1, color: '#A08060' },
    { id: 'door-double', name: 'Porta dupla', category: 'doors', width: 1.6, depth: 0.08, height: 2.1, color: '#A08060' },
    { id: 'door-sliding', name: 'Porta correr', category: 'doors', width: 1.2, depth: 0.08, height: 2.1, color: '#8B7050' },
    { id: 'door-folding', name: 'Porta sanfonada', category: 'doors', width: 0.9, depth: 0.08, height: 2.1, color: '#D2B48C' },
    { id: 'door-pocket', name: 'Porta embutida', category: 'doors', width: 0.8, depth: 0.08, height: 2.1, color: '#A08060' },
    { id: 'door-glass', name: 'Porta vidro', category: 'doors', width: 0.9, depth: 0.08, height: 2.1, color: '#B0D0E0' },

    // APPLIANCES (8)
    { id: 'ac-split', name: 'Ar condicionado split', category: 'appliances', width: 0.8, depth: 0.2, height: 0.28, color: '#E0E0E0' },
    { id: 'ac-window', name: 'Ar condicionado janela', category: 'appliances', width: 0.55, depth: 0.55, height: 0.38, color: '#D0D0D0' },
    { id: 'heater', name: 'Aquecedor', category: 'appliances', width: 0.4, depth: 0.2, height: 0.6, color: '#CCCCCC' },
    { id: 'water-heater', name: 'Aquecedor agua', category: 'appliances', width: 0.4, depth: 0.35, height: 0.6, color: '#E0E0E0' },
    { id: 'fan-stand', name: 'Ventilador pedestal', category: 'appliances', width: 0.45, depth: 0.45, height: 1.3, color: '#AAAAAA' },
    { id: 'vacuum', name: 'Aspirador', category: 'appliances', width: 0.35, depth: 0.35, height: 1.1, color: '#444444' },
    { id: 'dehumidifier', name: 'Desumidificador', category: 'appliances', width: 0.35, depth: 0.25, height: 0.55, color: '#E0E0E0' },
    { id: 'purifier', name: 'Purificador ar', category: 'appliances', width: 0.25, depth: 0.25, height: 0.55, color: '#F0F0F0' },

    // PLANTS (8)
    { id: 'plant-small', name: 'Planta pequena', category: 'plants', width: 0.25, depth: 0.25, height: 0.35, color: '#228B22' },
    { id: 'plant-medium', name: 'Planta media', category: 'plants', width: 0.4, depth: 0.4, height: 0.7, color: '#228B22' },
    { id: 'plant-tall', name: 'Planta grande', category: 'plants', width: 0.5, depth: 0.5, height: 1.5, color: '#006400' },
    { id: 'plant-tree', name: 'Arvore interna', category: 'plants', width: 0.6, depth: 0.6, height: 2.0, color: '#006400' },
    { id: 'cactus', name: 'Cacto', category: 'plants', width: 0.15, depth: 0.15, height: 0.4, color: '#2E8B57' },
    { id: 'bonsai', name: 'Bonsai', category: 'plants', width: 0.3, depth: 0.3, height: 0.35, color: '#228B22' },
    { id: 'hanging-plant', name: 'Planta pendente', category: 'plants', width: 0.3, depth: 0.3, height: 0.6, color: '#32CD32' },
    { id: 'flower-pot', name: 'Vaso flores', category: 'plants', width: 0.2, depth: 0.2, height: 0.3, color: '#FF6347' }
  ];

  function getAll() { return items; }
  function getItem(id) { return items.find(i => i.id === id) || null; }
  function getCategories() { return categories; }
  function getByCategory(categoryId) { return items.filter(i => i.category === categoryId); }

  function search(query) {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }

  return { getAll, getItem, getCategories, getByCategory, search };
})();

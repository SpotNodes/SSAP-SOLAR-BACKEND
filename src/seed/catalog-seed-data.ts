import { StockStatus } from '../core/enums.js';

// Ported verbatim from the app's src/mocks/categories.ts and src/mocks/products.ts so the seeded
// catalogue matches what the app has always shown in mock mode.

function placeholderImages(seed: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/800/600`);
}

const LOW_STOCK_THRESHOLD = 5;

function stockFor(status: StockStatus): { inventoryQuantity: number; lowStockThreshold: number } {
  switch (status) {
    case StockStatus.OutOfStock:
      return { inventoryQuantity: 0, lowStockThreshold: LOW_STOCK_THRESHOLD };
    case StockStatus.LowStock:
      return { inventoryQuantity: 3, lowStockThreshold: LOW_STOCK_THRESHOLD };
    default:
      return { inventoryQuantity: 50, lowStockThreshold: LOW_STOCK_THRESHOLD };
  }
}

export interface CatalogSeedCategory {
  id: string;
  name: string;
  iconKey: string;
}

// iconKey values equal the app's current Ionicons glyph names (PRD decision D2) — the app can
// keep using them directly today, or switch to its own local categoryId→icon map later without
// this backend needing to change.
export const catalogSeedCategories: CatalogSeedCategory[] = [
  { id: 'panels', name: 'Solar Panels', iconKey: 'sunny-outline' },
  { id: 'inverters', name: 'Inverters', iconKey: 'flash-outline' },
  { id: 'batteries', name: 'Batteries', iconKey: 'battery-charging-outline' },
  { id: 'mounting', name: 'Mounting Structures', iconKey: 'construct-outline' },
  { id: 'controllers', name: 'Charge Controllers', iconKey: 'hardware-chip-outline' },
  { id: 'accessories', name: 'Cables & Accessories', iconKey: 'git-network-outline' },
];

export interface CatalogSeedProduct {
  id: string;
  name: string;
  images: string[];
  price: number;
  description: string;
  specs: { label: string; value: string }[];
  categoryId: string;
  inventoryQuantity: number;
  lowStockThreshold: number;
}

export const catalogSeedProducts: CatalogSeedProduct[] = [
  {
    id: 'panel-mono-550',
    name: 'Monocrystalline 550W Solar Panel',
    images: placeholderImages('panel-mono-550', 3),
    price: 14999,
    description:
      'High-efficiency monocrystalline panel built for maximum output per square foot, ideal for rooftop installations with limited space.',
    specs: [
      { label: 'Wattage', value: '550W' },
      { label: 'Cell Type', value: 'Monocrystalline PERC' },
      { label: 'Efficiency', value: '21.3%' },
      { label: 'Dimensions', value: '2280 x 1134 x 35 mm' },
      { label: 'Warranty', value: '25 years performance' },
    ],
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'panel-mono-330',
    name: 'Monocrystalline 330W Solar Panel',
    images: placeholderImages('panel-mono-330', 2),
    price: 8499,
    description:
      'Reliable mid-size monocrystalline panel suited for residential rooftop arrays and small commercial installs.',
    specs: [
      { label: 'Wattage', value: '330W' },
      { label: 'Cell Type', value: 'Monocrystalline' },
      { label: 'Efficiency', value: '19.8%' },
      { label: 'Dimensions', value: '1956 x 992 x 35 mm' },
      { label: 'Warranty', value: '25 years performance' },
    ],
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'panel-poly-250',
    name: 'Polycrystalline 250W Solar Panel',
    images: placeholderImages('panel-poly-250', 2),
    price: 6999,
    description: 'Budget-friendly polycrystalline panel for standard grid-tied and off-grid setups.',
    specs: [
      { label: 'Wattage', value: '250W' },
      { label: 'Cell Type', value: 'Polycrystalline' },
      { label: 'Efficiency', value: '17.2%' },
      { label: 'Dimensions', value: '1650 x 992 x 35 mm' },
      { label: 'Warranty', value: '20 years performance' },
    ],
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'panel-bifacial-450',
    name: 'Bifacial 450W Solar Panel',
    images: placeholderImages('panel-bifacial-450', 3),
    price: 12499,
    description:
      'Dual-sided bifacial panel that captures reflected light for a meaningful energy yield boost on ground-mount arrays.',
    specs: [
      { label: 'Wattage', value: '450W' },
      { label: 'Cell Type', value: 'Bifacial Mono PERC' },
      { label: 'Rear Gain', value: 'Up to 15%' },
      { label: 'Dimensions', value: '2094 x 1038 x 35 mm' },
      { label: 'Warranty', value: '30 years performance' },
    ],
    categoryId: 'panels',
    ...stockFor(StockStatus.OutOfStock),
  },
  {
    id: 'inverter-hybrid-5kw',
    name: '5kW Hybrid Solar Inverter',
    images: placeholderImages('inverter-hybrid-5kw', 2),
    price: 68000,
    description:
      'Hybrid inverter with built-in battery charging support — runs grid-tied or off-grid and switches automatically on outage.',
    specs: [
      { label: 'Capacity', value: '5 kW' },
      { label: 'Type', value: 'Hybrid (Grid + Battery)' },
      { label: 'Peak Efficiency', value: '97.6%' },
      { label: 'Input Voltage', value: '120–450V DC' },
      { label: 'Warranty', value: '5 years' },
    ],
    categoryId: 'inverters',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'inverter-offgrid-3kw',
    name: '3kW Off-Grid Inverter',
    images: placeholderImages('inverter-offgrid-3kw', 2),
    price: 42500,
    description: 'Pure sine wave off-grid inverter for standalone systems with battery banks.',
    specs: [
      { label: 'Capacity', value: '3 kW' },
      { label: 'Type', value: 'Off-Grid' },
      { label: 'Waveform', value: 'Pure Sine Wave' },
      { label: 'Battery Voltage', value: '24V / 48V' },
      { label: 'Warranty', value: '3 years' },
    ],
    categoryId: 'inverters',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'inverter-ongrid-10kw',
    name: '10kW On-Grid Inverter',
    images: placeholderImages('inverter-ongrid-10kw', 2),
    price: 115000,
    description: 'Three-phase on-grid inverter for commercial rooftop and small industrial installs.',
    specs: [
      { label: 'Capacity', value: '10 kW' },
      { label: 'Type', value: 'On-Grid, 3-Phase' },
      { label: 'Peak Efficiency', value: '98.1%' },
      { label: 'MPPT Trackers', value: '2' },
      { label: 'Warranty', value: '5 years' },
    ],
    categoryId: 'inverters',
    ...stockFor(StockStatus.LowStock),
  },
  {
    id: 'battery-lithium-100ah',
    name: 'Lithium 100Ah 12V Battery',
    images: placeholderImages('battery-lithium-100ah', 2),
    price: 38000,
    description: 'LiFePO4 battery with long cycle life and a built-in battery management system.',
    specs: [
      { label: 'Capacity', value: '100 Ah' },
      { label: 'Voltage', value: '12V' },
      { label: 'Chemistry', value: 'LiFePO4' },
      { label: 'Cycle Life', value: '6000+ cycles' },
      { label: 'Warranty', value: '5 years' },
    ],
    categoryId: 'batteries',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'battery-tubular-150ah',
    name: 'Tubular 150Ah Battery',
    images: placeholderImages('battery-tubular-150ah', 2),
    price: 16500,
    description: 'Deep-cycle tubular battery built for daily solar charge/discharge cycles.',
    specs: [
      { label: 'Capacity', value: '150 Ah' },
      { label: 'Voltage', value: '12V' },
      { label: 'Chemistry', value: 'Lead Acid (Tubular)' },
      { label: 'Cycle Life', value: '1500 cycles' },
      { label: 'Warranty', value: '3 years' },
    ],
    categoryId: 'batteries',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'battery-lithium-200ah',
    name: 'Lithium 200Ah 24V Battery',
    images: placeholderImages('battery-lithium-200ah', 2),
    price: 72000,
    description: 'High-capacity LiFePO4 battery pack for larger hybrid and off-grid systems.',
    specs: [
      { label: 'Capacity', value: '200 Ah' },
      { label: 'Voltage', value: '24V' },
      { label: 'Chemistry', value: 'LiFePO4' },
      { label: 'Cycle Life', value: '6000+ cycles' },
      { label: 'Warranty', value: '5 years' },
    ],
    categoryId: 'batteries',
    ...stockFor(StockStatus.OutOfStock),
  },
  {
    id: 'mounting-rooftop-kit',
    name: 'Rooftop Mounting Kit (4 Panel)',
    images: placeholderImages('mounting-rooftop-kit', 2),
    price: 9500,
    description: 'Corrosion-resistant aluminium mounting kit for pitched or flat rooftop installs.',
    specs: [
      { label: 'Material', value: 'Anodized Aluminium' },
      { label: 'Panel Capacity', value: '4 panels' },
      { label: 'Load Rating', value: '2.4 kN/m²' },
      { label: 'Warranty', value: '10 years' },
    ],
    categoryId: 'mounting',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'mounting-ground-structure',
    name: 'Ground Mount Structure',
    images: placeholderImages('mounting-ground-structure', 2),
    price: 18000,
    description: 'Galvanized steel ground-mount frame for open-field solar arrays.',
    specs: [
      { label: 'Material', value: 'Hot-Dip Galvanized Steel' },
      { label: 'Tilt Angle', value: '10°–30° adjustable' },
      { label: 'Load Rating', value: '3.0 kN/m²' },
      { label: 'Warranty', value: '10 years' },
    ],
    categoryId: 'mounting',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'controller-mppt-60a',
    name: 'MPPT 60A Charge Controller',
    images: placeholderImages('controller-mppt-60a', 2),
    price: 7200,
    description: 'Maximum power point tracking controller for higher charging efficiency.',
    specs: [
      { label: 'Max Current', value: '60A' },
      { label: 'Type', value: 'MPPT' },
      { label: 'System Voltage', value: '12V / 24V / 48V auto' },
      { label: 'Warranty', value: '3 years' },
    ],
    categoryId: 'controllers',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'controller-pwm-30a',
    name: 'PWM 30A Charge Controller',
    images: placeholderImages('controller-pwm-30a', 2),
    price: 2400,
    description: 'Entry-level PWM controller for small off-grid battery-charging systems.',
    specs: [
      { label: 'Max Current', value: '30A' },
      { label: 'Type', value: 'PWM' },
      { label: 'System Voltage', value: '12V / 24V' },
      { label: 'Warranty', value: '2 years' },
    ],
    categoryId: 'controllers',
    ...stockFor(StockStatus.LowStock),
  },
  {
    id: 'accessory-mc4-pair',
    name: 'MC4 Connector Pair',
    images: placeholderImages('accessory-mc4-pair', 1),
    price: 150,
    description: 'Weatherproof MC4 connector pair for panel-to-panel and panel-to-inverter wiring.',
    specs: [
      { label: 'Rated Current', value: '30A' },
      { label: 'IP Rating', value: 'IP67' },
    ],
    categoryId: 'accessories',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'accessory-dc-cable-100m',
    name: 'Solar DC Cable (4mm², 100m)',
    images: placeholderImages('accessory-dc-cable-100m', 1),
    price: 3800,
    description: 'UV-resistant single-core DC cable for solar array wiring runs.',
    specs: [
      { label: 'Cross Section', value: '4 mm²' },
      { label: 'Length', value: '100 m' },
      { label: 'Rating', value: '1500V DC, UV resistant' },
    ],
    categoryId: 'accessories',
    ...stockFor(StockStatus.InStock),
  },
];

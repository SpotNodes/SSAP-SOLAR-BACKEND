import { StockStatus } from '../core/enums.js';

/**
 * Demo catalogue for the SSAP Solar storefront — modelled on the Indian residential/commercial
 * solar market (DCR vs non-DCR modules, PCU-style hybrid inverters, tall-tubular vs LFP batteries),
 * with prices in whole rupees as the API stores them.
 *
 * Photography: hot-linked from the Pexels/Unsplash CDNs, which serve these without an API key.
 * Every URL below was fetched and visually checked before being committed. They are stand-ins for
 * the client's own product shots — swap `IMG` for real photography before launch. (Wikimedia was
 * evaluated and rejected: it blocks direct hot-linking, so those URLs fail inside the app.)
 */
const px = (id: number): string =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1200`;
const us = (id: string): string => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const IMG = {
  // Single-module shots — the closest thing to a product photo in the free pools.
  panelHeld: px(9875441),
  panelUpright: px(9875440),
  panelOnRoof: px(9875439),
  panelCrew: px(8853501),
  panelInstall: px(8853502),
  panelHands: us('1559302504-64aae6ca6b6d'),
  // Array / context shots.
  arrayGround: us('1509391366360-2e959784a276'),
  arrayRow: us('1508514177221-188b1cf16e9d'),
  arrayTopDown: us('1497440001374-f26997328c1b'),
  arrayRooftop: us('1613665813446-82a78c468a1d'),
  arrayPoly: us('1521618755572-156ae0cdd74d'),
  arraySky: px(356036),
  arrayAerial: px(2800832),
  arraySunset: px(371917),
  panelClean: px(4254165),
  engineer: px(4254163),
  // Structures.
  carport: px(9799731),
  carportCars: px(9800029),
  // Electrical — inverters, controllers, balance-of-system.
  switchboard: px(257736),
  cabling: px(442150),
} as const;

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

/** Wattage options priced per watt — how panels are actually quoted in this market. */
function wattageVariants(
  baseId: string,
  watts: number[],
  pricePerWatt: number,
): CatalogSeedVariant[] {
  return watts.map((watt) => ({
    id: `${baseId}-w${watt}`,
    label: `${watt}W`,
    price: Math.round((watt * pricePerWatt) / 10) * 10,
  }));
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

export interface CatalogSeedVariant {
  id: string;
  label: string;
  price?: number;
  stockStatus?: StockStatus;
}

export interface CatalogSeedProduct {
  id: string;
  name: string;
  images: string[];
  price: number;
  description: string;
  specs: { label: string; value: string }[];
  variantLabel?: string;
  variants?: CatalogSeedVariant[];
  categoryId: string;
  inventoryQuantity: number;
  lowStockThreshold: number;
}

export const catalogSeedProducts: CatalogSeedProduct[] = [
  // ---- Solar panels -------------------------------------------------------------------------
  {
    id: 'panel-waaree-mono-perc-550',
    name: 'Waaree 550W Mono PERC Solar Panel (DCR)',
    images: [IMG.panelUpright, IMG.panelHeld, IMG.arrayRow],
    price: 15400,
    description:
      'Domestic-content (DCR) mono PERC module built for PM Surya Ghar and other subsidy-linked rooftop projects. Half-cut cells cut shading losses, and the anodised aluminium frame is rated for 5400 Pa snow and 2400 Pa wind load.',
    specs: [
      { label: 'Peak Power', value: '550 Wp' },
      { label: 'Cell Type', value: 'Mono PERC half-cut' },
      { label: 'Module Efficiency', value: '21.3%' },
      { label: 'Content', value: 'DCR (subsidy eligible)' },
      { label: 'Dimensions', value: '2279 x 1134 x 35 mm' },
      { label: 'Weight', value: '27.5 kg' },
      { label: 'Product Warranty', value: '12 years' },
      { label: 'Performance Warranty', value: '27 years / 80% output' },
    ],
    variantLabel: 'Wattage',
    variants: wattageVariants('panel-waaree-mono-perc-550', [530, 535, 540, 545, 550], 28),
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'panel-adani-topcon-585',
    name: 'Adani ElanSG 585W N-Type TOPCon Panel (DCR)',
    images: [IMG.panelHeld, IMG.panelOnRoof, IMG.arrayTopDown],
    price: 17000,
    description:
      'N-type TOPCon glass-to-glass module with a lower temperature coefficient than PERC, so it holds output far better through an Indian summer. Bifacial rear gain of up to 70% on reflective rooftops.',
    specs: [
      { label: 'Peak Power', value: '585 Wp' },
      { label: 'Cell Type', value: 'N-Type TOPCon' },
      { label: 'Module Efficiency', value: '22.8%' },
      { label: 'Content', value: 'DCR (subsidy eligible)' },
      { label: 'Temperature Coefficient', value: '-0.30% / °C' },
      { label: 'Dimensions', value: '2278 x 1134 x 30 mm' },
      { label: 'Product Warranty', value: '15 years' },
      { label: 'Performance Warranty', value: '30 years / 87.4% output' },
    ],
    variantLabel: 'Wattage',
    variants: wattageVariants('panel-adani-topcon-585', [570, 575, 580, 585, 590], 29).map((v) =>
      v.label === '590W' ? { ...v, stockStatus: StockStatus.OutOfStock } : v,
    ),
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'panel-vikram-somera-545',
    name: 'Vikram Solar Somera 545W Mono PERC Panel',
    images: [IMG.panelOnRoof, IMG.arraySky, IMG.panelInstall],
    price: 14700,
    description:
      'A workhorse mono PERC module for residential rooftops — proven, widely stocked, and easy to service. PID-resistant with a salt-mist and ammonia certification for coastal installs.',
    specs: [
      { label: 'Peak Power', value: '545 Wp' },
      { label: 'Cell Type', value: 'Mono PERC half-cut' },
      { label: 'Module Efficiency', value: '21.1%' },
      { label: 'Certification', value: 'IEC 61701 salt mist, IEC 62716 ammonia' },
      { label: 'Dimensions', value: '2279 x 1134 x 35 mm' },
      { label: 'Product Warranty', value: '12 years' },
      { label: 'Performance Warranty', value: '25 years / 80.2% output' },
    ],
    variantLabel: 'Wattage',
    variants: wattageVariants('panel-vikram-somera-545', [530, 535, 540, 545], 27),
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'panel-tata-535',
    name: 'Tata Power Solar 535W Mono PERC Panel',
    images: [IMG.panelCrew, IMG.arrayRooftop, IMG.engineer],
    price: 15000,
    description:
      'Made in India by the country’s oldest solar manufacturer, with a service network in every major city. A safe specification for customers who prize after-sales support over the last rupee of price.',
    specs: [
      { label: 'Peak Power', value: '535 Wp' },
      { label: 'Cell Type', value: 'Mono PERC' },
      { label: 'Module Efficiency', value: '20.7%' },
      { label: 'Content', value: 'DCR (subsidy eligible)' },
      { label: 'Dimensions', value: '2256 x 1133 x 35 mm' },
      { label: 'Product Warranty', value: '12 years' },
      { label: 'Performance Warranty', value: '25 years / 80% output' },
    ],
    variantLabel: 'Wattage',
    variants: wattageVariants('panel-tata-535', [525, 530, 535], 28),
    categoryId: 'panels',
    ...stockFor(StockStatus.LowStock),
  },
  {
    id: 'panel-bifacial-dual-glass-550',
    name: 'Adani 550W Bifacial Dual-Glass Panel',
    images: [IMG.arrayGround, IMG.arrayAerial, IMG.panelHands],
    price: 16500,
    description:
      'Dual-glass bifacial module that harvests reflected light from the rear face — worth 5–20% extra yield on elevated ground mounts, white membrane roofs and car ports. Frameless build with a 30-year glass warranty.',
    specs: [
      { label: 'Peak Power (front)', value: '550 Wp' },
      { label: 'Bifaciality', value: '70% ± 5%' },
      { label: 'Cell Type', value: 'N-Type TOPCon bifacial' },
      { label: 'Construction', value: 'Dual glass 2.0 + 2.0 mm' },
      { label: 'Dimensions', value: '2278 x 1134 x 30 mm' },
      { label: 'Product Warranty', value: '15 years' },
      { label: 'Performance Warranty', value: '30 years / 87% output' },
    ],
    variantLabel: 'Wattage',
    variants: wattageVariants('panel-bifacial-dual-glass-550', [540, 550, 560, 570], 30),
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'panel-nondcr-topcon-600',
    name: 'Non-DCR 600W TOPCon Panel (Commercial)',
    images: [IMG.arrayRow, IMG.arraySunset, IMG.arrayAerial],
    price: 15600,
    description:
      'The same N-type TOPCon cell technology at a keener per-watt price for open-access, C&I and captive projects where domestic-content rules do not apply.',
    specs: [
      { label: 'Peak Power', value: '600 Wp' },
      { label: 'Cell Type', value: 'N-Type TOPCon' },
      { label: 'Module Efficiency', value: '23.0%' },
      { label: 'Content', value: 'Non-DCR' },
      { label: 'Dimensions', value: '2382 x 1134 x 30 mm' },
      { label: 'Product Warranty', value: '12 years' },
      { label: 'Performance Warranty', value: '30 years / 87% output' },
    ],
    variantLabel: 'Wattage',
    variants: wattageVariants('panel-nondcr-topcon-600', [590, 600, 610, 620, 630], 26),
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'panel-loom-shark-440',
    name: 'Loom Solar Shark 440W Bifacial Panel',
    images: [IMG.panelHeld, IMG.panelUpright, IMG.panelClean],
    price: 12800,
    description:
      'Compact bifacial module sized for smaller rooftops and balcony systems where a full 550W panel simply will not fit. Popular for 1–2 kW residential add-ons.',
    specs: [
      { label: 'Peak Power', value: '440 Wp' },
      { label: 'Cell Type', value: 'Mono PERC bifacial' },
      { label: 'Module Efficiency', value: '20.4%' },
      { label: 'Dimensions', value: '1908 x 1134 x 30 mm' },
      { label: 'Weight', value: '23 kg' },
      { label: 'Product Warranty', value: '10 years' },
      { label: 'Performance Warranty', value: '25 years / 80% output' },
    ],
    categoryId: 'panels',
    ...stockFor(StockStatus.OutOfStock),
  },
  {
    id: 'panel-offgrid-12v-125',
    name: '125W 12V Off-Grid Solar Panel',
    images: [IMG.panelOnRoof, IMG.panelHeld, IMG.arrayPoly],
    price: 4200,
    description:
      'Small 12V module for off-grid duty — street lights, CCTV poles, farm pumps, camper vans and battery top-up charging. Pairs directly with a 12V PWM or MPPT controller.',
    specs: [
      { label: 'Peak Power', value: '125 Wp' },
      { label: 'System Voltage', value: '12 V' },
      { label: 'Cell Type', value: 'Mono PERC' },
      { label: 'Dimensions', value: '1090 x 670 x 30 mm' },
      { label: 'Weight', value: '8.5 kg' },
      { label: 'Product Warranty', value: '10 years' },
    ],
    variantLabel: 'Wattage',
    variants: [
      { id: 'panel-offgrid-12v-125-w75', label: '75W', price: 2700 },
      { id: 'panel-offgrid-12v-125-w100', label: '100W', price: 3500 },
      { id: 'panel-offgrid-12v-125-w125', label: '125W', price: 4200 },
      { id: 'panel-offgrid-12v-125-w165', label: '165W', price: 5400, stockStatus: StockStatus.LowStock },
    ],
    categoryId: 'panels',
    ...stockFor(StockStatus.InStock),
  },

  // ---- Inverters ----------------------------------------------------------------------------
  {
    id: 'inverter-luminous-nxg1800',
    name: 'Luminous NXG 1800 Solar Hybrid PCU — 1500VA / 24V',
    images: [IMG.switchboard, IMG.cabling, IMG.arrayRooftop],
    price: 12500,
    description:
      'Solar hybrid PCU for homes that want backup first and savings second: runs the load from solar, tops up the battery, and falls back to the grid only when it must. Built-in 50A PWM controller.',
    specs: [
      { label: 'Capacity', value: '1500 VA / 1250 W' },
      { label: 'System Voltage', value: '24 V' },
      { label: 'Type', value: 'Off-grid hybrid PCU' },
      { label: 'Solar Controller', value: 'PWM 50 A built-in' },
      { label: 'Max Panel Input', value: '1000 Wp' },
      { label: 'Waveform', value: 'Pure sine wave' },
      { label: 'Warranty', value: '2 years' },
    ],
    categoryId: 'inverters',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'inverter-smarten-superb-3000',
    name: 'Smarten Superb 3000 MPPT Solar PCU — 2.5kVA / 24V',
    images: [IMG.cabling, IMG.switchboard, IMG.engineer],
    price: 21500,
    description:
      'MPPT-based PCU that harvests noticeably more than a PWM unit on cloudy days and in winter. Suits a 2–3 kW home system with two or three tall-tubular batteries.',
    specs: [
      { label: 'Capacity', value: '2500 VA / 2000 W' },
      { label: 'System Voltage', value: '24 V' },
      { label: 'Type', value: 'Off-grid MPPT PCU' },
      { label: 'Solar Controller', value: 'MPPT 60 A built-in' },
      { label: 'Max Panel Input', value: '3000 Wp' },
      { label: 'Efficiency', value: '>97% MPPT tracking' },
      { label: 'Warranty', value: '2 years' },
    ],
    categoryId: 'inverters',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'inverter-ongrid-5kw',
    name: '5kW On-Grid Solar Inverter (Single Phase)',
    images: [IMG.switchboard, IMG.arrayRooftop, IMG.cabling],
    price: 42000,
    description:
      'Grid-tied string inverter for net-metered rooftop systems — no battery, lowest cost per unit generated. Dual MPPT trackers handle two roof faces, with Wi-Fi monitoring in the box.',
    specs: [
      { label: 'Rated Power', value: '5 kW' },
      { label: 'Phase', value: 'Single phase' },
      { label: 'MPPT Trackers', value: '2' },
      { label: 'Max Efficiency', value: '98.2%' },
      { label: 'Protection', value: 'IP65' },
      { label: 'Monitoring', value: 'Wi-Fi + mobile app' },
      { label: 'Warranty', value: '5 years (extendable to 10)' },
    ],
    variantLabel: 'Capacity',
    variants: [
      { id: 'inverter-ongrid-5kw-c3', label: '3 kW', price: 29000 },
      { id: 'inverter-ongrid-5kw-c4', label: '4 kW', price: 35000 },
      { id: 'inverter-ongrid-5kw-c5', label: '5 kW', price: 42000 },
      { id: 'inverter-ongrid-5kw-c6', label: '6 kW', price: 49500 },
      { id: 'inverter-ongrid-5kw-c10', label: '10 kW', price: 82000, stockStatus: StockStatus.LowStock },
    ],
    categoryId: 'inverters',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'inverter-hybrid-8kw-3phase',
    name: '8kW Three-Phase Hybrid Inverter (LFP Ready)',
    images: [IMG.cabling, IMG.switchboard, IMG.arrayAerial],
    price: 128000,
    description:
      'Three-phase hybrid for larger villas and small commercial loads — grid export, battery storage and generator input on one unit. Talks CAN/RS485 to 48V lithium packs out of the box.',
    specs: [
      { label: 'Rated Power', value: '8 kW' },
      { label: 'Phase', value: 'Three phase' },
      { label: 'Battery Support', value: '48 V LFP (CAN / RS485)' },
      { label: 'MPPT Trackers', value: '2' },
      { label: 'Max Efficiency', value: '97.6%' },
      { label: 'Protection', value: 'IP65' },
      { label: 'Warranty', value: '5 years' },
    ],
    categoryId: 'inverters',
    ...stockFor(StockStatus.LowStock),
  },
  {
    id: 'inverter-microtek-msun-2035',
    name: 'Microtek M-SUN 2035 Solar Inverter — 1650VA / 24V',
    images: [IMG.switchboard, IMG.engineer, IMG.cabling],
    price: 9800,
    description:
      'Budget PWM solar inverter that does the essential job well: reliable backup with solar assist. A common pick for two-battery homes upgrading from a plain inverter.',
    specs: [
      { label: 'Capacity', value: '1650 VA / 1400 W' },
      { label: 'System Voltage', value: '24 V' },
      { label: 'Solar Controller', value: 'PWM 35 A built-in' },
      { label: 'Max Panel Input', value: '800 Wp' },
      { label: 'Waveform', value: 'Pure sine wave' },
      { label: 'Warranty', value: '2 years' },
    ],
    categoryId: 'inverters',
    ...stockFor(StockStatus.InStock),
  },

  // ---- Batteries ----------------------------------------------------------------------------
  {
    id: 'battery-luminous-tubular-150',
    name: 'Luminous Solar Tall Tubular Battery — 150Ah / 12V',
    images: [IMG.switchboard, IMG.cabling, IMG.arrayRooftop],
    price: 15800,
    description:
      'Deep-discharge tall tubular battery designed for daily solar cycling, not just occasional backup. Thicker positive plates and higher electrolyte volume than a standard inverter battery.',
    specs: [
      { label: 'Capacity', value: '150 Ah' },
      { label: 'Voltage', value: '12 V' },
      { label: 'Chemistry', value: 'Lead acid, tall tubular' },
      { label: 'Cycle Life', value: '~1500 cycles @ 50% DoD' },
      { label: 'Weight', value: '54 kg' },
      { label: 'Warranty', value: '60 months (36 full + 24 pro-rata)' },
    ],
    variantLabel: 'Capacity',
    variants: [
      { id: 'battery-luminous-tubular-150-c100', label: '100 Ah', price: 11200 },
      { id: 'battery-luminous-tubular-150-c150', label: '150 Ah', price: 15800 },
      { id: 'battery-luminous-tubular-150-c180', label: '180 Ah', price: 18400 },
      { id: 'battery-luminous-tubular-150-c200', label: '200 Ah', price: 20900 },
    ],
    categoryId: 'batteries',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'battery-exide-solar-150',
    name: 'Exide Solar 6LMS150L Tubular Battery — 150Ah / 12V',
    images: [IMG.cabling, IMG.switchboard, IMG.engineer],
    price: 15200,
    description:
      'Exide’s solar-specific tubular range, built for the deep daily cycling a PV system imposes. Low water top-up frequency and a nationwide replacement network.',
    specs: [
      { label: 'Capacity', value: '150 Ah' },
      { label: 'Voltage', value: '12 V' },
      { label: 'Chemistry', value: 'Lead acid, tubular' },
      { label: 'Cycle Life', value: '~1400 cycles @ 50% DoD' },
      { label: 'Weight', value: '52 kg' },
      { label: 'Warranty', value: '60 months' },
    ],
    categoryId: 'batteries',
    ...stockFor(StockStatus.OutOfStock),
  },
  {
    id: 'battery-lfp-48v-3500',
    name: 'Lithium LFP Battery Pack — 3.5kWh / 48V',
    images: [IMG.switchboard, IMG.cabling, IMG.arrayAerial],
    price: 92000,
    description:
      'Rack-mount LiFePO4 pack with an integrated BMS — roughly four times the cycle life of tubular lead acid in a quarter of the footprint, with no watering and no ventilation requirement. Stackable to 15 units.',
    specs: [
      { label: 'Usable Energy', value: '3.5 kWh' },
      { label: 'Voltage', value: '48 V (51.2 V nominal)' },
      { label: 'Chemistry', value: 'LiFePO4' },
      { label: 'Cycle Life', value: '6000+ cycles @ 90% DoD' },
      { label: 'Communication', value: 'CAN / RS485' },
      { label: 'Weight', value: '32 kg' },
      { label: 'Warranty', value: '10 years' },
    ],
    variantLabel: 'Capacity',
    variants: [
      { id: 'battery-lfp-48v-3500-e35', label: '3.5 kWh', price: 92000 },
      { id: 'battery-lfp-48v-3500-e51', label: '5.1 kWh', price: 132000 },
      { id: 'battery-lfp-48v-3500-e100', label: '10.2 kWh', price: 249000, stockStatus: StockStatus.OutOfStock },
    ],
    categoryId: 'batteries',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'battery-livguard-invertuff-200',
    name: 'Livguard Invertuff Solar Battery — 200Ah / 12V',
    images: [IMG.cabling, IMG.engineer, IMG.switchboard],
    price: 20400,
    description:
      'High-capacity tubular battery for larger off-grid homes and shops running long evening loads. Suits 2.5–4 kW systems on a 24V or 48V bank.',
    specs: [
      { label: 'Capacity', value: '200 Ah' },
      { label: 'Voltage', value: '12 V' },
      { label: 'Chemistry', value: 'Lead acid, tall tubular' },
      { label: 'Cycle Life', value: '~1500 cycles @ 50% DoD' },
      { label: 'Weight', value: '68 kg' },
      { label: 'Warranty', value: '72 months' },
    ],
    categoryId: 'batteries',
    ...stockFor(StockStatus.LowStock),
  },

  // ---- Mounting structures ------------------------------------------------------------------
  {
    id: 'mounting-rooftop-gi-kit',
    name: 'Rooftop Mounting Structure — Hot-Dip GI',
    images: [IMG.arrayRooftop, IMG.panelInstall, IMG.arrayTopDown],
    price: 9800,
    description:
      'Hot-dip galvanised structure engineered for 150 km/h wind load, supplied cut to length with all clamps, bolts and end caps. Priced per panel bay — pick the size that matches your array.',
    specs: [
      { label: 'Material', value: 'Hot-dip galvanised iron' },
      { label: 'Coating', value: '80 micron zinc' },
      { label: 'Wind Load', value: 'Up to 150 km/h' },
      { label: 'Tilt', value: 'Fixed 10–15° (site specific)' },
      { label: 'Includes', value: 'Rails, mid/end clamps, fasteners' },
      { label: 'Warranty', value: '5 years against rust-through' },
    ],
    variantLabel: 'Array Size',
    variants: [
      { id: 'mounting-rooftop-gi-kit-p2', label: '2 panels', price: 5400 },
      { id: 'mounting-rooftop-gi-kit-p4', label: '4 panels', price: 9800 },
      { id: 'mounting-rooftop-gi-kit-p6', label: '6 panels', price: 14200 },
      { id: 'mounting-rooftop-gi-kit-p8', label: '8 panels', price: 18600 },
      { id: 'mounting-rooftop-gi-kit-p12', label: '12 panels', price: 27500 },
    ],
    categoryId: 'mounting',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'mounting-elevated-ground',
    name: 'Elevated Ground-Mount Structure (per kW)',
    images: [IMG.arrayGround, IMG.arrayRow, IMG.arraySunset],
    price: 18500,
    description:
      'Raised ground-mount frame that keeps modules clear of flooding and grazing livestock, and leaves the land beneath usable. Foundation bolts included; civil work quoted separately.',
    specs: [
      { label: 'Material', value: 'Hot-dip galvanised iron' },
      { label: 'Clearance', value: '1.8 m under-panel' },
      { label: 'Wind Load', value: 'Up to 180 km/h' },
      { label: 'Tilt', value: 'Fixed, latitude-optimised' },
      { label: 'Includes', value: 'Purlins, rafters, clamps, foundation bolts' },
      { label: 'Warranty', value: '5 years' },
    ],
    categoryId: 'mounting',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'mounting-solar-carport',
    name: 'Solar Car Port Structure — 2 Car Bay',
    images: [IMG.carport, IMG.carportCars, IMG.arrayGround],
    price: 86000,
    description:
      'Powder-coated steel car-port frame that doubles as a generating array — shaded parking that pays for itself. Sized for eight to ten 550W modules over two bays.',
    specs: [
      { label: 'Bays', value: '2 cars' },
      { label: 'Panel Capacity', value: '8–10 modules (~5 kW)' },
      { label: 'Material', value: 'Powder-coated MS' },
      { label: 'Clearance', value: '2.4 m' },
      { label: 'Includes', value: 'Frame, rails, clamps, drainage channel' },
      { label: 'Warranty', value: '7 years' },
    ],
    categoryId: 'mounting',
    ...stockFor(StockStatus.LowStock),
  },
  {
    id: 'mounting-tilt-legs',
    name: 'Adjustable Tilt Leg Kit (Pair)',
    images: [IMG.panelInstall, IMG.arrayTopDown, IMG.panelHands],
    price: 1450,
    description:
      'Adjustable-angle legs for flat roofs and terraces, letting you set the tilt seasonally to squeeze out extra winter generation. Sold per pair, one pair per panel.',
    specs: [
      { label: 'Adjustment Range', value: '15° – 35°' },
      { label: 'Material', value: 'Anodised aluminium' },
      { label: 'Per Pack', value: '1 pair (supports 1 module)' },
      { label: 'Fasteners', value: 'SS304 included' },
      { label: 'Warranty', value: '5 years' },
    ],
    categoryId: 'mounting',
    ...stockFor(StockStatus.InStock),
  },

  // ---- Charge controllers -------------------------------------------------------------------
  {
    id: 'controller-mppt-60a',
    name: 'MPPT Solar Charge Controller — 60A / 12-48V',
    images: [IMG.switchboard, IMG.cabling, IMG.engineer],
    price: 8900,
    description:
      'Maximum power point tracking controller that typically recovers 20–30% more energy than PWM in winter and under cloud. Auto-detects 12/24/36/48V banks with an LCD showing live yield.',
    specs: [
      { label: 'Charge Current', value: '60 A' },
      { label: 'System Voltage', value: '12 / 24 / 36 / 48 V auto' },
      { label: 'Max PV Input', value: '150 VOC' },
      { label: 'Tracking Efficiency', value: '>99%' },
      { label: 'Display', value: 'Backlit LCD + RS485' },
      { label: 'Warranty', value: '2 years' },
    ],
    variantLabel: 'Current',
    variants: [
      { id: 'controller-mppt-60a-a30', label: '30 A', price: 5200 },
      { id: 'controller-mppt-60a-a40', label: '40 A', price: 6400 },
      { id: 'controller-mppt-60a-a50', label: '50 A', price: 7600 },
      { id: 'controller-mppt-60a-a60', label: '60 A', price: 8900 },
      { id: 'controller-mppt-60a-a80', label: '80 A', price: 12400, stockStatus: StockStatus.LowStock },
    ],
    categoryId: 'controllers',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'controller-pwm-20a',
    name: 'PWM Solar Charge Controller — 20A / 12-24V',
    images: [IMG.cabling, IMG.switchboard, IMG.panelHands],
    price: 1650,
    description:
      'Straightforward, dependable PWM controller for small off-grid loads — street lights, CCTV, farm pumps and single-panel battery charging. USB output for phone charging.',
    specs: [
      { label: 'Charge Current', value: '20 A' },
      { label: 'System Voltage', value: '12 / 24 V auto' },
      { label: 'Max PV Input', value: '50 VOC' },
      { label: 'Protection', value: 'Reverse polarity, overload, short circuit' },
      { label: 'Extras', value: 'Dual USB 5V/2A' },
      { label: 'Warranty', value: '1 year' },
    ],
    categoryId: 'controllers',
    ...stockFor(StockStatus.InStock),
  },

  // ---- Cables & accessories -----------------------------------------------------------------
  {
    id: 'accessory-mc4-connector-pair',
    name: 'MC4 Connector Pair — IP67 (10 Pairs)',
    images: [IMG.cabling, IMG.panelHands, IMG.panelInstall],
    price: 640,
    description:
      'TUV-rated MC4 male/female connector pairs for panel-to-panel and string-to-DCDB runs. IP67 sealed with a positive lock — the standard termination on every modern module.',
    specs: [
      { label: 'Pack Size', value: '10 pairs' },
      { label: 'Rated Current', value: '30 A' },
      { label: 'Rated Voltage', value: '1000 V DC' },
      { label: 'Protection', value: 'IP67' },
      { label: 'Cable Range', value: '2.5 / 4 / 6 mm²' },
      { label: 'Certification', value: 'TUV' },
    ],
    categoryId: 'accessories',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'accessory-dc-cable-100m',
    name: 'Solar DC Cable 4mm² — 100m Roll (Red + Black)',
    images: [IMG.cabling, IMG.switchboard, IMG.panelInstall],
    price: 7400,
    description:
      'UV-stabilised, double-insulated tinned-copper DC cable rated for 25 years of rooftop exposure. Supplied as a matched red and black pair so a full string run comes from one order.',
    specs: [
      { label: 'Conductor', value: 'Tinned copper' },
      { label: 'Cross Section', value: '4 mm²' },
      { label: 'Length', value: '100 m red + 100 m black' },
      { label: 'Rated Voltage', value: '1500 V DC' },
      { label: 'Temperature Range', value: '-40°C to +90°C' },
      { label: 'Certification', value: 'TUV 2 PfG 1169' },
    ],
    variantLabel: 'Cross Section',
    variants: [
      { id: 'accessory-dc-cable-100m-s4', label: '4 mm²', price: 7400 },
      { id: 'accessory-dc-cable-100m-s6', label: '6 mm²', price: 10600 },
    ],
    categoryId: 'accessories',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'accessory-acdb-dcdb-combo',
    name: 'ACDB + DCDB Protection Box Set (Up to 5kW)',
    images: [IMG.switchboard, IMG.cabling, IMG.engineer],
    price: 4900,
    description:
      'Pre-wired AC and DC distribution boxes with surge protection and isolators — mandatory for net-metering approval in most DISCOMs, and the difference between a safe install and a fire risk.',
    specs: [
      { label: 'Suits', value: 'Systems up to 5 kW' },
      { label: 'DCDB', value: '1-in 1-out, 1000V SPD + fuse' },
      { label: 'ACDB', value: '32A MCB + AC SPD' },
      { label: 'Enclosure', value: 'IP65 polycarbonate' },
      { label: 'Certification', value: 'IEC 61439' },
      { label: 'Warranty', value: '2 years' },
    ],
    categoryId: 'accessories',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'accessory-earthing-kit',
    name: 'Solar Earthing Kit — Copper-Bonded Rod + Compound',
    images: [IMG.cabling, IMG.panelInstall, IMG.arrayGround],
    price: 3200,
    description:
      'Copper-bonded earth electrode with backfill compound and lightning arrester lug — the earthing every rooftop system needs to pass inspection and survive a monsoon storm.',
    specs: [
      { label: 'Electrode', value: '17 mm x 2 m copper bonded' },
      { label: 'Compound', value: '2 x 10 kg backfill' },
      { label: 'Includes', value: 'Earth pit cover, clamps, lug' },
      { label: 'Resistance', value: '<5 Ω (soil dependent)' },
      { label: 'Standard', value: 'IS 3043' },
    ],
    categoryId: 'accessories',
    ...stockFor(StockStatus.InStock),
  },
  {
    id: 'accessory-panel-cleaning-kit',
    name: 'Solar Panel Cleaning Kit — Telescopic',
    images: [IMG.panelClean, IMG.panelHands, IMG.arrayTopDown],
    price: 2450,
    description:
      'Telescopic brush with a soft microfibre head and a water-fed pole — dust on an Indian rooftop can cost 15–25% of annual yield, and this is the cheapest generation you will ever buy back.',
    specs: [
      { label: 'Reach', value: '3.6 m telescopic' },
      { label: 'Head', value: 'Microfibre, non-abrasive' },
      { label: 'Water Feed', value: 'Yes, hose adaptor included' },
      { label: 'Weight', value: '2.1 kg' },
      { label: 'Warranty', value: '1 year' },
    ],
    categoryId: 'accessories',
    ...stockFor(StockStatus.InStock),
  },
];

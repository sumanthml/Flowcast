import { Business, Supplier, Product, InventoryMovement, SalesRecord, PurchaseOrder } from '@/types';

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'biz_electronics',
    name: 'Apex Audio & Gear (Sample Retailer)',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',
    defaultUnit: 'pcs',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'biz_grocery',
    name: 'Verde Organics Market (Sample Retailer)',
    currency: 'EUR',
    currencySymbol: '€',
    timezone: 'Europe/Paris',
    defaultUnit: 'kg',
    createdAt: '2026-02-01T09:30:00Z',
    updatedAt: '2026-02-01T09:30:00Z',
  },
  {
    id: 'biz_home',
    name: 'Lumina Living Lifestyle (Sample Retailer)',
    currency: 'GBP',
    currencySymbol: '£',
    timezone: 'Europe/London',
    defaultUnit: 'units',
    createdAt: '2026-02-15T11:00:00Z',
    updatedAt: '2026-02-15T11:00:00Z',
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  // Apex Audio Suppliers
  {
    id: 'sup_audio_tech',
    businessId: 'biz_electronics',
    name: 'AcousticDynamics Labs Ltd',
    contactEmail: 'orders@acousticdynamics.com',
    contactPhone: '+1 (555) 492-1084',
    leadTimeDays: 10,
    minimumOrderValue: 1500,
    currency: 'USD',
    notes: 'Premium driver supplier. Strict carton packaging requirements.',
    createdAt: '2026-01-11T10:00:00Z',
  },
  {
    id: 'sup_cables_co',
    businessId: 'biz_electronics',
    name: 'SignalCraft Cable Interconnects',
    contactEmail: 'support@signalcraft.net',
    contactPhone: '+1 (555) 321-9988',
    leadTimeDays: 5,
    minimumOrderValue: 500,
    currency: 'USD',
    notes: 'Local regional warehouse. Quick turnaround on standard cables.',
    createdAt: '2026-01-12T11:00:00Z',
  },
  {
    id: 'sup_microphones',
    businessId: 'biz_electronics',
    name: 'VocalPeak Broadcast Instruments',
    contactEmail: 'b2b@vocalpeak.io',
    contactPhone: '+1 (555) 773-4521',
    leadTimeDays: 14,
    minimumOrderValue: 2000,
    currency: 'USD',
    notes: 'Overseas shipment. 14 days standard ocean/customs.',
    createdAt: '2026-01-15T12:00:00Z',
  },

  // Verde Organics Suppliers
  {
    id: 'sup_bio_farm',
    businessId: 'biz_grocery',
    name: 'Provence Bio Farms Co-op',
    contactEmail: 'contact@provence-bio.fr',
    contactPhone: '+33 4 91 22 33 44',
    leadTimeDays: 2,
    minimumOrderValue: 300,
    currency: 'EUR',
    notes: 'Fresh organic produce delivered thrice weekly.',
    createdAt: '2026-02-02T08:00:00Z',
  },
  {
    id: 'sup_dairy_artisan',
    businessId: 'biz_grocery',
    name: 'Alpes Artisan Laiterie',
    contactEmail: 'commandes@laiterie-alpes.fr',
    contactPhone: '+33 4 50 88 19 20',
    leadTimeDays: 3,
    minimumOrderValue: 400,
    currency: 'EUR',
    notes: 'Chilled freight required. Strict expiry tracking.',
    createdAt: '2026-02-03T09:00:00Z',
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  // Apex Audio Products
  {
    id: 'prod_anc_headphones',
    businessId: 'biz_electronics',
    sku: 'APX-HD-700',
    name: 'Apex Studio Wireless ANC Headphones',
    category: 'Headphones',
    unitOfMeasure: 'pcs',
    barcode: '085002938101',
    supplierId: 'sup_audio_tech',
    supplierName: 'AcousticDynamics Labs Ltd',
    currentStock: 14,
    reservedStock: 4,
    incomingStock: 0,
    reorderPoint: 35,
    safetyStock: 15,
    packSize: 5,
    minOrderQuantity: 20,
    leadTimeDays: 10,
    unitCost: 110.00,
    sellingPrice: 249.99,
    isArchived: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'prod_usb_mic',
    businessId: 'biz_electronics',
    sku: 'APX-MIC-PRO',
    name: 'Broadcast USB Condenser Microphone',
    category: 'Microphones',
    unitOfMeasure: 'pcs',
    barcode: '085002938102',
    supplierId: 'sup_microphones',
    supplierName: 'VocalPeak Broadcast Instruments',
    currentStock: 48,
    reservedStock: 2,
    incomingStock: 30,
    reorderPoint: 40,
    safetyStock: 12,
    packSize: 10,
    minOrderQuantity: 30,
    leadTimeDays: 14,
    unitCost: 65.00,
    sellingPrice: 139.99,
    isArchived: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'prod_xlr_cable',
    businessId: 'biz_electronics',
    sku: 'APX-CBL-10FT',
    name: 'Braided Gold-Plated XLR Cable (10ft)',
    category: 'Cables & Accessories',
    unitOfMeasure: 'pcs',
    barcode: '085002938103',
    supplierId: 'sup_cables_co',
    supplierName: 'SignalCraft Cable Interconnects',
    currentStock: 220,
    reservedStock: 0,
    incomingStock: 0,
    reorderPoint: 60,
    safetyStock: 20,
    packSize: 20,
    minOrderQuantity: 40,
    leadTimeDays: 5,
    unitCost: 6.50,
    sellingPrice: 24.99,
    isArchived: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'prod_monitor_speakers',
    businessId: 'biz_electronics',
    sku: 'APX-SPK-5X',
    name: 'Reference Bi-Amplified Studio Monitors (Pair)',
    category: 'Speakers',
    unitOfMeasure: 'pairs',
    barcode: '085002938104',
    supplierId: 'sup_audio_tech',
    supplierName: 'AcousticDynamics Labs Ltd',
    currentStock: 6,
    reservedStock: 1,
    incomingStock: 0,
    reorderPoint: 12,
    safetyStock: 4,
    packSize: 2,
    minOrderQuantity: 6,
    leadTimeDays: 10,
    unitCost: 180.00,
    sellingPrice: 399.00,
    isArchived: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'prod_dac_amp',
    businessId: 'biz_electronics',
    sku: 'APX-DAC-M1',
    name: 'Audiophile Desktop DAC & Headphone Amp',
    category: 'Amplifiers',
    unitOfMeasure: 'pcs',
    barcode: '085002938105',
    supplierId: 'sup_audio_tech',
    supplierName: 'AcousticDynamics Labs Ltd',
    currentStock: 19,
    reservedStock: 0,
    incomingStock: 10,
    reorderPoint: 20,
    safetyStock: 6,
    packSize: 5,
    minOrderQuantity: 10,
    leadTimeDays: 10,
    unitCost: 95.00,
    sellingPrice: 219.00,
    isArchived: false,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-01-15T10:00:00Z',
  },

  // Verde Organics Products (with shelf life & expiry dates)
  {
    id: 'prod_olive_oil',
    businessId: 'biz_grocery',
    sku: 'VRD-OIL-500ML',
    name: 'Cold-Pressed Extra Virgin Olive Oil (500ml)',
    category: 'Pantry Oils',
    unitOfMeasure: 'bottles',
    barcode: '376012948011',
    supplierId: 'sup_bio_farm',
    supplierName: 'Provence Bio Farms Co-op',
    currentStock: 45,
    reservedStock: 0,
    incomingStock: 0,
    reorderPoint: 30,
    safetyStock: 10,
    packSize: 12,
    minOrderQuantity: 24,
    leadTimeDays: 3,
    unitCost: 7.20,
    sellingPrice: 15.50,
    shelfLifeDays: 365,
    expiryDate: '2027-02-01',
    isArchived: false,
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'prod_goat_cheese',
    businessId: 'biz_grocery',
    sku: 'VRD-CHS-CHEVRE',
    name: 'Artisanal Organic Chèvre Goat Cheese',
    category: 'Dairy & Chilled',
    unitOfMeasure: 'pcs',
    barcode: '376012948012',
    supplierId: 'sup_dairy_artisan',
    supplierName: 'Alpes Artisan Laiterie',
    currentStock: 9,
    reservedStock: 2,
    incomingStock: 0,
    reorderPoint: 25,
    safetyStock: 8,
    packSize: 6,
    minOrderQuantity: 18,
    leadTimeDays: 2,
    unitCost: 3.40,
    sellingPrice: 7.90,
    shelfLifeDays: 21,
    expiryDate: '2026-11-28',
    isArchived: false,
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-02-05T10:00:00Z',
  },
];

/**
 * Generate synthetic realistic daily sales records for the last 45 days
 */
export function generateSeedSales(): SalesRecord[] {
  const sales: SalesRecord[] = [];
  const now = new Date('2026-11-14T12:00:00Z');

  INITIAL_PRODUCTS.forEach(product => {
    // Determine baseline daily volume and intermittent pattern
    let baseDaily = 2.5;
    let intermittentProb = 0.8; // 80% chance of sales on any day

    if (product.id === 'prod_anc_headphones') {
      baseDaily = 3.2; // fast mover
      intermittentProb = 0.95;
    } else if (product.id === 'prod_monitor_speakers') {
      baseDaily = 0.8; // slower, higher value
      intermittentProb = 0.45; // intermittent!
    } else if (product.id === 'prod_xlr_cable') {
      baseDaily = 8.5; // bulk accessory
      intermittentProb = 0.98;
    } else if (product.id === 'prod_goat_cheese') {
      baseDaily = 4.0;
      intermittentProb = 0.90;
    }

    for (let dayOffset = 45; dayOffset >= 1; dayOffset--) {
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - dayOffset);
      const dateStr = saleDate.toISOString().split('T')[0];

      // Day of week effect: weekends have higher retail volume
      const dayOfWeek = saleDate.getDay();
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.4 : 1.0;

      // Random noise & intermittent zero days
      const rand = Math.random();
      if (rand <= intermittentProb) {
        const variance = (Math.random() * 0.8 + 0.6); // 0.6 to 1.4
        const qty = Math.max(1, Math.round(baseDaily * weekendMultiplier * variance));
        
        sales.push({
          id: `sale-${product.id}-${dateStr}`,
          businessId: product.businessId,
          productId: product.id,
          productSku: product.sku,
          date: dateStr,
          quantitySold: qty,
          unitPrice: product.sellingPrice,
          channel: dayOffset % 3 === 0 ? 'Online Store' : 'Retail Front Desk',
          location: 'Main Storefront',
        });
      }
    }
  });

  return sales;
}

export const INITIAL_MOVEMENTS: InventoryMovement[] = [
  {
    id: 'mov_101',
    businessId: 'biz_electronics',
    productId: 'prod_anc_headphones',
    productSku: 'APX-HD-700',
    productName: 'Apex Studio Wireless ANC Headphones',
    type: 'purchase_received',
    quantityChange: 20,
    previousStock: 4,
    newStock: 24,
    reason: 'Initial PO Delivery receipt from AcousticDynamics',
    referenceId: 'PO-2026-001',
    performedBy: 'sarah.inventory@apex.demo',
    timestamp: '2026-10-25T14:22:00Z',
  },
  {
    id: 'mov_102',
    businessId: 'biz_electronics',
    productId: 'prod_anc_headphones',
    productSku: 'APX-HD-700',
    productName: 'Apex Studio Wireless ANC Headphones',
    type: 'sale',
    quantityChange: -10,
    previousStock: 24,
    newStock: 14,
    reason: 'Storefront and E-commerce batches dispatched',
    referenceId: 'BATCH-ORD-449',
    performedBy: 'automated_pos@apex.demo',
    timestamp: '2026-11-12T18:30:00Z',
  },
  {
    id: 'mov_103',
    businessId: 'biz_electronics',
    productId: 'prod_monitor_speakers',
    productSku: 'APX-SPK-5X',
    productName: 'Reference Bi-Amplified Studio Monitors (Pair)',
    type: 'manual_correction',
    quantityChange: -1,
    previousStock: 7,
    newStock: 6,
    reason: 'Floor demonstration unit damaged in showroom, transferred to scrap',
    referenceId: 'AUDIT-SCRAP-09',
    performedBy: 'marcus.mgr@apex.demo',
    timestamp: '2026-11-13T10:15:00Z',
  },
];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po_9001',
    businessId: 'biz_electronics',
    poNumber: 'PO-2026-004',
    supplierId: 'sup_microphones',
    supplierName: 'VocalPeak Broadcast Instruments',
    status: 'sent',
    items: [
      {
        id: 'poi_1',
        productId: 'prod_usb_mic',
        productSku: 'APX-MIC-PRO',
        productName: 'Broadcast USB Condenser Microphone',
        unitOfMeasure: 'pcs',
        packSize: 10,
        packsOrdered: 3,
        totalQuantity: 30,
        unitCost: 65.00,
        totalCost: 1950.00,
        quantityReceived: 0,
      }
    ],
    totalAmount: 1950.00,
    currency: 'USD',
    orderDate: '2026-11-08',
    expectedDeliveryDate: '2026-11-22',
    notes: 'In-transit via FedEx Freight tracking #773829104.',
    createdAt: '2026-11-08T09:00:00Z',
    updatedAt: '2026-11-08T09:00:00Z',
  }
];

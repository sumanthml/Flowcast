export type UserRole = 'owner' | 'staff' | 'viewer';

export interface Business {
  id: string;
  name: string;
  currency: string; // e.g. USD, EUR, GBP, INR, JPY
  currencySymbol: string;
  timezone: string; // e.g. America/New_York, UTC, Asia/Kolkata
  defaultUnit: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  leadTimeDays: number; // default lead time in days
  minimumOrderValue?: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  businessId: string;
  sku: string;
  name: string;
  category: string;
  unitOfMeasure: string; // pcs, kg, boxes, liters, etc.
  barcode?: string;
  supplierId: string;
  supplierName?: string;
  
  // Stock levels
  currentStock: number;
  reservedStock: number; // Allocated to customer orders not yet dispatched
  incomingStock: number; // On open Purchase Orders
  
  // Replenishment configuration
  reorderPoint: number; // Threshold triggering order recommendation
  safetyStock: number; // Buffer against demand spikes or supplier delays
  packSize: number; // Items per carton / case
  minOrderQuantity: number; // MOQ set by supplier
  leadTimeDays: number; // Specific supplier lead time for this SKU
  unitCost: number; // Purchase price
  sellingPrice: number; // Retail price
  
  // Perishability / Shelf Life
  shelfLifeDays?: number; // Days before expiry
  expiryDate?: string; // Specific batch expiry if applicable
  
  // Status
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 
  | 'sale' 
  | 'purchase_received' 
  | 'manual_correction' 
  | 'waste_expired' 
  | 'customer_return' 
  | 'transfer_in' 
  | 'transfer_out';

export interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  productSku?: string;
  productName?: string;
  type: MovementType;
  quantityChange: number; // positive for additions, negative for reductions
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId?: string; // e.g., PO-1002, SALE-8492
  performedBy: string; // user email or name for audit trail
  timestamp: string;
}

export interface SalesRecord {
  id: string;
  businessId: string;
  productId: string;
  productSku: string;
  date: string; // YYYY-MM-DD
  quantitySold: number;
  unitPrice: number;
  location?: string;
  channel?: string; // In-store, Online, Wholesale
}

export type ForecastMethod = 
  | 'sma' // Simple Moving Average
  | 'wma' // Weighted Moving Average
  | 'ses' // Single Exponential Smoothing
  | 'holt' // Holt-Winters (Double Exponential Smoothing with Trend)
  | 'croston' // Croston's Intermittent Demand method
  | 'cautious_fallback'; // Static min-max fallback when data is scarce

export interface ForecastPoint {
  date: string; // YYYY-MM-DD
  expectedDemand: number;
  lowerConfidence80: number;
  upperConfidence80: number;
  lowerConfidence95: number;
  upperConfidence95: number;
}

export interface ForecastMetrics {
  mae: number; // Mean Absolute Error
  mape: number; // Mean Absolute Percentage Error (%)
  rmse: number; // Root Mean Square Error
  trackingSignal: number; // Cumulative forecast error / MAD (bias indicator)
  sampleSize: number;
}

export interface ForecastResult {
  productId: string;
  method: ForecastMethod;
  methodLabel: string;
  horizonDays: number;
  dataStartDate: string;
  dataEndDate: string;
  historicalDaysCount: number;
  totalHistoricalVolume: number;
  averageDailyDemand: number;
  dailyDemandStdDev: number;
  forecastPoints: ForecastPoint[];
  backtestMetrics?: ForecastMetrics;
  limitations: string[];
  isEstimate: true; // explicit honesty label
}

export type ReorderUrgency = 'critical' | 'urgent' | 'upcoming' | 'healthy' | 'excess';

export interface ReorderRecommendation {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  
  // State classification
  urgency: ReorderUrgency;
  dfaStateId: string; // e.g. Q3_CRITICAL, Q2_REORDER
  
  // Mathematical Inputs
  currentStock: number;
  reservedStock: number;
  netUsableStock: number; // current - reserved + incoming
  incomingStock: number;
  
  leadTimeDays: number;
  leadTimeDemand: number; // average daily demand * lead time
  safetyStockRecommended: number;
  reorderPointCalculated: number; // leadTimeDemand + safetyStock
  
  // Days of Inventory Remaining (DOIR)
  daysOfStockRemaining: number;
  stockoutDateEstimate?: string;
  
  // Suggested Order
  rawDeficit: number;
  suggestedQuantity: number; // rounded to pack size & MOQ
  packSize: number;
  minOrderQuantity: number;
  estimatedCost: number;
  orderDeadlineDate: string; // Date by which order must be placed to avoid stockout
  
  // Plain language audit & explanations
  explanationTitle: string;
  plainLanguageExplanation: string;
  calculationBreakdown: {
    label: string;
    value: string;
    description: string;
  }[];
  assumptions: string[];
  dataReliability: 'high' | 'moderate' | 'cautious_insufficient_data';
  
  // User Actions
  status: 'pending' | 'accepted' | 'edited' | 'dismissed' | 'snoozed';
  userModifiedQuantity?: number;
  snoozedUntil?: string;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partially_received' | 'received' | 'cancelled';

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  unitOfMeasure: string;
  packSize: number;
  packsOrdered: number;
  totalQuantity: number;
  unitCost: number;
  totalCost: number;
  quantityReceived: number;
}

export interface PurchaseOrder {
  id: string;
  businessId: string;
  poNumber: string; // e.g. PO-2026-001
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  currency: string;
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Theory of Computation Types
export type AutomatonStateId = 
  | 'Q0_OPTIMAL'
  | 'Q1_WATCHLIST'
  | 'Q2_REORDER'
  | 'Q3_CRITICAL'
  | 'Q4_EXCESS'
  | 'Q5_INCOMING_BUFFER';

export type AutomatonEvent = 
  | 'DEMAND_CONSUMED'
  | 'BELOW_ROP'
  | 'BELOW_SAFETY_STOCK'
  | 'STOCKOUT_IMMINENT'
  | 'PO_PLACED'
  | 'PO_RECEIVED'
  | 'EXCESS_ACCUMULATED'
  | 'MANUAL_OVERRIDE';

export interface AutomatonState {
  id: AutomatonStateId;
  label: string;
  badgeColor: string;
  description: string;
  actionGuidance: string;
  isAcceptingOrAlert: boolean;
}

export interface DFAEvaluationResult {
  currentState: AutomatonStateId;
  stateDetails: AutomatonState;
  inputMetrics: {
    usableStock: number;
    reorderPoint: number;
    safetyStock: number;
    daysRemaining: number;
    hasIncomingOrder: boolean;
    excessThreshold: number;
  };
  transitionHistory: {
    fromState: AutomatonStateId;
    event: AutomatonEvent;
    toState: AutomatonStateId;
    reason: string;
    timestamp: string;
  }[];
  explanation: string;
  formalProof: string;
}

export interface TuringMachineStep {
  stepIndex: number;
  currentState: string;
  headPosition: number;
  tapeSnapshot: string[];
  actionDescription: string;
}

export interface TuringSimulationResult {
  initialTape: string[];
  finalTape: string[];
  tapeAlphabet: string[];
  totalSteps: number;
  isAccepted: boolean; // e.g., Reorder Required = Accept, Healthy = Reject
  formalLanguageDefinition: string;
  steps: TuringMachineStep[];
}

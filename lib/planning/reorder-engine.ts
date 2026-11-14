import { Product, Supplier, ReorderRecommendation, ReorderUrgency, SalesRecord } from '@/types';
import { generateDemandForecast, buildDailyTimeSeries } from '@/lib/forecasting/engine';
import { evaluateInventoryDFA } from '@/lib/toc/dfa';

export function calculateReorderRecommendation(
  product: Product,
  supplier: Supplier | undefined,
  sales: SalesRecord[]
): ReorderRecommendation {
  const leadTimeDays = product.leadTimeDays || (supplier ? supplier.leadTimeDays : 7);
  const packSize = Math.max(1, product.packSize || 1);
  const minOrderQuantity = Math.max(1, product.minOrderQuantity || 1);

  // Filter sales for this product
  const productSales = sales.filter(s => s.productId === product.id);
  const forecast = generateDemandForecast(product.id, productSales, 'auto', 30);
  
  const avgDailyDemand = forecast.averageDailyDemand;
  const dailyDemandStdDev = forecast.dailyDemandStdDev;

  // 1. Lead Time Demand (LTD) = Lead Time * Average Daily Demand
  const leadTimeDemand = Math.round(leadTimeDays * avgDailyDemand);

  // 2. Safety Stock (SS)
  // Standard inventory science: SS = Z * sqrt(LeadTime) * StdDev(Demand)
  // For 95% service level, Z ≈ 1.65. If user set an explicit safetyStock on the product, honor that as base or floor.
  const statisticalSafetyStock = Math.round(1.65 * Math.sqrt(leadTimeDays) * dailyDemandStdDev);
  const effectiveSafetyStock = product.safetyStock > 0 ? product.safetyStock : Math.max(packSize, statisticalSafetyStock);

  // 3. Reorder Point (ROP) = Lead Time Demand + Safety Stock
  const calculatedROP = leadTimeDemand + effectiveSafetyStock;
  const effectiveROP = product.reorderPoint > 0 ? product.reorderPoint : calculatedROP;

  // 4. Usable Net Stock = Current Stock - Reserved Stock + Incoming Stock
  const onShelfUsable = Math.max(0, product.currentStock - product.reservedStock);
  const netUsableStock = onShelfUsable + product.incomingStock;

  // 5. Days of Inventory Remaining (DOIR)
  const burnRate = avgDailyDemand > 0 ? avgDailyDemand : 0.001;
  const daysOfStockRemaining = Number((onShelfUsable / burnRate).toFixed(1));

  // Estimate stockout date
  const now = new Date();
  const stockoutDate = new Date(now);
  stockoutDate.setDate(stockoutDate.getDate() + Math.floor(daysOfStockRemaining));
  const stockoutDateStr = avgDailyDemand > 0 ? stockoutDate.toISOString().split('T')[0] : 'N/A (No sales burn)';

  // Order deadline: When should PO be placed so supplier delivery arrives before stock hits safety buffer?
  // Days until order needed = max(0, daysOfStockRemaining - leadTimeDays)
  const daysUntilOrderDeadline = Math.max(0, Math.floor(daysOfStockRemaining - leadTimeDays));
  const deadlineDate = new Date(now);
  deadlineDate.setDate(deadlineDate.getDate() + daysUntilOrderDeadline);
  const deadlineDateStr = deadlineDate.toISOString().split('T')[0];

  // Evaluate DFA State Machine
  const dfaResult = evaluateInventoryDFA({
    currentStock: product.currentStock,
    reservedStock: product.reservedStock,
    incomingStock: product.incomingStock,
    reorderPoint: effectiveROP,
    safetyStock: effectiveSafetyStock,
    leadTimeDays,
    averageDailyDemand: avgDailyDemand,
  });

  // Calculate Deficit & Suggested Order Quantity
  // Target Maximum Inventory Corridor: ROP + 14 days forward demand
  const targetInventory = effectiveROP + Math.round(14 * avgDailyDemand);
  let rawDeficit = 0;
  let suggestedQty = 0;
  let urgency: ReorderUrgency = 'healthy';

  if (dfaResult.currentState === 'Q3_CRITICAL') {
    urgency = 'critical';
    rawDeficit = Math.max(0, targetInventory - netUsableStock);
  } else if (dfaResult.currentState === 'Q2_REORDER') {
    urgency = 'urgent';
    rawDeficit = Math.max(0, targetInventory - netUsableStock);
  } else if (dfaResult.currentState === 'Q1_WATCHLIST') {
    urgency = 'upcoming';
    rawDeficit = 0;
  } else if (dfaResult.currentState === 'Q4_EXCESS') {
    urgency = 'excess';
    rawDeficit = 0;
  } else {
    urgency = 'healthy';
    rawDeficit = 0;
  }

  // Rounding to Pack Size & MOQ
  if (rawDeficit > 0) {
    let roundedToPack = Math.ceil(rawDeficit / packSize) * packSize;
    suggestedQty = Math.max(minOrderQuantity, roundedToPack);
  }

  // Shelf-life constraint warnings
  const shelfLifeWarnings: string[] = [];
  if (product.shelfLifeDays && product.shelfLifeDays > 0) {
    const daysToSellSuggested = (suggestedQty + onShelfUsable) / burnRate;
    if (daysToSellSuggested > product.shelfLifeDays) {
      shelfLifeWarnings.push(`Shelf life warning: Total stock would take ${Math.round(daysToSellSuggested)} days to deplete, exceeding shelf life of ${product.shelfLifeDays} days.`);
    }
  }
  if (product.expiryDate) {
    const expDate = new Date(product.expiryDate);
    const daysUntilExp = (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    if (daysUntilExp < 30) {
      shelfLifeWarnings.push(`Expiring batch: Batch on hand expires in ${Math.round(daysUntilExp)} days (${product.expiryDate}). Prioritize inventory rotation.`);
    }
  }

  // Plain-Language Explanation & Assumptions
  let explanationTitle = '';
  let plainLanguageExplanation = '';
  const assumptions: string[] = [];

  if (urgency === 'critical') {
    explanationTitle = `Critical Stockout Risk (${daysOfStockRemaining} days of stock remaining)`;
    plainLanguageExplanation = `On-hand stock (${onShelfUsable} units) is below the safety reserve (${effectiveSafetyStock} units). Because supplier lead time is ${leadTimeDays} days, stock will deplete in ${daysOfStockRemaining} days unless an order of at least ${suggestedQty} units is placed immediately.`;
  } else if (urgency === 'urgent') {
    explanationTitle = `Reorder Point Triggered (ROP: ${effectiveROP} units)`;
    plainLanguageExplanation = `Usable stock (${netUsableStock} units) has crossed the Reorder Threshold (${effectiveROP} units). Placing a requisition for ${suggestedQty} units will replenish inventory to target levels before supplier delivery lead-time elapses.`;
  } else if (urgency === 'upcoming') {
    explanationTitle = `Approaching Reorder Threshold`;
    plainLanguageExplanation = `Current inventory is within 25% of the reorder point. At current daily burn rate of ${avgDailyDemand} units/day, an order will be required around ${deadlineDateStr}.`;
  } else if (urgency === 'excess') {
    explanationTitle = `Excess Inventory Detected`;
    plainLanguageExplanation = `Current stock (${onShelfUsable} units) covers ${daysOfStockRemaining} days of forward sales. Replenishment is suspended to prevent locking up working capital.`;
  } else {
    explanationTitle = `Optimal Stock Level`;
    plainLanguageExplanation = `Inventory levels comfortably cover lead-time requirements and safety buffers. No order is currently needed.`;
  }

  assumptions.push(`Supplier lead time: ${leadTimeDays} days (based on ${supplier ? supplier.name : 'product default'}).`);
  assumptions.push(`Average daily sales burn: ${avgDailyDemand} ${product.unitOfMeasure}/day (evaluated via ${forecast.methodLabel}).`);
  assumptions.push(`Safety stock buffer: ${effectiveSafetyStock} units (absorbs standard demand variability).`);
  assumptions.push(`Pack size constraint: ${packSize} units/carton; MOQ: ${minOrderQuantity} units.`);
  if (product.incomingStock > 0) {
    assumptions.push(`Incoming open purchase orders: ${product.incomingStock} units credited against deficit.`);
  }
  if (product.reservedStock > 0) {
    assumptions.push(`Reserved stock allocated to open sales orders: ${product.reservedStock} units withheld from usable count.`);
  }
  shelfLifeWarnings.forEach(w => assumptions.push(w));

  const reliability = forecast.historicalDaysCount < 7 
    ? 'cautious_insufficient_data' 
    : forecast.historicalDaysCount < 21 ? 'moderate' : 'high';

  return {
    id: `rec-${product.id}`,
    productId: product.id,
    productSku: product.sku,
    productName: product.name,
    supplierId: product.supplierId,
    supplierName: product.supplierName || (supplier ? supplier.name : 'Unassigned Supplier'),
    urgency,
    dfaStateId: dfaResult.currentState,
    currentStock: product.currentStock,
    reservedStock: product.reservedStock,
    netUsableStock,
    incomingStock: product.incomingStock,
    leadTimeDays,
    leadTimeDemand,
    safetyStockRecommended: effectiveSafetyStock,
    reorderPointCalculated: effectiveROP,
    daysOfStockRemaining,
    stockoutDateEstimate: stockoutDateStr,
    rawDeficit,
    suggestedQuantity: suggestedQty,
    packSize,
    minOrderQuantity,
    estimatedCost: Number((suggestedQty * product.unitCost).toFixed(2)),
    orderDeadlineDate: deadlineDateStr,
    explanationTitle,
    plainLanguageExplanation,
    calculationBreakdown: [
      {
        label: 'Average Daily Demand',
        value: `${avgDailyDemand} ${product.unitOfMeasure}/day`,
        description: `Calculated from ${forecast.historicalDaysCount} days of historical sales.`,
      },
      {
        label: 'Lead Time Demand (LTD)',
        value: `${leadTimeDemand} ${product.unitOfMeasure}`,
        description: `${leadTimeDays} days lead time × ${avgDailyDemand} daily burn.`,
      },
      {
        label: 'Safety Stock Cushion',
        value: `${effectiveSafetyStock} ${product.unitOfMeasure}`,
        description: 'Buffer protecting against demand surges or supplier shipping delays.',
      },
      {
        label: 'Calculated Reorder Point',
        value: `${effectiveROP} ${product.unitOfMeasure}`,
        description: 'LTD + Safety Stock. Trigger threshold for replenishment.',
      },
      {
        label: 'Net Usable Position',
        value: `${netUsableStock} ${product.unitOfMeasure}`,
        description: `On-hand (${product.currentStock}) - Reserved (${product.reservedStock}) + Incoming POs (${product.incomingStock}).`,
      },
      {
        label: 'Pack / MOQ Alignment',
        value: `${suggestedQty} ${product.unitOfMeasure} (${suggestedQty / packSize} packs)`,
        description: `Rounded up from raw deficit (${rawDeficit}) to nearest carton size (${packSize}) and MOQ (${minOrderQuantity}).`,
      },
    ],
    assumptions,
    dataReliability: reliability,
    status: 'pending',
  };
}

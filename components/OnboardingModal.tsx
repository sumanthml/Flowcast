'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { Building2, X, Check, ArrowRight, ArrowLeft, Globe2, Truck, Package } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { createBusiness, createSupplier, createProduct } = useInventory();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Business Details
  const [bizName, setBizName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [timezone, setTimezone] = useState('UTC');
  const [defaultUnit, setDefaultUnit] = useState('pcs');

  // Step 2: Primary Supplier
  const [supplierName, setSupplierName] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [supplierEmail, setSupplierEmail] = useState('');

  // Step 3: First Product & Opening Stock
  const [productSku, setProductSku] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('General');
  const [openingStock, setOpeningStock] = useState(25);
  const [reorderPoint, setReorderPoint] = useState(30);
  const [safetyStock, setSafetyStock] = useState(10);
  const [packSize, setPackSize] = useState(5);
  const [unitCost, setUnitCost] = useState(20);
  const [sellingPrice, setSellingPrice] = useState(45);

  if (!isOpen) return null;

  const handleCurrencyChange = (curr: string) => {
    setCurrency(curr);
    if (curr === 'USD') setCurrencySymbol('$');
    else if (curr === 'EUR') setCurrencySymbol('€');
    else if (curr === 'GBP') setCurrencySymbol('£');
    else if (curr === 'INR') setCurrencySymbol('₹');
    else if (curr === 'JPY') setCurrencySymbol('¥');
    else if (curr === 'CAD' || curr === 'AUD') setCurrencySymbol('$');
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) return;

    // 1. Create Business
    const newBiz = createBusiness({
      name: bizName.trim(),
      currency,
      currencySymbol,
      timezone,
      defaultUnit,
    });

    // 2. Create Initial Supplier if provided
    let supId = '';
    if (supplierName.trim()) {
      const createdSup = createSupplier({
        name: supplierName.trim(),
        leadTimeDays: Number(leadTimeDays),
        contactEmail: supplierEmail.trim() || undefined,
        currency,
      });
      supId = createdSup.id;
    }

    // 3. Create Initial Product if provided
    if (productSku.trim() && productName.trim()) {
      createProduct({
        sku: productSku.trim(),
        name: productName.trim(),
        category,
        unitOfMeasure: defaultUnit,
        supplierId: supId,
        supplierName: supplierName.trim() || 'Primary Supplier',
        currentStock: Number(openingStock),
        reservedStock: 0,
        reorderPoint: Number(reorderPoint),
        safetyStock: Number(safetyStock),
        packSize: Number(packSize),
        minOrderQuantity: Number(packSize) * 2,
        leadTimeDays: Number(leadTimeDays),
        unitCost: Number(unitCost),
        sellingPrice: Number(sellingPrice),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-xs max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">
              Guided Business Setup
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Steps */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-5">
          {[
            { num: 1, label: 'Store Location & Currency', icon: Globe2 },
            { num: 2, label: 'Primary Supplier', icon: Truck },
            { num: 3, label: 'Opening Stock', icon: Package },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.num} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                  step === s.num
                    ? 'bg-indigo-600 text-white'
                    : step > s.num
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </span>
                <span className={`hidden sm:inline ${step === s.num ? 'text-white font-semibold' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleFinish}>
          
          {/* Step 1: Business Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 block mb-1">Business / Storefront Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kyoto Craft Goods Co."
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Operating Currency *</label>
                  <select
                    value={currency}
                    onChange={e => handleCurrencyChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Primary Unit of Measure *</label>
                  <select
                    value={defaultUnit}
                    onChange={e => setDefaultUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="units">Units</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="boxes">Boxes / Cartons</option>
                    <option value="liters">Liters</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Business Timezone *</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                </select>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  disabled={!bizName.trim()}
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>Next: Supplier</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Primary Supplier */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 block mb-1">Primary Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pacific Artisan Supply Ltd"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Standard Lead Time (Days) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={leadTimeDays}
                    onChange={e => setLeadTimeDays(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Contact Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="orders@supplier.com"
                    value={supplierEmail}
                    onChange={e => setSupplierEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!supplierName.trim()}
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>Next: Opening SKU</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Opening Product */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Product SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-101"
                    value={productSku}
                    onChange={e => setProductSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Handcrafted Ceramic Mug"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Opening Stock ({defaultUnit})</label>
                  <input
                    type="number"
                    min="0"
                    value={openingStock}
                    onChange={e => setOpeningStock(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderPoint}
                    onChange={e => setReorderPoint(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Pack Size</label>
                  <input
                    type="number"
                    min="1"
                    value={packSize}
                    onChange={e => setPackSize(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Unit Cost ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={e => setUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Selling Price ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={e => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Launch Business Platform</span>
                </button>
              </div>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}

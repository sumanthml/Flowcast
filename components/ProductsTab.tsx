'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { Product } from '@/types';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Archive, 
  Edit2, 
  ArrowUpDown, 
  Building2, 
  Clock, 
  Layers, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface ProductsTabProps {
  onOpenMovementModal: (product: Product) => void;
}

export function ProductsTab({ onOpenMovementModal }: ProductsTabProps) {
  const { 
    products, 
    suppliers, 
    currentBusiness, 
    createProduct, 
    updateProduct, 
    archiveProduct,
    userRole 
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New Product Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [unitOfMeasure, setUnitOfMeasure] = useState(currentBusiness.defaultUnit);
  const [barcode, setBarcode] = useState('');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [currentStock, setCurrentStock] = useState<number>(20);
  const [reservedStock, setReservedStock] = useState<number>(0);
  const [reorderPoint, setReorderPoint] = useState<number>(30);
  const [safetyStock, setSafetyStock] = useState<number>(10);
  const [packSize, setPackSize] = useState<number>(5);
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(10);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [unitCost, setUnitCost] = useState<number>(50);
  const [sellingPrice, setSellingPrice] = useState<number>(120);
  const [shelfLifeDays, setShelfLifeDays] = useState<number | undefined>(undefined);
  const [expiryDate, setExpiryDate] = useState<string>('');

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.barcode && p.barcode.includes(searchQuery));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) return;

    const matchedSupplier = suppliers.find(s => s.id === supplierId);

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        sku,
        name,
        category,
        unitOfMeasure,
        barcode: barcode || undefined,
        supplierId,
        supplierName: matchedSupplier?.name,
        reorderPoint,
        safetyStock,
        packSize,
        minOrderQuantity,
        leadTimeDays,
        unitCost,
        sellingPrice,
        shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : undefined,
        expiryDate: expiryDate || undefined,
      });
      setEditingProduct(null);
    } else {
      createProduct({
        sku,
        name,
        category,
        unitOfMeasure,
        barcode: barcode || undefined,
        supplierId,
        supplierName: matchedSupplier?.name,
        currentStock,
        reservedStock,
        reorderPoint,
        safetyStock,
        packSize,
        minOrderQuantity,
        leadTimeDays,
        unitCost,
        sellingPrice,
        shelfLifeDays: shelfLifeDays ? Number(shelfLifeDays) : undefined,
        expiryDate: expiryDate || undefined,
      });
    }

    setIsAddModalOpen(false);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setUnitOfMeasure(p.unitOfMeasure);
    setBarcode(p.barcode || '');
    setSupplierId(p.supplierId);
    setCurrentStock(p.currentStock);
    setReservedStock(p.reservedStock);
    setReorderPoint(p.reorderPoint);
    setSafetyStock(p.safetyStock);
    setPackSize(p.packSize);
    setMinOrderQuantity(p.minOrderQuantity);
    setLeadTimeDays(p.leadTimeDays);
    setUnitCost(p.unitCost);
    setSellingPrice(p.sellingPrice);
    setShelfLifeDays(p.shelfLifeDays);
    setExpiryDate(p.expiryDate || '');
    setIsAddModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setSku(`SKU-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategory(categories[0] || 'General');
    setUnitOfMeasure(currentBusiness.defaultUnit);
    setBarcode('');
    setSupplierId(suppliers[0]?.id || '');
    setCurrentStock(20);
    setReservedStock(0);
    setReorderPoint(25);
    setSafetyStock(10);
    setPackSize(5);
    setMinOrderQuantity(10);
    setLeadTimeDays(7);
    setUnitCost(20);
    setSellingPrice(50);
    setShelfLifeDays(undefined);
    setExpiryDate('');
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <span>Product Catalog & Stock Records</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Maintain master SKU records, packaging constraints, MOQ, and supplier lead times.
          </p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search SKU, name, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">SKU / Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">On-Hand Stock</th>
                <th className="py-3 px-4">Allocated / Reserved</th>
                <th className="py-3 px-4">Reorder Point / SS</th>
                <th className="py-3 px-4">Pack Size / MOQ</th>
                <th className="py-3 px-4">Lead Time</th>
                <th className="py-3 px-4">Unit Cost / Price</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map(p => {
                const usable = Math.max(0, p.currentStock - p.reservedStock);
                const isBelowROP = usable <= p.reorderPoint;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{p.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{p.sku}</span>
                        {p.barcode && <span className="text-slate-500">#{p.barcode}</span>}
                        {p.expiryDate && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1 rounded">
                            Exp: {p.expiryDate}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1">
                        <span className={`font-black text-sm ${isBelowROP ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {p.currentStock}
                        </span>
                        <span className="text-[10px] text-slate-400">{p.unitOfMeasure}</span>
                      </div>
                      {p.incomingStock > 0 && (
                        <div className="text-[10px] text-cyan-400">+{p.incomingStock} on PO</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.reservedStock > 0 ? (
                        <span className="text-amber-400 font-semibold">{p.reservedStock} {p.unitOfMeasure}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>ROP: <span className="font-semibold text-white">{p.reorderPoint}</span></div>
                      <div className="text-[10px] text-slate-400">Safety: {p.safetyStock}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>Pack: {p.packSize}</div>
                      <div className="text-[10px] text-slate-400">MOQ: {p.minOrderQuantity}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {p.leadTimeDays} days
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {currentBusiness.currencySymbol}{p.sellingPrice}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Cost: {currentBusiness.currencySymbol}{p.unitCost}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenMovementModal(p)}
                          title="Record traceable stock adjustment"
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 font-medium transition-colors"
                        >
                          Adjust Stock
                        </button>
                        {userRole !== 'viewer' && (
                          <>
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => archiveProduct(p.id)}
                              title="Archive product"
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white mb-4">
              {editingProduct ? 'Edit Product SKU' : 'Add New Product to Catalog'}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={unitOfMeasure}
                    onChange={e => setUnitOfMeasure(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Barcode (Optional)</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Primary Supplier</label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.leadTimeDays}d lead time)</option>
                  ))}
                </select>
              </div>

              {/* Replenishment constraints */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <span className="text-[11px] font-semibold uppercase text-indigo-400 block">
                  Replenishment & Inventory Parameters
                </span>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Current Stock</label>
                    <input
                      type="number"
                      value={currentStock}
                      onChange={e => setCurrentStock(Number(e.target.value))}
                      disabled={Boolean(editingProduct)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Reorder Point</label>
                    <input
                      type="number"
                      value={reorderPoint}
                      onChange={e => setReorderPoint(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Safety Stock</label>
                    <input
                      type="number"
                      value={safetyStock}
                      onChange={e => setSafetyStock(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Lead Time (Days)</label>
                    <input
                      type="number"
                      value={leadTimeDays}
                      onChange={e => setLeadTimeDays(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Pack Size</label>
                    <input
                      type="number"
                      value={packSize}
                      onChange={e => setPackSize(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">MOQ</label>
                    <input
                      type="number"
                      value={minOrderQuantity}
                      onChange={e => setMinOrderQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Unit Cost ({currentBusiness.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitCost}
                      onChange={e => setUnitCost(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Selling Price ({currentBusiness.currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sellingPrice}
                      onChange={e => setSellingPrice(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Perishability / Shelf Life */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Shelf Life (Days, Optional)</label>
                  <input
                    type="number"
                    value={shelfLifeDays || ''}
                    placeholder="e.g. 30"
                    onChange={e => setShelfLifeDays(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Batch Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

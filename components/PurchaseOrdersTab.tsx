'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { PurchaseOrder, PurchaseOrderStatus } from '@/types';
import { 
  ShoppingCart, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Truck, 
  FileText, 
  PackageCheck, 
  Send, 
  X,
  ExternalLink
} from 'lucide-react';

export function PurchaseOrdersTab() {
  const { 
    purchaseOrders, 
    currentBusiness, 
    updatePOStatus, 
    receivePurchaseOrder,
    products,
    suppliers,
    createPurchaseOrder,
    userRole
  } = useInventory();

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Manual PO Form State
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poExpectedDate, setPoExpectedDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [orderQuantity, setOrderQuantity] = useState(20);

  const filteredPOs = purchaseOrders.filter(po => {
    if (filterStatus === 'all') return true;
    return po.status === filterStatus;
  });

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[10px] uppercase">Draft</span>;
      case 'sent':
        return <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold text-[10px] uppercase flex items-center gap-1"><Truck className="w-3 h-3" /> Sent / In-Transit</span>;
      case 'partially_received':
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-[10px] uppercase">Partially Received</span>;
      case 'received':
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-[10px] uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Received & Stocked</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-[10px] uppercase">Cancelled</span>;
    }
  };

  const handleCreateManualPO = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === poSupplierId);
    const prod = products.find(p => p.id === selectedProductId);
    if (!sup || !prod) return;

    const now = new Date();
    const expDate = poExpectedDate || new Date(now.getTime() + (sup.leadTimeDays * 86400000)).toISOString().split('T')[0];

    const packs = Math.ceil(orderQuantity / prod.packSize);
    const totalCost = Number((orderQuantity * prod.unitCost).toFixed(2));

    createPurchaseOrder({
      poNumber: `PO-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: sup.id,
      supplierName: sup.name,
      status: 'draft',
      totalAmount: totalCost,
      currency: currentBusiness.currency,
      orderDate: now.toISOString().split('T')[0],
      expectedDeliveryDate: expDate,
      notes: poNotes || 'Standard stock replenishment.',
      items: [
        {
          id: `poi_${Date.now()}`,
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          unitOfMeasure: prod.unitOfMeasure,
          packSize: prod.packSize,
          packsOrdered: packs,
          totalQuantity: orderQuantity,
          unitCost: prod.unitCost,
          totalCost,
          quantityReceived: 0,
        }
      ]
    });

    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            <span>Purchase Order Replenishment Hub</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track procurement lifecycle from draft requisition through receiving dock verification.
          </p>
        </div>

        {userRole !== 'viewer' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Draft PO</span>
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'All Orders', count: purchaseOrders.length },
          { id: 'draft', label: 'Drafts', count: purchaseOrders.filter(p => p.status === 'draft').length },
          { id: 'sent', label: 'Sent / In-Transit', count: purchaseOrders.filter(p => p.status === 'sent').length },
          { id: 'received', label: 'Received & Stocked', count: purchaseOrders.filter(p => p.status === 'received').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStatus === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Purchase Orders List */}
      <div className="space-y-3">
        {filteredPOs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
            No purchase orders in this status. Generate orders from Reorder Planning or click "Create Draft PO".
          </div>
        ) : (
          filteredPOs.map(po => (
            <div
              key={po.id}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-white">{po.poNumber}</span>
                  {getStatusBadge(po.status)}
                  <span className="text-xs text-slate-400">
                    Ordered: <strong className="text-slate-200">{po.orderDate}</strong>
                  </span>
                </div>

                <div className="text-xs text-slate-300 mt-2">
                  Supplier: <strong className="text-white">{po.supplierName}</strong> • Delivery Due: <strong className="text-cyan-400">{po.expectedDeliveryDate}</strong>
                </div>

                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  {po.items.map(item => (
                    <span key={item.id} className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      {item.productSku} × {item.totalQuantity} {item.unitOfMeasure} ({currentBusiness.currencySymbol}{item.totalCost})
                    </span>
                  ))}
                </div>
              </div>

              {/* Total & Action Buttons */}
              <div className="flex items-center gap-4 self-end md:self-center">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Investment</span>
                  <span className="text-base font-black text-white font-mono">
                    {currentBusiness.currencySymbol}{po.totalAmount.toLocaleString()}
                  </span>
                </div>

                {userRole !== 'viewer' && (
                  <div className="flex items-center gap-2">
                    {po.status === 'draft' && (
                      <button
                        onClick={() => updatePOStatus(po.id, 'sent')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Mark Sent</span>
                      </button>
                    )}

                    {po.status === 'sent' && (
                      <button
                        onClick={() => receivePurchaseOrder(po.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors animate-pulse"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Receive & Stock In</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedPO(po)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      title="View printable purchase requisition summary"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Printable PO Preview Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="font-mono text-base font-bold text-white">Purchase Order: {selectedPO.poNumber}</span>
              <button onClick={() => setSelectedPO(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Buyer Business:</span>
                <span className="font-semibold text-white">{currentBusiness.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier Vendor:</span>
                <span className="font-semibold text-white">{selectedPO.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Issue Date:</span>
                <span className="text-white">{selectedPO.orderDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected Delivery:</span>
                <span className="text-cyan-400 font-semibold">{selectedPO.expectedDeliveryDate}</span>
              </div>
              {selectedPO.notes && (
                <div className="pt-2 border-t border-slate-800/80 text-slate-400">
                  Notes: <span className="text-slate-300">{selectedPO.notes}</span>
                </div>
              )}
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 font-medium">
                  <tr>
                    <th className="p-2.5">Item / SKU</th>
                    <th className="p-2.5">Quantity</th>
                    <th className="p-2.5">Unit Cost</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedPO.items.map(item => (
                    <tr key={item.id} className="text-slate-200">
                      <td className="p-2.5">
                        <div className="font-medium">{item.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{item.productSku}</div>
                      </td>
                      <td className="p-2.5 font-mono">{item.totalQuantity} {item.unitOfMeasure}</td>
                      <td className="p-2.5 font-mono">{currentBusiness.currencySymbol}{item.unitCost}</td>
                      <td className="p-2.5 font-mono font-bold text-right">{currentBusiness.currencySymbol}{item.totalCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-800">
              <span className="text-slate-400">Total Purchase Amount:</span>
              <span className="text-emerald-400 font-mono text-base">
                {currentBusiness.currencySymbol}{selectedPO.totalAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => setSelectedPO(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Manual Draft PO Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-xs">
            <h2 className="text-sm font-bold text-white mb-4">Create Draft Purchase Order</h2>
            <form onSubmit={handleCreateManualPO} className="space-y-4">
              <div>
                <label className="text-slate-400 block mb-1">Select Supplier *</label>
                <select
                  value={poSupplierId}
                  onChange={e => setPoSupplierId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.leadTimeDays}d lead time)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Select Product *</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Order Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQuantity}
                    onChange={e => setOrderQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={poExpectedDate}
                    onChange={e => setPoExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PO Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Standard sea freight shipment"
                  value={poNotes}
                  onChange={e => setPoNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Create PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

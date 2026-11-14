'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Business, 
  Supplier, 
  Product, 
  InventoryMovement, 
  SalesRecord, 
  PurchaseOrder, 
  UserRole,
  ReorderRecommendation
} from '@/types';
import { 
  INITIAL_BUSINESSES, 
  INITIAL_SUPPLIERS, 
  INITIAL_PRODUCTS, 
  INITIAL_MOVEMENTS, 
  INITIAL_PURCHASE_ORDERS, 
  generateSeedSales 
} from '@/lib/store/mock-db';
import { calculateReorderRecommendation } from '@/lib/planning/reorder-engine';

interface InventoryContextType {
  businesses: Business[];
  currentBusiness: Business;
  setCurrentBusinessId: (id: string) => void;
  createBusiness: (biz: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => Business;
  
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  
  suppliers: Supplier[];
  createSupplier: (supplier: Omit<Supplier, 'id' | 'businessId' | 'createdAt'>) => Supplier;
  
  products: Product[];
  createProduct: (product: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt' | 'isArchived' | 'incomingStock'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  archiveProduct: (id: string) => void;
  
  movements: InventoryMovement[];
  recordMovement: (
    productId: string, 
    type: InventoryMovement['type'], 
    quantityChange: number, 
    reason: string, 
    referenceId?: string
  ) => void;
  
  sales: SalesRecord[];
  recordSale: (sale: Omit<SalesRecord, 'id' | 'businessId'>) => void;
  importSalesCSV: (records: Omit<SalesRecord, 'id' | 'businessId'>[]) => { imported: number; errors: string[] };
  
  purchaseOrders: PurchaseOrder[];
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => PurchaseOrder;
  updatePOStatus: (poId: string, status: PurchaseOrder['status']) => void;
  receivePurchaseOrder: (poId: string) => void;
  
  recommendations: ReorderRecommendation[];
  updateRecommendationStatus: (recId: string, status: ReorderRecommendation['status'], modifiedQty?: number) => void;
  
  resetToSampleData: () => void;
  clearAllBusinessData: () => void;
  isSampleData: boolean;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

const STORAGE_KEY_PREFIX = 'flowcast_toc_data_v2_';

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>(INITIAL_BUSINESSES);
  const [currentBusinessId, setCurrentBusinessId] = useState<string>('biz_electronics');
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [movements, setMovements] = useState<InventoryMovement[]>(INITIAL_MOVEMENTS);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [isSampleData, setIsSampleData] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Initialize from LocalStorage or populate rich seed
  useEffect(() => {
    try {
      const storedBiz = localStorage.getItem(`${STORAGE_KEY_PREFIX}businesses`);
      const storedSuppliers = localStorage.getItem(`${STORAGE_KEY_PREFIX}suppliers`);
      const storedProducts = localStorage.getItem(`${STORAGE_KEY_PREFIX}products`);
      const storedMovements = localStorage.getItem(`${STORAGE_KEY_PREFIX}movements`);
      const storedSales = localStorage.getItem(`${STORAGE_KEY_PREFIX}sales`);
      const storedPOs = localStorage.getItem(`${STORAGE_KEY_PREFIX}pos`);
      const storedIsSample = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_sample`);

      if (storedBiz && storedProducts) {
        setBusinesses(JSON.parse(storedBiz));
        if (storedSuppliers) setSuppliers(JSON.parse(storedSuppliers));
        setProducts(JSON.parse(storedProducts));
        if (storedMovements) setMovements(JSON.parse(storedMovements));
        if (storedSales) setSales(JSON.parse(storedSales));
        if (storedPOs) setPurchaseOrders(JSON.parse(storedPOs));
        setIsSampleData(storedIsSample === 'true');
      } else {
        // First load: generate rich sales seed
        const initialSales = generateSeedSales();
        setSales(initialSales);
        setIsSampleData(true);
      }
    } catch (e) {
      console.warn('Storage read error, using memory fallback:', e);
      setSales(generateSeedSales());
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Sync to LocalStorage on change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}businesses`, JSON.stringify(businesses));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}suppliers`, JSON.stringify(suppliers));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}products`, JSON.stringify(products));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}movements`, JSON.stringify(movements));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}sales`, JSON.stringify(sales));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}pos`, JSON.stringify(purchaseOrders));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}is_sample`, String(isSampleData));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }, [businesses, suppliers, products, movements, sales, purchaseOrders, isSampleData, isInitialized]);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0] || INITIAL_BUSINESSES[0];

  // Business-scoped entities
  const scopedProducts = products.filter(p => p.businessId === currentBusiness.id && !p.isArchived);
  const scopedSuppliers = suppliers.filter(s => s.businessId === currentBusiness.id);
  const scopedSales = sales.filter(s => s.businessId === currentBusiness.id);
  const scopedMovements = movements.filter(m => m.businessId === currentBusiness.id);
  const scopedPOs = purchaseOrders.filter(po => po.businessId === currentBusiness.id);

  // Dynamic recommendations calculation
  const [recStatuses, setRecStatuses] = useState<Record<string, { status: ReorderRecommendation['status']; modifiedQty?: number }>>({});

  const recommendations: ReorderRecommendation[] = scopedProducts.map(prod => {
    const sup = scopedSuppliers.find(s => s.id === prod.supplierId);
    const rec = calculateReorderRecommendation(prod, sup, scopedSales);
    const override = recStatuses[rec.id];
    if (override) {
      rec.status = override.status;
      if (override.modifiedQty !== undefined) {
        rec.userModifiedQuantity = override.modifiedQty;
      }
    }
    return rec;
  });

  const updateRecommendationStatus = (recId: string, status: ReorderRecommendation['status'], modifiedQty?: number) => {
    setRecStatuses(prev => ({
      ...prev,
      [recId]: { status, modifiedQty }
    }));
  };

  const createBusiness = (bizData: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBiz: Business = {
      ...bizData,
      id: `biz_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setBusinesses(prev => [...prev, newBiz]);
    setCurrentBusinessId(newBiz.id);
    setIsSampleData(false);
    return newBiz;
  };

  const createSupplier = (supData: Omit<Supplier, 'id' | 'businessId' | 'createdAt'>) => {
    const newSup: Supplier = {
      ...supData,
      id: `sup_${Date.now()}`,
      businessId: currentBusiness.id,
      createdAt: new Date().toISOString(),
    };
    setSuppliers(prev => [...prev, newSup]);
    return newSup;
  };

  const createProduct = (pData: Omit<Product, 'id' | 'businessId' | 'createdAt' | 'updatedAt' | 'isArchived' | 'incomingStock'>) => {
    const newProd: Product = {
      ...pData,
      id: `prod_${Date.now()}`,
      businessId: currentBusiness.id,
      incomingStock: 0,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts(prev => [...prev, newProd]);

    // Record initial stock creation movement
    if (newProd.currentStock > 0) {
      recordMovement(
        newProd.id,
        'manual_correction',
        newProd.currentStock,
        'Initial stock opening balance',
        undefined
      );
    }
    return newProd;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      return {
        ...p,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const archiveProduct = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isArchived: true } : p));
  };

  const recordMovement = (
    productId: string,
    type: InventoryMovement['type'],
    quantityChange: number,
    reason: string,
    referenceId?: string
  ) => {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;

    const previousStock = targetProduct.currentStock;
    const newStock = Math.max(0, previousStock + quantityChange);

    const movement: InventoryMovement = {
      id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      businessId: currentBusiness.id,
      productId: targetProduct.id,
      productSku: targetProduct.sku,
      productName: targetProduct.name,
      type,
      quantityChange,
      previousStock,
      newStock,
      reason,
      referenceId,
      performedBy: userRole === 'owner' ? 'Owner Admin' : 'Floor Staff',
      timestamp: new Date().toISOString(),
    };

    setMovements(prev => [movement, ...prev]);

    // Update product stock level in state
    updateProduct(productId, { currentStock: newStock });
  };

  const recordSale = (saleData: Omit<SalesRecord, 'id' | 'businessId'>) => {
    const newSale: SalesRecord = {
      ...saleData,
      id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      businessId: currentBusiness.id,
    };
    setSales(prev => [...prev, newSale]);

    // Automatically record corresponding traceable inventory reduction
    recordMovement(
      saleData.productId,
      'sale',
      -saleData.quantitySold,
      `Sale recorded via ${saleData.channel || 'Manual Entry'}`,
      newSale.id
    );
  };

  const importSalesCSV = (records: Omit<SalesRecord, 'id' | 'businessId'>[]) => {
    const errors: string[] = [];
    let count = 0;

    const newSalesList: SalesRecord[] = [];
    records.forEach((r, idx) => {
      // Find matching product by SKU
      const matched = scopedProducts.find(p => p.sku.toLowerCase() === r.productSku.toLowerCase() || p.id === r.productId);
      if (!matched) {
        errors.push(`Row #${idx + 1}: SKU '${r.productSku}' does not exist in product catalog.`);
        return;
      }
      if (r.quantitySold <= 0) {
        errors.push(`Row #${idx + 1}: Quantity (${r.quantitySold}) must be positive.`);
        return;
      }

      newSalesList.push({
        id: `sale_import_${Date.now()}_${idx}`,
        businessId: currentBusiness.id,
        productId: matched.id,
        productSku: matched.sku,
        date: r.date,
        quantitySold: r.quantitySold,
        unitPrice: r.unitPrice || matched.sellingPrice,
        channel: r.channel || 'CSV Import',
        location: r.location || 'Warehouse',
      });
      count++;
    });

    if (newSalesList.length > 0) {
      setSales(prev => [...prev, ...newSalesList]);
      setIsSampleData(false);
    }

    return { imported: count, errors };
  };

  const createPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>) => {
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po_${Date.now()}`,
      businessId: currentBusiness.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPurchaseOrders(prev => [newPO, ...prev]);

    // Credit incoming stock for products on this PO
    poData.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        updateProduct(item.productId, { incomingStock: prod.incomingStock + item.totalQuantity });
      }
    });

    return newPO;
  };

  const updatePOStatus = (poId: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders(prev => prev.map(po => {
      if (po.id !== poId) return po;
      return {
        ...po,
        status,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const receivePurchaseOrder = (poId: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    // For each item, increase currentStock and decrease incomingStock
    po.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        const newIncoming = Math.max(0, prod.incomingStock - item.totalQuantity);
        updateProduct(item.productId, { incomingStock: newIncoming });
        
        // Record traceable movement
        recordMovement(
          item.productId,
          'purchase_received',
          item.totalQuantity,
          `PO Receipt: ${po.poNumber} from ${po.supplierName}`,
          po.poNumber
        );
      }
    });

    updatePOStatus(poId, 'received');
  };

  const resetToSampleData = () => {
    setBusinesses(INITIAL_BUSINESSES);
    setCurrentBusinessId('biz_electronics');
    setSuppliers(INITIAL_SUPPLIERS);
    setProducts(INITIAL_PRODUCTS);
    setMovements(INITIAL_MOVEMENTS);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setSales(generateSeedSales());
    setIsSampleData(true);
    setRecStatuses({});
  };

  const clearAllBusinessData = () => {
    setProducts(prev => prev.filter(p => p.businessId !== currentBusiness.id));
    setSuppliers(prev => prev.filter(s => s.businessId !== currentBusiness.id));
    setSales(prev => prev.filter(s => s.businessId !== currentBusiness.id));
    setMovements(prev => prev.filter(m => m.businessId !== currentBusiness.id));
    setPurchaseOrders(prev => prev.filter(po => po.businessId !== currentBusiness.id));
    setIsSampleData(false);
  };

  return (
    <InventoryContext.Provider
      value={{
        businesses,
        currentBusiness,
        setCurrentBusinessId,
        createBusiness,
        userRole,
        setUserRole,
        suppliers: scopedSuppliers,
        createSupplier,
        products: scopedProducts,
        createProduct,
        updateProduct,
        archiveProduct,
        movements: scopedMovements,
        recordMovement,
        sales: scopedSales,
        recordSale,
        importSalesCSV,
        purchaseOrders: scopedPOs,
        createPurchaseOrder,
        updatePOStatus,
        receivePurchaseOrder,
        recommendations,
        updateRecommendationStatus,
        resetToSampleData,
        clearAllBusinessData,
        isSampleData,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}

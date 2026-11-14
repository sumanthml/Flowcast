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
import { useAuth } from '@/lib/firebase/auth-context';

interface InventoryContextType {
  businesses: Business[];
  currentBusiness: Business;
  setCurrentBusinessId: (id: string) => void;
  createBusiness: (biz: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => Business;
  hasCustomBusiness: boolean;
  
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
  
  loadSampleDemoData: () => void;
  clearAllBusinessData: () => void;
  isSampleData: boolean;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

const DEFAULT_WORKSPACE: Business = {
  id: 'biz_default',
  name: 'My Storefront',
  currency: 'USD',
  currencySymbol: '$',
  timezone: 'UTC',
  defaultUnit: 'units',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  // Storage key scoped to authenticated user UID (or guest)
  const storagePrefix = user ? `flowcast_v3_${user.uid}_` : 'flowcast_v3_guest_';

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('owner');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sales, setSales] = useState<SalesRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isSampleData, setIsSampleData] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load purely dynamic user data on mount or auth change
  useEffect(() => {
    try {
      const storedBiz = localStorage.getItem(`${storagePrefix}businesses`);
      const storedSuppliers = localStorage.getItem(`${storagePrefix}suppliers`);
      const storedProducts = localStorage.getItem(`${storagePrefix}products`);
      const storedMovements = localStorage.getItem(`${storagePrefix}movements`);
      const storedSales = localStorage.getItem(`${storagePrefix}sales`);
      const storedPOs = localStorage.getItem(`${storagePrefix}pos`);
      const storedIsSample = localStorage.getItem(`${storagePrefix}is_sample`);

      if (storedBiz) {
        const parsedBiz = JSON.parse(storedBiz);
        setBusinesses(parsedBiz);
        if (parsedBiz.length > 0) {
          setCurrentBusinessId(parsedBiz[0].id);
        }
      } else {
        // Start clean with NO businesses or auto-create a clean single store
        const userInitialBiz: Business = {
          id: `biz_${user?.uid ? user.uid.substring(0, 8) : 'store_1'}`,
          name: user?.displayName ? `${user.displayName}'s Store` : 'My Retail Store',
          currency: 'USD',
          currencySymbol: '$',
          timezone: 'America/New_York',
          defaultUnit: 'pcs',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setBusinesses([userInitialBiz]);
        setCurrentBusinessId(userInitialBiz.id);
      }

      // Products, suppliers, movements, sales, POs strictly start empty unless previously saved by user!
      if (storedSuppliers) setSuppliers(JSON.parse(storedSuppliers));
      else setSuppliers([]);

      if (storedProducts) setProducts(JSON.parse(storedProducts));
      else setProducts([]);

      if (storedMovements) setMovements(JSON.parse(storedMovements));
      else setMovements([]);

      if (storedSales) setSales(JSON.parse(storedSales));
      else setSales([]);

      if (storedPOs) setPurchaseOrders(JSON.parse(storedPOs));
      else setPurchaseOrders([]);

      setIsSampleData(storedIsSample === 'true');
    } catch (e) {
      console.warn('Storage read error, using clean empty store:', e);
      setBusinesses([DEFAULT_WORKSPACE]);
      setCurrentBusinessId(DEFAULT_WORKSPACE.id);
      setProducts([]);
      setSuppliers([]);
      setSales([]);
      setMovements([]);
      setPurchaseOrders([]);
    } finally {
      setIsInitialized(true);
    }
  }, [user, storagePrefix]);

  // Persist strictly to user's LocalStorage on change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(`${storagePrefix}businesses`, JSON.stringify(businesses));
      localStorage.setItem(`${storagePrefix}suppliers`, JSON.stringify(suppliers));
      localStorage.setItem(`${storagePrefix}products`, JSON.stringify(products));
      localStorage.setItem(`${storagePrefix}movements`, JSON.stringify(movements));
      localStorage.setItem(`${storagePrefix}sales`, JSON.stringify(sales));
      localStorage.setItem(`${storagePrefix}pos`, JSON.stringify(purchaseOrders));
      localStorage.setItem(`${storagePrefix}is_sample`, String(isSampleData));
    } catch (e) {
      console.warn('Storage write error:', e);
    }
  }, [businesses, suppliers, products, movements, sales, purchaseOrders, isSampleData, isInitialized, storagePrefix]);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0] || DEFAULT_WORKSPACE;

  // Business-scoped entities
  const scopedProducts = products.filter(p => p.businessId === currentBusiness.id && !p.isArchived);
  const scopedSuppliers = suppliers.filter(s => s.businessId === currentBusiness.id);
  const scopedSales = sales.filter(s => s.businessId === currentBusiness.id);
  const scopedMovements = movements.filter(m => m.businessId === currentBusiness.id);
  const scopedPOs = purchaseOrders.filter(po => po.businessId === currentBusiness.id);

  // Dynamic recommendations calculation - purely reactive to user's real products & sales
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

    // Record initial stock opening movement if stock > 0
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
      performedBy: userRole === 'owner' ? (user?.displayName || 'Owner Admin') : 'Store Staff',
      timestamp: new Date().toISOString(),
    };

    setMovements(prev => [movement, ...prev]);
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
      const matched = scopedProducts.find(
        p => p.sku.toLowerCase() === r.productSku.toLowerCase() || p.id === r.productId
      );
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

  // Explicit action ONLY if user deliberately requests to test with a demo dataset
  const loadSampleDemoData = () => {
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
        hasCustomBusiness: businesses.length > 0 && businesses[0].id !== 'biz_default',
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
        loadSampleDemoData,
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

-- FlowCast TOC: Explainable Inventory Planning Platform Schema
-- Multi-tenant Row-Level Security (RLS) PostgreSQL Migration

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    currency_symbol VARCHAR(5) NOT NULL DEFAULT '$',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    default_unit TEXT NOT NULL DEFAULT 'pcs',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Business Membership & Role-Based Access Control (RBAC)
CREATE TYPE public.user_role AS ENUM ('owner', 'staff', 'viewer');

CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id)
    role public.user_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (business_id, user_id)
);

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    lead_time_days INT NOT NULL DEFAULT 7,
    minimum_order_value NUMERIC(12, 2) DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
    barcode TEXT,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    
    -- Stock inventory numbers
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reserved_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    incoming_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    
    -- Replenishment parameters
    reorder_point NUMERIC(12, 2) NOT NULL DEFAULT 0,
    safety_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    pack_size INT NOT NULL DEFAULT 1,
    min_order_quantity INT NOT NULL DEFAULT 1,
    lead_time_days INT NOT NULL DEFAULT 7,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    
    -- Perishability & Expiry
    shelf_life_days INT,
    expiry_date DATE,
    
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    UNIQUE (business_id, sku)
);

-- 5. Inventory Movements (Immutable Audit Trail)
CREATE TYPE public.movement_type AS ENUM (
    'sale', 
    'purchase_received', 
    'manual_correction', 
    'waste_expired', 
    'customer_return', 
    'transfer_in', 
    'transfer_out'
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type public.movement_type NOT NULL,
    quantity_change NUMERIC(12, 2) NOT NULL,
    previous_stock NUMERIC(12, 2) NOT NULL,
    new_stock NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    reference_id TEXT,
    performed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Sales Records (Time Series History)
CREATE TABLE IF NOT EXISTS public.sales_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    quantity_sold NUMERIC(12, 2) NOT NULL CHECK (quantity_sold > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    channel TEXT DEFAULT 'Direct Store',
    location TEXT DEFAULT 'Primary Warehouse',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Purchase Orders
CREATE TYPE public.po_status AS ENUM ('draft', 'sent', 'partially_received', 'received', 'cancelled');

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    status public.po_status NOT NULL DEFAULT 'draft',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (business_id, po_number)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    pack_size INT NOT NULL DEFAULT 1,
    packs_ordered INT NOT NULL DEFAULT 1,
    total_quantity NUMERIC(12, 2) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    quantity_received NUMERIC(12, 2) NOT NULL DEFAULT 0
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_movements_prod_time ON public.inventory_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_prod_date ON public.sales_records(product_id, date);
CREATE INDEX IF NOT EXISTS idx_pos_business_status ON public.purchase_orders(business_id, status);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check business tenant membership
CREATE OR REPLACE FUNCTION public.check_user_business_access(b_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.business_id = b_id
      AND bm.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
CREATE POLICY "Users can view businesses they belong to"
    ON public.businesses FOR SELECT
    USING (public.check_user_business_access(id));

CREATE POLICY "Members can view members in their business"
    ON public.business_members FOR SELECT
    USING (public.check_user_business_access(business_id));

CREATE POLICY "Business data isolation: Suppliers"
    ON public.suppliers FOR ALL
    USING (public.check_user_business_access(business_id));

CREATE POLICY "Business data isolation: Products"
    ON public.products FOR ALL
    USING (public.check_user_business_access(business_id));

CREATE POLICY "Business data isolation: Movements"
    ON public.inventory_movements FOR ALL
    USING (public.check_user_business_access(business_id));

CREATE POLICY "Business data isolation: Sales"
    ON public.sales_records FOR ALL
    USING (public.check_user_business_access(business_id));

CREATE POLICY "Business data isolation: Purchase Orders"
    ON public.purchase_orders FOR ALL
    USING (public.check_user_business_access(business_id));

CREATE POLICY "Business data isolation: PO Items"
    ON public.purchase_order_items FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.purchase_orders po
        WHERE po.id = purchase_order_id
          AND public.check_user_business_access(po.business_id)
      )
    );

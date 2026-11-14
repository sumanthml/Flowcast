-- Seed Data for FlowCast TOC (Multi-Business)
-- Clearly labeled as sample demonstration data for retail planning

INSERT INTO public.businesses (id, name, currency, currency_symbol, timezone, default_unit)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Apex Audio & Gear (Sample Retailer)', 'USD', '$', 'America/New_York', 'pcs'),
  ('22222222-2222-2222-2222-222222222222', 'Verde Organics Market (Sample Retailer)', 'EUR', '€', 'Europe/Paris', 'kg')
ON CONFLICT (id) DO NOTHING;

-- Suppliers
INSERT INTO public.suppliers (id, business_id, name, contact_email, lead_time_days, minimum_order_value, currency)
VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'AcousticDynamics Labs Ltd', 'orders@acousticdynamics.com', 10, 1500, 'USD'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'SignalCraft Cable Interconnects', 'support@signalcraft.net', 5, 500, 'USD'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Provence Bio Farms Co-op', 'contact@provence-bio.fr', 2, 300, 'EUR')
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO public.products (
  id, business_id, sku, name, category, unit_of_measure, supplier_id,
  current_stock, reserved_stock, incoming_stock, reorder_point, safety_stock,
  pack_size, min_order_quantity, lead_time_days, unit_cost, selling_price
)
VALUES
  (
    '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'APX-HD-700',
    'Apex Studio Wireless ANC Headphones', 'Headphones', 'pcs', '33333333-3333-3333-3333-333333333331',
    14, 4, 0, 35, 15, 5, 20, 10, 110.00, 249.99
  ),
  (
    '44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'APX-CBL-10FT',
    'Braided Gold-Plated XLR Cable (10ft)', 'Cables & Accessories', 'pcs', '33333333-3333-3333-3333-333333333332',
    220, 0, 0, 60, 20, 20, 40, 5, 6.50, 24.99
  )
ON CONFLICT (id) DO NOTHING;

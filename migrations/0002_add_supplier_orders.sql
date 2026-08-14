PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS supplier_orders (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  order_date TEXT NOT NULL,
  expected_date TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ordered','partial','received','cancelled')),
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS supplier_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES supplier_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost INTEGER NOT NULL,
  total INTEGER NOT NULL
);

// Auto-generated from migrations/0001_initial.sql + 0002_add_supplier_orders.sql + 0003_sessions.sql.
// Used only for protected first-run initialization. Keep migrations as the source of truth for upgrades.
export const SCHEMA_VERSION = 3;
export const REQUIRED_TABLES = ['users','clients','cash_accounts','audit_logs','supplier_orders','sessions'];
export const INITIAL_SCHEMA_SQL = String.raw`
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  matricule TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  function_title TEXT,
  hire_date TEXT,
  salary INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','suspended')),
  photo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('super_admin','admin','director','manager','cashier','office_agent','mobile_money_agent','sales_agent','stock_manager','accountant','employee','readonly')),
  active INTEGER NOT NULL DEFAULT 1,
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  civility TEXT,
  first_name TEXT,
  last_name TEXT NOT NULL,
  sex TEXT,
  birth_date TEXT,
  profession TEXT,
  company TEXT,
  phone TEXT,
  phone2 TEXT,
  whatsapp TEXT,
  email TEXT,
  city TEXT,
  commune TEXT,
  district TEXT,
  address TEXT,
  nationality TEXT,
  id_type TEXT,
  id_number TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_clients_reference ON clients(reference);

CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  category_id TEXT REFERENCES service_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'unité',
  price INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','urgent','very_urgent')),
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','waiting','in_progress','review','completed','ready','delivered','cancelled')),
  due_at TEXT,
  assigned_employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);

CREATE TABLE IF NOT EXISTS cash_accounts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash' CHECK(type IN ('cash','wave','orange_money','mtn_money','moov_money','bank','other')),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL REFERENCES cash_accounts(id),
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense','transfer_in','transfer_out','correction','credit_repayment','sale','mobile_money')),
  category TEXT,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount >= 0),
  payment_method TEXT,
  related_type TEXT,
  related_id TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  cancelled INTEGER NOT NULL DEFAULT 0,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cash_tx_account ON cash_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_tx_created ON cash_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_tx_client ON cash_transactions(client_id);

CREATE TABLE IF NOT EXISTS cash_closures (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES cash_accounts(id),
  closure_date TEXT NOT NULL,
  theoretical_balance INTEGER NOT NULL,
  actual_balance INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  justification TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, closure_date)
);

CREATE TABLE IF NOT EXISTS mobile_money_transactions (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  operator TEXT NOT NULL CHECK(operator IN ('wave','orange_money','mtn_money','moov_money','other')),
  operation_type TEXT NOT NULL CHECK(operation_type IN ('deposit','withdrawal','transfer','payment','commission','float_in','float_out')),
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  customer_phone TEXT,
  amount INTEGER NOT NULL CHECK(amount >= 0),
  fees INTEGER NOT NULL DEFAULT 0,
  commission INTEGER NOT NULL DEFAULT 0,
  cash_account_id TEXT REFERENCES cash_accounts(id) ON DELETE SET NULL,
  note TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mm_created ON mobile_money_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_mm_operator ON mobile_money_transactions(operator);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  barcode TEXT,
  category_id TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  purchase_price INTEGER NOT NULL DEFAULT 0,
  sale_price INTEGER NOT NULL DEFAULT 0,
  stock_quantity REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unité',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out','sale','return','adjustment','transfer')),
  quantity REAL NOT NULL,
  unit_cost INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  related_type TEXT,
  related_id TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements(product_id);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT,
  cash_account_id TEXT REFERENCES cash_accounts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('draft','completed','cancelled')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price INTEGER NOT NULL,
  total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id),
  principal INTEGER NOT NULL CHECK(principal > 0),
  interest_rate REAL NOT NULL DEFAULT 0,
  fees INTEGER NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 1,
  total_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  due_date TEXT,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paid','late','cancelled')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_credits_client ON credits(client_id);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);

CREATE TABLE IF NOT EXISTS credit_payments (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  credit_id TEXT NOT NULL REFERENCES credits(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  amount INTEGER NOT NULL CHECK(amount > 0),
  cash_account_id TEXT REFERENCES cash_accounts(id) ON DELETE SET NULL,
  payment_method TEXT,
  note TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_credit_payments_credit ON credit_payments(credit_id);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount > 0),
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  receipt_reference TEXT,
  expense_date TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','final','archived')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  body_html TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(document_id, version)
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  total INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','refused','expired','converted')),
  valid_until TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  sale_id TEXT REFERENCES sales(id) ON DELETE SET NULL,
  total INTEGER NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('draft','issued','paid','partial','cancelled')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  payment_method TEXT,
  related_type TEXT,
  related_id TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_data TEXT,
  new_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- Default cash accounts
INSERT OR IGNORE INTO cash_accounts(id, code, name, type, opening_balance) VALUES
('cash-main', 'CAISSE', 'Caisse principale', 'cash', 0),
('cash-wave', 'WAVE', 'Wave', 'wave', 0),
('cash-orange', 'OM', 'Orange Money', 'orange_money', 0),
('cash-mtn', 'MTN', 'MTN Money', 'mtn_money', 0),
('cash-moov', 'MOOV', 'Moov Money', 'moov_money', 0),
('cash-bank', 'BANQUE', 'Banque', 'bank', 0);

-- Default service categories
INSERT OR IGNORE INTO service_categories(id, name) VALUES
('cat-office', 'Bureautique'),
('cat-print', 'Impression'),
('cat-copy', 'Photocopie'),
('cat-scan', 'Scan'),
('cat-finish', 'Finition'),
('cat-photo', 'Photos'),
('cat-digital', 'Services numériques');

-- Starter service catalogue; prices remain editable by the administrator.
INSERT OR IGNORE INTO services(id, code, category_id, name, unit, price, cost) VALUES
('srv-typing', 'BUR-SAISIE', 'cat-office', 'Saisie simple', 'page', 0, 0),
('srv-cv', 'BUR-CV', 'cat-office', 'CV professionnel', 'document', 0, 0),
('srv-letter', 'BUR-COURRIER', 'cat-office', 'Courrier / Demande administrative', 'document', 0, 0),
('srv-print-bw', 'IMP-A4-NB', 'cat-print', 'Impression A4 noir et blanc', 'page', 0, 0),
('srv-print-color', 'IMP-A4-CLR', 'cat-print', 'Impression A4 couleur', 'page', 0, 0),
('srv-copy-bw', 'COP-A4-NB', 'cat-copy', 'Photocopie A4 noir et blanc', 'page', 0, 0),
('srv-scan', 'SCAN-A4', 'cat-scan', 'Scan de document', 'page', 0, 0),
('srv-laminate', 'FIN-PLAST', 'cat-finish', 'Plastification', 'document', 0, 0),
('srv-binding', 'FIN-REL', 'cat-finish', 'Reliure', 'document', 0, 0),
('srv-idphoto', 'PHO-ID', 'cat-photo', 'Photo identité', 'planche', 0, 0),
('srv-online', 'NUM-ONLINE', 'cat-digital', 'Service / inscription en ligne', 'service', 0, 0);

-- Company defaults
INSERT OR IGNORE INTO settings(key, value) VALUES
('company_name', 'MEGA SERVICES SARL U'),
('company_trade_name', 'MEGA SERVICES'),
('company_capital', '1000000'),
('company_currency', 'FCFA'),
('company_city', 'Diabo'),
('company_country', 'Côte d’Ivoire'),
('app_name', 'MEGA SERVICES WORK SYSTEM'),
('app_short_name', 'MSWS');

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

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES('schema_version','3',CURRENT_TIMESTAMP);
`

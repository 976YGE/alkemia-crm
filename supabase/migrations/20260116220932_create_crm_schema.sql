/*
  # CRM Multi-Pays - Schéma Complet
  
  ## Vue d'ensemble
  Ce schéma crée l'architecture complète du CRM multi-pays avec isolation des données
  par pays et système d'authentification par code unique pour les animateurs.
  
  ## 1. Tables de Référence
  
  ### countries
  - Stocke les informations de chaque pays supporté
  - Code ISO, nom, timezone, paramètres régionaux
  
  ### user_codes
  - Codes uniques fournis par l'ancien CRM pour l'activation des comptes
  - Lien permanent avec les utilisateurs après activation
  
  ### users (extension de auth.users)
  - Profil utilisateur étendu avec référence au code et pays
  
  ## 2. Tables Catalogue Produits
  
  ### product_categories
  - Gammes de produits (GLOW, etc.)
  - Configuration visuelle (couleurs)
  
  ### products
  - Catalogue produits (~52 produits)
  - Prix, gamme, pays
  
  ## 3. Tables Module Agenda
  
  ### appointments
  - Rendez-vous des animateurs
  - Importés depuis l'ancien CRM via SFTP
  
  ## 4. Tables Module Ventes
  
  ### sales_reports
  - Comptes rendus de ventes par rendez-vous
  - CA global et commentaire
  
  ### sales_report_lines
  - Détail des quantités vendues par produit
  
  ## 5. Tables Synchronisation SFTP
  
  ### sftp_configurations
  - Paramètres de connexion SFTP par pays
  
  ### import_export_logs
  - Historique des synchronisations
  
  ### import_errors
  - Détail des erreurs d'import
  
  ## 6. Tables Modules Futurs (Placeholder)
  
  ### customers
  - Clients et prospects (module futur)
  
  ### orders
  - Commandes (module futur)
  
  ### order_lines
  - Lignes de commandes (module futur)
  
  ## 7. Sécurité
  
  - RLS activé sur toutes les tables
  - Isolation stricte par pays
  - Politiques basées sur auth.uid() et country
*/

-- =============================================================================
-- 1. TABLES DE RÉFÉRENCE
-- =============================================================================

-- Table des pays supportés
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL CHECK (code IN ('FR', 'ES', 'IT', 'BE', 'CH')),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Paris',
  locale text NOT NULL DEFAULT 'fr-FR',
  currency text NOT NULL DEFAULT 'EUR',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table des codes utilisateurs (source: ancien CRM)
CREATE TABLE IF NOT EXISTS user_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  is_activated boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table des utilisateurs (extension de auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code_id uuid UNIQUE NOT NULL REFERENCES user_codes(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  preferred_language text NOT NULL DEFAULT 'fr',
  role text NOT NULL DEFAULT 'animator' CHECK (role IN ('animator', 'admin', 'super_admin')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. TABLES CATALOGUE PRODUITS
-- =============================================================================

-- Table des catégories/gammes de produits
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  display_order int NOT NULL DEFAULT 0,
  primary_color text NOT NULL DEFAULT '#3B82F6',
  secondary_color text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code, country_code)
);

-- Table des produits
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  price decimal(10,2) NOT NULL,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code, country_code)
);

-- =============================================================================
-- 3. TABLES MODULE AGENDA
-- =============================================================================

-- Table des rendez-vous
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  user_code_id uuid NOT NULL REFERENCES user_codes(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  store_name text NOT NULL,
  store_address text,
  store_city text,
  store_postal_code text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(external_id, country_code)
);

-- =============================================================================
-- 4. TABLES MODULE VENTES
-- =============================================================================

-- Table des comptes rendus de ventes
CREATE TABLE IF NOT EXISTS sales_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  total_amount decimal(10,2) NOT NULL,
  comment text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  exported boolean NOT NULL DEFAULT false,
  exported_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table des lignes de ventes (détail par produit)
CREATE TABLE IF NOT EXISTS sales_report_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_report_id uuid NOT NULL REFERENCES sales_reports(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL,
  line_amount decimal(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sales_report_id, product_id)
);

-- =============================================================================
-- 5. TABLES SYNCHRONISATION SFTP
-- =============================================================================

-- Table des configurations SFTP par pays
CREATE TABLE IF NOT EXISTS sftp_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text UNIQUE NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  host text NOT NULL,
  port int NOT NULL DEFAULT 22,
  username text NOT NULL,
  import_path text NOT NULL DEFAULT '/import',
  export_path text NOT NULL DEFAULT '/export',
  active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table des logs d'import/export
CREATE TABLE IF NOT EXISTS import_export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('import_users', 'import_products', 'import_appointments', 'export_sales')),
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  filename text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'success', 'error')),
  started_at timestamptz,
  completed_at timestamptz,
  rows_processed int DEFAULT 0,
  rows_success int DEFAULT 0,
  rows_error int DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Table des erreurs d'import détaillées
CREATE TABLE IF NOT EXISTS import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id uuid NOT NULL REFERENCES import_export_logs(id) ON DELETE CASCADE,
  row_number int,
  error_message text NOT NULL,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 6. TABLES MODULES FUTURS (PLACEHOLDER)
-- =============================================================================

-- Table des clients (module futur)
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  name text NOT NULL,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  type text CHECK (type IN ('prospect', 'client')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(external_id, country_code)
);

-- Table des commandes (module futur)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  country_code text NOT NULL REFERENCES countries(code) ON DELETE CASCADE,
  order_date date NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(external_id, country_code)
);

-- Table des lignes de commandes (module futur)
CREATE TABLE IF NOT EXISTS order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL,
  line_amount decimal(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 7. INDEX POUR PERFORMANCES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_codes_code ON user_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_codes_country ON user_codes(country_code);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_country ON products(country_code);
CREATE INDEX IF NOT EXISTS idx_appointments_user_code ON appointments(user_code_id);
CREATE INDEX IF NOT EXISTS idx_appointments_country ON appointments(country_code);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_sales_reports_appointment ON sales_reports(appointment_id);
CREATE INDEX IF NOT EXISTS idx_sales_reports_user ON sales_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_reports_exported ON sales_reports(exported);
CREATE INDEX IF NOT EXISTS idx_sales_report_lines_report ON sales_report_lines(sales_report_id);
CREATE INDEX IF NOT EXISTS idx_import_export_logs_country ON import_export_logs(country_code);
CREATE INDEX IF NOT EXISTS idx_import_export_logs_type ON import_export_logs(type);

-- =============================================================================
-- 8. TRIGGERS POUR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
    AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- =============================================================================
-- 9. ROW LEVEL SECURITY
-- =============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_report_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sftp_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;

-- Politiques pour countries (lecture publique)
CREATE POLICY "Countries are viewable by everyone"
  ON countries FOR SELECT
  TO authenticated
  USING (true);

-- Politiques pour user_codes
CREATE POLICY "User codes are viewable for activation"
  ON user_codes FOR SELECT
  TO anon, authenticated
  USING (NOT is_activated);

CREATE POLICY "User codes can be updated for activation"
  ON user_codes FOR UPDATE
  TO authenticated
  USING (NOT is_activated)
  WITH CHECK (is_activated = true);

-- Politiques pour users
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Politiques pour product_categories
CREATE POLICY "Product categories viewable by authenticated users in same country"
  ON product_categories FOR SELECT
  TO authenticated
  USING (
    country_code IN (
      SELECT country_code FROM users WHERE id = auth.uid()
    )
  );

-- Politiques pour products
CREATE POLICY "Products viewable by authenticated users in same country"
  ON products FOR SELECT
  TO authenticated
  USING (
    country_code IN (
      SELECT country_code FROM users WHERE id = auth.uid()
    )
  );

-- Politiques pour appointments
CREATE POLICY "Appointments viewable by owner"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    user_code_id IN (
      SELECT user_code_id FROM users WHERE id = auth.uid()
    )
  );

-- Politiques pour sales_reports
CREATE POLICY "Sales reports viewable by owner"
  ON sales_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Sales reports insertable by owner"
  ON sales_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sales reports updatable by owner if not exported"
  ON sales_reports FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND NOT exported)
  WITH CHECK (user_id = auth.uid());

-- Politiques pour sales_report_lines
CREATE POLICY "Sales report lines viewable by report owner"
  ON sales_report_lines FOR SELECT
  TO authenticated
  USING (
    sales_report_id IN (
      SELECT id FROM sales_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sales report lines insertable by report owner"
  ON sales_report_lines FOR INSERT
  TO authenticated
  WITH CHECK (
    sales_report_id IN (
      SELECT id FROM sales_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sales report lines updatable by report owner"
  ON sales_report_lines FOR UPDATE
  TO authenticated
  USING (
    sales_report_id IN (
      SELECT id FROM sales_reports WHERE user_id = auth.uid() AND NOT exported
    )
  )
  WITH CHECK (
    sales_report_id IN (
      SELECT id FROM sales_reports WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Sales report lines deletable by report owner"
  ON sales_report_lines FOR DELETE
  TO authenticated
  USING (
    sales_report_id IN (
      SELECT id FROM sales_reports WHERE user_id = auth.uid() AND NOT exported
    )
  );

-- Politiques pour sftp_configurations (admins seulement)
CREATE POLICY "SFTP configurations viewable by admins"
  ON sftp_configurations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Politiques pour import_export_logs (admins seulement)
CREATE POLICY "Import/Export logs viewable by admins"
  ON import_export_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Politiques pour import_errors (admins seulement)
CREATE POLICY "Import errors viewable by admins"
  ON import_errors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- =============================================================================
-- 10. DONNÉES INITIALES
-- =============================================================================

-- Insérer les pays supportés
INSERT INTO countries (code, name, timezone, locale, currency) VALUES
  ('FR', 'France', 'Europe/Paris', 'fr-FR', 'EUR'),
  ('ES', 'Espagne', 'Europe/Madrid', 'es-ES', 'EUR'),
  ('IT', 'Italie', 'Europe/Rome', 'it-IT', 'EUR'),
  ('BE', 'Belgique', 'Europe/Brussels', 'fr-BE', 'EUR'),
  ('CH', 'Suisse', 'Europe/Zurich', 'fr-CH', 'CHF')
ON CONFLICT (code) DO NOTHING;
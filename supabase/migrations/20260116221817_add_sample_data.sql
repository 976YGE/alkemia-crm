/*
  # Add Sample Data for Testing
  
  ## Purpose
  This migration adds sample data to help test the application functionality
  
  ## Data Added
  
  1. Sample User Codes
    - 3 test user codes for animators in France
    - Ready for activation
  
  2. Sample Product Categories
    - GLOW, VITAL, BEAUTY categories with colors
    - Configured for France
  
  3. Sample Products
    - ~15 sample products across categories
    - Realistic pricing for testing
  
  ## Note
  This is test data - can be safely removed in production
*/

-- Sample user codes for testing (France)
INSERT INTO user_codes (code, first_name, last_name, country_code, is_activated) VALUES
  ('ANIM001', 'Marie', 'Dupont', 'FR', false),
  ('ANIM002', 'Pierre', 'Martin', 'FR', false),
  ('ANIM003', 'Sophie', 'Bernard', 'FR', false)
ON CONFLICT (code) DO NOTHING;

-- Sample product categories for France
INSERT INTO product_categories (code, name, country_code, display_order, primary_color, secondary_color) VALUES
  ('GLOW', 'Gamme GLOW', 'FR', 1, '#F59E0B', '#FCD34D'),
  ('VITAL', 'Gamme VITAL', 'FR', 2, '#10B981', '#6EE7B7'),
  ('BEAUTY', 'Gamme BEAUTY', 'FR', 3, '#EC4899', '#F9A8D4'),
  ('CARE', 'Gamme CARE', 'FR', 4, '#3B82F6', '#93C5FD'),
  ('WELLNESS', 'Gamme WELLNESS', 'FR', 5, '#8B5CF6', '#C4B5FD')
ON CONFLICT (code, country_code) DO NOTHING;

-- Sample products for France
DO $$
DECLARE
  cat_glow_id uuid;
  cat_vital_id uuid;
  cat_beauty_id uuid;
  cat_care_id uuid;
  cat_wellness_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO cat_glow_id FROM product_categories WHERE code = 'GLOW' AND country_code = 'FR';
  SELECT id INTO cat_vital_id FROM product_categories WHERE code = 'VITAL' AND country_code = 'FR';
  SELECT id INTO cat_beauty_id FROM product_categories WHERE code = 'BEAUTY' AND country_code = 'FR';
  SELECT id INTO cat_care_id FROM product_categories WHERE code = 'CARE' AND country_code = 'FR';
  SELECT id INTO cat_wellness_id FROM product_categories WHERE code = 'WELLNESS' AND country_code = 'FR';

  -- Insert products
  INSERT INTO products (code, name, category_id, price, country_code) VALUES
    -- GLOW products
    ('GLOW001', 'GLOW Sérum Éclat', cat_glow_id, 29.90, 'FR'),
    ('GLOW002', 'GLOW Crème Jour', cat_glow_id, 35.50, 'FR'),
    ('GLOW003', 'GLOW Masque Lumière', cat_glow_id, 24.90, 'FR'),
    ('GLOW004', 'GLOW Huile Précieuse', cat_glow_id, 42.00, 'FR'),
    
    -- VITAL products
    ('VITAL001', 'VITAL Complément Énergie', cat_vital_id, 19.90, 'FR'),
    ('VITAL002', 'VITAL Vitamines C+', cat_vital_id, 15.90, 'FR'),
    ('VITAL003', 'VITAL Omega 3', cat_vital_id, 22.50, 'FR'),
    ('VITAL004', 'VITAL Immunité Plus', cat_vital_id, 25.90, 'FR'),
    
    -- BEAUTY products
    ('BEAUTY001', 'BEAUTY Rouge à Lèvres Mat', cat_beauty_id, 16.90, 'FR'),
    ('BEAUTY002', 'BEAUTY Fond de Teint', cat_beauty_id, 28.90, 'FR'),
    ('BEAUTY003', 'BEAUTY Mascara Volume', cat_beauty_id, 19.90, 'FR'),
    ('BEAUTY004', 'BEAUTY Palette Yeux', cat_beauty_id, 32.00, 'FR'),
    
    -- CARE products
    ('CARE001', 'CARE Crème Mains', cat_care_id, 12.90, 'FR'),
    ('CARE002', 'CARE Baume Lèvres', cat_care_id, 8.90, 'FR'),
    ('CARE003', 'CARE Lotion Corps', cat_care_id, 18.90, 'FR'),
    
    -- WELLNESS products
    ('WELL001', 'WELLNESS Tisane Détente', cat_wellness_id, 9.90, 'FR'),
    ('WELL002', 'WELLNESS Huiles Essentielles', cat_wellness_id, 24.90, 'FR'),
    ('WELL003', 'WELLNESS Bougie Parfumée', cat_wellness_id, 16.90, 'FR')
  ON CONFLICT (code, country_code) DO NOTHING;
END $$;

-- Sample appointments for testing (2 past, 2 future)
DO $$
DECLARE
  user_code_id_1 uuid;
  user_code_id_2 uuid;
BEGIN
  SELECT id INTO user_code_id_1 FROM user_codes WHERE code = 'ANIM001';
  SELECT id INTO user_code_id_2 FROM user_codes WHERE code = 'ANIM002';

  INSERT INTO appointments (
    external_id, user_code_id, country_code, 
    appointment_date, appointment_time, 
    store_name, store_address, store_city, store_postal_code
  ) VALUES
    -- Past appointments
    ('APT001', user_code_id_1, 'FR', CURRENT_DATE - INTERVAL '3 days', '10:00:00', 
     'Pharmacie Centrale', '12 Rue de la République', 'Paris', '75001'),
    ('APT002', user_code_id_1, 'FR', CURRENT_DATE - INTERVAL '1 day', '14:30:00', 
     'Pharmacie du Marché', '45 Avenue des Champs', 'Lyon', '69002'),
    
    -- Future appointments
    ('APT003', user_code_id_1, 'FR', CURRENT_DATE + INTERVAL '2 days', '09:00:00', 
     'Pharmacie Moderne', '78 Boulevard Haussmann', 'Paris', '75008'),
    ('APT004', user_code_id_2, 'FR', CURRENT_DATE + INTERVAL '5 days', '15:00:00', 
     'Pharmacie des Halles', '23 Place du Marché', 'Marseille', '13001')
  ON CONFLICT (external_id, country_code) DO NOTHING;
END $$;

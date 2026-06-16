/*
  # Ajout du champ EAN aux produits

  1. Modifications
    - Ajout de la colonne `ean` (code-barres EAN-13) à la table `products`
    - Le champ est optionnel pour ne pas casser les données existantes
    
  2. Notes
    - L'EAN permet d'identifier physiquement les produits lors de la prise de commande
    - Utile pour scanner les produits avec l'appareil photo sur mobile
*/

-- Ajouter la colonne EAN à la table products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'ean'
  ) THEN
    ALTER TABLE products ADD COLUMN ean text;
  END IF;
END $$;

-- Ajouter un index pour la recherche par EAN (utile pour le futur scanner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'products' AND indexname = 'idx_products_ean'
  ) THEN
    CREATE INDEX idx_products_ean ON products(ean) WHERE ean IS NOT NULL;
  END IF;
END $$;

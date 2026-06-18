ALTER TABLE countries ADD COLUMN proof_photo_required boolean NOT NULL DEFAULT true;

-- FR and BE: required (default), others: not required
UPDATE countries SET proof_photo_required = false WHERE code IN ('IT', 'ES', 'CH');

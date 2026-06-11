/*
  # Séparation statut CRM et activation Alkemia sur user_codes

  ## Contexte
  Jusqu'à présent, le champ `is_activated` de la table `user_codes` servait à deux fins
  différentes, ce qui crée une ambiguïté :
  - L'état actif/inactif de l'utilisateur tel que défini dans le CRM (champ 0/1 du fichier SFTP)
  - Le fait qu'il ait créé son compte sur Alkemia

  ## Changements

  ### Table : user_codes
  - Ajout de la colonne `is_active` (boolean, default false) :
    représente le statut actif/inactif importé depuis le CRM via SFTP (champ 0 ou 1)
  - La colonne existante `is_activated` reste et conserve son rôle :
    indique si l'utilisateur a créé son compte sur Alkemia (étape d'activation)

  ### Règle métier
  - Un utilisateur ne peut activer son compte et se connecter que si `is_active = true`
  - L'import SFTP met à jour `is_active` à chaque synchronisation
  - `is_activated` passe à true une seule fois, lors de la première connexion

  ### Migration des données existantes
  - Tous les user_codes existants reçoivent `is_active = true` par défaut
    (on suppose qu'ils étaient actifs puisqu'ils ont été importés sans le champ)

  ## Sécurité
  - Les politiques RLS existantes ne sont pas modifiées
  - La colonne `is_active` peut être lue par les utilisateurs authentifiés (pour vérifier leur propre statut)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_codes' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE user_codes ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

COMMENT ON COLUMN user_codes.is_active IS 'Statut actif/inactif importé depuis le CRM (champ 0/1 du fichier SFTP). Un utilisateur inactif ne peut pas se connecter ni activer son compte.';
COMMENT ON COLUMN user_codes.is_activated IS 'Indique si l''utilisateur a créé son compte Alkemia (activation par code). Passe à true lors de la première connexion.';

# CRM Multi-Pays - Application Animateurs

Application CRM mobile-first destinée aux équipes terrain (animateurs et commerciaux) avec gestion multi-pays et synchronisation SFTP.

## Fonctionnalités Principales

### Module Agenda
- Liste des rendez-vous passés et à venir
- Vue détaillée de chaque rendez-vous
- Indicateurs visuels pour les comptes rendus en attente
- Filtrage par période (tous, à venir, passés)

### Module Compte Rendu de Ventes
- Saisie des ventes par produit
- Catalogue produits groupé par gamme avec couleurs configurables
- Recherche rapide de produits
- Saisie du CA global et commentaires
- Mode brouillon et validation
- Blocage après export vers CRM existant

### Authentification par Code
- Première connexion avec code utilisateur unique
- Création du compte (email + mot de passe)
- Connexion standard pour les accès suivants

### Synchronisation SFTP
- Import automatique des utilisateurs, produits et rendez-vous
- Export des comptes rendus de ventes
- Logs détaillés et monitoring
- Gestion multi-pays

## Architecture Technique

### Frontend
- **React 18** avec TypeScript
- **Vite** pour le build
- **React Router** pour la navigation
- **i18next** pour le multilingue (FR, ES, IT, BE, CH)
- **Tailwind CSS** pour le style
- **Zustand** pour la gestion d'état
- **date-fns** pour les dates

### Backend
- **Supabase** pour la base de données PostgreSQL
- **Supabase Auth** pour l'authentification
- **Supabase Edge Functions** pour la synchronisation SFTP
- **Row Level Security** pour l'isolation des données par pays

### Base de Données

#### Tables Principales
- `countries` - Pays supportés (FR, ES, IT, BE, CH)
- `user_codes` - Codes utilisateurs pour activation
- `users` - Profils utilisateurs étendus
- `product_categories` - Gammes de produits avec couleurs
- `products` - Catalogue produits (~52 produits)
- `appointments` - Rendez-vous animateurs
- `sales_reports` - Comptes rendus de ventes
- `sales_report_lines` - Détail des ventes par produit
- `import_export_logs` - Logs de synchronisation
- `sftp_configurations` - Configurations SFTP par pays

#### Tables Modules Futurs (Placeholder)
- `customers` - Clients et prospects
- `orders` - Commandes
- `order_lines` - Lignes de commandes

## Installation et Démarrage

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase

### Configuration
1. Cloner le repository
2. Installer les dépendances : `npm install`
3. Configurer les variables d'environnement dans `.env`
4. Démarrer le serveur de développement : `npm run dev`

### Variables d'Environnement
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Utilisation

### Pour les Animateurs

#### Première Connexion
1. Accéder à `/activate`
2. Saisir votre code utilisateur (ex: ANIM001, ANIM002, ANIM003)
3. Créer votre compte avec email et mot de passe
4. Vous êtes redirigé vers l'agenda

#### Connexions Suivantes
1. Accéder à `/login`
2. Se connecter avec email et mot de passe

#### Saisir un Compte Rendu
1. Dans l'agenda, cliquer sur un rendez-vous passé
2. Cliquer sur "Saisir le compte rendu"
3. Saisir le CA global
4. Sélectionner les produits vendus et quantités
5. Ajouter un commentaire (optionnel)
6. Enregistrer en brouillon ou valider

### Pour les Administrateurs

#### Monitoring des Synchronisations
1. Accéder à `/admin/sync`
2. Voir l'historique des imports/exports
3. Vérifier les statuts et erreurs

## Synchronisation SFTP

### Edge Function: sync-data

L'Edge Function `sync-data` gère les imports et exports de données.

#### Endpoint
```
POST /functions/v1/sync-data
```

#### Payload
```json
{
  "type": "import_users|import_products|import_appointments|export_sales",
  "country_code": "FR|ES|IT|BE|CH",
  "data": []
}
```

#### Types de Synchronisation

**Import Users**
```json
{
  "type": "import_users",
  "country_code": "FR",
  "data": [
    {
      "code": "ANIM001",
      "first_name": "Marie",
      "last_name": "Dupont"
    }
  ]
}
```

**Import Products**
```json
{
  "type": "import_products",
  "country_code": "FR",
  "data": [
    {
      "code": "PROD001",
      "name": "Product Name",
      "category_code": "GLOW",
      "category_name": "Gamme GLOW",
      "price": "29.90",
      "display_order": 1
    }
  ]
}
```

**Import Appointments**
```json
{
  "type": "import_appointments",
  "country_code": "FR",
  "data": [
    {
      "external_id": "APT001",
      "user_code": "ANIM001",
      "date": "2024-01-20",
      "time": "10:00:00",
      "store_name": "Pharmacie Centrale",
      "store_address": "12 Rue de la République",
      "store_city": "Paris",
      "store_postal_code": "75001"
    }
  ]
}
```

**Export Sales**
```json
{
  "type": "export_sales",
  "country_code": "FR"
}
```

Retourne :
```json
{
  "success": true,
  "processed": 5,
  "data": [
    {
      "report_id": "uuid",
      "appointment_external_id": "APT001",
      "user_code": "ANIM001",
      "date": "2024-01-20",
      "total_amount": 150.50,
      "comment": "Très bon accueil",
      "lines": [
        {
          "product_code": "PROD001",
          "quantity": 2,
          "unit_price": 29.90,
          "line_amount": 59.80
        }
      ]
    }
  ]
}
```

## Données de Test

Des données de test sont disponibles pour faciliter le développement :

### Codes Utilisateurs
- `ANIM001` - Marie Dupont (France)
- `ANIM002` - Pierre Martin (France)
- `ANIM003` - Sophie Bernard (France)

### Produits
- 15+ produits répartis sur 5 gammes
- Gammes : GLOW, VITAL, BEAUTY, CARE, WELLNESS
- Prix réalistes entre 8.90€ et 42.00€

### Rendez-vous
- 2 rendez-vous passés (pour saisir des comptes rendus)
- 2 rendez-vous futurs

## Structure du Projet

```
/src
  /components
    /layout          # Layout principal et navigation
    /ui             # Composants UI réutilisables
  /contexts         # Contextes React (Auth)
  /hooks            # Hooks personnalisés
  /lib              # Configuration (Supabase, i18n)
  /pages
    /auth           # Pages d'authentification
    /agenda         # Module Agenda
    /sales          # Module Ventes
    /admin          # Interface admin
  /services         # Services API
  /store            # Stores Zustand
  /types            # Types TypeScript
/supabase
  /functions        # Edge Functions
```

## Sécurité

### Row Level Security (RLS)
Toutes les tables sont protégées par RLS :
- Isolation complète des données par pays
- Accès limité aux données de l'utilisateur authentifié
- Validation côté serveur de toutes les opérations

### Authentification
- Mots de passe hashés par Supabase Auth
- Sessions sécurisées avec JWT
- Refresh tokens automatiques

## Évolutions Futures

### Modules Planifiés
- **Clients** - Gestion des clients et prospects
- **Commandes** - Prise de commandes terrain
- **Statistiques** - Analyse des performances commerciales

### Fonctionnalités à Ajouter
- Mode offline avec synchronisation
- Notifications push pour nouveaux rendez-vous
- Export PDF des comptes rendus
- Géolocalisation des points de vente
- Signature électronique

## Support

Pour toute question ou problème :
1. Consulter les logs de synchronisation dans l'interface admin
2. Vérifier les configurations SFTP par pays
3. Contacter l'équipe technique

## Licence

Propriétaire - Tous droits réservés

# Guide de Démarrage Rapide

## Accès à l'Application

### Option 1 : Créer votre premier compte (Recommandé)

1. Accédez à l'application
2. Cliquez sur "Activer mon compte"
3. Utilisez un des codes suivants :
   - **ANIM001** (Marie Dupont - France)
   - **ANIM002** (Pierre Martin - France)
   - **ANIM003** (Sophie Bernard - France)

4. Créez votre compte avec :
   - Email : votre-email@example.com
   - Mot de passe : au moins 6 caractères

5. Vous serez automatiquement connecté et redirigé vers l'agenda

### Codes Utilisateurs Disponibles

| Code | Nom | Pays | Rendez-vous |
|------|-----|------|-------------|
| ANIM001 | Marie Dupont | France | 2 passés, 1 futur |
| ANIM002 | Pierre Martin | France | 1 futur |
| ANIM003 | Sophie Bernard | France | Aucun |

**Note importante :** Chaque code ne peut être activé qu'**une seule fois**. Une fois qu'un code est activé, vous devez utiliser l'email et le mot de passe pour vous reconnecter.

## Tester l'Application

### 1. Voir les Rendez-vous
- Après connexion, vous arrivez sur l'agenda
- Les rendez-vous passés sont marqués avec un badge orange "Compte rendu à saisir"
- Les rendez-vous futurs sont marqués en bleu "Prévu"

### 2. Saisir un Compte Rendu de Ventes

**Pour ANIM001 (a 2 rendez-vous passés) :**

1. Dans l'agenda, cliquez sur un rendez-vous avec le badge orange
2. Cliquez sur "Saisir le compte rendu"
3. Saisissez le CA global (ex: 150.50)
4. Parcourez les gammes de produits (GLOW, VITAL, BEAUTY, etc.)
5. Cliquez sur + pour ajouter des quantités
6. Ajoutez un commentaire (optionnel)
7. Choisissez :
   - "Enregistrer le brouillon" : sauvegarde modifiable
   - "Valider" : finalise le compte rendu (non modifiable jusqu'à l'export)

### 3. Voir un Compte Rendu
- Dans l'agenda, les rendez-vous avec compte rendu ont un badge vert
- Cliquez sur le rendez-vous
- Cliquez sur "Voir le compte rendu"
- Les produits sont groupés par gamme avec les couleurs configurées

## Produits de Test Disponibles

### Gamme GLOW (Orange)
- GLOW Sérum Éclat - 29.90€
- GLOW Crème Jour - 35.50€
- GLOW Masque Lumière - 24.90€
- GLOW Huile Précieuse - 42.00€

### Gamme VITAL (Vert)
- VITAL Complément Énergie - 19.90€
- VITAL Vitamines C+ - 15.90€
- VITAL Omega 3 - 22.50€
- VITAL Immunité Plus - 25.90€

### Gamme BEAUTY (Rose)
- BEAUTY Rouge à Lèvres Mat - 16.90€
- BEAUTY Fond de Teint - 28.90€
- BEAUTY Mascara Volume - 19.90€
- BEAUTY Palette Yeux - 32.00€

### Gamme CARE (Bleu)
- CARE Crème Mains - 12.90€
- CARE Baume Lèvres - 8.90€
- CARE Lotion Corps - 18.90€

### Gamme WELLNESS (Violet)
- WELLNESS Tisane Détente - 9.90€
- WELLNESS Huiles Essentielles - 24.90€
- WELLNESS Bougie Parfumée - 16.90€

## Données de Test

### Rendez-vous Pré-créés pour ANIM001

**Rendez-vous Passés (peuvent recevoir un compte rendu) :**
1. Pharmacie Centrale - Il y a 3 jours à 10:00
2. Pharmacie du Marché - Hier à 14:30

**Rendez-vous Futurs :**
3. Pharmacie Moderne - Dans 2 jours à 09:00

### Rendez-vous Pré-créés pour ANIM002

**Rendez-vous Futurs :**
1. Pharmacie des Halles - Dans 5 jours à 15:00

## Interface Admin (Futur)

La page `/admin/sync` est accessible mais nécessite un rôle admin. Pour l'instant, tous les comptes créés ont le rôle "animator".

Pour tester la synchronisation, vous pouvez utiliser l'Edge Function directement :

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/sync-data' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "export_sales",
    "country_code": "FR"
  }'
```

## Résolution de Problèmes

### "Aucun rendez-vous"
- Vérifiez que vous utilisez ANIM001 ou ANIM002 (ANIM003 n'a pas de rendez-vous)
- Les rendez-vous passés apparaissent dans le filtre "Passés" ou "Tous"

### "Code déjà activé"
- Le code a déjà été utilisé, utilisez la page de connexion avec votre email/mot de passe
- Ou utilisez un autre code (ANIM001, ANIM002, ANIM003)

### "Impossible de saisir un compte rendu"
- Seuls les rendez-vous passés peuvent recevoir un compte rendu
- Les rendez-vous futurs doivent être passés pour devenir modifiables

### "Le compte rendu ne se sauvegarde pas"
- Vérifiez que le CA global est renseigné
- Vérifiez qu'au moins un produit a une quantité > 0
- Vérifiez les erreurs dans la console du navigateur

## Prochaines Étapes

1. **Tester le workflow complet** : Activation → Agenda → Compte rendu
2. **Tester sur mobile** : L'interface est optimisée pour tablettes et smartphones
3. **Tester le multilingue** : Changer la langue dans le navigateur (FR, ES, IT)
4. **Ajouter vos propres données** : Via l'Edge Function sync-data

## Support

Si vous rencontrez des problèmes :
1. Vérifiez la console du navigateur (F12)
2. Vérifiez que Supabase est bien configuré
3. Vérifiez les logs des Edge Functions dans le dashboard Supabase

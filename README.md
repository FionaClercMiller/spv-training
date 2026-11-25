# SPV Training — première version

Application React/Vite de suivi personnel de préparation SPV.

## Lancer en local
1. Installer Node.js (version 18 ou supérieure).
2. Dans ce dossier : `npm install`
3. Puis : `npm run dev`
4. Ouvrir l'adresse locale indiquée par Vite.

Sans configuration Supabase, l'application fonctionne en **mode local** et sauvegarde les données dans le navigateur (`localStorage`).

## Activer les comptes privés et la synchronisation
1. Créer un projet Supabase.
2. Dans Supabase > SQL Editor, exécuter `supabase/schema.sql`.
3. Copier `.env.example` en `.env.local`.
4. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` avec les valeurs du projet.
5. Redémarrer Vite (`npm run dev`).

Les tables utilisent Row Level Security (RLS) : chaque utilisateur ne peut lire ou modifier que ses propres données. Ne jamais mettre une clé `service_role` dans le navigateur.

## Contenu de cette V1
- Dashboard et indicateurs.
- Journal de séances avec exercices, charges, durée et distance.
- Statistiques de volume et historique des tests.
- Planning avec statut à faire / terminée.
- Suivi des cinq objectifs SPV.
- Salle de sport.
- Journal de récupération.
- Programmes de travail de départ.
- Authentification e-mail / mot de passe Supabase.

## Notes
- Les données de démonstration sont des exemples de départ issus des informations de préparation fournies ; vérifie-les et modifie-les selon tes résultats officiels.
- Les programmes sont des trames à adapter, pas un avis médical.
- Pour un déploiement public, configurer les URL de redirection et la confirmation d'e-mail dans Supabase Auth.

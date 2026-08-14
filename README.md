# MEGA SERVICES WORK SYSTEM — Cloudflare + GitHub

Application intégrée de travail et de gestion pour **MEGA SERVICES SARL U**.

## Ressources Cloudflare déjà configurées dans `wrangler.toml`

- D1 : `systeme-d1`
  - ID : `1b2c5789-288b-4741-b26a-41e7df08ddc3`
  - Binding applicatif : `SYSTEME_DB`
- KV : `systeme_kv`
  - ID : `44f6968fcb75493e9e7d5bbdacabf760`
  - Binding applicatif : `SYSTEME_KV`

> Le fichier ne contient volontairement aucun mot de passe, token Cloudflare ou secret de Super Admin.

## Modules inclus dans cette V1

- Connexion sécurisée et création du premier Super Admin
- Sessions stockées dans KV
- Mots de passe dérivés par PBKDF2-SHA256 avec sel aléatoire
- Rôles et contrôle d’accès serveur
- Tableau de bord Direction
- Clients et historique transversal
- Catalogue de services et tarifs
- Travaux clients et suivi des statuts
- Paiements, reçus et soldes à payer
- Atelier de documents avec versions D1 et impression
- Caisse multicomptes et clôture avec calcul d’écart
- Wave / Orange Money / MTN Money / Moov Money
- Produits, stock, mouvements, seuils d’alerte
- Ventes avec décrément automatique du stock
- Facture de vente imprimable
- Crédits clients et remboursements
- Dépenses
- Fournisseurs
- Employés et comptes utilisateurs
- Rapports financiers et export CSV
- Recherche universelle
- Journal d’audit
- Paramètres entreprise
- Page Santé système
- Interface responsive ordinateur / tablette / téléphone
- Workflow GitHub Actions pour migrations D1 + déploiement Pages

## 1. Préparer GitHub

Créez un dépôt GitHub, par exemple :

`mega-services-work-system`

Décompressez le ZIP à la racine du dépôt puis poussez les fichiers sur la branche `main`.

## 2. Créer le projet Cloudflare Pages

Dans Cloudflare > Workers & Pages, créez un projet Pages nommé exactement :

`mega-services-work-system`

Vous pouvez soit connecter le dépôt GitHub, soit laisser GitHub Actions assurer le Direct Upload.

Le workflow fourni utilise le Direct Upload Wrangler.

## 3. Ajouter les secrets GitHub

Dans GitHub :

Settings > Secrets and variables > Actions > New repository secret

Ajoutez :

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Le token Cloudflare doit pouvoir au minimum déployer Pages et appliquer les migrations D1 du compte concerné.

## 4. Configurer le secret d’initialisation du Super Admin

Créez un code long et aléatoire. Ne l’écrivez jamais dans le dépôt GitHub.

Depuis un terminal authentifié Cloudflare :

```bash
npx wrangler pages secret put BOOTSTRAP_TOKEN --project-name mega-services-work-system
```

Entrez votre code secret lorsqu’il est demandé.

Ce code n’est utilisé que pour protéger l’écran de première initialisation.

## 5. Appliquer les migrations D1

Le workflow GitHub le fait automatiquement avant chaque déploiement :

```bash
npx wrangler d1 migrations apply systeme-d1 --remote
```

Pour le faire manuellement :

```bash
npm install
npm run db:remote
```

## 6. Déploiement manuel

```bash
npm install
npm run check
npm run deploy
```

## 7. Première ouverture

Lors de la toute première ouverture, si aucun utilisateur n’existe, l’application affiche :

**Première installation — Initialiser MEGA SERVICES**

Renseignez :

- nom du Super Administrateur ;
- email ;
- mot de passe de 10 caractères minimum ;
- valeur du secret `BOOTSTRAP_TOKEN`.

Après validation, le premier compte `super_admin` est créé et la session est ouverte.

Une fois le premier utilisateur créé, l’API refuse toute nouvelle tentative de bootstrap.

## 8. Développement local

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

Le développement local utilise les ressources locales simulées par Wrangler. Il n’écrit pas dans la base D1 de production avec cette configuration.

## 9. Règle importante — remboursement des crédits

Le remboursement d’un crédit est calculé à partir de la **dette restante du crédit**.

Exemple :

- dette restante : 108 000 FCFA
- remboursement reçu : 10 000 FCFA
- nouvelle dette : 98 000 FCFA

Le système ne demande pas que le compte crédit dispose d’un “solde disponible” pour accepter le remboursement.

## 10. Documents et fichiers

Cette version stocke le contenu éditable des documents texte dans D1 et conserve les versions.

Les pièces binaires lourdes — photos, scans, PDF importés, CNI, diplômes, etc. — ne sont **pas** stockées dans D1 afin d’éviter de transformer la base relationnelle en stockage de fichiers.

Pour ces pièces, la prochaine extension recommandée est un bucket Cloudflare R2 avec un binding séparé. Cette V1 reste donc strictement conforme aux ressources demandées : **KV + D1**.

## 11. Intelligence artificielle

L’interface documentaire est prête à recevoir un assistant IA, mais aucune clé externe n’est intégrée au dépôt et aucune fausse IA n’est simulée.

L’intégration pourra ensuite se faire avec un fournisseur choisi ou avec une ressource Cloudflare adaptée, en conservant les secrets exclusivement côté serveur.

## 12. Sécurité

Principes déjà appliqués :

- aucun mot de passe en clair ;
- aucun secret dans Git ;
- cookie de session HttpOnly + SameSite Strict + Secure en HTTPS ;
- session stockée dans KV avec expiration ;
- validation des rôles côté API ;
- contrôle d’origine sur les requêtes de modification ;
- en-têtes de sécurité et Content Security Policy ;
- blocage temporaire après échecs répétés de connexion ;
- journalisation des actions sensibles ;
- pas de suppression silencieuse des écritures financières dans l’interface V1.

## 13. Arborescence

```text
mega-services-work-system/
├── .github/workflows/deploy.yml
├── functions/api/[[path]].js
├── migrations/
│   ├── 0001_initial.sql
│   └── 0002_add_supplier_orders.sql
├── public/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── favicon.svg
│   ├── _headers
│   └── _routes.json
├── scripts/check.mjs
├── .dev.vars.example
├── .gitignore
├── package.json
├── wrangler.toml
└── README.md
```

## 14. Avant mise en production réelle

1. Compléter les informations de MEGA SERVICES dans Paramètres.
2. Saisir les tarifs réels des services.
3. Vérifier les soldes initiaux des caisses et comptes Mobile Money.
4. Créer un compte utilisateur distinct pour chaque employé.
5. Tester une vente, un travail, un paiement, une dépense et un remboursement de crédit.
6. Vérifier les rapports et les écarts de caisse.
7. Ne partager aucun token Cloudflare ni `BOOTSTRAP_TOKEN`.

## 15. Limites volontaires de cette V1

Cette V1 est un noyau fonctionnel complet pour démarrer sur D1 + KV. Les éléments ci-dessous nécessitent une ressource ou une décision supplémentaire :

- stockage de gros fichiers : R2 recommandé ;
- envoi WhatsApp automatique : API WhatsApp / fournisseur à connecter ;
- génération IA : fournisseur IA à connecter ;
- PDF serveur avancé : moteur dédié à ajouter si nécessaire ;
- multi-agences avancé : le schéma peut être étendu sans casser le noyau ;
- synchronisation avec BANK MANAGER PRO : API/migration à réaliser après audit de la version utilisée.

---

**MEGA SERVICES WORK SYSTEM — MSWS v1.0.0**

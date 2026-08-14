# MEGA SERVICES WORK SYSTEM v1.2 — Cloudflare Pages + GitHub

Application intégrée de travail et de gestion pour **MEGA SERVICES SARL U**.

## Configuration Cloudflare déjà incluse

- D1 : `systeme-d1` — `1b2c5789-288b-4741-b26a-41e7df08ddc3` — binding `SYSTEME_DB`
- KV : `systeme_kv` — `44f6968fcb75493e9e7d5bbdacabf760` — binding `SYSTEME_KV`
- Sortie Pages : `./public`
- Fonctions API : `functions/api/[[path]].js`

Aucun mot de passe ni token Cloudflare n’est inclus dans Git.

## Paramètres GitHub → Cloudflare Pages

Le ZIP est construit **sans dossier parent** : copiez son contenu directement à la racine du dépôt GitHub.

Dans Cloudflare Pages :

- **Chemin d’accès / Root directory :** laisser vide
- **Commande de version / Build command :** `exit 0`
- **Répertoire de sortie / Build output directory :** `public`
- **Branche de production :** `main` ou votre branche principale

`wrangler.toml` contient déjà les bindings D1/KV et `pages_build_output_dir = "./public"`.

## Secret obligatoire

Dans Cloudflare > Workers & Pages > votre projet > Settings > Variables and Secrets, créez un **Secret** :

`BOOTSTRAP_TOKEN`

Choisissez une valeur longue et privée. Ne la placez jamais dans GitHub.

## Première installation — correction HTTP 500

La v1.2 corrige l’échec observé sur **Initialiser MEGA SERVICES**.

Avant l’initialisation, l’écran contrôle maintenant :

- le binding D1 `SYSTEME_DB` ;
- le binding KV `SYSTEME_KV` ;
- la présence du secret `BOOTSTRAP_TOKEN`.

Le schéma D1 est installé par **petits lots SQL contrôlés**, au lieu d’envoyer toute l’initialisation comme une seule grosse opération. Les créations sont idempotentes : une installation partiellement effectuée peut être relancée sans recréer les données déjà présentes.

Le système utilise désormais **D1 comme stockage fiable des sessions** et KV comme **cache de session**. Une indisponibilité temporaire de KV ne doit donc plus empêcher la connexion si D1 fonctionne.

Si une ancienne tentative a déjà créé le Super Administrateur mais a échoué juste après, l’application le détecte. L’écran de connexion apparaît et la prochaine connexion répare automatiquement le schéma manquant.

## Migrations D1

- `0001_initial.sql`
- `0002_add_supplier_orders.sql`
- `0003_sessions.sql`

Pour une installation neuve, le formulaire d’initialisation sait créer automatiquement le schéma. Pour une maintenance manuelle :

```bash
npm install
npm run db:remote
```

## Vérification locale du projet

```bash
npm install
npm run check
```

Pour le développement local :

```bash
cp .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

## Modules inclus

- authentification et Super Admin ;
- sessions D1 + cache KV ;
- clients ;
- services et tarifs ;
- travaux ;
- paiements et reçus ;
- documents et versions ;
- caisse multicomptes et clôture ;
- Wave / Orange Money / MTN Money / Moov Money ;
- produits, stock et mouvements ;
- ventes et factures ;
- crédits et remboursements ;
- dépenses ;
- fournisseurs ;
- commandes fournisseurs ;
- employés et utilisateurs ;
- rapports ;
- recherche universelle ;
- journal d’audit ;
- paramètres entreprise ;
- santé système.

## Règle crédit importante

Un remboursement diminue directement la dette restante. Il n’est pas bloqué par un faux contrôle de « solde insuffisant » du compte crédit.

Exemple : dette 108 000 FCFA, remboursement 10 000 FCFA, nouveau solde 98 000 FCFA.

## Sécurité

- mots de passe PBKDF2-SHA256 avec sel ;
- aucun mot de passe en clair ;
- cookie HttpOnly / Secure / SameSite ;
- jeton de session aléatoire ;
- seul le hash du jeton est conservé dans D1 ;
- KV utilisé en cache, sans devenir le seul point de vérité de la session ;
- permissions côté serveur ;
- contrôle d’origine des écritures ;
- CSP et en-têtes de sécurité ;
- verrouillage après échecs répétés ;
- journal d’audit ;
- initialisation protégée par `BOOTSTRAP_TOKEN`.

## Stockage de fichiers et IA

Cette version utilise les ressources demandées **D1 + KV**. Les gros fichiers binaires (scans, PDF importés, photos, CNI, diplômes) nécessiteront idéalement Cloudflare R2. L’IA et WhatsApp nécessitent également leurs propres services et secrets.

## Arborescence attendue à la racine GitHub

```text
functions/
migrations/
public/
scripts/
.dev.vars.example
.gitignore
package.json
wrangler.toml
README.md
```

**MEGA SERVICES WORK SYSTEM — MSWS v1.2.0**

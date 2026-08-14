# MEGA SERVICES WORK SYSTEM v1.1 — Cloudflare Pages + GitHub

Application intégrée de travail et de gestion pour **MEGA SERVICES SARL U**.

## Configuration Cloudflare déjà incluse

- D1 : `systeme-d1` — `1b2c5789-288b-4741-b26a-41e7df08ddc3` — binding `SYSTEME_DB`
- KV : `systeme_kv` — `44f6968fcb75493e9e7d5bbdacabf760` — binding `SYSTEME_KV`
- Sortie Pages : `./public`
- Fonctions API : `functions/api/[[path]].js`

Aucun mot de passe ni token Cloudflare n’est inclus dans Git.

## Déploiement GitHub → Cloudflare Pages

Le ZIP est volontairement construit **sans dossier parent** : copiez son contenu directement à la racine du dépôt GitHub.

Dans Cloudflare Pages, utilisez :

- **Chemin d’accès / Root directory :** laisser vide
- **Commande de version / Build command :** `exit 0`
- **Répertoire de sortie / Build output directory :** `public`
- **Branche de production :** `main` (ou votre branche principale)

`wrangler.toml` contient déjà les bindings D1/KV et `pages_build_output_dir = "./public"`.

## Secret obligatoire

Dans Cloudflare > Workers & Pages > votre projet > Settings > Variables and Secrets, créez un **Secret** :

`BOOTSTRAP_TOKEN`

Choisissez une valeur longue et privée. Ne la placez jamais dans GitHub.

## Première ouverture — D1 automatique

La v1.1 corrige le blocage « Base D1 non initialisée ».

Au premier chargement, l’API vérifie le schéma D1 sans supposer que la table `users` existe. Si la base est vide, l’écran **Initialiser MEGA SERVICES** reste accessible.

Lorsque vous validez le formulaire avec le bon `BOOTSTRAP_TOKEN` :

1. le serveur vérifie le secret ;
2. il crée automatiquement les tables et index manquants dans D1 ;
3. il insère les caisses, catégories et services de départ ;
4. il crée le premier Super Administrateur ;
5. il ouvre la session sécurisée dans KV.

L’initialisation D1 n’est donc plus une étape manuelle obligatoire pour une installation neuve.

Les fichiers `migrations/*.sql` restent présents et constituent la source de vérité pour les futures évolutions de schéma. Pour une maintenance manuelle :

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

- authentification sécurisée et Super Admin ;
- sessions KV ;
- clients ;
- services ;
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
- employés et utilisateurs ;
- rapports ;
- recherche universelle ;
- journal d’audit ;
- paramètres entreprise ;
- santé système.

## Règle crédit importante

Un remboursement diminue la dette restante. Il n’est pas bloqué par un contrôle de « solde disponible » du compte crédit.

Exemple : dette 108 000 FCFA, remboursement 10 000 FCFA, nouveau solde 98 000 FCFA.

## Stockage de fichiers et IA

Cette version utilise uniquement les ressources demandées **D1 + KV**. Les gros fichiers binaires (scans, PDF importés, photos, CNI, diplômes) nécessiteront idéalement R2. L’IA et WhatsApp nécessitent également leurs propres services/secrets et ne sont pas simulés avec de fausses données.

## Sécurité

- mots de passe PBKDF2-SHA256 avec sel ;
- aucun mot de passe en clair ;
- cookie de session HttpOnly / Secure / SameSite ;
- sessions côté KV ;
- permissions côté serveur ;
- contrôle d’origine des écritures ;
- CSP et en-têtes de sécurité ;
- verrouillage après échecs répétés ;
- journal d’audit ;
- initialisation D1 protégée par `BOOTSTRAP_TOKEN`.

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

**MEGA SERVICES WORK SYSTEM — MSWS v1.1.0**


## Correctif V1.3 — installation D1 progressive

L’installation initiale ne crée plus tout le schéma dans une seule invocation. Le navigateur appelle `/api/bootstrap/schema` plusieurs fois et le serveur exécute seulement 3 instructions SQL par requête. Cette méthode réduit fortement le risque de coupure de fonction Cloudflare. Le formulaire affiche aussi le code API, la version et le Cloudflare Ray ID lorsqu’une erreur HTTP non JSON survient.

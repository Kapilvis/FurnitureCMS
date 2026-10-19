# Nivaas: furniture storefront with admin CMS

Static storefront (HTML, CSS, vanilla JavaScript) plus an admin dashboard at `/admin` where one admin user manages colours, product types, categories and products (with image uploads).

The same API code (`lib/api.js`) runs in two places:

| Where | Storage | Use it for |
|-------|---------|-----------|
| **Netlify** (`netlify/functions/api.mjs`) | Netlify Blobs | production hosting on Netlify |
| **Node server** (`server.js`) | files in `data/` and `assets/images/uploads/` | local development, or a VPS / Docker host |

## Deploy on Netlify

Netlify has no always-on server and no writable disk, so on Netlify the catalogue, uploaded images, backups, audit log and login-lockout counters live in **Netlify Blobs** (built in, no setup), and the API runs as a **Netlify Function**. The storefront and admin pages are static files on the CDN.

1. **Put the project in a Git repository** (GitHub, GitLab or Bitbucket) and push it. `node_modules/`, `dist/`, `data/users.json` and other local files are already in `.gitignore`.
2. In Netlify choose **Add new site > Import an existing project** and pick the repository. The build settings come from `netlify.toml` (build command `node tools/build-netlify.js`, publish folder `dist`, functions in `netlify/functions`). Netlify installs `@netlify/blobs` from `package.json` automatically.
3. Before the first deploy (or right after), open **Site configuration > Environment variables** and add:

   | Variable | Value |
   |----------|-------|
   | `SESSION_SECRET` | a random string of 32+ characters, e.g. run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Required: the API refuses to start without it. |
   | `ADMIN_USER` | your admin username (default `admin`) |
   | `ADMIN_PASSWORD_HASH` | recommended. Run `node tools/hash-password.js "your long password"` and paste the printed value. |
   | `ADMIN_PASSWORD` | simpler alternative to the hash: the plain password (12+ characters). Mark it as a secret value. Use one of the two. |

   Redeploy after adding variables.
4. Open `https://YOUR-SITE.netlify.app/admin` and sign in. The first request seeds the catalogue from the bundled `data/catalog.json` into Blobs.
5. After signing in, use **Account > Change password**. The new password is stored (salted hash) in Blobs and overrides the environment values.

Other ways to deploy: with the Netlify CLI run `npx netlify deploy --build --prod` from this folder (drag-and-drop in the Netlify UI does not deploy functions, so it will not work for this project).

**Things to know about Netlify**
- Edits made in the admin are stored in Blobs, **not** in your Git repository. `data/catalog.json` is only the starting data. Re-deploying does not overwrite your edits.
- Uploaded images are stored in Blobs and served from `/assets/images/uploads/...` by the function. Limit: 4 MB per image (functions accept about 6 MB per request).
- Two admins saving at the same moment: the last save wins. Fine for one or two editors.
- Sessions are signed cookies (8 hours). "Sign out" clears the browser cookie, but a copied cookie stays valid until it expires or until the password is changed, which signs everyone out.
- Custom domain: add it in Netlify; HTTPS is automatic.
- Backups: the last 40 catalogue versions are kept in the `backups` Blobs store. View blobs with the Netlify CLI (`npx netlify blobs:list backups`) or export them occasionally.
- Test locally the Netlify way with `npx netlify dev` (needs the CLI), or use the built-in simulator below.

## GitHub Pages (storefront only)

GitHub Pages serves static files only, so there the **storefront works but the admin and API do not**. The workflow `.github/workflows/pages.yml` builds `dist-pages/` (`node tools/build-pages.js`: pages, CSS, JS, images and `data/catalog.json`, no admin or server code) and deploys it on every push to `main`. On Pages the catalogue shown is whatever is committed in `data/catalog.json`; to change it there, edit that file and push. For the full CMS with login, use Netlify or a Node host (sections above).

One-time setup if the first run reports that Pages is not enabled: repository **Settings > Pages > Build and deployment > Source: GitHub Actions**, then re-run the workflow.

## Run locally (Node server)

```bash
npm start
```

Open http://localhost:3000/ (storefront) and http://localhost:3000/admin.

On first start the server creates `data/users.json` with one admin user and prints a random password **once** in the terminal; change it under **Account > Change password**. To choose your own, set `ADMIN_USER` and `ADMIN_PASSWORD` for the very first start. To reset the admin, stop the server, delete `data/users.json` and start again.

Environment variables: `PORT` (3000), `HOST` (default `127.0.0.1`; use `0.0.0.0` to accept outside connections), `DATA_DIR` (`data/`), `SESSION_SECRET` (optional; otherwise a random key is stored in `data/session.key`), `TRUST_PROXY=1` and `COOKIE_SECURE=1` (see below).

### Netlify simulator

Runs the real Netlify function against a local Blobs server (no Netlify account needed):

```bash
SESSION_SECRET=0123456789abcdef0123456789abcdef ADMIN_PASSWORD=choose-a-long-password npm run test:netlify-sim
```

It serves only the API routes on port 3200 (static files are not simulated).

### Public VPS / Docker (alternative to Netlify)

Run `server.js` behind a reverse proxy that provides HTTPS (Caddy example: `shop.example.com { reverse_proxy 127.0.0.1:3000 }`) with `HOST=0.0.0.0`, `TRUST_PROXY=1` and `ADMIN_PASSWORD` set. `data/` and `assets/images/uploads/` must be on a persistent disk and backed up. A `Dockerfile` is included (`docker build -t nivaas .`, then mount volumes on `/app/data` and `/app/assets/images/uploads`; seed `catalog.json` into the data volume first).

## What the admin can do

Add, edit and delete **colours**, **product types**, **categories** and **products**; upload images (JPG, PNG, WebP, GIF); change the password. Changes show on the storefront immediately.

- A category, type or colour that is still used by a product cannot be deleted.
- Deleting or replacing a product's uploaded image also deletes the stored file.
- Every change first saves a backup of the previous catalogue (last 40 kept) and is written to the audit log.

## Project structure

```
index.html, products.html, product-detail.html, cart.html     storefront pages
admin/                  dashboard (index.html, admin.css, admin.js)
css/styles.css          storefront styles (design tokens in :root)
js/data.js              loads /api/catalog (falls back to data/catalog.json on a plain static host)
js/main.js              header/footer, cart, wishlist, page logic
lib/api.js              API core: validation, auth, CRUD, uploads (host independent)
lib/storage-file.js     file storage (Node server)
lib/storage-blobs.js    Netlify Blobs storage
server.js               Node server: static files + API
netlify/functions/api.mjs   Netlify function: API + uploaded images
netlify.toml            Netlify build, headers and settings
data/catalog.json       starting catalogue (the live database on the Node server)
assets/images/          sample images; uploads/ holds files uploaded on the Node server
tools/                  build-netlify.js, hash-password.js, netlify-sim.mjs, build-catalog.js (sample data generator)
```

## Data model (`data/catalog.json`)

| Section      | Purpose                        | Key fields |
|--------------|--------------------------------|-----------|
| `colors`     | Master list of finishes        | `key -> { name, hex }` |
| `types`      | Master list of product types   | `id`, `name` |
| `categories` | Master list of shop categories | `id`, `name`, `defaultTypeId`, `image` |
| `products`   | The catalogue                  | `id`, `name`, `categoryId`, `typeId`, `price`, `mrp`, `badge`, `colors[]`, `material`, `description`, `specs{}`, `images{ colourKey: [paths] }` |

Products reference masters by id; the API checks this on every save.

## API

Public: `GET /api/catalog`

Admin (signed-in cookie required; every non-GET request must send `X-Requested-With: nivaas-admin`):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/login`, `/logout`, `/password` | session and password |
| GET | `/api/admin/me` | current user |
| POST | `/api/admin/upload` | raw image body, returns `{ path }` |
| POST | `/api/admin/{categories,types,colors,products}` | create |
| PUT / DELETE | `/api/admin/{...}/<id>` | update / delete |

## Security notes

- Passwords are salted scrypt hashes. Sessions are HMAC-signed cookies (`HttpOnly`, `SameSite=Strict`, `Secure` on HTTPS), valid 8 hours; changing the password invalidates all of them.
- Login throttling: 5 failures lock that address for 15 minutes; 30 failures lock the username for 15 minutes. Counters are kept in storage so they work across serverless instances.
- Every response carries a Content-Security-Policy, `X-Frame-Options: DENY` and related headers; admin changes require a custom header so other sites cannot trigger them.
- Uploads are checked by file signature, saved under random names and served with a locked-down CSP. SVG uploads are refused.
- All admin input is validated on the server; the dashboard builds pages with text nodes only.
- On the Node server only `*.html` at the root and `css/`, `js/`, `assets/`, `admin/` are served; on Netlify only `dist/` is published (built by `tools/build-netlify.js`), so server code and data are never exposed.

## Coding standards

- **Names:** lowercase, hyphen-separated file names; `camelCase` in JS; `kebab-case` for CSS classes; ids in the JSON are short lowercase strings.
- **JavaScript:** `'use strict'`, `const` by default, no framework. Pass any text from the URL or users through `esc()` before putting it in HTML.
- **CSS:** colours, radius and fonts come from the custom properties in `:root`; breakpoints sit at the bottom of the file.
- **HTML:** semantic landmarks, one `h1` per page, `alt` on content images, a label on every form control.
- **Formatting:** see `.editorconfig` (2 spaces, UTF-8, LF).
- **Data:** the catalogue JSON is the single source of truth; do not duplicate product facts in HTML or JS.

## Scope notes

Checkout, customer sign-in and the newsletter form are intentionally not functional, and prices, offers and delivery estimates are sample content. Use only photos and descriptions you own or are licensed to use.

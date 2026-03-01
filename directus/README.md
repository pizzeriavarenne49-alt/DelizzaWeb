# Directus CMS — Setup Guide

## Quick Start

### 1. Run Directus + Postgres via Docker

```bash
# From the project root
docker compose -f directus/docker-compose.yml up -d
```

Or manually:

```bash
docker run -d --name directus-db \
  -e POSTGRES_USER=directus \
  -e POSTGRES_PASSWORD=directus \
  -e POSTGRES_DB=directus \
  postgres:16-alpine

docker run -d --name directus \
  -p 8055:8055 \
  -e DB_CLIENT=pg \
  -e DB_HOST=directus-db \
  -e DB_PORT=5432 \
  -e DB_DATABASE=directus \
  -e DB_USER=directus \
  -e DB_PASSWORD=directus \
  -e SECRET=change-me-to-a-long-random-string \
  -e ADMIN_EMAIL=admin@delizza.fr \
  -e ADMIN_PASSWORD=admin123 \
  --link directus-db \
  directus/directus:10
```

### 2. Import the Schema Snapshot

Once Directus is running:

```bash
# Copy snapshot into the running container
docker cp directus/snapshot.json directus:/directus/snapshots/snapshot.json

# Apply the snapshot
docker exec directus npx directus schema apply /directus/snapshots/snapshot.json --yes
```

This creates the four collections: `categories`, `products`, `offers`, `home_hero_slides`.

### 3. Configure Public Read Access

Go to **Settings → Access Control → Public** in the Directus admin (`http://localhost:8055`).

Grant **READ** permission on:

| Collection | Fields to allow |
|---|---|
| `categories` | `id`, `name`, `slug`, `order`, `active` |
| `products` | `id`, `name`, `slug`, `description_short`, `ingredients`, `price_cents`, `active`, `is_popular`, `tags`, `category`, `image` |
| `offers` | `id`, `title`, `content`, `start_at`, `end_at`, `active`, `image` |
| `home_hero_slides` | `id`, `title`, `subtitle`, `badge`, `cta_label`, `cta_target`, `price_cents`, `active`, `order`, `image` |
| `directus_files` | `id`, `filename_download`, `type`, `width`, `height` |

> **Important**: Without Public READ on `directus_files`, images won't load on the frontend.

### 4. Seed Sample Data

Use the Directus REST API to import `seed.json`:

```bash
# Get an access token
TOKEN=$(curl -s -X POST http://localhost:8055/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@delizza.fr","password":"admin123"}' \
  | jq -r '.data.access_token')

# Import categories
curl -X POST http://localhost:8055/items/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$(jq '.categories' directus/seed.json)"

# Import products
curl -X POST http://localhost:8055/items/products \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$(jq '.products' directus/seed.json)"

# Import offers
curl -X POST http://localhost:8055/items/offers \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$(jq '.offers' directus/seed.json)"

# Import hero slides
curl -X POST http://localhost:8055/items/home_hero_slides \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$(jq '.home_hero_slides' directus/seed.json)"
```

### 5. Connect the Site

Create `.env.local` at the project root:

```env
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8055
```

Then restart the dev server:

```bash
npm run dev
```

The site will now fetch data from Directus. If Directus is unreachable, it falls back to mock data automatically.

---

## Schema Overview

| Collection | Key Fields | Notes |
|---|---|---|
| `categories` | name, slug, order, active | Sorted by `order ASC` |
| `products` | name, slug, price_cents, category (M2O), is_popular, active | `price_cents` = centimes |
| `offers` | title, content, start_at, end_at, active | Date window filtering |
| `home_hero_slides` | title, subtitle, badge, cta_label, cta_target, price_cents, order, active | Sorted by `order ASC` |

## Data Rules

- **Products**: Only items with `active=true` appear on the menu.
- **Categories**: Only `active=true` categories show as filter chips.
- **Offers**: Only `active=true` AND within `start_at`/`end_at` window (if set) are displayed.
- **Hero slides**: Only `active=true`, sorted by `order ASC`.
- **Price**: Always stored in **cents** (e.g. `1190` = `11.90 €`).

## Optional: Static Token

If you prefer token-based auth instead of Public role:

1. Go to **Settings → Access Control → create a new Role** (e.g. "API Read")
2. Grant READ on the same collections as above
3. Create a user with that role and generate a **static token**
4. Add to `.env.local`:
   ```env
   DIRECTUS_STATIC_TOKEN=your-static-token
   ```

## File Structure

```
directus/
├── README.md          ← This file
├── snapshot.json      ← Directus schema export (import via CLI)
└── seed.json          ← Sample data for quick setup
```

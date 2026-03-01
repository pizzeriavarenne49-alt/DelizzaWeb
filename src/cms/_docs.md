# CMS Integration — Directus

## Architecture

```
src/config/cms.ts       → Directus URL, fetch options, asset URL helper
src/data/repository.ts  → DataRepository interface + DirectusRepository + MockRepository
src/data/mock/          → Mock data (fallback when CMS unavailable)
```

## Directus Schema

### categories
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | string | Display name |
| slug | string | URL-friendly, unique |
| order | int | Sort order (ASC) |
| active | bool | Show on site? |

### products
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| name | string | Product name |
| slug | string | URL-friendly, unique |
| description_short | string | 1-2 line description |
| ingredients | json | Array of strings |
| price_cents | int | **Price in CENTS** (1190 = 11.90 €) |
| active | bool | Show on menu? |
| is_popular | bool | Show in "Populaire" section |
| tags | json | Array of strings (optional) |
| category | uuid (M2O) | FK → categories.id |
| image | file | Directus file reference |

### offers
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| title | string | Offer headline |
| content | text | Rich description |
| start_at | datetime | Start of validity (nullable) |
| end_at | datetime | End of validity (nullable) |
| active | bool | Master toggle |
| image | file | Banner image (optional) |

### home_hero_slides
| Field | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| title | string | Slide title |
| subtitle | string | Subtitle (optional) |
| badge | string | Badge text (optional) |
| cta_label | string | CTA button text |
| cta_target | string | CTA link URL |
| price_cents | int | Price in cents (optional) |
| active | bool | Show on home? |
| order | int | Sort order (ASC) |
| image | file | Background image |

## Data Flow

```
Page (React)
  ↓ calls
repo.getProducts() / repo.getOffers() / etc.
  ↓
repo = DirectusRepository (if NEXT_PUBLIC_DIRECTUS_URL is set)
     | MockRepository (fallback)
  ↓
withFallback(directusCall, mockCall)  ← resilient wrapper
  ↓
Directus REST API  ──timeout 5s──→  if fails → mock data
```

## Filtering Rules

| Data | Rule |
|---|---|
| Products | `active=true` only |
| Popular | `active=true` AND `is_popular=true` |
| Categories | `active=true`, sorted by `order ASC` |
| Offers | `active=true` AND within `start_at`/`end_at` window |
| Hero slides | `active=true`, sorted by `order ASC` |

## Images

Images are served via Directus asset endpoint:

```
{DIRECTUS_URL}/assets/{file_id}?width=600&fit=cover
```

The `assetUrl()` helper in `src/config/cms.ts` builds these URLs. It accepts optional `width`, `height`, and `fit` parameters for on-the-fly transforms.

## Caching (ISR)

| Data | Revalidate |
|---|---|
| Home (hero slides) | 120s |
| Menu (products, categories) | 120s |
| Offers | 60s |

Configured in `src/config/cms.ts` via `REVALIDATE` constant.

## How to Modify the Menu

1. **Add a product**: Go to Directus admin → Products → Create. Fill name, slug, price_cents, category, set `active=true`.
2. **Disable a product**: Set `active=false` → disappears from menu within ~120s.
3. **Change price**: Update `price_cents` (in cents!) → visible within ~120s.
4. **Edit ingredients**: Click the ingredients field → add/remove tags.
5. **Add a category**: Categories → Create. Set order to control position.
6. **Create an offer**: Offers → Create. Set start_at/end_at for time-limited display.
7. **Update hero carousel**: Home Hero Slides → edit/reorder. Change `order` to reposition.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_DIRECTUS_URL` | Yes | Directus server URL (e.g. `http://localhost:8055`) |
| `DIRECTUS_STATIC_TOKEN` | No | API token (only if Public role not configured) |

## Fallback Behavior

- If `NEXT_PUBLIC_DIRECTUS_URL` is not set → MockRepository is used (console warning).
- If Directus is unreachable → `withFallback()` catches the error and falls back to MockRepository.
- The site never crashes due to CMS unavailability.

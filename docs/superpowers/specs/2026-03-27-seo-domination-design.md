# SEO Domination Strategy — ShopBaas

**Date:** 2026-03-27
**Status:** Approved
**Goal:** Rank #1 in Google.nl for Dutch supermarket deal queries

## Context

ShopBaas already has: GA4, GSC, weekly blog posts with Article schema, structured data (Organization, WebSite, FAQPage, MobileApp, BreadcrumbList on 1 page), dynamic deal.html with OG tags, sitemap (11 URLs), clean URLs.

**Gap:** No store-specific landing pages, no Product/Offer schema on deals, /deal/ blocked in robots.txt, static 11-URL sitemap, no evergreen content, limited internal linking.

**Competitive edge:** No competitor implements Product/Offer schema at the deal level. This gives us rich snippets (price, availability, valid dates) = 20-30% higher CTR.

## 1. Store Landing Pages (Static, Auto-Generated)

### Pages
8 store pages at `/aanbiedingen/{store-slug}`:
- `/aanbiedingen/albert-heijn`
- `/aanbiedingen/jumbo`
- `/aanbiedingen/lidl`
- `/aanbiedingen/aldi`
- `/aanbiedingen/plus`
- `/aanbiedingen/dirk`
- `/aanbiedingen/kruidvat`
- `/aanbiedingen/etos`

Plus an index page at `/aanbiedingen` listing all stores.

### Title Pattern
`{Store} Aanbiedingen Week {N} — Alle {Store-specific} Deals | ShopBaas`

Store-specific keywords: AH = "AH Bonus", Jumbo = "Jumbo", Lidl = "Lidl", etc.

### Page Content
- Hero: store name, logo, week number, deal count, date range (e.g., "23 maart – 29 maart 2026")
- Top deals grid: 8-12 best deals scored by discount %, with images, prices, discount badges
- Full deal list grouped by category (Zuivel, Dranken, Vlees, etc.)
- Store info section (when new deals publish, store description)
- CTA: download app
- Internal links: other store pages, this week's blog post, evergreen pages

### Schema Markup Per Store Page
- **BreadcrumbList:** `ShopBaas > Aanbiedingen > {Store} > Week {N}`
- **ItemList:** top deals as ListItems (enables Google carousel)
- **Product/Offer:** on each deal shown (name, brand, price, priceCurrency, priceValidUntil, seller, availability, image)
- **FAQPage:** 3-4 store-specific Q&As ("Wanneer komen nieuwe {store} aanbiedingen?", "Hoeveel deals heeft {store} deze week?", "Hoe kan ik {store} deals vergelijken?")

### Generator Script
New file: `~/slimmer-admin/scrapers/generate-store-pages.js`
- Same pattern as `generate-blog.js`: reads CSVs from `scrapers/output/week N/`
- Outputs to `~/slimmer-app/shopbaas-website/aanbiedingen/`
- Reuses deal scoring logic from blog generator
- Generates index page + 8 store pages per week
- Hooked into scrape pipeline (deal-watcher.js, scheduled-scrape.js)

### Design Style
- Matches existing website dark theme (--bg, --surface, --accent, etc.)
- Responsive mobile-first
- Same nav/footer as other pages
- GA4 tracking + consent mode

## 2. Enhanced Deal Pages (Cloud Function)

### Current State
- `deal.html` fetches from Firestore client-side, updates OG tags via JS
- `/deal/` blocked in robots.txt
- No JSON-LD structured data

### Changes
- **Cloud Function `dealPage`:** Render HTML server-side with Product/Offer JSON-LD baked in
  - Read deal doc from Firestore
  - Inject: title, meta description, OG tags, Product/Offer schema, BreadcrumbList
  - Return complete HTML (no client-side fetch needed for SEO-critical content)
- **Unblock in robots.txt:** Remove `Disallow: /deal/`
- **Add to sitemap:** Deal pages included in `sitemap-deals.xml`

### Product/Offer Schema on Deal Pages
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{product_name}",
  "brand": { "@type": "Brand", "name": "{brand}" },
  "image": "{imageUrl}",
  "description": "{product_name} aanbieding bij {store}",
  "offers": {
    "@type": "Offer",
    "url": "https://shopbaas.nl/deal/{id}",
    "priceCurrency": "EUR",
    "price": "{salePrice}",
    "priceValidUntil": "{valid_until}",
    "availability": "https://schema.org/InStock",
    "seller": { "@type": "Organization", "name": "{store}" }
  }
}
```

### BreadcrumbList on Deal Pages
`ShopBaas > Aanbiedingen > {Store} > {Product Name}`

## 3. Dynamic Sitemap

### Structure
Use a sitemap index pointing to sub-sitemaps:

**`sitemap.xml`** (index):
- `sitemap-pages.xml` — core pages (index, download, privacy, terms, aanbiedingen-vergelijken, blog)
- `sitemap-stores.xml` — 8 store landing pages + /aanbiedingen index
- `sitemap-blog.xml` — all blog posts
- `sitemap-deals.xml` — current week's deal pages (1000+ URLs)

### Generation
Extend `generate-store-pages.js` to also regenerate all sitemaps.
Or a shared `generate-sitemap.js` called by both blog and store generators.

### Freshness
- `sitemap-deals.xml`: `<changefreq>weekly</changefreq>`, `<lastmod>` = generation date
- Store pages: `<changefreq>weekly</changefreq>`, priority 0.9
- Blog posts: `<changefreq>yearly</changefreq>` (old weeks), `<changefreq>weekly</changefreq>` (current)

## 4. Evergreen Content Pages (Static)

### `/aanbiedingen` — Store Index
- Grid of 8 store cards linking to individual store pages
- Brief intro text: "Vergelijk alle supermarkt aanbiedingen per winkel"
- BreadcrumbList: `ShopBaas > Aanbiedingen`

### `/goedkoopste-supermarkt` — Data-Driven Comparison
- Title: "Goedkoopste Supermarkt 2026 — Welke Supermarkt is het Goedkoopst? | ShopBaas"
- Content: comparison table using real deal data (avg discount %, deal count, price ranges per store)
- Updated weekly by generator (data-driven, not opinion)
- Keywords: "goedkoopste supermarkt", "goedkoopste supermarkt 2026", "welke supermarkt is het goedkoopst"
- FAQPage schema

### `/boodschappen-besparen` — Tips Article
- Title: "Boodschappen Besparen: 15 Slimme Tips om te Besparen op je Boodschappen | ShopBaas"
- Evergreen content with actionable tips
- Links to store pages and app download
- Keywords: "boodschappen besparen", "besparen op boodschappen", "slimmer boodschappen doen"
- FAQPage schema

## 5. Cross-Cutting Improvements

### BreadcrumbList on All Pages
Every page gets BreadcrumbList JSON-LD:
- Homepage: just `ShopBaas`
- Blog index: `ShopBaas > Blog`
- Blog post: `ShopBaas > Blog > Week {N}`
- Store page: `ShopBaas > Aanbiedingen > {Store}`
- Evergreen: `ShopBaas > {Page Title}`

### ItemList Schema on Blog Posts
Wrap the top deals section in ItemList schema — enables Google to show a carousel of deals in search results.

### Homepage Navigation
Add to nav: `Blog` and `Aanbiedingen` links.
Add to footer: links to all store pages, blog, evergreen pages (internal link juice).

### Internal Linking Mesh
- Store pages link to: blog post for same week, other store pages, evergreen pages, app download
- Blog posts link to: relevant store pages, evergreen pages, app download
- Evergreen pages link to: store pages, blog, app download
- Homepage links to: all of the above

## 6. Firebase Configuration

### New Rewrites (firebase.json)
```json
{ "source": "/aanbiedingen", "destination": "/aanbiedingen/index.html" },
{ "source": "/aanbiedingen/albert-heijn", "destination": "/aanbiedingen/albert-heijn.html" },
{ "source": "/aanbiedingen/jumbo", "destination": "/aanbiedingen/jumbo.html" },
... (all 8 stores)
{ "source": "/goedkoopste-supermarkt", "destination": "/goedkoopste-supermarkt.html" },
{ "source": "/boodschappen-besparen", "destination": "/boodschappen-besparen.html" }
```

Note: `cleanUrls: true` may handle this automatically — verify.

### robots.txt Update
```
User-agent: *
Allow: /
Allow: /aanbiedingen/
Allow: /blog/
Allow: /deal/
Sitemap: https://shopbaas.nl/sitemap.xml
```

## 7. Pipeline Integration

### Trigger Flow
```
Scraper runs → CSVs saved → auto-process.js → generate-blog.js + generate-store-pages.js → firebase deploy
```

Both generators are called from:
- `deal-watcher.js` (on new deal detection)
- `scheduled-scrape.js` (on scheduled runs)
- Manual: `node generate-store-pages.js [--week N]`

## Expected Impact

### New Indexable URLs
- 9 store pages (8 stores + index) per week
- 1000+ deal pages per week (via Cloud Function)
- 2-3 evergreen pages
- From 11 URLs → potentially 1000+ indexed pages

### Target Keywords Captured
| Keyword | Page |
|---------|------|
| "supermarkt aanbiedingen" | homepage + /aanbiedingen |
| "ah bonus week {N}" | /aanbiedingen/albert-heijn |
| "jumbo aanbiedingen deze week" | /aanbiedingen/jumbo |
| "lidl aanbiedingen week {N}" | /aanbiedingen/lidl |
| "{store} aanbiedingen" | /aanbiedingen/{store} |
| "goedkoopste supermarkt 2026" | /goedkoopste-supermarkt |
| "boodschappen besparen" | /boodschappen-besparen |
| "{product} aanbieding" | /deal/{id} |
| "supermarkt aanbiedingen week {N}" | /blog/week-{N} |

### Rich Snippets
- Product/Offer schema → price, validity, availability in search results
- FAQPage schema → expandable Q&As in search results
- ItemList schema → carousel of deals in search results
- BreadcrumbList → navigation path in search results

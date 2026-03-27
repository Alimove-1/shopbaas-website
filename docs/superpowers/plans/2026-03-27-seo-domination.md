# SEO Domination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build store landing pages, enhance deal pages with Product/Offer schema, create dynamic sitemaps, and add evergreen content to dominate Dutch supermarket deal search queries.

**Architecture:** Static HTML pages generated from scraper CSV data (same pattern as generate-blog.js), enhanced Cloud Function for deal pages with server-side JSON-LD, sitemap index with sub-sitemaps. All generators hooked into existing scrape pipeline.

**Tech Stack:** Node.js (generator scripts), Firebase Hosting (static pages), Firebase Cloud Functions (deal page SSR), HTML/CSS (dark theme matching existing site)

---

### Task 1: Store Page Generator — Core Script Setup

**Files:**
- Create: `~/slimmer-admin/scrapers/generate-store-pages.js`

This task creates the generator script skeleton with shared utilities from generate-blog.js and the main() entry point.

- [ ] **Step 1: Create generator script with shared utilities and CLI**

```javascript
#!/usr/bin/env node
/**
 * generate-store-pages.js — Auto-generate SEO store landing pages from scraper CSVs
 *
 * Usage:
 *   node generate-store-pages.js              # current week
 *   node generate-store-pages.js --week 13    # specific week
 *   node generate-store-pages.js --all        # all available weeks
 */

const fs = require('fs');
const path = require('path');

// Paths
const OUTPUT_DIR = path.join(__dirname, 'output');
const WEBSITE_DIR = path.join(__dirname, '..', '..', 'slimmer-app', 'shopbaas-website');
const STORE_PAGES_DIR = path.join(WEBSITE_DIR, 'aanbiedingen');

// Store display names, slugs, colors, keywords (reused from generate-blog.js)
const STORE_ORDER = ['Albert Heijn', 'Jumbo', 'Lidl', 'Aldi', 'Plus', 'Dirk', 'Kruidvat', 'Etos'];
const STORE_SLUGS = {
  'Albert Heijn': 'albert-heijn', 'Jumbo': 'jumbo', 'Lidl': 'lidl',
  'Aldi': 'aldi', 'Plus': 'plus', 'Dirk': 'dirk', 'Kruidvat': 'kruidvat', 'Etos': 'etos'
};
const STORE_COLORS = {
  'Albert Heijn': '#00a0e2', 'Jumbo': '#ffc800', 'Lidl': '#0050aa',
  'Aldi': '#00569d', 'Plus': '#43a047', 'Dirk': '#e53935', 'Kruidvat': '#00843d', 'Etos': '#e91e63'
};
// Store-specific SEO keyword prefixes (e.g. "AH Bonus" for Albert Heijn)
const STORE_KEYWORDS = {
  'Albert Heijn': 'ah bonus', 'Jumbo': 'jumbo deals', 'Lidl': 'lidl',
  'Aldi': 'aldi', 'Plus': 'plus supermarkt', 'Dirk': 'dirk van den broek',
  'Kruidvat': 'kruidvat', 'Etos': 'etos'
};
// Store descriptions for SEO content
const STORE_DESCRIPTIONS = {
  'Albert Heijn': 'Albert Heijn is de grootste supermarktketen van Nederland. De AH Bonus aanbiedingen worden elke zondag vernieuwd en lopen van maandag tot en met zondag.',
  'Jumbo': 'Jumbo is de tweede supermarkt van Nederland. Nieuwe Jumbo aanbiedingen starten elke woensdag en lopen tot en met dinsdag van de volgende week.',
  'Lidl': 'Lidl biedt elke week scherpe aanbiedingen op A-merken en huismerkproducten. Nieuwe Lidl folders verschijnen op zondag.',
  'Aldi': 'Aldi staat bekend om lage dagprijzen en wekelijkse aanbiedingen. Nieuwe Aldi deals verschijnen op zondag.',
  'Plus': 'Plus is een Nederlandse supermarktketen met wekelijks verse aanbiedingen. Nieuwe Plus deals starten op woensdag.',
  'Dirk': 'Dirk van den Broek is bekend om zijn lage prijzen. Nieuwe Dirk aanbiedingen starten op woensdag.',
  'Kruidvat': 'Kruidvat is de grootste drogist van Nederland. Wekelijks nieuwe aanbiedingen op verzorging, gezondheid en huishouden.',
  'Etos': 'Etos biedt elke week aanbiedingen op verzorging, gezondheid, baby en huishouden. Nieuwe Etos deals verschijnen op zondag.'
};
// Store deal day info for FAQ
const STORE_DEAL_DAYS = {
  'Albert Heijn': { start: 'maandag', publish: 'zondag', end: 'zondag' },
  'Jumbo': { start: 'woensdag', publish: 'dinsdag', end: 'dinsdag' },
  'Lidl': { start: 'maandag', publish: 'zondag', end: 'zondag' },
  'Aldi': { start: 'maandag', publish: 'zondag', end: 'zondag' },
  'Plus': { start: 'woensdag', publish: 'dinsdag', end: 'dinsdag' },
  'Dirk': { start: 'woensdag', publish: 'dinsdag', end: 'dinsdag' },
  'Kruidvat': { start: 'maandag', publish: 'zondag', end: 'zondag' },
  'Etos': { start: 'maandag', publish: 'zondag', end: 'zondag' }
};

// Dutch month names
const MONTHS_NL = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];

// Get ISO week number
function getISOWeek(d) {
  const date = new Date(d.getTime());
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7) + 1;
}

// Get Monday of ISO week
function getMondayOfWeek(week, year) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

// Format date as "3 april"
function formatDateNL(d) {
  return `${d.getDate()} ${MONTHS_NL[d.getMonth()]}`;
}

// Parse CSV line (handles semicolons in quoted fields)
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ';' && !inQuotes) { fields.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  fields.push(current.trim());
  return fields;
}

// Read all deals from a week folder
function readWeekDeals(weekNum) {
  const weekDir = path.join(OUTPUT_DIR, `week ${weekNum}`);
  if (!fs.existsSync(weekDir)) {
    console.error(`No data for week ${weekNum} at ${weekDir}`);
    return null;
  }

  const csvFiles = fs.readdirSync(weekDir).filter(f => f.endsWith('.csv'));
  if (csvFiles.length === 0) {
    console.error(`No CSV files in week ${weekNum}`);
    return null;
  }

  const allDeals = [];
  for (const file of csvFiles) {
    const content = fs.readFileSync(path.join(weekDir, file), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) continue;

    const headers = parseCSVLine(lines[0]);
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 10) continue;

      const deal = {};
      headers.forEach((h, idx) => { deal[h] = fields[idx] || ''; });

      deal.offer_price_num = parseFloat(deal.offer_price) || 0;
      deal.regular_price_num = parseFloat(deal.regular_unit_price) || 0;
      deal.percent_off_num = parseInt(deal.percent_off) || 0;
      deal.bundle_for_price_num = parseFloat(deal.bundle_for_price) || 0;

      if (!deal.percent_off_num && deal.regular_price_num && deal.offer_price_num) {
        deal.percent_off_num = Math.round((1 - deal.offer_price_num / deal.regular_price_num) * 100);
      }

      allDeals.push(deal);
    }
  }

  return allDeals;
}

// Score and sort deals (higher = more interesting)
function scoreDeals(deals) {
  return deals.map(d => {
    let score = d.percent_off_num || 0;
    if (d.promo_type === 'SECOND_ITEM_FREE') score += 50;
    if (d.promo_type === 'BUY_X_GET_Y_FREE') score += 40;
    if (d.promo_type === 'SECOND_ITEM_HALF_PRICE') score += 25;
    if (d.brand) score += 5;
    if (d.offer_price_num > 0) score += 10;
    if (d.image_url) score += 3;
    return { ...d, score };
  }).sort((a, b) => b.score - a.score);
}

// Format deal promo text
function formatDealText(deal) {
  if (deal.promo_type === 'SECOND_ITEM_FREE') return '2e gratis';
  if (deal.promo_type === 'SECOND_ITEM_HALF_PRICE') return '2e halve prijs';
  if (deal.promo_type === 'BUY_X_GET_Y_FREE') {
    return `${deal.buy_qty || 2} + ${deal.get_qty_free || 1} gratis`;
  }
  if (deal.promo_type === 'QUANTITY_FOR_PRICE' && deal.bundle_for_price_num) {
    return `${deal.bundle_qty || 2} voor €${deal.bundle_for_price_num.toFixed(2).replace('.', ',')}`;
  }
  if (deal.promo_type === 'STACKING_DISCOUNT') return 'Stapelkorting';

  const parts = [];
  if (deal.percent_off_num) parts.push(`${deal.percent_off_num}% korting`);
  if (deal.offer_price_num) parts.push(`€${deal.offer_price_num.toFixed(2).replace('.', ',')}`);

  return parts.join(' — ') || deal.conditions_text || 'Aanbieding';
}

// Escape HTML
function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Escape for JSON-LD (double-escape quotes)
function escJson(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// Detect year from deal dates in CSV
function detectYear(deals) {
  for (const d of deals) {
    if (d.valid_until && d.valid_until.includes('-')) {
      const parts = d.valid_until.split('-');
      const year = parts.find(p => p.length === 4);
      if (year) return parseInt(year);
    }
  }
  return new Date().getFullYear();
}

// Calculate stats for deals
function calcStats(deals) {
  const stores = new Set(deals.map(d => d.store));
  let maxDiscount = 0;
  for (const d of deals) {
    if (d.percent_off_num > maxDiscount) maxDiscount = d.percent_off_num;
  }
  return { totalDeals: deals.length, storeCount: stores.size, maxDiscount, stores: [...stores] };
}

// Group deals by category
function groupByCategory(deals) {
  const groups = {};
  for (const d of deals) {
    const cat = d.category || 'Overig';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(d);
  }
  // Sort categories by deal count (most deals first)
  return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
}

// ─── PLACEHOLDER: generateStorePageHTML() added in Task 2 ───
// ─── PLACEHOLDER: generateStoreIndexHTML() added in Task 3 ───
// ─── PLACEHOLDER: generateSitemaps() added in Task 5 ───

// Main
function main() {
  const args = process.argv.slice(2);
  let weekNums = [];

  if (args.includes('--all')) {
    const folders = fs.readdirSync(OUTPUT_DIR).filter(f => f.startsWith('week '));
    weekNums = folders.map(f => parseInt(f.replace('week ', ''))).filter(n => !isNaN(n)).sort((a, b) => a - b);
    console.log(`Generating store pages for ${weekNums.length} weeks...`);
  } else if (args.includes('--week')) {
    const idx = args.indexOf('--week');
    weekNums = [parseInt(args[idx + 1])];
  } else {
    weekNums = [getISOWeek(new Date())];
  }

  if (!fs.existsSync(STORE_PAGES_DIR)) fs.mkdirSync(STORE_PAGES_DIR, { recursive: true });

  const MIN_DEALS = 50;
  const MIN_STORES = 3;

  for (const weekNum of weekNums) {
    console.log(`\nWeek ${weekNum}:`);
    const allDeals = readWeekDeals(weekNum);
    if (!allDeals || allDeals.length === 0) { console.log('  Skipped (no data)'); continue; }
    if (allDeals.length < MIN_DEALS) { console.log(`  Skipped (${allDeals.length} deals < ${MIN_DEALS} minimum)`); continue; }

    const year = detectYear(allDeals);
    const globalStats = calcStats(allDeals);
    if (globalStats.storeCount < MIN_STORES) { console.log(`  Skipped (${globalStats.storeCount} stores < ${MIN_STORES} minimum)`); continue; }

    const monday = getMondayOfWeek(weekNum, year);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const dateRange = `${formatDateNL(monday)} – ${formatDateNL(sunday)} ${year}`;

    // Group deals by store
    const byStore = {};
    for (const d of allDeals) {
      const store = d.store || 'Onbekend';
      if (!byStore[store]) byStore[store] = [];
      byStore[store].push(d);
    }

    // Generate individual store pages
    for (const store of STORE_ORDER) {
      if (!byStore[store] || byStore[store].length === 0) continue;
      const storeDeals = byStore[store];
      const scored = scoreDeals(storeDeals);
      const topDeals = scored.slice(0, 12);
      const categories = groupByCategory(storeDeals);

      const html = generateStorePageHTML(store, weekNum, year, dateRange, topDeals, storeDeals, categories, monday, sunday);
      const slug = STORE_SLUGS[store];
      const filePath = path.join(STORE_PAGES_DIR, `${slug}.html`);
      fs.writeFileSync(filePath, html);
      console.log(`  ${store}: ${storeDeals.length} deals → aanbiedingen/${slug}.html`);
    }

    // Generate store index page
    const indexHTML = generateStoreIndexHTML(weekNum, year, dateRange, byStore, globalStats);
    fs.writeFileSync(path.join(STORE_PAGES_DIR, 'index.html'), indexHTML);
    console.log(`  Store index → aanbiedingen/index.html`);
  }

  // Generate sitemaps (uses latest week data)
  generateSitemaps();

  console.log('\nDone! Deploy with: cd ~/slimmer-app/shopbaas-website && firebase deploy --only hosting --project slimmer-383d4');
}

main();
```

- [ ] **Step 2: Verify the script runs without errors (placeholders will be defined in later tasks)**

Run: `cd ~/slimmer-admin/scrapers && node generate-store-pages.js --week 13 2>&1 | head -5`
Expected: Error about `generateStorePageHTML is not a function` (placeholder not yet implemented)

- [ ] **Step 3: Commit**

```bash
cd ~/slimmer-admin && git add scrapers/generate-store-pages.js && git commit -m "feat: add store page generator skeleton with CLI and shared utilities"
```

---

### Task 2: Store Page Generator — Individual Store Page HTML

**Files:**
- Modify: `~/slimmer-admin/scrapers/generate-store-pages.js` (replace the `generateStorePageHTML` placeholder)

This task implements the HTML template for individual store pages with all schema markup (Product/Offer, ItemList, BreadcrumbList, FAQPage).

- [ ] **Step 1: Replace the `generateStorePageHTML` placeholder with the full implementation**

Find the line `// ─── PLACEHOLDER: generateStorePageHTML() added in Task 2 ───` and replace it with:

```javascript
// Generate individual store page HTML
function generateStorePageHTML(store, weekNum, year, dateRange, topDeals, allStoreDeals, categories, monday, sunday) {
  const slug = STORE_SLUGS[store];
  const color = STORE_COLORS[store] || '#6c5ce7';
  const kw = STORE_KEYWORDS[store] || store.toLowerCase();
  const desc = STORE_DESCRIPTIONS[store] || '';
  const dealDay = STORE_DEAL_DAYS[store] || { start: 'maandag', publish: 'zondag', end: 'zondag' };
  const url = `https://shopbaas.nl/aanbiedingen/${slug}`;
  const title = `${store} Aanbiedingen Week ${weekNum} — Alle ${store === 'Albert Heijn' ? 'AH Bonus' : store} Deals | ShopBaas`;
  const metaDesc = `Bekijk alle ${allStoreDeals.length} ${store} aanbiedingen van week ${weekNum} (${dateRange}). Vergelijk deals en bespaar op je boodschappen met ShopBaas.`;

  // Format valid_until for schema (ISO date)
  const validUntil = `${year}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

  // Build Product/Offer JSON-LD for top deals (ItemList wrapping)
  const itemListItems = topDeals.map((d, idx) => {
    const itemJson = {
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "Product",
        "name": d.product_name || 'Aanbieding',
        "description": `${d.product_name || 'Aanbieding'} aanbieding bij ${store}`,
        "brand": d.brand ? { "@type": "Brand", "name": d.brand } : undefined,
        "image": d.image_url || "https://shopbaas.nl/og-cover.jpg",
        "offers": {
          "@type": "Offer",
          "priceCurrency": "EUR",
          "price": d.offer_price_num > 0 ? d.offer_price_num.toFixed(2) : undefined,
          "priceValidUntil": validUntil,
          "availability": "https://schema.org/InStock",
          "seller": { "@type": "Organization", "name": store }
        }
      }
    };
    // Remove undefined fields
    if (!itemJson.item.brand) delete itemJson.item.brand;
    if (!itemJson.item.offers.price) delete itemJson.item.offers.price;
    return itemJson;
  });

  const itemListSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${store} aanbiedingen week ${weekNum}`,
    "numberOfItems": topDeals.length,
    "itemListElement": itemListItems
  }, null, 2);

  // BreadcrumbList schema
  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "ShopBaas", "item": "https://shopbaas.nl" },
      { "@type": "ListItem", "position": 2, "name": "Aanbiedingen", "item": "https://shopbaas.nl/aanbiedingen" },
      { "@type": "ListItem", "position": 3, "name": store, "item": url }
    ]
  }, null, 2);

  // FAQPage schema
  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Wanneer komen nieuwe ${store} aanbiedingen?`,
        "acceptedAnswer": { "@type": "Answer", "text": `Nieuwe ${store} aanbiedingen worden gepubliceerd op ${dealDay.publish} en starten op ${dealDay.start}. De deals lopen tot en met ${dealDay.end}.` }
      },
      {
        "@type": "Question",
        "name": `Hoeveel ${store} deals zijn er deze week?`,
        "acceptedAnswer": { "@type": "Answer", "text": `Deze week (week ${weekNum}) heeft ${store} ${allStoreDeals.length} aanbiedingen. Bekijk ze allemaal op ShopBaas.` }
      },
      {
        "@type": "Question",
        "name": `Hoe kan ik ${store} aanbiedingen vergelijken met andere supermarkten?`,
        "acceptedAnswer": { "@type": "Answer", "text": `Met de gratis ShopBaas app vergelijk je ${store} aanbiedingen met 7 andere supermarkten. Download de app en zie direct welke supermarkt de beste deal heeft.` }
      }
    ]
  }, null, 2);

  // Top deals HTML
  const topDealsHTML = topDeals.map(d => `
          <div class="deal-card">
            ${d.image_url ? `<img src="${esc(d.image_url)}" alt="${esc(d.product_name)}" class="deal-card-img" loading="lazy"/>` : `<div class="deal-card-img-ph"></div>`}
            <div class="deal-card-body">
              <span class="deal-card-name">${esc(d.product_name)}${d.brand ? ` <span class="deal-card-brand">${esc(d.brand)}</span>` : ''}${d.size ? ` <span class="deal-card-size">${esc(d.size)}</span>` : ''}</span>
              <span class="deal-card-promo">${esc(formatDealText(d))}</span>
            </div>
            ${d.regular_price_num ? `<div class="deal-card-prices"><span class="price-old">€${d.regular_price_num.toFixed(2).replace('.',',')}</span>${d.offer_price_num ? `<span class="price-new">€${d.offer_price_num.toFixed(2).replace('.',',')}</span>` : ''}</div>` : ''}
          </div>`).join('');

  // Category sections HTML (all deals grouped)
  const categorySectionsHTML = categories.map(([cat, deals]) => {
    const dealRows = deals.slice(0, 20).map(d => `
            <div class="cat-deal">
              <span class="cat-deal-name">${esc(d.product_name)}${d.size ? ` <span class="cat-deal-size">${esc(d.size)}</span>` : ''}</span>
              <span class="cat-deal-promo">${esc(formatDealText(d))}</span>
            </div>`).join('');
    return `
          <details class="cat-section">
            <summary class="cat-header"><span class="cat-name">${esc(cat)}</span><span class="cat-count">${deals.length} deals</span></summary>
            <div class="cat-deals">${dealRows}
            </div>
          </details>`;
  }).join('');

  // Other store links
  const otherStoreLinks = STORE_ORDER
    .filter(s => s !== store)
    .map(s => `<a href="/aanbiedingen/${STORE_SLUGS[s]}" class="other-store-link"><span class="store-dot-sm" style="background:${STORE_COLORS[s]}"></span>${s}</a>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8ETV9YR5BT"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
gtag('js', new Date());
gtag('config', 'G-8ETV9YR5BT');
</script>
<title>${esc(title)}</title>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
<meta name="description" content="${esc(metaDesc)}"/>
<meta name="keywords" content="${kw} aanbiedingen, ${kw} week ${weekNum}, ${kw} aanbiedingen deze week, ${store.toLowerCase()} deals, ${store.toLowerCase()} korting, supermarkt aanbiedingen"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(metaDesc)}"/>
<meta property="og:image" content="https://shopbaas.nl/og-cover.jpg"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:type" content="website"/>
<meta property="og:locale" content="nl_NL"/>
<meta property="og:site_name" content="ShopBaas"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(metaDesc)}"/>
<link rel="canonical" href="${esc(url)}"/>
<link rel="stylesheet" href="/fonts/fonts.css"/>
<script type="application/ld+json">${itemListSchema}</script>
<script type="application/ld+json">${breadcrumbSchema}</script>
<script type="application/ld+json">${faqSchema}</script>
<style>
:root{--bg:#06080d;--surface:#0e1117;--surface2:#161b26;--card:#111723;--accent:#6c5ce7;--accent2:#a29bfe;--green:#00e5a0;--text:#f0f2f8;--muted:#8b93b3;--border:rgba(255,255,255,.06);--radius:16px;--store-color:${color}}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
a{color:var(--accent2);text-decoration:none}
a:hover{text-decoration:underline}

/* Nav */
.nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(6,8,13,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.nav-inner{max-width:1000px;margin:0 auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-family:'Outfit',sans-serif;font-weight:800;font-size:22px;background:linear-gradient(135deg,var(--accent),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}
.nav-links{display:flex;gap:20px;align-items:center}
.nav-links a{color:var(--muted);font-size:14px;text-decoration:none;transition:color .2s}
.nav-links a:hover{color:var(--text)}
.nav-cta{background:linear-gradient(135deg,var(--accent),#8b7cf7);color:#fff!important;padding:8px 18px;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none!important}

/* Hero */
.hero{max-width:1000px;margin:0 auto;padding:100px 24px 40px}
.breadcrumb{font-size:13px;color:var(--muted);margin-bottom:20px}
.breadcrumb a{color:var(--muted);text-decoration:none}
.breadcrumb a:hover{color:var(--text)}
.hero-store{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.hero-logo{width:48px;height:48px}
.hero h1{font-family:'Outfit',sans-serif;font-size:clamp(28px,4vw,42px);font-weight:800;line-height:1.2;letter-spacing:-1px;background:linear-gradient(135deg,var(--text) 40%,var(--store-color));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero-meta{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}
.meta-badge{background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.2);color:var(--green);padding:4px 12px;border-radius:50px;font-size:12px;font-weight:600}
.hero-desc{color:var(--muted);font-size:16px;margin-top:16px;max-width:700px}

/* Content */
.content{max-width:1000px;margin:0 auto;padding:0 24px 60px}

/* Top deals */
.section-title{font-family:'Outfit',sans-serif;font-size:22px;font-weight:700;margin:40px 0 16px;color:var(--text)}
.top-deals{display:flex;flex-direction:column;gap:8px}
.deal-card{display:flex;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px;transition:border-color .2s}
.deal-card:hover{border-color:rgba(108,92,231,.3)}
.deal-card-img{width:56px;height:56px;border-radius:10px;object-fit:cover;background:var(--surface2);flex-shrink:0}
.deal-card-img-ph{width:56px;height:56px;border-radius:10px;background:var(--surface2);flex-shrink:0}
.deal-card-body{flex:1;min-width:0}
.deal-card-name{display:block;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.deal-card-brand{color:var(--muted);font-weight:400}
.deal-card-size{color:var(--muted);font-size:12px}
.deal-card-promo{display:inline-block;font-size:12px;color:var(--green);font-weight:600;margin-top:2px}
.deal-card-prices{text-align:right;flex-shrink:0}
.price-old{display:block;font-size:12px;color:var(--muted);text-decoration:line-through}
.price-new{display:block;font-size:16px;font-weight:700;color:var(--green)}

/* Category sections */
.cat-section{background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:8px}
.cat-header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;cursor:pointer;list-style:none;font-weight:600;font-size:15px}
.cat-header::-webkit-details-marker{display:none}
.cat-header::after{content:'\\25BC';font-size:10px;color:var(--muted);transition:transform .2s}
details[open] .cat-header::after{transform:rotate(180deg)}
.cat-count{font-size:12px;color:var(--muted);font-weight:400}
.cat-deals{padding:0 18px 14px}
.cat-deal{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-top:1px solid var(--border)}
.cat-deal-name{font-size:14px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:12px}
.cat-deal-size{color:var(--muted);font-size:12px}
.cat-deal-promo{font-size:13px;color:var(--green);font-weight:600;flex-shrink:0}

/* Other stores */
.other-stores{margin-top:48px}
.other-stores-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.other-store-link{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);padding:10px 16px;border-radius:10px;font-size:13px;color:var(--text);text-decoration:none!important;transition:border-color .2s}
.other-store-link:hover{border-color:var(--accent)}
.store-dot-sm{width:8px;height:8px;border-radius:50%;flex-shrink:0}

/* CTA */
.cta-box{background:linear-gradient(135deg,rgba(108,92,231,.12),rgba(0,229,160,.08));border:1px solid rgba(108,92,231,.2);border-radius:20px;padding:40px 32px;text-align:center;margin:48px 0}
.cta-box h3{font-family:'Outfit',sans-serif;font-size:24px;font-weight:700;margin-bottom:8px}
.cta-box p{color:var(--muted);margin-bottom:20px}
.cta-buttons{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
.cta-btn{display:inline-flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border);padding:12px 20px;border-radius:12px;color:var(--text);font-weight:600;font-size:14px;text-decoration:none!important;transition:border-color .2s}
.cta-btn:hover{border-color:var(--accent)}
.cta-btn-primary{background:linear-gradient(135deg,var(--accent),#8b7cf7);border-color:transparent;color:#fff}

/* Footer */
.site-footer{border-top:1px solid var(--border);padding:32px 24px;text-align:center;color:var(--muted);font-size:13px}
.site-footer a{color:var(--accent2)}

/* FAQ */
.faq-section{margin-top:48px}
.faq-item{background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:8px}
.faq-q{padding:16px 18px;cursor:pointer;list-style:none;font-weight:600;font-size:15px}
.faq-q::-webkit-details-marker{display:none}
.faq-q::after{content:'\\25BC';font-size:10px;color:var(--muted);margin-left:8px}
details[open] .faq-q::after{transform:rotate(180deg);display:inline-block}
.faq-a{padding:0 18px 16px;color:var(--muted);font-size:14px;line-height:1.8}

@media(max-width:600px){
  .hero{padding:80px 16px 32px}
  .content{padding:0 16px 40px}
  .deal-card{padding:10px 12px;gap:10px}
  .deal-card-img,.deal-card-img-ph{width:44px;height:44px}
  .nav-links a:not(.nav-cta){display:none}
}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo">ShopBaas</a>
    <div class="nav-links">
      <a href="/blog">Blog</a>
      <a href="/aanbiedingen">Aanbiedingen</a>
      <a href="/download" class="nav-cta">Download App</a>
    </div>
  </div>
</nav>

<header class="hero">
  <div class="breadcrumb"><a href="/">Home</a> › <a href="/aanbiedingen">Aanbiedingen</a> › ${esc(store)}</div>
  <div class="hero-store">
    <img src="/logos/${slug}.svg" alt="${esc(store)} logo" class="hero-logo" width="48" height="48"/>
    <div>
      <h1>${esc(store)} Aanbiedingen Week ${weekNum}</h1>
      <div class="hero-meta">
        <span class="meta-badge">${allStoreDeals.length} deals</span>
        <span class="meta-badge">${dateRange}</span>
        ${allStoreDeals.some(d => d.percent_off_num >= 40) ? '<span class="meta-badge">Tot ' + Math.max(...allStoreDeals.map(d => d.percent_off_num)) + '% korting</span>' : ''}
      </div>
    </div>
  </div>
  <p class="hero-desc">${esc(desc)}</p>
</header>

<main class="content">
  <h2 class="section-title">Top deals van ${esc(store)} deze week</h2>
  <div class="top-deals">${topDealsHTML}
  </div>

  <h2 class="section-title">Alle ${esc(store)} aanbiedingen per categorie</h2>
  ${categorySectionsHTML}

  <section class="faq-section">
    <h2 class="section-title">Veelgestelde vragen over ${esc(store)}</h2>
    <details class="faq-item">
      <summary class="faq-q">Wanneer komen nieuwe ${esc(store)} aanbiedingen?</summary>
      <p class="faq-a">Nieuwe ${esc(store)} aanbiedingen worden gepubliceerd op ${dealDay.publish} en starten op ${dealDay.start}. De deals lopen tot en met ${dealDay.end}.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Hoeveel ${esc(store)} deals zijn er deze week?</summary>
      <p class="faq-a">Deze week (week ${weekNum}) heeft ${esc(store)} ${allStoreDeals.length} aanbiedingen. Bekijk ze allemaal op ShopBaas of download de app voor meldingen.</p>
    </details>
    <details class="faq-item">
      <summary class="faq-q">Hoe vergelijk ik ${esc(store)} met andere supermarkten?</summary>
      <p class="faq-a">Met de gratis ShopBaas app vergelijk je ${esc(store)} aanbiedingen met 7 andere supermarkten. Zie direct welke winkel de beste deal heeft voor elk product.</p>
    </details>
  </section>

  <section class="other-stores">
    <h2 class="section-title">Bekijk ook aanbiedingen van</h2>
    <div class="other-stores-grid">${otherStoreLinks}</div>
  </section>

  <div class="cta-box">
    <h3>Alle ${allStoreDeals.length} ${esc(store)} deals in je broekzak</h3>
    <p>Download ShopBaas en mis nooit meer een aanbieding. Gratis, geen advertenties.</p>
    <div class="cta-buttons">
      <a href="https://apps.apple.com/nl/app/shopbaas/id6742043090" class="cta-btn" onclick="gtag('event','app_download',{store:'apple',source:'store_${slug}_week_${weekNum}'})">App Store</a>
      <a href="https://play.google.com/store/apps/details?id=com.shopbaas.app" class="cta-btn" onclick="gtag('event','app_download',{store:'google',source:'store_${slug}_week_${weekNum}'})">Google Play</a>
      <a href="/download" class="cta-btn cta-btn-primary">Meer info</a>
    </div>
  </div>
</main>

<footer class="site-footer">
  <p>&copy; ${year} <a href="/">ShopBaas</a> — Slimmer boodschappen doen. <a href="/privacy">Privacy</a> · <a href="/terms">Voorwaarden</a> · <a href="/blog">Blog</a></p>
</footer>

<script src="/cookie-consent.js"></script>
</body>
</html>`;
}
```

- [ ] **Step 2: Test store page generation**

Run: `cd ~/slimmer-admin/scrapers && node generate-store-pages.js --week 13 2>&1 | head -15`
Expected: Error about `generateStoreIndexHTML is not a function` (Task 3), but store pages should already be generated

- [ ] **Step 3: Commit**

```bash
cd ~/slimmer-admin && git add scrapers/generate-store-pages.js && git commit -m "feat: add store page HTML generator with Product/Offer, ItemList, BreadcrumbList, FAQ schemas"
```

---

### Task 3: Store Page Generator — Index Page + Sitemaps

**Files:**
- Modify: `~/slimmer-admin/scrapers/generate-store-pages.js` (replace remaining placeholders)

- [ ] **Step 1: Replace the `generateStoreIndexHTML` placeholder**

Find `// ─── PLACEHOLDER: generateStoreIndexHTML() added in Task 3 ───` and replace with:

```javascript
// Generate store index page (/aanbiedingen)
function generateStoreIndexHTML(weekNum, year, dateRange, byStore, globalStats) {
  const url = 'https://shopbaas.nl/aanbiedingen';
  const title = `Supermarkt Aanbiedingen Week ${weekNum} — Alle Deals per Winkel | ShopBaas`;
  const metaDesc = `Vergelijk ${globalStats.totalDeals} supermarkt aanbiedingen van week ${weekNum} (${dateRange}). Bekijk deals per winkel: Albert Heijn, Jumbo, Lidl, Aldi, Plus, Dirk, Kruidvat, Etos.`;

  const breadcrumbSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "ShopBaas", "item": "https://shopbaas.nl" },
      { "@type": "ListItem", "position": 2, "name": "Aanbiedingen", "item": url }
    ]
  }, null, 2);

  const storeCards = STORE_ORDER.map(store => {
    const deals = byStore[store] || [];
    if (deals.length === 0) return '';
    const slug = STORE_SLUGS[store];
    const color = STORE_COLORS[store];
    const maxDiscount = Math.max(...deals.map(d => d.percent_off_num || 0));
    return `
      <a href="/aanbiedingen/${slug}" class="store-card">
        <img src="/logos/${slug}.svg" alt="${esc(store)}" class="store-card-logo" width="40" height="40"/>
        <h2 class="store-card-name">${esc(store)}</h2>
        <span class="store-card-count">${deals.length} deals</span>
        ${maxDiscount > 0 ? `<span class="store-card-discount">Tot ${maxDiscount}% korting</span>` : ''}
      </a>`;
  }).filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8ETV9YR5BT"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', wait_for_update: 500 });
gtag('js', new Date());
gtag('config', 'G-8ETV9YR5BT');
</script>
<title>${esc(title)}</title>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/>
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
<meta name="description" content="${esc(metaDesc)}"/>
<meta name="keywords" content="supermarkt aanbiedingen, supermarkt deals, weekaanbiedingen, ah bonus, jumbo deals, lidl aanbiedingen, boodschappen vergelijken"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(metaDesc)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:type" content="website"/>
<meta property="og:locale" content="nl_NL"/>
<meta property="og:image" content="https://shopbaas.nl/og-cover.jpg"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="canonical" href="${esc(url)}"/>
<link rel="stylesheet" href="/fonts/fonts.css"/>
<script type="application/ld+json">${breadcrumbSchema}</script>
<style>
:root{--bg:#06080d;--surface:#0e1117;--surface2:#161b26;--accent:#6c5ce7;--accent2:#a29bfe;--green:#00e5a0;--text:#f0f2f8;--muted:#8b93b3;--border:rgba(255,255,255,.06);--radius:16px}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
a{color:var(--accent2);text-decoration:none}
.nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(6,8,13,.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.nav-inner{max-width:1000px;margin:0 auto;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{font-family:'Outfit',sans-serif;font-weight:800;font-size:22px;background:linear-gradient(135deg,var(--accent),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}
.nav-links{display:flex;gap:20px;align-items:center}
.nav-links a{color:var(--muted);font-size:14px;text-decoration:none;transition:color .2s}
.nav-links a:hover{color:var(--text)}
.nav-cta{background:linear-gradient(135deg,var(--accent),#8b7cf7);color:#fff!important;padding:8px 18px;border-radius:50px;font-size:13px;font-weight:600;text-decoration:none!important}
.page{max-width:1000px;margin:0 auto;padding:100px 24px 60px}
.breadcrumb{font-size:13px;color:var(--muted);margin-bottom:20px}
.breadcrumb a{color:var(--muted);text-decoration:none}
.page h1{font-family:'Outfit',sans-serif;font-size:clamp(28px,4vw,42px);font-weight:800;line-height:1.2;letter-spacing:-1px;margin-bottom:8px;background:linear-gradient(135deg,var(--text) 40%,var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.page-sub{color:var(--muted);font-size:17px;margin-bottom:12px}
.page-meta{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:40px}
.meta-badge{background:rgba(0,229,160,.08);border:1px solid rgba(0,229,160,.2);color:var(--green);padding:4px 12px;border-radius:50px;font-size:12px;font-weight:600}
.store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.store-card{display:flex;flex-direction:column;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px 20px;text-decoration:none!important;transition:border-color .2s,transform .2s}
.store-card:hover{border-color:rgba(108,92,231,.3);transform:translateY(-3px)}
.store-card-logo{width:40px;height:40px}
.store-card-name{font-family:'Outfit',sans-serif;font-size:17px;font-weight:700;color:var(--text)}
.store-card-count{font-size:13px;color:var(--muted)}
.store-card-discount{font-size:12px;color:var(--green);font-weight:600}
.cta-box{background:linear-gradient(135deg,rgba(108,92,231,.12),rgba(0,229,160,.08));border:1px solid rgba(108,92,231,.2);border-radius:20px;padding:40px 32px;text-align:center;margin:48px 0}
.cta-box h3{font-family:'Outfit',sans-serif;font-size:24px;font-weight:700;margin-bottom:8px}
.cta-box p{color:var(--muted);margin-bottom:20px}
.cta-buttons{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
.cta-btn{display:inline-flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--border);padding:12px 20px;border-radius:12px;color:var(--text);font-weight:600;font-size:14px;text-decoration:none!important}
.cta-btn-primary{background:linear-gradient(135deg,var(--accent),#8b7cf7);border-color:transparent;color:#fff}
.site-footer{border-top:1px solid var(--border);padding:32px 24px;text-align:center;color:var(--muted);font-size:13px}
.site-footer a{color:var(--accent2)}
@media(max-width:600px){.page{padding:80px 16px 40px}.store-grid{grid-template-columns:1fr 1fr}.nav-links a:not(.nav-cta){display:none}}
</style>
</head>
<body>
<nav class="nav"><div class="nav-inner"><a href="/" class="nav-logo">ShopBaas</a><div class="nav-links"><a href="/blog">Blog</a><a href="/aanbiedingen">Aanbiedingen</a><a href="/download" class="nav-cta">Download App</a></div></div></nav>
<main class="page">
  <div class="breadcrumb"><a href="/">Home</a> › Aanbiedingen</div>
  <h1>Supermarkt Aanbiedingen Week ${weekNum}</h1>
  <p class="page-sub">Vergelijk alle deals per supermarkt. Klik op een winkel voor alle aanbiedingen.</p>
  <div class="page-meta">
    <span class="meta-badge">${globalStats.totalDeals} deals totaal</span>
    <span class="meta-badge">${globalStats.storeCount} winkels</span>
    <span class="meta-badge">${dateRange}</span>
  </div>
  <div class="store-grid">${storeCards}</div>
  <div class="cta-box">
    <h3>Alle deals in 1 app</h3>
    <p>Download ShopBaas en vergelijk alle supermarkt aanbiedingen gratis.</p>
    <div class="cta-buttons">
      <a href="https://apps.apple.com/nl/app/shopbaas/id6742043090" class="cta-btn">App Store</a>
      <a href="https://play.google.com/store/apps/details?id=com.shopbaas.app" class="cta-btn">Google Play</a>
      <a href="/download" class="cta-btn cta-btn-primary">Meer info</a>
    </div>
  </div>
</main>
<footer class="site-footer"><p>&copy; ${year} <a href="/">ShopBaas</a> — Slimmer boodschappen doen. <a href="/privacy">Privacy</a> · <a href="/terms">Voorwaarden</a> · <a href="/blog">Blog</a></p></footer>
<script src="/cookie-consent.js"></script>
</body>
</html>`;
}
```

- [ ] **Step 2: Replace the `generateSitemaps` placeholder**

Find `// ─── PLACEHOLDER: generateSitemaps() added in Task 5 ───` and replace with:

```javascript
// Generate sitemap index + sub-sitemaps
function generateSitemaps() {
  const sitemapDir = WEBSITE_DIR;

  // Load blog metadata for blog sitemap
  const blogMetaPath = path.join(WEBSITE_DIR, 'blog', 'posts-meta.json');
  let blogPosts = [];
  if (fs.existsSync(blogMetaPath)) {
    try { blogPosts = Object.values(JSON.parse(fs.readFileSync(blogMetaPath, 'utf-8'))); } catch(e) {}
  }

  const today = new Date().toISOString().split('T')[0];

  // sitemap-pages.xml — core static pages
  const pagesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://shopbaas.nl/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>
  <url><loc>https://shopbaas.nl/aanbiedingen</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>
  <url><loc>https://shopbaas.nl/aanbiedingen-vergelijken</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>
  <url><loc>https://shopbaas.nl/blog</loc><changefreq>weekly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>
  <url><loc>https://shopbaas.nl/download</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://shopbaas.nl/goedkoopste-supermarkt</loc><changefreq>weekly</changefreq><priority>0.8</priority><lastmod>${today}</lastmod></url>
  <url><loc>https://shopbaas.nl/boodschappen-besparen</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://shopbaas.nl/privacy</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://shopbaas.nl/terms</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
</urlset>`;
  fs.writeFileSync(path.join(sitemapDir, 'sitemap-pages.xml'), pagesXml);

  // sitemap-stores.xml — store landing pages
  const storeUrls = STORE_ORDER.map(store => {
    const slug = STORE_SLUGS[store];
    const pagePath = path.join(STORE_PAGES_DIR, `${slug}.html`);
    if (!fs.existsSync(pagePath)) return '';
    return `  <url><loc>https://shopbaas.nl/aanbiedingen/${slug}</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>`;
  }).filter(Boolean).join('\n');

  const storesXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${storeUrls}
</urlset>`;
  fs.writeFileSync(path.join(sitemapDir, 'sitemap-stores.xml'), storesXml);

  // sitemap-blog.xml — blog posts
  const blogUrls = blogPosts
    .sort((a, b) => b.weekNum - a.weekNum)
    .map(p => `  <url><loc>https://shopbaas.nl/blog/${p.slug}</loc><changefreq>yearly</changefreq><priority>0.7</priority></url>`)
    .join('\n');

  const blogXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${blogUrls}
</urlset>`;
  fs.writeFileSync(path.join(sitemapDir, 'sitemap-blog.xml'), blogXml);

  // sitemap.xml — sitemap index
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://shopbaas.nl/sitemap-pages.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>https://shopbaas.nl/sitemap-stores.xml</loc><lastmod>${today}</lastmod></sitemap>
  <sitemap><loc>https://shopbaas.nl/sitemap-blog.xml</loc><lastmod>${today}</lastmod></sitemap>
</sitemapindex>`;
  fs.writeFileSync(path.join(sitemapDir, 'sitemap.xml'), indexXml);

  console.log(`\nSitemaps updated: sitemap.xml (index) + 3 sub-sitemaps`);
  console.log(`  Pages: 9 URLs, Stores: ${storeUrls.split('\n').filter(Boolean).length} URLs, Blog: ${blogPosts.length} URLs`);
}
```

- [ ] **Step 3: Run full generation for week 13 and verify output**

Run: `cd ~/slimmer-admin/scrapers && node generate-store-pages.js --week 13`
Expected: Output showing 8 store pages + index + sitemaps generated

- [ ] **Step 4: Verify generated files exist**

Run: `ls -la ~/slimmer-app/shopbaas-website/aanbiedingen/ && ls -la ~/slimmer-app/shopbaas-website/sitemap*.xml`
Expected: 9 HTML files (8 stores + index.html) and 4 XML files (sitemap.xml + 3 sub-sitemaps)

- [ ] **Step 5: Commit**

```bash
cd ~/slimmer-admin && git add scrapers/generate-store-pages.js && git commit -m "feat: add store index page + sitemap index with sub-sitemaps"
```

---

### Task 4: Cloud Function — Add Product/Offer Schema to Deal Pages

**Files:**
- Modify: `~/slimmer-app/functions/index.js:3047-3246` (the `dealPage` Cloud Function)

- [ ] **Step 1: Add Product/Offer + BreadcrumbList JSON-LD to the dealPage Cloud Function**

In the `dealPage` function, after the existing meta tag generation (around line 3081 where Firestore data has been fetched), add variables to build the JSON-LD. Then inject the schema scripts into the `<head>` of the HTML response.

Find this block (around line 3082-3086):
```javascript
    } catch (err) {
      console.error("dealPage Firestore fetch failed:", err.message);
    }
  }

  // Escape HTML for safe injection
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
```

Replace with:
```javascript
    } catch (err) {
      console.error("dealPage Firestore fetch failed:", err.message);
    }
  }

  // Build Product/Offer JSON-LD (only if we have deal data)
  let schemaScripts = '';
  if (dealId && productName) {
    const productSchema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": productName,
      "description": `${productName} aanbieding bij ${store}`,
      "image": ogImage,
      "offers": {
        "@type": "Offer",
        "url": ogUrl,
        "priceCurrency": "EUR",
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": store }
      }
    };
    // Add price fields if available
    try {
      const snap = await db.collection("deals").doc(dealId).get();
      if (snap.exists) {
        const d = snap.data();
        if (d.salePrice != null) productSchema.offers.price = Number(d.salePrice).toFixed(2);
        if (d.brand) productSchema.brand = { "@type": "Brand", "name": d.brand };
        if (d.validUntil) {
          const vd = d.validUntil.toDate ? d.validUntil.toDate() : new Date(d.validUntil);
          productSchema.offers.priceValidUntil = vd.toISOString().split('T')[0];
        }
      }
    } catch(e) { /* schema enrichment is best-effort */ }

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "ShopBaas", "item": "https://shopbaas.nl" },
        { "@type": "ListItem", "position": 2, "name": "Aanbiedingen", "item": "https://shopbaas.nl/aanbiedingen" },
        { "@type": "ListItem", "position": 3, "name": store, "item": `https://shopbaas.nl/aanbiedingen/${store.toLowerCase().replace(/\s+/g, '-')}` },
        { "@type": "ListItem", "position": 4, "name": productName, "item": ogUrl }
      ]
    };

    const escJsonStr = (obj) => JSON.stringify(obj, null, 2).replace(/<\//g, '<\\/');
    schemaScripts = `\n<script type="application/ld+json">${escJsonStr(productSchema)}</script>\n<script type="application/ld+json">${escJsonStr(breadcrumbSchema)}</script>`;
  }

  // Escape HTML for safe injection
  const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
```

Note: This does a second Firestore read for schema enrichment. The first read (existing code) only extracts basic fields. We could refactor to reuse the first read, but that would require restructuring the existing code. The extra read is cached by Firestore and adds negligible latency. Keep it simple.

Then inject `schemaScripts` into the HTML `<head>`. Find the line:
```javascript
<link rel="stylesheet" href="/fonts/fonts.css"/>
```

And change it to:
```javascript
<link rel="stylesheet" href="/fonts/fonts.css"/>${schemaScripts}
```

- [ ] **Step 2: Commit**

```bash
cd ~/slimmer-app && git add functions/index.js && git commit -m "feat: add Product/Offer + BreadcrumbList JSON-LD to deal page Cloud Function"
```

Note: Do NOT deploy yet. We'll deploy functions after Task 5 (robots.txt unblock) so everything goes live together.

---

### Task 5: Unblock Deal Pages + Update robots.txt + Firebase Config

**Files:**
- Modify: `~/slimmer-app/shopbaas-website/robots.txt`
- Modify: `~/slimmer-app/shopbaas-website/firebase.json`

- [ ] **Step 1: Update robots.txt to unblock /deal/ and add store pages**

Replace the full contents of `~/slimmer-app/shopbaas-website/robots.txt` with:

```
User-agent: *
Allow: /
Allow: /aanbiedingen/
Allow: /blog/
Allow: /deal/
Allow: /goedkoopste-supermarkt
Allow: /boodschappen-besparen

Sitemap: https://shopbaas.nl/sitemap.xml
```

- [ ] **Step 2: Add rewrite rules for new pages in firebase.json**

The `cleanUrls: true` setting in firebase.json already strips `.html` extensions, so `/aanbiedingen/albert-heijn` will automatically serve `/aanbiedingen/albert-heijn.html`. However, we need a rewrite for `/aanbiedingen` to serve `/aanbiedingen/index.html` since Firebase doesn't auto-resolve index files in subdirectories.

Add these rewrites to the `rewrites` array in firebase.json (before the existing `/deal/**` rewrite):

```json
{
  "source": "/aanbiedingen",
  "destination": "/aanbiedingen/index.html"
},
{
  "source": "/goedkoopste-supermarkt",
  "destination": "/goedkoopste-supermarkt.html"
},
{
  "source": "/boodschappen-besparen",
  "destination": "/boodschappen-besparen.html"
},
```

- [ ] **Step 3: Commit**

```bash
cd ~/slimmer-app/shopbaas-website && git add robots.txt firebase.json && git commit -m "feat: unblock /deal/ in robots.txt, add rewrites for store + evergreen pages"
```

---

### Task 6: Evergreen Page — Goedkoopste Supermarkt

**Files:**
- Create: `~/slimmer-app/shopbaas-website/goedkoopste-supermarkt.html`

This is a data-driven comparison page that will be updated by the store page generator with real deal stats. For now, create the static version with placeholder stats — the generator can optionally update it later.

- [ ] **Step 1: Create the goedkoopste-supermarkt.html page**

Create the file at `~/slimmer-app/shopbaas-website/goedkoopste-supermarkt.html` with:
- Title: "Goedkoopste Supermarkt 2026 — Welke Supermarkt is het Goedkoopst? | ShopBaas"
- BreadcrumbList schema: ShopBaas > Goedkoopste Supermarkt
- FAQPage schema with 3 Q&As about cheap supermarkets
- Store comparison table (8 stores, columns: store, avg discount %, deal count, popular categories)
- Tips section: how to find the cheapest groceries
- CTA: download app
- Same dark theme, nav, footer as other pages
- ~1000+ words of Dutch content for SEO depth

The full HTML content should follow the exact same patterns as the existing `aanbiedingen-vergelijken.html` page for styling consistency — same CSS variables, nav, footer, breadcrumb pattern.

- [ ] **Step 2: Commit**

```bash
cd ~/slimmer-app/shopbaas-website && git add goedkoopste-supermarkt.html && git commit -m "feat: add goedkoopste-supermarkt evergreen SEO page"
```

---

### Task 7: Evergreen Page — Boodschappen Besparen Tips

**Files:**
- Create: `~/slimmer-app/shopbaas-website/boodschappen-besparen.html`

- [ ] **Step 1: Create the boodschappen-besparen.html page**

Create the file at `~/slimmer-app/shopbaas-website/boodschappen-besparen.html` with:
- Title: "Boodschappen Besparen: 15 Slimme Tips | ShopBaas"
- BreadcrumbList schema: ShopBaas > Boodschappen Besparen
- FAQPage schema with 3 Q&As about saving on groceries
- 15 numbered tips (each with a heading + 2-3 sentences)
- Internal links to store pages and blog
- CTA: download app
- Same dark theme as other pages
- ~1500+ words of Dutch content

- [ ] **Step 2: Commit**

```bash
cd ~/slimmer-app/shopbaas-website && git add boodschappen-besparen.html && git commit -m "feat: add boodschappen-besparen evergreen SEO tips page"
```

---

### Task 8: Homepage Nav + Blog Link + Internal Linking

**Files:**
- Modify: `~/slimmer-app/shopbaas-website/index.html` (nav links + footer)

- [ ] **Step 1: Add Aanbiedingen link to homepage nav**

In `index.html`, find the nav section and add "Aanbiedingen" link. The nav currently has links but may not include Blog or Aanbiedingen. Ensure the nav contains:

```html
<a href="/blog">Blog</a>
<a href="/aanbiedingen">Aanbiedingen</a>
```

- [ ] **Step 2: Add store page links to homepage footer**

Find the footer section in `index.html` and add links to store pages and evergreen content for internal link juice:

```html
<div class="footer-links">
  <a href="/aanbiedingen/albert-heijn">AH Aanbiedingen</a> ·
  <a href="/aanbiedingen/jumbo">Jumbo Deals</a> ·
  <a href="/aanbiedingen/lidl">Lidl Aanbiedingen</a> ·
  <a href="/aanbiedingen/aldi">Aldi Deals</a> ·
  <a href="/aanbiedingen/plus">Plus Aanbiedingen</a> ·
  <a href="/aanbiedingen/dirk">Dirk Deals</a> ·
  <a href="/aanbiedingen/kruidvat">Kruidvat Deals</a> ·
  <a href="/aanbiedingen/etos">Etos Deals</a> ·
  <a href="/blog">Blog</a> ·
  <a href="/goedkoopste-supermarkt">Goedkoopste Supermarkt</a> ·
  <a href="/boodschappen-besparen">Besparen Tips</a>
</div>
```

- [ ] **Step 3: Commit**

```bash
cd ~/slimmer-app/shopbaas-website && git add index.html && git commit -m "feat: add store page + blog + evergreen links to homepage nav and footer"
```

---

### Task 9: Hook Generator into Scrape Pipeline

**Files:**
- Modify: `~/slimmer-admin/scrapers/scheduled-scrape.js` (add generate-store-pages.js call)
- Modify: `~/slimmer-admin/scrapers/deal-watcher.js` (add generate-store-pages.js call)

- [ ] **Step 1: Add store page generation to scheduled-scrape.js**

Find where `generate-blog.js` is called (likely via `child_process.execSync` or similar) and add an equivalent call to `generate-store-pages.js` right after it.

Search for "generate-blog" in the file and add a parallel call:
```javascript
// Generate store landing pages (SEO)
execSync('node ' + path.join(__dirname, 'generate-store-pages.js'), { stdio: 'inherit' });
```

- [ ] **Step 2: Add store page generation to deal-watcher.js**

Same approach — find where blog generation is triggered and add store page generation alongside it.

- [ ] **Step 3: Commit**

```bash
cd ~/slimmer-admin && git add scrapers/scheduled-scrape.js scrapers/deal-watcher.js && git commit -m "feat: hook store page generator into scrape pipeline"
```

---

### Task 10: Generate, Verify, Deploy

- [ ] **Step 1: Run the full store page generator**

```bash
cd ~/slimmer-admin/scrapers && node generate-store-pages.js --week 13
```

- [ ] **Step 2: Verify all output files**

```bash
ls -la ~/slimmer-app/shopbaas-website/aanbiedingen/
ls -la ~/slimmer-app/shopbaas-website/sitemap*.xml
ls -la ~/slimmer-app/shopbaas-website/goedkoopste-supermarkt.html
ls -la ~/slimmer-app/shopbaas-website/boodschappen-besparen.html
```

- [ ] **Step 3: Open a store page in browser to visually verify**

```bash
open ~/slimmer-app/shopbaas-website/aanbiedingen/albert-heijn.html
```

- [ ] **Step 4: Validate JSON-LD schema with Google's test**

Open https://search.google.com/test/rich-results and paste the HTML of a generated store page. Verify Product, ItemList, BreadcrumbList, and FAQPage schemas are all detected.

- [ ] **Step 5: Deploy website (with Yashnar's approval)**

```bash
cd ~/slimmer-app/shopbaas-website && firebase deploy --only hosting --project slimmer-383d4
```

- [ ] **Step 6: Deploy Cloud Function (with Yashnar's approval)**

```bash
cd ~/slimmer-app && firebase deploy --only functions:dealPage --project slimmer-383d4
```

- [ ] **Step 7: Submit updated sitemap to Google Search Console**

Go to https://search.google.com/search-console and request indexing of the new sitemap.

- [ ] **Step 8: Final commit of generated files**

```bash
cd ~/slimmer-app/shopbaas-website && git add aanbiedingen/ sitemap*.xml goedkoopste-supermarkt.html boodschappen-besparen.html && git commit -m "feat: generated store pages, sitemaps, and evergreen content for SEO launch"
```

# Al-Madina Showcase

Build a modern, editorial, high-end jewellery catalogue website for a Pakistani brand called "Al-Madina Jewellers".

=== BRAND ===

Name: Al-Madina Jewellers

Tagline: "Heirlooms in the Making"

Positioning: A trusted family jewellery house in Pakistan. Traditional craftsmanship, modern presentation. 21K/22K gold, 925 sterling silver, and certified diamond jewellery.

Audience: Pakistani women aged 20-55 buying bridal sets, everyday gold and gifts, plus overseas Pakistani buyers.

Voice: Warm, refined, quietly confident. Short sentences. Never pushy or discount-shouty.

Locations: Sarafa Market Mandi Bahauddin. Primary contact via WhatsApp on 92546502244. Founder: Haji Ashraf Siddiqui .Cell No: 923217759959 , 923217744282

=== BUSINESS MODEL - IMPORTANT ===

This is a CATALOGUE + ENQUIRY site, NOT a webshop.

- NO shopping cart, NO checkout, NO payment gateway, NO user accounts.

- Every product converts to one of: "Enquire on WhatsApp" (opens wa.me with a pre-filled message containing the product name, SKU and page URL), or "Request a Callback" (a short form).

- A wishlist saved in localStorage is allowed, and it must have a "Send my wishlist on WhatsApp" button.

=== DESIGN SYSTEM - FOLLOW EXACTLY ===

Colours (Tailwind theme tokens):

  primary   #0B3D2E  (Madina Green - headers, footer, dark sections)

  primaryDeep #04180F (hero overlays, footer base)

  gold      #C9A24B  (accent, buttons, rules, active states)

  champagne #E8D9B5  (soft fills, hover backgrounds)

  ivory     #FAF7F2  (page background - never pure white)

  ink       #1E1C18  (body text)

  warmgrey  #8A8378  (secondary text, borders)

  rose      #9B2C3F  (sale badges only, used sparingly)

Typography (Google Fonts):

  Display: "Cormorant Garamond" - weights 300/400/600. Used for h1, h2, h3, product names and hero headlines. Large sizes at weight 300 with tracking-wide.

  Body/UI: "Inter" - weights 400/500/600. Paragraphs, nav, buttons, prices, specs.

  Prices and gram weights use tabular-nums so digits align.

Design rules:

- Airy and editorial. Generous whitespace. Section padding of at least 96px on desktop.

- Thin 1px gold hairline rules as section dividers, never heavy borders.

- Buttons: sharp corners or a maximum 2px radius. NO rounded pill buttons anywhere.

- Primary button = solid gold background, dark green text, uppercase, tracking-widest, 12px.

- Secondary button = 1px gold outline, transparent background.

- Images: subtle zoom on hover (scale 1.04, 700ms ease-out). Cards lift with a soft shadow only, no borders appearing on hover.

- Scroll reveal: fade-up 24px with a 500ms ease-out, staggered 80ms across grid children. Restrained, not bouncy.

- Fully responsive. Mobile-first. Product grid is 2 columns on mobile, 3 on tablet, 4 on desktop.

- Accessible: AA contrast, visible focus rings in gold, alt text on all imagery.

=== PAGES TO BUILD ===

1. HOME - in this exact order:

   a) Slim announcement bar in Madina Green: "Free insured delivery across Pakistan" + WhatsApp number on the right.

   b) Sticky header: logo left (wordmark "AL-MADINA" in Cormorant with "JEWELLERS" small and letter-spaced beneath), centre nav (Collections with a mega-menu, Bridal, New Arrivals, Gold Rate, Our Story, Stores), right icons (search, wishlist, WhatsApp). Header is transparent over the hero, then turns solid ivory with a gold hairline on scroll.

   c) Full-screen hero: large jewellery image, dark green gradient overlay from the bottom, headline in Cormorant 300 "Heirlooms in the Making", one line of subcopy, two buttons - "Explore Collections" (gold) and "Book a Bridal Consultation" (outline). Add a slow Ken Burns zoom on the background image.

   d) Trust strip: four items with thin icons - Hallmarked 21K & 22K Gold / 925 Certified Silver / Lifetime Buy-Back / Insured Nationwide Delivery.

   e) "Shop by Category": six tall image tiles with the category name overlaid in Cormorant - Bridal Sets, Gold Bangles, Rings, Earrings, Lockets & Chains, Silver Essentials.

   f) "Signature Bridal" - a horizontal-scroll carousel of the most expensive flagship bridal sets. Show full price, gram weight and stone composition. This anchors price perception high.

   g) Editorial split section: large image left, text right - the house story, "Three generations. One standard." with a "Our Story" text link.

   h) "Everyday Gold" - a 4-column product grid of accessible price points, so a visitor priced out by the bridal section immediately sees something attainable.

   i) Live Gold Rate strip: today's 24K/22K/21K per-gram and per-tola rates in a clean table on a dark green band, with the date and a "View full rate history" link.

   j) Testimonials: three quotes, Cormorant italic, on a champagne background.

   k) Newsletter + WhatsApp community CTA.

   l) Footer in Deep Forest: four columns (Collections / Information / Visit Us / Connect), store addresses, socials, payment-agnostic trust line, copyright.

2. COLLECTION / CATEGORY PAGE

   - Slim banner with the category name in Cormorant plus a two-line description.

   - Breadcrumbs.

   - Left sidebar filters (collapsible into a drawer on mobile): Metal (Gold/Silver/Diamond), Karat (18K/21K/22K/24K), Category, Occasion (Bridal/Everyday/Gifting/Investment), Price range slider in PKR, Weight range in grams, Stone type. Live result counts on each option and a "Clear all".

   - Sort dropdown: Featured, Newest, Price low-high, Price high-low, Weight low-high.

   - Product grid with the card spec below.

   - "Load more" button rather than numbered pagination.

3. PRODUCT CARD - build as a reusable component

   - Square image, second image cross-fades in on hover.

   - Karat badge top-left (e.g. "22K"), "New" or "Sale" badge top-right.

   - Wishlist heart top-right on hover.

   - Product name in Cormorant.

   - A specification line in small warm-grey Inter: "18.420 g · Ruby, Pearl & Zircon" - THIS IS ESSENTIAL, Pakistani buyers price by weight.

   - Price in Inter semibold tabular-nums, format "Rs. 1,250,000". Struck-through original price when discounted.

   - ONE primary action on hover: "Enquire" - not four buttons.

4. PRODUCT DETAIL PAGE

   - Left: image gallery with vertical thumbnails and click-to-zoom.

   - Right: category eyebrow, product name in Cormorant 300 at 36px, price, then a specification table - SKU, Metal, Purity/Karat, Gross Weight (g), Net Weight (g), Stones, Stone Weight, Dimensions, Available Sizes.

   - A collapsible "How this price is calculated" panel showing: gold value (weight x today's karat rate) + making charges + stone value. This transparency is a major trust builder in this market.

   - Primary CTA "Enquire on WhatsApp" - opens wa.me/[NUMBER] pre-filled with: "Assalam-o-Alaikum, I'm interested in [PRODUCT NAME] (SKU: [SKU]) - [URL]".

   - Secondary CTAs: "Request a Callback", "Add to Wishlist", "Book a Store Viewing".

   - Accordions: Description, Care Instructions, Certification & Hallmarking, Delivery & Buy-Back Policy.

   - "You may also like" - 4 related products from the same category.

5. BRIDAL

   - Cinematic hero, an editorial intro on wedding jewellery and tradition.

   - Bridal sets grid.

   - "The Bridal Consultation" section explaining a private appointment, with a booking form: name, phone, city, wedding date, budget range, preferred branch, notes. On submit, show a confirmation and also offer a WhatsApp handoff.

6. GOLD RATE

   - Today's rates in a clean table: 24K / 22K / 21K / 18K, columns for per gram and per tola, in PKR.

   - Large "last updated" timestamp.

   - A simple calculator: user enters grams and selects karat, output is the estimated gold value with a note that making charges and stones are additional.

   - Disclaimer that rates are indicative and confirmed at the time of purchase.

   - Rates must come from an editable Supabase table so they can be updated daily from an admin screen - do not hardcode them.

7. OUR STORY - founding story, three-generation heritage, craftsmanship process with images, quality and hallmarking standards, a milestone timeline.

8. STORES - card per branch with photo, address, phone, WhatsApp, opening hours, an embedded Google Map and a "Get Directions" link.

9. CONTACT - form (name, phone, email, subject, message), WhatsApp CTA, and a short FAQ accordion.

10. Also build: Search results page, Wishlist page, New Arrivals page, 404 page in the same visual language.

=== DATA MODEL (Supabase) ===

products: id, sku, name, slug, description, category_id, metal (gold|silver|diamond), karat, gross_weight_g, net_weight_g, stones (text), stone_weight_ct, dimensions, sizes (array), price_pkr, sale_price_pkr, making_charges_pkr, images (array of urls), is_new, is_featured, is_bridal, in_stock, occasion (array), created_at

categories: id, name, slug, parent_id, description, banner_image, sort_order

gold_rates: id, date, karat, rate_per_gram_pkr, rate_per_tola_pkr

enquiries: id, product_id, name, phone, city, message, type (product|callback|bridal|contact), created_at

stores: id, name, address, city, phone, whatsapp, hours, map_embed_url, image

testimonials: id, name, city, quote, rating

Seed the database with at least 40 realistic sample products spread across gold, silver and diamond, with realistic Pakistani names, realistic gram weights and PKR prices ranging from Rs. 45,000 to Rs. 4,500,000. Use tasteful jewellery placeholder imagery.

=== GLOBAL ELEMENTS ===

- A floating WhatsApp button, bottom-right, on every page. Gold circle, subtle pulse animation.

- Full-screen search overlay with trending searches and live product results.

- Mobile: full-screen slide-in nav drawer, accordion sub-menus.

- SEO: unique title and meta description per page, Open Graph tags, JSON-LD Product schema on product pages, and a sitemap.

- Performance: lazy-load all images, use next-gen formats, skeleton loaders on grids.

Start by building the complete design system and the home page. Get the visual language right first - I will then ask for the remaining pages one at a time.

# MASTER LOVABLE PROMPT

You are a senior React developer and UI/UX designer.

Build a production-ready application following all instructions below.

## Technology Stack

* React (latest stable version)

* Vite

* JavaScript only (NO TypeScript)

* JSX files only

* Tailwind CSS

* React Router DOM

* Axios for API calls

* React Icons

* Context API for global state (if needed)

## Mandatory Development Rules

1. Never place the entire application inside a single file.

2. Every section must be a separate reusable component.

3. Use `.jsx` files for all components.

4. Use JavaScript only. Do NOT use TypeScript.

5. Keep the code beginner-friendly and easy to edit.

6. Add comments wherever necessary.

7. Use meaningful variable and component names.

8. Ensure the project can be opened directly in VS Code and run using:

* npm install

* npm run dev

## Folder Structure

src/

│

├── components/

│   ├── Navbar.jsx

│   ├── Footer.jsx

│   ├── Hero.jsx

│   ├── Features.jsx

│   └── ...

│

├── pages/

│   ├── Home.jsx

│   ├── About.jsx

│   └── Contact.jsx

│

├── layouts/

│   └── MainLayout.jsx

│

├── services/

│   └── api.js

│

├── context/

│   └── AppContext.jsx

│

├── assets/

│

├── hooks/

│

├── utils/

│

├── App.jsx

└── main.jsx

## UI Requirements

* Fully responsive.

* Mobile-first design.

* Modern and premium appearance.

* Proper spacing.

* Consistent typography.

* Smooth animations.

* Accessibility support.

* Loading states.

* Error handling.

## Coding Standards

* Maximum 150 lines per component.

* Reusable components whenever possible.

* No inline CSS.

* Use Tailwind classes.

* Keep business logic separate from UI.

* Use environment variables for secrets.

* Avoid code duplication.

## Deliverables

Generate:

1. Complete React project.

2. Proper folder structure.

3. All JSX files.

4. Tailwind configuration.

5. Package dependencies.

6. README.md with setup instructions.

7. Clean and maintainable code.

8. Production-ready implementation.

Before generating any code, think about scalability, maintainability, and ease of editing by non-technical users.

The final code should look like it was written by a senior React engineer and should be easy for a beginner to understand and modify.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/062d5919-4b14-40d0-90d7-f159f1bfce5a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

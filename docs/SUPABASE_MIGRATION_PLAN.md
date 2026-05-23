# Supabase Migration Audit & Plan

## 1. CURRENT STATE ANALYSIS
- **Firebase Status:** **Firebase is NOT required in the current runtime app.**
- **Dependency Audit:** `firebase` is listed in `package.json` but no SDK calls exist in the code.
- **Data Handling:** Images are handled as Base64 Data URIs. This causes large payload errors and slow performance.

## 2. SUPABASE MIGRATION FEASIBILITY
- **Verdict:** Highly Recommended. 
- **Benefit:** Solving the "Base64 bottleneck" is the priority. Supabase Storage + PostgreSQL is ideal for e-commerce catalogs.

## 3. SALVAGE LIST (What to Keep)
- `src/ai/flows/*.ts`: Keep the prompt engineering and Genkit flow structure.
- `src/components/ui/`: Keep the ShadCN base.
- `src/lib/types.ts`: Reuse the Zod schemas for the database types.

## 4. DATABASE SCHEMA (Proposed)

### `products`
- `id` (uuid, primary key)
- `created_at` (timestamp)
- `user_id` (uuid, references profiles.id)
- `category` (text)
- `metadata` (jsonb: fabric, fit, color, etc.)
- `status` (text: pending/generating/completed)

### `assets`
- `id` (uuid, primary key)
- `product_id` (uuid, references products.id)
- `url` (text)
- `type` (text: original/generated)
- `view` (text: front/side/back/flatlay)

### `seo_metadata`
- `id` (uuid, primary key)
- `product_id` (uuid, references products.id)
- `title` (text)
- `description` (text)
- `slug` (text)
- `meta_description` (text)
- `alt_text` (text)
- `bullet_features` (jsonb)

## 5. STORAGE BUCKET DESIGN
- `product-assets/`
  - `/{userId}/{productId}/originals/`
  - `/{userId}/{productId}/generated/`

## 6. MIGRATION WORKFLOW
1.  **Auth:** Replace form submission with a protected route.
2.  **Upload:** In `onSubmit`, upload raw images to Supabase Storage first.
3.  **Trigger:** Pass Storage URLs (or signed URLs) to the AI Flows instead of Base64.
4.  **Persistence:** Save Genkit results back to Storage and update the PostgreSQL record.
5.  **Retrieval:** The `ResultsDisplay` component should fetch assets from the database.

## 7. RISKS & MITIGATION
- **URL Availability:** Imagen 2 needs public or short-lived signed URLs to access the images. 
- **Timeout:** Next.js Server Actions have a 60s limit. Parallelize AI calls or use a queue.

## 8. FILE-BY-FILE MIGRATION PLAN
- `src/lib/supabase.ts`: New client initialization.
- `src/app/api/upload/route.ts`: Handler for file uploads to storage.
- `src/services/product-service.ts`: DB operations for products and metadata.
- `src/app/page.tsx`: Refactor `onSubmit` to use Storage URLs.
- `src/middleware.ts`: Add Next.js middleware for Auth protection.

## 9. FINAL VERDICT
- **Is Firebase currently required?** No.
- **Can we safely move to Supabase?** Yes, it is the cleanest path forward.
- **Safest Order:** 
  1. Setup Supabase Client.
  2. Implement Image Upload -> Storage.
  3. Update AI flows to accept URLs.
  4. Add Database persistence.
  5. Add Auth.
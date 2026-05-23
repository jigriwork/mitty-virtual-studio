# Supabase Migration Audit & Plan: MITTY Virtual Studio

---

## 1. CURRENT FIREBASE USAGE
- **Is Firebase Auth used?** NO.
- **Is Firestore used?** NO.
- **Is Firebase Storage used?** NO.
- **Is Firebase Hosting used?** NO (App Hosting config exists but is unused).
- **Is Firebase Functions used?** NO.
- **Is Firebase required?** **Firebase is NOT required in the current runtime app.** 
- **Analysis:** The `firebase` dependency in `package.json` is a "ghost" dependency. There are no initialization files (`firebase/config.ts`), no provider wrappers, and no SDK calls in any components or server actions.

---

## 2. CURRENT DATA STORAGE
- **Storage Mechanism:** **Ephemeral/In-Memory.**
- **Details:** 
    - Images are converted to **Base64 Data URIs** in the browser via `FileReader`.
    - These strings are stored in React state (`productImageUris`).
    - The entire Base64 payload (often several MBs) is sent over the wire via Next.js Server Actions.
- **Refresh Behavior:** All data is **lost on refresh**.
- **Generated Assets:** Generated images exist only as long as the session. They are never saved to a persistent cloud bucket.
- **History:** No history exists. Each generation is a "one-shot" attempt.

---

## 3. SUPABASE MIGRATION FEASIBILITY
- **Verdict:** **Supabase is a perfect fit.** 
- **Comparison:**
    - **Firebase:** Excellent for real-time and NoSQL, but the current app doesn't leverage these. 
    - **Supabase:** Better for structured ecommerce data (PostgreSQL), has superior RLS (Row Level Security) for user-owned assets, and integrates naturally with Next.js 15.
- **Recommendation:** Proceed with Supabase. It will solve the "Payload Size" issue by allowing us to pass URLs to AI flows instead of massive Base64 strings.

---

## 4. WHAT TO KEEP
We will preserve 100% of the AI logic:
- `src/ai/flows/*.ts`: All category prompts and generation logic.
- `src/components/ui/`: All ShadCN components.
- `src/components/product-form.tsx`: The UI for input (will be refactored to save to DB).
- `src/lib/types.ts`: The core Zod schemas.

---

## 5. WHAT TO REPLACE
- **`onSubmit` in `page.tsx`**: Must be split into: 1. Create DB Record -> 2. Upload to Storage -> 3. Trigger Generation -> 4. Update DB.
- **State Management**: Replace `useState` results with Supabase real-time or standard fetching.
- **Payloads**: Stop sending Base64. Start sending signed Storage URLs.

---

## 6. SUPABASE DATABASE DESIGN (Proposed)

### Table: `profiles`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key (fk auth.users) |
| `full_name` | text | |
| `avatar_url` | text | |

### Table: `products`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `user_id` | uuid | fk profiles.id |
| `category` | text | 'Shirt', 'Trousers', etc. |
| `metadata` | jsonb | Stores fabric, fit, gender, etc. |
| `status` | text | 'pending', 'generating', 'completed' |
| `created_at` | timestamptz | |

### Table: `assets`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `product_id` | uuid | fk products.id |
| `type` | text | 'original', 'generated' |
| `view` | text | 'front', 'side', 'back', 'flatlay' |
| `url` | text | Storage URL |
| `path` | text | Storage Path |

### Table: `seo_metadata`
| Column | Type | Notes |
| :--- | :--- | :--- |
| `id` | uuid | Primary Key |
| `product_id` | uuid | fk products.id |
| `title` | text | |
| `description` | text | |
| `slug` | text | |
| `alt_text` | text | |

---

## 7. SUPABASE STORAGE DESIGN
- **Bucket:** `product-assets`
- **Structure:**
    - `/{userId}/{productId}/originals/front.png`
    - `/{userId}/{productId}/generated/front_model.png`
    - `/{userId}/{productId}/exports/bundle.zip`

---

## 8. UPDATED WORKFLOW
1. **Upload:** User selects files; app uploads them immediately to `product-assets/originals/`.
2. **DB Entry:** A new record is created in the `products` table.
3. **AI Trigger:** Server action is called with the `productId`.
4. **AI Processing:** 
    - Server action fetches original URLs from DB.
    - Flows generate assets.
    - Assets are uploaded to Supabase Storage.
    - SEO text is saved to `seo_metadata`.
5. **UI Update:** The UI refreshes (or uses a subscription) to show the generated assets.

---

## 9. MIGRATION RISKS
- **AI Flow Update:** Current flows (e.g., `generate-front-view.ts`) expect `media: { url: base64 }`. We must update them to handle `media: { url: supabase_url }`.
- **Timeouts:** Generating 4 HD images in one request may exceed Vercel/App Hosting 60s timeout. We should implement a **Queue** or **Webhooks**.
- **signedURLs:** Supabase storage is private by default. We must generate short-lived signed URLs for the AI models to "see" the images.

---

## 10. FINAL VERDICT
- **A. Is Firebase required?** No.
- **B. Can we move to Supabase?** Yes, easily.
- **C. Should we continue this codebase?** Yes. The UI and Prompt Engineering are high-value. The lack of a backend is actually a "clean slate" for Supabase.
- **D. Order:** 
    1. Initialize Supabase Client.
    2. Add Auth (Login/Signup).
    3. Implement Image Upload to Storage.
    4. Refactor flows to use URLs.
    5. Build the Dashboard/History view.

---

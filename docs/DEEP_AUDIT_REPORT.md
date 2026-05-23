# MITTY Virtual Studio: Comprehensive Deep Audit Report

---

## 1. WHAT THE APP CURRENTLY DOES
**Full App Purpose:**
MITTY is an AI-powered e-commerce content engine. It transforms raw product photos (flats or basic shots) into professional marketing assets including on-model photography, studio packshots, and SEO-optimized metadata.

**User-Facing Features:**
- **Product Configuration:** A dynamic form to specify category, gender, fabric, fit, pattern, and color.
- **Multi-Image Upload:** Support for single main images (Shirts/Shoes) or triple reference shots (Trousers/Perfumes).
- **AI Asset Generation:** Simultaneous generation of 4+ marketing images and product copy.
- **Real-time Review:** A grid-based results display with individual "Regenerate" controls.
- **Bulk Export:** One-click download of all assets in a structured `.zip` archive.
- **Technical Reporting:** A dedicated `/report` page summarizing system capabilities.

**Admin/Dashboard Features:**
- **NONE:** Currently, the app is a single-session "stateless" tool. There is no user login, project history, or admin dashboard for managing past generations.

**End-to-End Workflow:**
1. **Input:** User fills out product metadata and uploads reference images.
2. **Analysis:** `generateProductTitleDescription` (Gemini 1.5 Flash) analyzes images to detect color and draft copy.
3. **Pipeline:** The detected color and reference images are passed to 4 parallel Genkit flows.
4. **Generation:** Imagen 2 and Gemini 2.0 Flash generate multi-angle high-fidelity images.
5. **Output:** User reviews images, optionally regenerates specific views, and downloads the package.

**Website Publishing:**
- **NOT IMPLEMENTED:** The workflow ends at the download step. There is no "Publish to Shopify/Web" button or API integration.

---

## 2. CURRENT ARCHITECTURE
- **Frontend:** Next.js 15.3 (App Router), TypeScript, Tailwind CSS, ShadCN UI.
- **Backend:** Next.js Server Actions interacting with Genkit for AI orchestration.
- **Firebase Usage:** 
    - **Firestore/Auth/Storage:** **NOT USED.** The app currently stores all data in memory/Base64. This is a major gap for production.
- **AI Providers:** 
    - **Google Vertex AI / Google AI Plugin:** Gemini 1.5 Flash (Metadata), Gemini 2.0 Flash & Imagen 2 (Images).
- **Prompt Management:** Hardcoded in `src/ai/flows/*.ts` using Handlebars templates.
- **Database Schema:** Defined via Zod in `src/lib/types.ts` for form validation only. No persistent database exists.

---

## 3. CURRENT UI/SCREENS
- **`/` (Main Generation):** The core workspace. Left sidebar for configuration, right pane for generation results.
- **`/report` (Technical Summary):** A static documentation page for internal review of the project's logic.
- **Missing Screens:** Login, Dashboard/History, Catalog, Settings, Publishing/Integrations.

---

## 4. CURRENT PRODUCT WORKFLOW
**Supported Categories:**
- **Shirts:** Supports `Full Sleeve` / `Half Sleeve`. Generates 3 model views + 1 flatlay.
- **Trousers:** Supports `Fit Type` and `Material Stretch`. Requires 3 reference photos. Generates Front Model, Back Model, Texture Close-up, and Flatlay.
- **Jeans:** Currently uses the same logic as shirts/shoes.
- **Shoes:** Supports `Formal` / `Casual`. Generates Front Single, Side Single, Back Pair, Top-down Pair.
- **Perfumes:** Supports `Fragrance Family`, `Target`, `Size`. Generates Bottle Front, Box Front, Box Back, and Hero (Bottle + Box).

---

## 5. TITLE + DESCRIPTION GENERATION AUDIT
- **Mechanism:** Uses a single prompt `generateProductTitleDescriptionPrompt`.
- **Title:** Product-aware (Format: `Mitty [Color] [Type] [Gender]`).
- **Description:** Fixed templates populated with variables (e.g., "Elevate your wardrobe...").
- **Gaps:** 
    - **Missing:** Bullet features, Meta description, Slug, Alt text.
    - **Quality:** Template-heavy. It feels robotic because it relies on filling slots rather than creative copy.
    - **Improvement:** Move to a multi-stage prompt that generates "SEO Pack" containing all 7 target metadata fields.

---

## 6. IMAGE GENERATION AUDIT
- **Quantity:** 4 images per product.
- **Consistency:** Low-Medium. While prompts request the "same model," there is no underlying seed-locking or LoRA training to ensure the model's face/build stays identical across different sessions.
- **Accuracy:** Good. Prompts are detailed and use reference images.
- **Targets:**
    - **Shirts/Trousers:** Strong front/side/back model support.
    - **Shoes:** Excellent packshot support (Single vs. Pair logic).
    - **Logo/Color:** Preserved via text instructions and media parts, but occasionally hallucinated or blurred.

---

## 7. CODE QUALITY AUDIT
- **Strong Parts:** Excellent separation of AI logic into Genkit Flows. Clean component-based UI using ShadCN.
- **Weak Parts:** 
    - **Base64 Overuse:** Sending 50MB+ of Base64 via Server Actions is a performance bottleneck.
    - **Statelessness:** No database means if the page refreshes, all generation costs and results are lost.
    - **Validation:** Missing server-side file size/type validation (it's client-side only).
    - **Error Handling:** Monolithic `try/catch` in `page.tsx` makes debugging specific flow failures difficult.

---

## 8. BUGS / RISKS / GAPS
1. **Rate Limits:** Running 5 parallel AI calls per submission will hit Google AI rate limits quickly under load.
2. **Payload Size:** Next.js Server Actions have a default body size limit (currently bumped to 50MB in config), but large Base64 strings can still cause "Unexpected Response" (timeouts).
3. **Accuracy:** Imagen 2 can occasionally struggle with specific fabric patterns (small checkers/stripes) and text (logos).
4. **Publishing Gap:** No path to get these assets onto an actual store without manual download/upload.

---

## 9. PRODUCTION READINESS: VERDICT
**Verdict: 30% Ready.**
The AI logic and UI layout are strong foundations. However, the **lack of persistence (DB/Storage) and Auth** makes it a demo, not a product. 

**Recommendation:** Continue but refactor heavily. The AI flows are worth 100% keeping, but the "Stateless" architecture must be replaced with a "Firebase-First" architecture.

---

## 10. IMPROVEMENT PLAN
- **Phase 1 (Persistence):** Integrate Firebase Auth and Firestore. Upload images to Firebase Storage first, then pass URLs to AI flows instead of Base64.
- **Phase 2 (SEO Pack):** Update `generate-product-title-description.ts` to output a full JSON SEO object (Slug, Alt text, Bullets, Meta).
- **Phase 3 (Model Consistency):** Experiment with "Persona" reference images in prompts or stable diffusion-based face swapping.
- **Phase 4 (Workflow):** Add a "Product Catalog" where users can see past generations and a "Publish" button.

---

## 11. GITHUB HANDOFF PREP
- **Critical Files:** `src/ai/flows/*` (Prompts), `src/app/page.tsx` (Logic), `src/lib/types.ts` (Schema).
- **Secrets:** `GEMINI_API_KEY` must be in `.env.local` (never committed).
- **Cleanup:** Delete `src/ai/flows/generate-product-images.ts` (it is marked as deprecated).

---

## 12. FINAL SUMMARY
**A. What works well:** The Genkit flow structure and the multi-category prompt logic.
**B. What should be fixed:** Move from Base64 to Cloud Storage URLs. Add user authentication.
**C. What should be added:** SEO metadata expansion and a persistent Product Catalog.
**D. Decision:** **Continue with this codebase.** The AI prompt engineering already done is significant and high-value.

---

## AUDIT SCORECARD
- **Product Foundation:** 4/10
- **UI Quality:** 7/10
- **Code Quality:** 6/10
- **Backend Readiness:** 2/10
- **AI Readiness:** 8/10
- **Scalability:** 2/10
- **Store Usability:** 3/10
- **Reuse Value:** 8/10
- **Production Readiness:** 3/10

**Final One-Line Decision: Proceed on this codebase (with heavy Firebase refactoring).**

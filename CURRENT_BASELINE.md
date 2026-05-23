# MITTY Virtual Studio Current Baseline

This document preserves the current working state before Supabase, PWA, or UI redesign work changes product logic.

## 1. Current Framework and Stack

- Framework: Next.js 15.3.8 with App Router
- Language: TypeScript
- Package manager: npm with `package-lock.json`
- UI: React 18, Tailwind CSS, shadcn/Radix UI components, lucide-react icons
- Forms: React Hook Form with Zod validation
- AI orchestration: Genkit 1.13 with `@genkit-ai/googleai`
- Image/text generation provider: Google AI models through Genkit
- Export: JSZip client-side ZIP generation

## 2. Current Routes

- `/`: Main product asset generation workspace
- `/report`: Static internal technical report page
- Default Next.js not-found route

## 3. Current Working Commands

- `npm run dev`: Starts the Next.js dev server with Turbopack
- `npm run genkit:dev`: Starts the Genkit developer UI
- `npm run genkit:watch`: Starts Genkit in watch mode
- `npm run lint`: Runs ESLint
- `npm run typecheck`: Runs TypeScript checking with `tsconfig.typecheck.json`
- `npm run build`: Builds the Next.js app
- `npm run start`: Starts the production build

## 4. Current Product Categories

- Shirt
- Trousers
- Jeans
- Shoes
- Perfume

## 5. Current Upload Requirements by Category

- Shirt: one product image
- Jeans: one product image
- Shoes: one product image
- Trousers: front view image, fabric close-up image, back view image
- Perfume: perfume bottle image, perfume box front image, perfume box back image

All uploads currently accept PNG, JPG/JPEG, and WEBP up to 5MB each.

## 6. Current AI Flows in `src/ai/flows`

- `types.ts`: Shared Genkit/Zod input schema for product generation
- `generate-product-title-description.ts`: Generates product title, product description, and detected/final color
- `generate-front-view.ts`: Generates front view image for fashion products and shoes
- `generate-side-view.ts`: Generates side view image for fashion products and shoes
- `generate-back-view.ts`: Generates back view image for fashion products, shoes, and trousers
- `generate-hd-flatlay.ts`: Generates flat lay or top view image
- `generate-texture-view.ts`: Generates trouser texture image
- `generate-perfume-bottle-front.ts`: Generates perfume bottle front packshot
- `generate-perfume-box-front.ts`: Generates perfume box front packshot
- `generate-perfume-box-back.ts`: Generates perfume box back packshot
- `generate-perfume-hero-view.ts`: Generates perfume bottle and box hero image
- `generate-product-images.ts`: Deprecated placeholder; logic has been split into individual view flows

## 7. Current Generated Outputs by Category

- Shirt: product title, product description, front view, side view, back view, HD flat lay
- Jeans: product title, product description, front view, side view, back view, HD flat lay
- Shoes: product title, product description, front view, side view, back view, top view
- Trousers: product title, product description, front view, back view, material texture, flat lay
- Perfume: product title, product description, bottle front, box front, box back, bottle and box hero view

## 8. Current SEO Metadata Output

Currently generated:

- Product title
- Product description
- Detected/final color

Currently missing:

- SEO title
- Short description
- Long description as a separate field
- Bullet features
- Meta title
- Meta description
- Slug
- Image alt text as generated metadata
- Category tags
- Styling suggestions

## 9. Current ZIP/Download Behavior

- Each generated image card has an individual download action.
- `ResultsDisplay` creates a client-side ZIP file with JSZip.
- ZIP contains generated PNG files and `Product_Info.txt`.
- `Product_Info.txt` includes product title and product description.
- No exported files are stored permanently.

## 10. Current Limitations

- No authentication
- No database
- No persistent storage
- No product history
- Base64/data URI workflow
- Uploaded and generated assets are held in memory only
- Results are lost on page refresh
- No PWA foundation before Phase 2
- Prototype UI
- No approval workflow
- No generation queue
- No cost/rate-limit controls

## 11. Files That Must Be Preserved

- `src/ai/flows/*`
- `src/ai/flows/types.ts`
- `src/components/results-display.tsx`
- Current form/category logic in `src/app/page.tsx`, `src/components/product-form.tsx`, and `src/lib/types.ts`

Do not delete working AI flows. Do not rewrite prompts until a later approved phase.

## 12. Regression Checklist

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- App opens
- Product generation form works
- Results render
- Regenerate still works
- ZIP download still works

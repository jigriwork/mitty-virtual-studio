# MITTY Virtual Studio Deployment

This app is currently an internal testing tool. It uses Google/Gemini/Genkit for generation and Supabase Storage only for public catalog image URLs. It does not use Supabase database, login, roles, or product history yet.

## Vercel Environment Variables

Add these variables in Vercel Project Settings under Environment Variables:

```env
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the real Google Gemini API key in Vercel only. Do not prefix it with `NEXT_PUBLIC_`.
Use only the Supabase anon public key for this phase. Do not add or use a Supabase service role key.

## Supabase Storage

Create these public Supabase Storage buckets before exporting catalog CSVs:

- `product-generated-images`
- `size-charts`

Generated product image URLs and uploaded size chart URLs must be public because the Mitty catalog CSV references them directly. Anyone with one of those URLs can access that image.

The app remains internal/stateless apart from browser `localStorage` catalog items. Saved catalog products persist only on the same device/browser until cleared.

## Security Notes

- Never commit `.env` or any file containing real secrets.
- Keep `GEMINI_API_KEY` server-only.
- Keep Supabase usage limited to the public URL and anon key in this phase.
- Keep the deployment URL private until login/auth is added.
- Generated images are uploaded to public Supabase Storage only when a user saves a product to the catalog.
- SEO/catalog metadata is saved in browser `localStorage`; no database writes are used.

## Vercel Notes

- Build command: `npm run build`
- Development command: `npm run dev`
- The app uses Next.js Server Actions and server-side Genkit flows for Gemini calls.
- Image generation can take longer than normal text requests. If Vercel functions time out during internal testing, increase the project/function timeout on a paid Vercel plan before changing providers or architecture.

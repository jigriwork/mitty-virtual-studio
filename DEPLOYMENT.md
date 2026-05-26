# MITTY Virtual Studio Deployment

This app is an internal MITTY tool. It uses Google/Gemini/Genkit for generation, Supabase Auth for login, Supabase Storage for public catalog image URLs, and browser `localStorage` for catalog persistence.

## Vercel Environment Variables

Add these variables in Vercel Project Settings under Environment Variables:

```env
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the real Google Gemini API key in Vercel only. Do not prefix it with `NEXT_PUBLIC_`.
Use only the Supabase anon public key. Do not add or use a Supabase service role key.

## Auth And Roles

The app now requires Supabase Auth login before users can access generation or catalog tools. Login is email/password only for existing Supabase Auth users.

Public signup is not implemented. Do not add a signup link or hardcode any password in source code.

Owner account:

- Email: `admin@gpbm.in`
- User ID: `a35c12a0-4d29-43d3-9dd1-1e83cf733452`

Roles are `owner` and `staff`. The app reads `public.profiles.role` when available and safely falls back to treating the owner email/user ID above as `owner`; all other authenticated users are treated as `staff`. Owner users can see the Staff Management placeholder. Staff creation should be handled manually in Supabase Auth until the future staff-management phase.

## Supabase Storage

Create these public Supabase Storage buckets before exporting catalog CSVs:

- `product-generated-images`
- `size-charts`

Generated product image URLs and uploaded size chart URLs must be public because the Mitty catalog CSV references them directly. Anyone with one of those URLs can access that image.

Generated images are uploaded to `product-generated-images` only when a user saves a product to the catalog. Uploaded size chart images are uploaded to `size-charts`. Saved catalog products persist only on the same device/browser until cleared.

## Security Notes

- Never commit `.env` or any file containing real secrets.
- Keep `GEMINI_API_KEY` server-only.
- Keep Supabase usage limited to the public URL and anon key.
- Do not use or deploy `SUPABASE_SERVICE_ROLE_KEY`.
- Do not hardcode passwords.
- Generated images are uploaded to public Supabase Storage only when a user saves a product to the catalog.
- SEO/catalog metadata is saved in browser `localStorage`; product catalog rows are not written to the database.

## Vercel Notes

- Build command: `npm run build`
- Development command: `npm run dev`
- The app uses Next.js Server Actions and server-side Genkit flows for Gemini calls.
- Image generation can take longer than normal text requests. If Vercel functions time out during internal testing, increase the project/function timeout on a paid Vercel plan before changing providers or architecture.

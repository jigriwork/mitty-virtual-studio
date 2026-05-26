# Supabase Setup

Supabase CLI was not available in this workspace, so create the storage buckets manually.

## Buckets

In the Supabase dashboard for the project:

1. Open Storage.
2. Create a public bucket named `product-generated-images`.
3. Create a public bucket named `size-charts`.
4. Confirm both buckets are public so the Mitty catalog CSV can reference image URLs directly.

## Environment Variables

Add these variables locally and in Vercel:

```env
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use the Supabase project URL and anon public key only. Do not use a service role key for this phase.

## Vercel

1. Add `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Project Settings.
2. Redeploy the app after adding or changing environment variables.

## Public URL Note

Generated catalog product images and size chart uploads are publicly accessible to anyone with the URL. This is required for the Mitty catalog CSV upload flow.

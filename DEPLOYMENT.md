# MITTY Virtual Studio Deployment

This app is currently a stateless internal testing tool. It does not use Supabase, login, a database, or storage yet.

## Vercel Environment Variables

Add this variable in Vercel Project Settings under Environment Variables:

```env
GEMINI_API_KEY=
```

Use the real Google Gemini API key in Vercel only. Do not prefix it with `NEXT_PUBLIC_`.

## Security Notes

- Never commit `.env` or any file containing real secrets.
- Keep `GEMINI_API_KEY` server-only.
- Keep the deployment URL private until login/auth is added.
- Generated images and SEO packs are not persisted by this app.
- Supabase and login will be added in a later phase.

## Vercel Notes

- Build command: `npm run build`
- Development command: `npm run dev`
- The app uses Next.js Server Actions and server-side Genkit flows for Gemini calls.
- Image generation can take longer than normal text requests. If Vercel functions time out during internal testing, increase the project/function timeout on a paid Vercel plan before changing providers or architecture.

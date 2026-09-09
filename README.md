# Birthday Studio

This version turns the original Valentine experience into a reusable birthday-card generator while keeping the original interactive flow and 3D gallery.

## What changed

- `/admin` — protected creator dashboard.
- Enter only recipient name, message, photos and one song.
- A unique `/birthday/<slug>` link is generated for every birthday.
- Each birthday stores its own photos, music and message in Supabase.
- The original interactive intro and 3D dome gallery remain the public experience.
- No need to edit source files for every new birthday.

## Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local` and fill in:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `ADMIN_SECRET`
4. Run:

```bash
npm install
npm run dev
```

5. Open `/admin` and create a birthday.

### Production

Deploy to Vercel or another Node-compatible host and add the same environment variables in the host's project settings. The `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be prefixed with `NEXT_PUBLIC_`.

### Upload limits

The creator currently allows up to 30 images, 8MB per image, and a 25MB music file. If your deployment has a request-body limit, use smaller/compressed files or move uploads to direct browser-to-Supabase signed uploads.

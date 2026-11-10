# CloudDesk — private self-hosting setup (phone-first)

This is a first migration away from AppDeploy. The React app now uses Supabase Auth and the `projects` table. It supports email/password and Google OAuth. The SQL policies are intentionally owner-only.

## What this version does
- Private sign-in UI with email/password and Google.
- Saves website/project records in Supabase.
- Row-level security is intended to restrict all records to one owner UUID.

## Configure Supabase
1. Create a free Supabase project.
2. In Project Settings > API, copy the Project URL and publishable/anon key.
3. In the source project, copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Open SQL Editor, paste `supabase-setup.sql`, but first create your owner account and replace `YOUR-OWNER-USER-UUID` with the UUID shown under Authentication > Users.
5. Configure Authentication > URL Configuration. Set the Site URL to the URL where CloudDesk will run. Add that same URL to Redirect URLs.
6. Under Authentication > Providers, enable Email. Enable Google only after configuring a Google OAuth client ID and secret in Google Cloud Console; set Supabase's callback URL as the authorized redirect URI in Google Cloud.
7. Create your account using email/password first. Confirm the email if confirmation is enabled. Then sign in and copy your user UUID into the SQL policy template before running it.
8. For Google sign-in to reach the same account, use the same verified email address for Google and email/password. Supabase can link verified identities with matching email addresses, subject to its provider settings.

## Run from Android
A phone can edit the code in a browser-based IDE, or run Node.js using Termux. This source needs Node.js 20+ (recommended), then:

```sh
npm install
npm run dev -- --host 0.0.0.0
```

This starts a development server for testing on your local network. It is not a production server. Do not expose the Vite development server publicly.

## Important hosting limitation
This dashboard currently stores website details; it does not yet deploy or serve arbitrary websites. A later stage can add a local static-site hosting service on Android (for example, using Termux and Nginx/Caddy where supported) and a tunnel for public access. Public reachability from mobile data may be blocked by carrier NAT, and free temporary tunnels may have changing URLs. A phone also needs to stay powered and connected.

Never put a Supabase service-role key in frontend code. The publishable/anon key is intended for browser use only when Row Level Security is correctly configured.

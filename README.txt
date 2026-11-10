CloudDesk private self-hosting dashboard
========================================

This is the phone-first, self-hosted migration of the CloudDesk frontend away
from AppDeploy. It uses React 19, TypeScript, Vite, Supabase Auth and Supabase
Postgres. See README-PHONE-SETUP.md for the step-by-step setup.

The app currently manages website/project records. It does NOT yet run or
publish arbitrary websites. Actual website hosting from Android (Termux) and
public access through a free tunnel are a separate next development stage.

Never expose a Supabase service-role key in frontend code. Configure the
owner-only Row Level Security policies in supabase-setup.sql before using it.

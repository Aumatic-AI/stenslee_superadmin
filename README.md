# Stenslee Super Admin

Platform-operator console for the Stenslee multi-tenant tattoo-studio SaaS —
manage studio organizations, subscription plans, per-org feature
permissions, and browse cross-tenant sessions/customers for support.

This is a separate app from the studio product (`../studio`), with its own
git repository, sharing only the Supabase backend. See `../README.md` for
the overall workspace layout, and `AGENTS.md` in this folder for the full
technical reference.

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase project values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll land on
`/login` — sign in with a platform admin account (see AGENTS.md's Auth
Model section for how to create the first one).

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build
npm run start    # serve a production build
npm run lint     # eslint
```

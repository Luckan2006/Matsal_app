# Matsal App — my-app

This is the React source for the Matsal kiosk app. See the [root README](../README.md) for a full project overview.

## Quick start

```bash
# From the my-app/ directory
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Available scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts the Vite dev server with hot reload |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run preview` | Serves the production build locally to test before deploying |
| `npm run deploy` | Deploys `dist/` to the `gh-pages` branch on GitHub |
| `npm run lint` | Runs ESLint on all source files |

## Key files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main component — session handling, button clicks, Supabase upsert |
| `src/login.jsx` | Login and register form |
| `src/supabaseClient.js` | Initialises the Supabase client |
| `vite.config.js` | Vite config — sets base path to `/Matsal_app/` for GitHub Pages |

## Notes

- The Supabase URL and anon key are stored directly in `supabaseClient.js`. The anon key is safe to expose in browser code — Supabase's Row Level Security policies control what data users can actually access.
- If you add a new user via the register form, an admin must set `approved = true` in the `profiles` table in Supabase before that account can log in.

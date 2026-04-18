# Matsal App

A Swedish-language kiosk web app for tracking food waste at a school cafeteria. Students tap one of four buttons to indicate why they are throwing away food. The data is stored in a shared database and can be viewed in the separate [Admin Dashboard](https://github.com/luckan/Matsal_app_admin).

## What it does

When a student throws away food they tap a button describing the reason:

| Button | Swedish | Meaning |
|--------|---------|---------|
| 1 | Hann inte äta | Didn't have time to eat |
| 2 | Tog för mycket | Took too much food |
| 3 | Ogillade maten | Didn't like the food |
| 4 | Slängde inte | Did not actually throw it away |

Each tap is stored in the database under today's date. A short "Tack!" (Thank you) animation plays after each tap to confirm it was registered.

## Tech stack

- **React 19** — UI framework
- **Vite** — build tool and dev server
- **Supabase** — PostgreSQL database and user authentication
- **GitHub Pages** — hosting
- **GitHub Actions** — keep-alive workflow that pings Supabase daily so the free-tier instance does not go to sleep

## Project structure

```
Matsal_app/
├── .github/
│   └── workflow/
│       ├── Ping-supabase.yml   # Daily cron job to keep Supabase awake
│       └── KeepAlive.js        # Script used by the cron job
└── my-app/                     # The React application
    ├── src/
    │   ├── main.jsx            # React entry point
    │   ├── App.jsx             # Main component — buttons, click logic, auth
    │   ├── App.css             # App styling
    │   ├── login.jsx           # Login / register form
    │   ├── login.css           # Login styling
    │   ├── index.css           # Global styles
    │   └── supabaseClient.js   # Supabase client initialisation
    ├── index.html
    ├── package.json
    └── vite.config.js          # Base path set to /Matsal_app/ for GitHub Pages
```

## How the code works

### Authentication

On startup, `App.jsx` checks for an existing Supabase session with `supabase.auth.getSession()`. It then looks up the user's row in the `profiles` table to confirm `approved = true`. Unapproved accounts are signed out immediately with a message. The `onAuthStateChange` listener keeps the session state in sync as the user logs in or out.

New registrations are created with `approved = false` by default. An admin must set `approved = true` in Supabase before the user can access the app.

### Button clicks

When a button is tapped:
1. The state variable `isClicking` is set to `true` to block double-taps.
2. The app calls Supabase with an **upsert** on the `daily_clicks` table, using `onConflict: "day"` so each date has exactly one row. The corresponding counter column (`one`, `two`, `three`, or `four`) is incremented.
3. A "Tack!" animation plays for 1.7 seconds.
4. `isClicking` is reset to `false`.

### Database tables

**`profiles`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Matches the Supabase auth user ID |
| approved | boolean | Must be `true` for a user to access the app |

**`daily_clicks`**
| Column | Type | Description |
|--------|------|-------------|
| day | date | Primary key — one row per calendar day |
| one | integer | Count for "Hann inte äta" |
| two | integer | Count for "Tog för mycket" |
| three | integer | Count for "Ogillade maten" |
| four | integer | Count for "Slängde inte" |

## Running locally

### Requirements

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) (included with Node.js)
- A code editor — [Visual Studio Code](https://code.visualstudio.com/) is recommended

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/Matsal_app.git
   cd Matsal_app/my-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to `http://localhost:5173`

The dev server supports Hot Module Replacement (HMR) — any file you save is reflected in the browser instantly without a full reload.

### In Visual Studio Code

1. Open the `Matsal_app` folder in VS Code (`File > Open Folder`).
2. Open the integrated terminal (`Ctrl + `` ` ``).
3. Run the commands above from the terminal.
4. Optionally install the **ESLint** extension for inline linting feedback.

## Deployment

The app is deployed to GitHub Pages using the `gh-pages` package.

```bash
cd my-app
npm run build   # builds the production bundle into dist/
npm run deploy  # pushes dist/ to the gh-pages branch
```

The `vite.config.js` sets `base: "/Matsal_app/"` so all asset paths match the GitHub Pages URL.

## Keep-alive workflow

Supabase free-tier instances pause after a period of inactivity. The `.github/workflow/Ping-supabase.yml` workflow runs every day at midnight UTC and makes a lightweight request to the Supabase project to keep it active.

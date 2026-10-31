# Lagos Life — Fictional Virtual Money Game

This is an independent fictional game demo. It is **not** the real Lagos Life service, a bank, or an affiliated login page.

## Features
- ₦1 trillion virtual-world landing page and game options.
- Verify & Proceed scroll button.
- Player registration and login using game-only credentials.
- Admin dashboard showing usernames, account creation dates, virtual balances, login outcomes, and timestamps.
- Passwords are hashed with Node's built-in `scrypt`; plaintext passwords are never stored, logged, or shown to admins.

## Run locally
1. Install Node.js 18 or newer.
2. Unzip this project and open a terminal in its folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Change `SESSION_SECRET` and `ADMIN_PASSWORD` in `.env` to long, unique values.
6. Run `npm start`.
7. Visit `http://localhost:3000`. Admin page: `http://localhost:3000/admin.html`.

## Publish online
Deploy this folder to a Node.js hosting provider that supports persistent disk storage. Set the environment variables from `.env.example` in the host's dashboard. Use HTTPS. The app writes `data.json` to its project directory, so configure persistent storage for that file or replace the simple JSON store with a managed database before scaling.

## Important
- Use only fictional game usernames and passwords. Never ask players for banking, email, or other real account credentials.
- Change the default admin credentials before deployment.
- The built-in Express memory session store is suitable only for a small demo. For production, use a persistent session store and add rate limiting, CSRF protection, backups, and a managed database.

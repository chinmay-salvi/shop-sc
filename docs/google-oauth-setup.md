# Google OAuth setup (fix 403 “origin is not allowed”)

If you see:

```text
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

follow this checklist. The app uses **Google Identity Services (GIS)** with a **Web application** OAuth client; only that client type has “Authorized JavaScript origins.”

## 1. Use a “Web application” client

- Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
- Open the OAuth 2.0 client whose **Client ID** matches `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local`.
- The client type must be **“Web application”**.  
  If it is “Desktop app”, “Android”, “Chrome app”, etc., that client **cannot** have Authorized JavaScript origins. In that case:
  - Create a **new** client: **Create Credentials** → **OAuth client ID** → Application type: **Web application**.
  - Copy the new Client ID into `frontend/.env.local` as `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
  - Then add the origins below to this **new** Web client.

## 2. Add Authorized JavaScript origins (exact strings)

For the **Web application** client you’re using:

- Under **Authorized JavaScript origins**, add **both** (for local dev on port 3000):
  - `http://localhost`
  - `http://localhost:3000`
- No trailing slash, no `https` unless you actually use HTTPS.
- If you sometimes use `http://127.0.0.1:3000`, add that too.

The browser sends the **exact** origin (e.g. `http://localhost:3000`). It must match one of these entries exactly.

## 3. Match the Client ID

- The value in `frontend/.env.local` must be the Client ID of the **same** Web application client you edited in step 2.
- No spaces, no quotes; only: `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client_id>`.

## 4. Save and wait

- Click **Save** in the Google Cloud Console.
- Google’s docs state that credential changes can take **5 minutes to a few hours** to propagate. If sign-in still returns 403 right after saving, wait longer (e.g. 30 minutes or try again the next day), then hard refresh (e.g. Cmd+Shift+R) or use an incognito window.

## 5. Restart frontend after changing .env.local

- Next.js bakes `NEXT_PUBLIC_*` in at build time. After changing `frontend/.env.local`, restart the dev server (`npm run dev:frontend` or `npm run dev` in `frontend/`).

## Quick check

- Open the app in the browser and check the console. In development we log the origin to add. Add that exact value **and** `http://localhost` to Authorized JavaScript origins for your Web application client.

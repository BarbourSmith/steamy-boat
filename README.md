# steamy boat

A small password-gated page for the floating sauna, for friends and family.

- `/` is the landing page. The password is `sauna`. It's a velvet rope, not a lock.
- `/deck/` has the signup form, the wind forecast for the coming Wednesday at Newport Shores, and the basics.
- `/stern/` lists who has signed up, grouped by Wednesday, with a remove button for each signup.

Each Wednesday holds 6 people (`CAPACITY` in both `assets/common.js` and `apps-script.gs`). Once it's full, the deck swaps the signup form for a "full" message.

## Turn on GitHub Pages

Repo **Settings → Pages → Build and deployment**: Source "Deploy from a branch", branch `main`, folder `/ (root)`.

## Hook up signups (about 2 minutes)

GitHub Pages can't store anything, so signups go to a Google Sheet.

1. Make a new Google Sheet, for example "steamy boat signups".
2. In the sheet, open **Extensions → Apps Script**. Delete what's there and paste in `apps-script.gs`. Save.
3. Click **Deploy → New deployment**, pick type **Web app**, set *Execute as* **Me** and *Who has access* **Anyone**, then **Deploy** and authorize it.
4. Copy the web app URL (ends in `/exec`) into `SIGNUP_URL` at the top of `assets/common.js`, then commit and push.

Until `SIGNUP_URL` is set, the site runs in test mode and signups only live in your own browser.

If you change `apps-script.gs` later, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## Editing

- The "the basics" list is plain HTML near the bottom of `deck/index.html`.
- Forecast data comes from [Open-Meteo](https://open-meteo.com/), which is free and needs no key.

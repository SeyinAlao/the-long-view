# Backlog

Agreed work that is deliberately not done yet, and when it should be.

## Before going live

- **Reset the Neon `neondb_owner` password** and update every environment's connection strings. The current one was shared outside the project during setup.
- **Publish the Google OAuth consent screen**, so any Google account can sign in, not only listed test users.
- **Daily jobs and nightly backup on GitHub Actions** (scheduled runs confirmed: they start 4-6 hours late, which is harmless), in the private `the-long-view-backups` repo (ADR 009). Since publishing requires a real price from the last 7 days, the refresh job is what keeps publishing possible at all, and Neon's free plan only restores to about 6 hours back. The in-process schedulers already run at the new times (5:30pm / 6:00pm Lagos). The workflows are live, a test restore passed and a failed scheduled run emailed (2 October 2026). Still to do: a week of checking fetched prices against NGX's official closes.
- **Keep the API awake, or accept the wait.** After 15 idle minutes Render's free API sleeps, and the first visitor waits about 46 seconds. Decide before posting the project publicly.
- **A clean production database.** The current `production` branch holds development test data, including theses published with the ₦100 placeholder price. Real users should start on clean data.
- **Vercel Web Analytics** on the production site (free up to 50,000 events a month on Hobby; not on staging, where the only visitor is the developer).

## After going live

- **Google sign-in returns people to where they were.** Today it always lands on the dashboard. Needs a signed OAuth `state` value carrying a `safeNextPath`-checked destination.
- **Share a thought, story-style, linking to the full thesis**, with the full thesis behind sign-in.
- **One shared style for form fields.** The same class string is copy-pasted across six files.
- **One shared "page is ready" wait in the browser tests.** Several tests type into a field straight after `page.goto`, and a key pressed before React hydrates the page is dropped. The account-switch test hit this in October 2026 and now retypes until the form responds (its own workaround). Replace per-test workarounds with one helper that waits for hydration (for example a marker the root layout sets once mounted), and use it in every test that types after loading a page.

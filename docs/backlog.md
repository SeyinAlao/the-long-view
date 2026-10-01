# Backlog

Agreed work that is deliberately not done yet, and when it should be.

## Before going live

- **Browser tests in CI.** Turn the journey, Google-button and axe accessibility checks used during development into Playwright tests that run on every PR.
- **Reset the Neon `neondb_owner` password** and update every environment's connection strings. The current one was shared outside the project during setup.
- **Publish the Google OAuth consent screen**, so any Google account can sign in, not only listed test users.
- **Daily jobs on GitHub Actions:** market-data refresh, then evaluation, against production.

## After going live

- **Google sign-in returns people to where they were.** Today it always lands on the dashboard. Needs a signed OAuth `state` value carrying a `safeNextPath`-checked destination.
- **Share a thought, story-style, linking to the full thesis**, with the full thesis behind sign-in.
- **One shared style for form fields.** The same class string is copy-pasted across six files.

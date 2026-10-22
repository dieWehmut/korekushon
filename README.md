# Korekushon

A simple, privacy-focused content and comment collection platform.

Live demo: https://dieWehmut.github.io/korekushon/

## Deployment

The site is deployed to GitHub Pages automatically by GitHub Actions on every push
to `main` (see `.github/workflows/deploy.yml`).

Because the app uses `BrowserRouter`, the build is served from the `/korekushon/`
sub-path (`base` in `vite.config.ts`) and `dist/index.html` is copied to
`dist/404.html` by `scripts/copy-404.mjs`, so deep links and page refreshes fall
back to the single-page app instead of a GitHub 404 page.

Build locally with:

```bash
npm ci
npm run build   # outputs dist/ (including 404.html)
```

## Data storage

The app has no backend and needs no credentials. Categories, links, comments,
favorites and the signed-in profile are stored in the browser's `localStorage`
(see `src/localdb/store.ts`), so every visitor starts with an empty workspace and
their changes stay on their own device.

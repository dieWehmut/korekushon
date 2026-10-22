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

Supabase credentials are supplied at build time through the `VITE_SUPABASE_URL`
and `VITE_SUPABASE_ANON_KEY` environment variables; they are not committed.

# astro-discord-membership playground

This is a minimal Astro host app for exercising the local `astro-discord-membership` integration. It follows the same nested-package pattern as AstroDevRelish's playground, while using `file:..` so edits to the integration are tested locally.

## Run it

```sh
cd playground
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:4321`. The home page validates integration setup without credentials. To test the injected directory, profile, OAuth, verification, and API routes, fill in `.env` with the services described in the root [README](../README.md).

## What the fixture provides

- Astro server output and the Node adapter required by the integration's server-rendered routes.
- The integration's Firebase, JWT, Markdown, and SMTP runtime dependencies, declared locally because a `file:..` package is not hoisted by every package manager. Vite preserves the local package link so these resolve from the fixture.
- `membership({ communityName, siteUrl })` configuration using the package at `file:..`.

From the repository root, `npm run playground:dev` and `npm run playground:build` forward to this app.

## End-to-end tests

The Playwright suite seeds an isolated `e2e-membership.db` with two public members, categories, labels, and assignments. It does not use the local development database or require Discord OAuth.

```sh
pnpm test:e2e
```

Use `pnpm test:e2e:ui` to run the Playwright UI. Each run applies the Drizzle schema to the test database and then reseeds its fixture data.

## Mejengas Martes - Vite + Lit + Firebase

This repository now includes the first implementation phase of the migration from a single HTML file to a component-based app that can be deployed on GitHub Pages.

The old app remains as legacy reference in [legacy-index.html](legacy-index.html).

## Stack

- Vite + Lit + TypeScript
- Firebase (Firestore + Auth)
- Chart.js for evolution chart
- html2canvas for wrapped export

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Fill Firebase values in `.env`.

4. Start dev server:

```bash
npm run dev
```

If Firebase keys are not configured, the app falls back to demo data.

## Build checks

- Type check:

```bash
npm run typecheck
```

- Max 400 lines per source file:

```bash
npm run check:lines
```

- Production build:

```bash
npm run build
```

## Deploy to GitHub Pages

A workflow exists at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

Required GitHub Secrets:

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

Also enable Pages in repository settings and set source to GitHub Actions.

## Firestore model (phase 1)

Collections:

- `players`
	- `nombre: string`
	- `activo: boolean`
- `matches`
	- `nombre: string`
	- `fechaISO: string` (YYYY-MM-DD)
	- `team1PlayerIds: string[]`
	- `team2PlayerIds: string[]`
	- `resultado: 'team1' | 'team2' | 'draw'`
	- `mvpPlayerId: string | null`
	- `asistencia: number`
- `config/global`
	- `wrappedEnabled: boolean`
	- `seasonLabel: string`

Security rules scaffold exists in [firestore.rules](firestore.rules).

## Current implementation status

Implemented now:

- Typed domain models and calculation utilities
- Firebase bootstrap and repository abstraction
- Reactive store and initial section components:
	- standings
	- h2h
	- evolution
	- curios
	- matches
- GitHub Pages deploy workflow
- 400-line guard script

Pending next phases:

- Admin auth UI and role checks in frontend flow
- Player profile modal
- Wrapped modal and export action
- Match/player CRUD forms wired to Firestore writes
- Data migration script from legacy format

## Mejengas Martes - Vite + Lit + Firebase

This repository now includes the first implementation phase of the migration from a single HTML file to a component-based app that can be deployed on GitHub Pages.

The old app remains as legacy reference in [legacy-index.html](legacy-index.html).

## Stack

- Vite + Lit + TypeScript
- Firebase (Firestore + Auth)
- Firebase Cloud Functions for trusted season rollover
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

- Cloud Functions build:

```bash
npm run build:functions
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

## Firestore model

- `users/{uid}`
	- `uid: string`
	- `email: string | null`
	- `role: 'player'`
- `leagues/{leagueId}`
	- `activeSeasonId: string`
	- `adminUids: string[]`
- `leagues/{leagueId}/players/{playerId}`
	- `nombre: string`
	- `activo: boolean`
- `leagues/{leagueId}/seasons/{seasonId}`
	- `name: string`
	- `startedAt: string`
	- `endedAt: string | null`
	- `status: 'active' | 'ending' | 'ended'`
	- `matchCount: number`
- `leagues/{leagueId}/seasons/{seasonId}/matches/{matchId}`
	- `nombre: string`
	- `fechaISO: string` (YYYY-MM-DD)
	- `team1PlayerIds: string[]`
	- `team2PlayerIds: string[]`
	- `resultado: 'team1' | 'team2' | 'draw'`
	- `mvpPlayerId: string | null`
	- `asistencia: number`
- `leagues/{leagueId}/history/{seasonId}`
	- Immutable final standings and season totals written by the `endSeason` callable.
- `config/global`
	- `wrappedEnabled: boolean`
- `memberships/{uid}_{leagueId}`
	- `uid: string`
	- `leagueId: string`
	- `role: 'player' | 'admin'`
	- `joinCode: string`

Security rules scaffold exists in [firestore.rules](firestore.rules).

To migrate the legacy top-level collections into the original league and its first active season, run the migration once with Firebase Admin credentials:

```bash
node scripts/migrate-to-default-league.mjs
```

Deploy the rules and trusted rollover function with the Firebase CLI:

```bash
npm run build:functions
firebase deploy --only firestore:rules,functions
```

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

Season rollover, season switching, historical summaries, active-season match CRUD, and the legacy data migration are implemented. Player profiles and Wrapped remain separate future work.

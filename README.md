# pdfedit — mobile & web PDF tools

One Expo (React Native) codebase that ships everywhere:

- **iOS / Android** — native apps built with EAS (`eas build`)
- **Web** — static export deployed to Vercel (`vercel.json` included)

The app talks to the existing **DocForge** backend API (FastAPI + Redis workers)
for all processing. No processing happens on-device.

## v1 scope: 4 core tools

| Tool | Backend slug | Notes |
|------|--------------|-------|
| Merge PDF | `merge-pdf` | Multiple files, reorder before merging |
| Split PDF | `split-pdf` | Page ranges (`1-3, 5`) or every page |
| Compress PDF | `compress-pdf` | Low / medium / high level |
| PDF to Word | `pdf-to-word` | Single file |

More DocForge tools (Word→PDF, OCR, images, QR…) can be added by extending
`src/tools.ts` and reusing the generic tool screen.

## Setup

```bash
npm install
```

Point the app at your backend (default is `https://api.pdfedit.app`):

```bash
EXPO_PUBLIC_API_URL=https://your-docforge-host:8000
```

`app.json` → `expo.extra.apiUrl` holds the same default for native builds.

## Run

```bash
npm start        # Expo dev (scan QR with Expo Go)
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # web dev
npm run typecheck
```

## Web deploy (Vercel)

`vercel.json` is preconfigured: Vercel runs `npx expo export --platform web`
and serves `dist/`. Just import the repo in Vercel and set
`EXPO_PUBLIC_API_URL` in the project environment variables.

## Native builds (EAS)

```bash
npm install -g eas-cli
eas login
eas build:configure   # sets the real projectId in app.json
eas build -p android --profile production
eas build -p ios --profile production
```

Store submission needs your own Apple Developer ($99/yr) and Google Play
($25 one-time) accounts — EAS Submit walks through it:
`eas submit -p ios` / `eas submit -p android`.

## Project layout

```
app/                  expo-router screens (index, tool/[slug], signin)
src/api/client.ts     DocForge API client (jobs, auth, token storage)
src/tools.ts          tool catalogue for v1
src/components/ui.tsx shared UI kit
assets/               app icon & splash
```

## Backend contract (DocForge)

- `POST /api/tools/{slug}` — multipart `files` + option fields → `202 {job_id, status_url}`
- `GET /api/jobs/{job_id}` — `{status, progress, download_url?, file_name?, error?}`
- `POST /api/auth/login|register`, `GET /api/auth/me` — JWT auth
- Tool options: split → `mode` + `ranges`; compress → `level`

# CareFlow Demo Video — Recording Runbook

This guide explains how to record the automated stakeholder demo video using Playwright. The recording captures **real app screens** from a running CareFlow instance with seeded demo data.

## What you get

- One continuous **1920×1080 WebM** screen recording (~8–10 minutes)
- Covers clinic owner workflows and super-admin platform management
- Pair with [demo-video-script.md](./demo-video-script.md) for voiceover narration

## Prerequisites

1. **MySQL** and **Redis** running (local install or Docker):
   ```bash
   docker compose up mysql redis -d
   ```

2. **Backend** configured and seeded:
   ```bash
   cd backend
   cp .env.example .env   # if not already done
   npm install
   npm run db:migrate
   npm run db:seed
   npm run db:seed:demo
   npm run dev
   ```
   API should be available at http://localhost:3001

3. **Frontend** running:
   ```bash
   cd frontend
   cp .env.example .env.local   # if not already done
   npm install
   npx playwright install chromium
   npm run dev
   ```
   Web should be available at http://localhost:3000

4. **Demo credentials** (created by seed scripts):
   - Clinic owner: `anita.desai@sunriseclinic.in` / `SunriseClinic!234`
   - Platform admin: `superadmin@gmail.com` / `PlatformAdmin!234`

## Quick start (Windows)

From the project root:

```powershell
.\scripts\record-demo.ps1
```

Or manually from `frontend/`:

```bash
npm run demo:record
```

## Output location

After a successful run, the video is saved under:

```
frontend/e2e/recordings/project-demo-CareFlow-stakeholder-demo-walkthrough-demo/video.webm
```

Playwright may append a hash to the folder name. Look for the most recent `video.webm` under `frontend/e2e/recordings/`.

## Adjusting pacing

Edit pause durations in [`frontend/e2e/helpers/demo.ts`](../frontend/e2e/helpers/demo.ts):

```ts
pause: {
  intro: 8_000,
  scene: 25_000,
  dashboard: 45_000,
  visit: 50_000,
  calendar: 35_000,
  platform: 35_000,
  outro: 8_000,
}
```

To slow down mouse/keyboard interactions, adjust `slowMo` in [`frontend/e2e/playwright.config.ts`](../frontend/e2e/playwright.config.ts) (demo project).

## Adding voiceover

1. Record the screen video: `npm run demo:record`
2. Record narration using [demo-video-script.md](./demo-video-script.md)
3. Merge video and audio with ffmpeg:

```bash
ffmpeg -i video.webm -i narration.mp3 -c:v libx264 -c:a aac -shortest careflow-demo.mp4
```

Or use CapCut, DaVinci Resolve, or iMovie to align the script timestamps with the recording.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails | Re-run `npm run db:seed` and `npm run db:seed:demo` in backend |
| `ECONNREFUSED` on :3000 or :3001 | Start frontend and backend dev servers |
| Test times out | Increase `timeout` on the `demo` project in `playwright.config.ts` |
| Empty patient/appointment tables | Ensure `db:seed:demo` completed successfully |
| Playwright not found | Run `npx playwright install chromium` in `frontend/` |

## Files

| File | Purpose |
|------|---------|
| `frontend/e2e/playwright.config.ts` | Demo project with video recording settings |
| `frontend/e2e/helpers/demo.ts` | Login, navigation, and pause helpers |
| `frontend/e2e/specs/project-demo.spec.ts` | Full stakeholder walkthrough |
| `docs/demo-video-script.md` | Narration script with scene timestamps |
| `scripts/record-demo.ps1` | Preflight checks + recording launcher |

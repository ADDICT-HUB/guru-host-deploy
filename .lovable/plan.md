

# Plan: Open Deployment for Any WhatsApp Bot MD Repo

## Problem
Currently the deploy page only lets users pick from pre-configured repos in the `bot_repos` table. The user wants Heroku-like flexibility: paste any GitHub repo URL and deploy it.

## Changes

### 1. Update Deploy UI (`src/pages/DeployBot.tsx`)
- Remove the `bot_repos` selector entirely (no more dropdown)
- Add a **Repo URL** input field where users paste any GitHub repo URL (e.g. `https://github.com/user/bot-repo`)
- Default the field to `https://github.com/Gurulabstech/GURU-MD` as a placeholder/suggestion
- Add a **Session Var Name** input (defaults to `SESSION_ID`) so users can customize which env var holds their session
- Keep everything else: session ID, region, custom vars, referral section, quick actions

### 2. Update Edge Function (`supabase/functions/deploy-bot/index.ts`)
- Accept new fields from the request body: `repoUrl` (string) and `sessionVarName` (string)
- If `repoUrl` is provided, use it directly instead of looking up `bot_repos`
- Convert GitHub URLs to tarball format automatically: `https://github.com/{owner}/{repo}` becomes `https://github.com/{owner}/{repo}/tarball/main`
- If `repoUrl` already ends with `/tarball/...`, use as-is
- Fall back to the default GURU-MD repo if neither `repoUrl` nor `repoId` is given
- Use `sessionVarName` if provided, otherwise default to `SESSION_ID`
- Store the raw `repoUrl` in the bot record's `custom_vars` for reference

### 3. Database Migration
- Add `repo_url` column (nullable text) to `bots` table so we track what repo was deployed, since users are no longer limited to `bot_repos` entries

## How it works after the change
1. User pastes any GitHub repo URL (or leaves the default GURU-MD)
2. User enters session ID and optionally changes the session var name
3. System converts the URL to a tarball, creates a Heroku app on `silvateam14`, sets buildpacks + config vars, and triggers the build
4. No filtering, no repo whitelist -- just like Heroku


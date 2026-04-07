
# Plan: Major Dashboard Enhancement

## 1. Database Migration - Bot Marketplace Table
- Create `marketplace_bots` table with fields: name, description, repo_url, pairing_link, image_url, session_var_name, category, featured, active
- Admin-manageable from the admin dashboard
- Public read access for all authenticated users

## 2. Build Logs Viewer
- Add `build-logs` action to `heroku-proxy` edge function to fetch build output (not just log-sessions)
- Show build output in a modal/drawer when user clicks on a failed bot
- Display env vars from the bot's app.json (fetched from GitHub)

## 3. Health Monitoring Dashboard
- Add status bars/stats: Active, Deploying, Crashed, Stopped counts
- Trending section showing recent deployments
- Error/fail counters with visual indicators
- Health percentage bar

## 4. Live Logs Streaming
- Add streaming log support via Heroku log-sessions with `tail: true`
- Real-time log viewer component with auto-scroll

## 5. Bot Marketplace Page
- Grid of available bots with cards showing name, description, category
- Each bot card has: Deploy button (quick deploy modal), Repo link, Pairing link
- Pre-fills deploy form or opens quick-deploy modal

## 6. Admin: Manage Marketplace Bots
- Add CRUD interface in admin dashboard for marketplace bots
- Add/edit/delete bots with all fields

## 7. Heroku API Key Expiry Detection & Auto-Switch
- Add `validate-key` action to heroku-proxy to test if API key works
- On deploy failure due to auth, auto-detect and try next active key
- Send notification (toast + optional email) to admin when key expires
- When new key is added, auto-retry pending deployments

## Files to create/modify:
- `supabase/functions/heroku-proxy/index.ts` - add build-logs, validate-key actions
- `src/pages/Dashboard.tsx` - health bars, build logs viewer
- `src/pages/BotMarketplace.tsx` - new marketplace page
- `src/components/BuildLogsViewer.tsx` - build output modal
- `src/components/LiveLogs.tsx` - streaming logs component
- `src/components/BotHealthBar.tsx` - health monitoring component
- `src/components/QuickDeployModal.tsx` - one-click deploy modal
- `src/pages/Admin.tsx` - add marketplace bot management
- `src/App.tsx` - add routes



# GURU HOST 2026 — WhatsApp Bot Hosting Platform

## Overview
A full-featured WhatsApp bot hosting dashboard where users can deploy GURU-MD bots to Heroku, with manual M-Pesa/Airtel payment verification and a super admin panel.

## Pages & Features

### 1. Landing Page
- Bold hero: "GURU HOST 2026" branding with tagline
- Features showcase (deploy bots, manage, monitor)
- Payment info with **copyable** M-Pesa (0116284050) and Airtel (0105521300) numbers
- CTA → Sign Up / Login

### 2. Authentication (Email + Password)
- Sign up, login, password reset pages
- User profiles table for storing display name, phone, balance (GRT currency)

### 3. User Dashboard
- **GRT Balance** display with funding instructions
- **Deploy New Bot** flow:
  1. Enter Session ID
  2. Select Heroku region/team
  3. Pay minimum 50 KSH (50 GRT) — deducted from balance
  4. Deploy to Heroku via Edge Function (calls Heroku API)
- **My Bots** list showing:
  - Bot name, status (deploying/active/crashed/stopped)
  - Action buttons: **Restart**, **View Logs**, **Delete**
  - Live status indicators (green = active)
- **Fund Account** section:
  - Payment instructions with copyable M-Pesa & Airtel numbers
  - Submit transaction code + email form
  - Transaction history with approval status

### 4. Bot Detail Page
- Build logs viewer (real-time streaming)
- Dyno status & uptime info
- Config vars management
- Restart / Redeploy / Delete actions

### 5. Super Admin Dashboard
- **Payment Approvals**: View pending transactions, approve/reject, fund user GRT balances
- **User Management**: View all users, ban/unban, view balances & bots
- **Heroku API Keys**: Add/remove/edit multiple Heroku accounts with labels, set max app capacity per key
- **All Bots Overview**: Every deployed bot across all users with status, logs access, restart/delete
- **Capacity Tracking**: Apps used vs max per Heroku account
- **Analytics**: Total users, total bots, revenue (GRT funded), deployments over time
- **Revenue Reports**: Payment history, total collected, charts

### 6. Database (Supabase)
- `profiles` — user info, GRT balance
- `user_roles` — admin/user roles (secure, separate table)
- `heroku_api_keys` — multiple Heroku accounts with labels, max_apps, active status
- `bots` — deployed bots (app name, session ID, status, user_id, heroku_api_key_id)
- `transactions` — payment submissions (amount, transaction code, status, user_id)
- `bot_logs` — cached log entries

### 7. Edge Functions (Supabase)
- `heroku-proxy` — All Heroku API operations (create app, set config, build, restart, delete, get logs, get dynos)
- `deploy-bot` — Orchestrates full deployment: create app → set buildpacks → set config vars (SESSION_ID) → trigger build from GURU-MD GitHub repo
- `admin-actions` — Admin-only operations (approve payments, manage API keys, ban users)

### 8. Design
- Dark theme with green/emerald accents (WhatsApp-inspired)
- Mobile-responsive
- Status badges (Active = green, Deploying = yellow, Crashed = red)
- Copy-to-clipboard buttons on payment numbers
- Toast notifications for all actions


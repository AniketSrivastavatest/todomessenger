# TodoMessenger Production Start

This is the first production track for TodoMessenger. The prototype can still run as a static app, but production should move identity, workspaces, chats, tasks, reminders, and integrations into a backend database.

## Phase 1: Local Production Foundation

Use PostgreSQL for the production database.

1. Install Node dependencies:

   ```powershell
   npm install
   ```

2. Create the PostgreSQL database.

   ```powershell
   createdb todomessenger
   ```

3. Create the tables.

   ```powershell
   psql -d todomessenger -f backend/schema.postgres.sql
   ```

4. Create `backend/.env` from `backend/.env.example`.

5. Set either `DATABASE_URL`:

   ```text
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/todomessenger
   ```

   Or set individual fields:

   ```text
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_postgres_password
   POSTGRES_DATABASE=todomessenger
   POSTGRES_SSL=false
   ```

6. Start the backend:

   ```powershell
   npm run backend
   ```

7. Check backend health:

   ```powershell
   Invoke-RestMethod http://localhost:8787/health
   ```

## First Production APIs

The backend now has these email/workspace/app-data endpoints:

- `POST /api/auth/email/start`
- `POST /api/auth/email/complete`
- `GET /api/me`
- `POST /api/workspaces`
- `POST /api/workspaces/invites`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/conversations/:id/messages`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `POST /api/messages/:id/reactions`
- `POST /api/messages/:id/read`

Realtime runs on `ws://localhost:8787/ws?token=SESSION_TOKEN` in local development and `wss://your-backend/ws?token=SESSION_TOKEN` in production.

In local development, `/api/auth/email/start` returns a demo verification code. In production, that code should be sent through email using an email provider such as SendGrid, Postmark, Amazon SES, or Resend.

## Production Configuration

Set these values on Render before deploying the backend:

- `DATABASE_URL`: Render PostgreSQL connection string.
- `OPENAI_API_KEY`: enables live `@blu` answers.
- `OPENAI_MODEL`: start with `gpt-5.4-mini` unless you need a larger model.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: enables server-sent push notifications.
- `ASANA_CLIENT_ID`, `ASANA_CLIENT_SECRET`, `ASANA_REDIRECT_URI`: enables Asana OAuth.
- `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`, `JIRA_REDIRECT_URI`, `JIRA_CLOUD_ID`, `JIRA_PROJECT_KEY`: enables Jira OAuth and issue creation.
- `TOKEN_ENCRYPTION_KEY`: required before storing long-lived OAuth refresh tokens in production.

OAuth redirect URLs should point to the deployed backend:

```text
https://todomessenger-backend.onrender.com/oauth/asana/callback
https://todomessenger-backend.onrender.com/oauth/jira/callback
```

## Recommended Production Order

1. Deploy the PostgreSQL schema to Render PostgreSQL.
2. Set backend environment variables on Render.
3. Deploy the backend and verify `/health`.
4. Update `app-config.js` so the frontend uses the Render backend URL.
5. Test email login, conversations, task creation, and realtime sync in two browser tabs.
6. Test `@blu` after `OPENAI_API_KEY` is active.
7. Configure Asana/Jira OAuth apps with the deployed redirect URLs.
8. Replace local demo E2EE with multi-device key exchange before real company data is used.

## Database Tables

The PostgreSQL schema includes:

- `companies`
- `users`
- `invites`
- `auth_codes`
- `sessions`
- `conversations`
- `conversation_members`
- `messages`
- `message_reactions`
- `message_reads`
- `tasks`
- `push_tokens`
- `integrations`

This gives TodoMessenger the production structure needed for company workspaces, employee roles, invites, task assignment, reminders, push notifications, and future integrations.

## E2EE Note

The current browser encryption is still a demo-level single-device key. Production E2EE needs identity keys, signed prekeys, per-device sessions, key rotation, backup/recovery design, and a way to add a new device without exposing old plaintext to the server. Do not market the app as true multi-device E2EE until that key exchange is implemented and reviewed.

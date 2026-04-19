# TodoMessenger Backend

This is the first backend layer for TodoMessenger integrations.

It adds:

- OpenAI-powered Blu backend endpoint.
- OpenAI-powered task suggestion endpoint for recent chat context, including suggested assignees.
- Firebase Cloud Messaging token registration and test push endpoint.
- OAuth start/callback routes for Asana and Jira.
- Local development token storage in `backend/data/store.json`.
- API endpoints for creating an Asana task or Jira issue from a TodoMessenger task.

## Run locally

From the project root:

```bash
npm run backend
```

The backend starts on `http://localhost:8787`.

## Configure OAuth apps

Create OAuth apps in Asana and Atlassian, then copy `backend/.env.example` to `backend/.env` or set the same environment variables in your host.

Redirect URLs:

```text
http://localhost:8787/oauth/asana/callback
http://localhost:8787/oauth/jira/callback
```

Production redirect URLs should use your deployed backend URL.

## Endpoints

```text
GET  /health
GET  /oauth/asana/start
GET  /oauth/asana/callback
GET  /oauth/jira/start
GET  /oauth/jira/callback
GET  /api/integrations
POST /api/push/register
POST /api/push/send-test
POST /api/ai/blu
POST /api/ai/suggest-tasks
POST /api/sync/asana/task
POST /api/sync/jira/issue
```

## AI setup

Set `OPENAI_API_KEY` in `backend/.env`. The frontend sends `@blu` prompts to:

```text
POST /api/ai/blu
```

The OpenAI API key must stay on the backend. Do not put it in browser code.

## Firebase Cloud Messaging setup

1. Create a Firebase project.
2. Add an Android app with package name `com.todomessenger.app`.
3. Download `google-services.json` and place it at `android-app/app/google-services.json`.
4. Create a Firebase service account key for the backend.
5. Set these environment variables on Render:

```text
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

The private key should keep newline characters as `\n` if your host stores it on one line.

The Android app sends its FCM token to:

```text
POST /api/push/register
```

You can send a test push through:

```text
POST /api/push/send-test
```

## Production notes

The local JSON token store is only for development. Before real users, replace it with a database and encrypt OAuth tokens at rest.

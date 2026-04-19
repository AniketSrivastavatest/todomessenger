# TodoMessenger Backend

This is the first backend layer for TodoMessenger integrations.

It adds:

- OpenAI-powered `@chatgpt` backend endpoint.
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
POST /api/ai/chatgpt
POST /api/sync/asana/task
POST /api/sync/jira/issue
```

## AI setup

Set `OPENAI_API_KEY` in `backend/.env`. The frontend sends `@chatgpt` prompts to:

```text
POST /api/ai/chatgpt
```

The OpenAI API key must stay on the backend. Do not put it in browser code.

## Production notes

The local JSON token store is only for development. Before real users, replace it with a database and encrypt OAuth tokens at rest.

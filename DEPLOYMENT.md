# TodoMessenger Deployment

## 1. GitHub

Create an empty GitHub repository, then push this local project:

```bash
git remote add origin https://github.com/YOUR_USERNAME/todomessenger.git
git branch -M main
git push -u origin main
```

## 2. Netlify frontend

Use the GitHub repository as the source.

- Build command: leave empty
- Publish directory: `.`

After the backend is deployed, update `app-config.js`:

```js
window.TODOMESSENGER_CONFIG = {
  backendUrl: "https://YOUR_RENDER_SERVICE.onrender.com"
};
```

Then commit and push again so Netlify redeploys.

## 3. Render backend

Create a new Render web service from the same GitHub repository.

Render can read `render.yaml`, or configure manually:

- Runtime: Node
- Build command: `npm install`
- Start command: `npm run backend`

Set these environment variables:

```text
PUBLIC_BACKEND_URL=https://YOUR_RENDER_SERVICE.onrender.com
FRONTEND_ORIGIN=https://todomesseneger26.netlify.app
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini
```

For Asana:

```text
ASANA_CLIENT_ID=
ASANA_CLIENT_SECRET=
ASANA_REDIRECT_URI=https://YOUR_RENDER_SERVICE.onrender.com/oauth/asana/callback
ASANA_WORKSPACE_GID=
```

For Jira:

```text
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=
JIRA_REDIRECT_URI=https://YOUR_RENDER_SERVICE.onrender.com/oauth/jira/callback
JIRA_CLOUD_ID=
JIRA_PROJECT_KEY=
```

## 4. Test AI

After backend deployment and frontend config update, open a chat and send:

```text
@chatgpt explain how TodoMessenger works
```

## 5. Configure OAuth redirects

Use these redirect URLs in provider developer dashboards:

```text
https://YOUR_RENDER_SERVICE.onrender.com/oauth/asana/callback
https://YOUR_RENDER_SERVICE.onrender.com/oauth/jira/callback
```

## Production Warning

The current backend stores OAuth tokens in local JSON for development. Before real users, replace this with a database and encrypt tokens at rest.

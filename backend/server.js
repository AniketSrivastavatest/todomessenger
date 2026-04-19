const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 8787);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:8080";
const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || `http://localhost:${PORT}`;
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const PROVIDERS = {
  asana: {
    name: "Asana",
    authUrl: "https://app.asana.com/-/oauth_authorize",
    tokenUrl: "https://app.asana.com/-/oauth_token",
    clientId: process.env.ASANA_CLIENT_ID,
    clientSecret: process.env.ASANA_CLIENT_SECRET,
    redirectUri: process.env.ASANA_REDIRECT_URI || `${PUBLIC_BACKEND_URL}/oauth/asana/callback`,
    scopes: process.env.ASANA_SCOPES || "tasks:read tasks:write projects:read projects:write",
    tokenBodyStyle: "form"
  },
  jira: {
    name: "Jira",
    authUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    clientId: process.env.JIRA_CLIENT_ID,
    clientSecret: process.env.JIRA_CLIENT_SECRET,
    redirectUri: process.env.JIRA_REDIRECT_URI || `${PUBLIC_BACKEND_URL}/oauth/jira/callback`,
    scopes: process.env.JIRA_SCOPES || "read:jira-work write:jira-work offline_access",
    tokenBodyStyle: "json"
  }
};

ensureStore();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, PUBLIC_BACKEND_URL);

    if (req.method === "OPTIONS") {
      sendNoContent(res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true, providers: providerStatus() });
      return;
    }

    const oauthStart = url.pathname.match(/^\/oauth\/([^/]+)\/start$/);
    if (req.method === "GET" && oauthStart) {
      startOAuth(oauthStart[1], url, res);
      return;
    }

    const oauthCallback = url.pathname.match(/^\/oauth\/([^/]+)\/callback$/);
    if (req.method === "GET" && oauthCallback) {
      await finishOAuth(oauthCallback[1], url, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/integrations") {
      sendJson(res, 200, listIntegrations());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ai/chatgpt") {
      const body = await readJson(req);
      sendJson(res, 200, await askChatGPT(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sync/asana/task") {
      const body = await readJson(req);
      sendJson(res, 200, await createAsanaTask(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sync/jira/issue") {
      const body = await readJson(req);
      sendJson(res, 200, await createJiraIssue(body));
      return;
    }

    sendJson(res, 404, { error: "Route not found" });
  } catch (error) {
    sendJson(res, 500, { error: normalizeError(error) });
  }
});

server.listen(PORT, () => {
  console.log(`TodoMessenger backend listening on ${PUBLIC_BACKEND_URL}`);
});

function startOAuth(providerId, url, res) {
  const provider = getProvider(providerId);
  requireProviderConfig(provider);

  const userId = url.searchParams.get("userId") || "demo-user";
  const state = crypto.randomBytes(24).toString("hex");
  const store = readStore();
  store.oauthStates[state] = {
    provider: providerId,
    userId,
    createdAt: new Date().toISOString()
  };
  writeStore(store);

  const authUrl = new URL(provider.authUrl);
  authUrl.searchParams.set("client_id", provider.clientId);
  authUrl.searchParams.set("redirect_uri", provider.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);

  if (providerId === "jira") {
    authUrl.searchParams.set("audience", "api.atlassian.com");
    authUrl.searchParams.set("prompt", "consent");
  }

  if (provider.scopes) {
    authUrl.searchParams.set("scope", provider.scopes);
  }

  redirect(res, authUrl.toString());
}

async function finishOAuth(providerId, url, res) {
  const provider = getProvider(providerId);
  requireProviderConfig(provider);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    sendHtml(res, 400, "<h1>OAuth failed</h1><p>Missing code or state.</p>");
    return;
  }

  const store = readStore();
  const storedState = store.oauthStates[state];
  if (!storedState || storedState.provider !== providerId) {
    sendHtml(res, 400, "<h1>OAuth failed</h1><p>State did not match.</p>");
    return;
  }

  const token = await exchangeCode(provider, code);
  store.connections[providerId] = {
    provider: providerId,
    userId: storedState.userId,
    token,
    connectedAt: new Date().toISOString()
  };
  delete store.oauthStates[state];
  writeStore(store);

  sendHtml(
    res,
    200,
    `<h1>${provider.name} connected</h1><p>You can close this tab and return to TodoMessenger.</p><p><a href="${FRONTEND_ORIGIN}">Back to TodoMessenger</a></p>`
  );
}

async function exchangeCode(provider, code) {
  const payload = {
    grant_type: "authorization_code",
    client_id: provider.clientId,
    client_secret: provider.clientSecret,
    code,
    redirect_uri: provider.redirectUri
  };

  if (provider.tokenBodyStyle === "form") {
    return postJson(provider.tokenUrl, new URLSearchParams(payload), {
      "Content-Type": "application/x-www-form-urlencoded"
    });
  }

  return postJson(provider.tokenUrl, JSON.stringify(payload), {
    "Content-Type": "application/json"
  });
}

async function createAsanaTask(body) {
  const connection = getConnection("asana");
  const workspace = process.env.ASANA_WORKSPACE_GID || body.workspace;
  if (!workspace) {
    throw new Error("Missing ASANA_WORKSPACE_GID or request workspace.");
  }

  return postJson(
    "https://app.asana.com/api/1.0/tasks",
    JSON.stringify({
      data: {
        name: body.title,
        notes: body.notes || body.sourceMessage || "",
        workspace,
        due_on: body.due || undefined,
        projects: body.project ? [body.project] : undefined
      }
    }),
    {
      Authorization: `Bearer ${connection.token.access_token}`,
      "Content-Type": "application/json"
    }
  );
}

async function askChatGPT(body) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const prompt = body.prompt || "Help with this TodoMessenger conversation.";
  const context = body.context ? `Recent encrypted-chat context, decrypted on the user's device:\n${body.context}` : "";
  const data = await postJson(
    "https://api.openai.com/v1/responses",
    JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      instructions:
        "You are ChatGPT inside TodoMessenger. Answer clearly and concisely. If the user asks for a task, suggest a short actionable task title.",
      input: `${context}\n\nUser request:\n${prompt}`,
      max_output_tokens: 700
    }),
    {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  );

  return {
    answer: extractResponseText(data),
    responseId: data.id
  };
}

function extractResponseText(response) {
  if (response.output_text) return response.output_text;

  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim() || "I could not generate an answer.";
}

async function createJiraIssue(body) {
  const connection = getConnection("jira");
  const cloudId = process.env.JIRA_CLOUD_ID || body.cloudId;
  const projectKey = process.env.JIRA_PROJECT_KEY || body.projectKey;
  if (!cloudId || !projectKey) {
    throw new Error("Missing JIRA_CLOUD_ID/JIRA_PROJECT_KEY or request cloudId/projectKey.");
  }

  return postJson(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
    JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary: body.title,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: body.notes || body.sourceMessage || "Created from TodoMessenger." }]
            }
          ]
        },
        issuetype: { name: body.issueType || "Task" }
      }
    }),
    {
      Authorization: `Bearer ${connection.token.access_token}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  );
}

async function postJson(url, body, headers) {
  const response = await fetch(url, { method: "POST", headers, body });
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok) {
    throw new Error(data.error_description || data.error || data.message || `HTTP ${response.status}`);
  }
  return data;
}

function listIntegrations() {
  const store = readStore();
  return Object.fromEntries(
    Object.keys(PROVIDERS).map((providerId) => [
      providerId,
      {
        configured: Boolean(PROVIDERS[providerId].clientId && PROVIDERS[providerId].clientSecret),
        connected: Boolean(store.connections[providerId]),
        connectedAt: store.connections[providerId]?.connectedAt || null
      }
    ])
  );
}

function providerStatus() {
  return Object.fromEntries(
    Object.keys(PROVIDERS).map((providerId) => [
      providerId,
      {
        configured: Boolean(PROVIDERS[providerId].clientId && PROVIDERS[providerId].clientSecret)
      }
    ])
  );
}

function getProvider(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return provider;
}

function requireProviderConfig(provider) {
  if (!provider.clientId || !provider.clientSecret) {
    throw new Error(`${provider.name} OAuth is missing client ID or secret.`);
  }
}

function getConnection(providerId) {
  const connection = readStore().connections[providerId];
  if (!connection?.token?.access_token) {
    throw new Error(`${providerId} is not connected yet.`);
  }
  return connection;
}

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    writeStore({ oauthStates: {}, connections: {} });
  }
}

function readStore() {
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), "application/json");
}

function sendHtml(res, status, html) {
  send(res, status, `<!doctype html><html><body>${html}</body></html>`, "text/html; charset=utf-8");
}

function sendNoContent(res) {
  addCors(res);
  res.writeHead(204);
  res.end();
}

function send(res, status, body, contentType) {
  addCors(res);
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function redirect(res, location) {
  addCors(res);
  res.writeHead(302, { Location: location });
  res.end();
}

function addCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function normalizeError(error) {
  if (!error) return "Server error";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Server error";
  }
}

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) return;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  });
}

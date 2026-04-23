const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
let WebSocketServer;
try {
  ({ WebSocketServer } = require("ws"));
} catch {
  WebSocketServer = null;
}

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 8787);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:8080";
const FRONTEND_ORIGINS = parseAllowedOrigins(process.env.FRONTEND_ORIGINS || FRONTEND_ORIGIN);
const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || `http://localhost:${PORT}`;
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const AUTH_CODE_TTL_MS = 15 * 60 * 1000;
const DEV_AUTH_CODE = process.env.DEV_AUTH_CODE || "123456";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 240);
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_REQUESTS = Number(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || 20);
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AI_RATE_LIMIT_MAX_REQUESTS = Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 30);
const REALTIME_TICKET_TTL_MS = 60 * 1000;
let postgresPool;
let postgresRuntimeSchemaReady = false;
const realtimeClients = new Map();
const rateLimitBuckets = new Map();
const realtimeTickets = new Map();

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
  },
  google_calendar: {
    name: "Google Calendar",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${PUBLIC_BACKEND_URL}/oauth/google_calendar/callback`,
    scopes: process.env.GOOGLE_CALENDAR_SCOPES || "https://www.googleapis.com/auth/calendar.events",
    tokenBodyStyle: "form"
  }
};

const SSO_PROVIDERS = {
  google: {
    id: "google",
    name: "Google Workspace",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    clientId: process.env.GOOGLE_SSO_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SSO_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_SSO_REDIRECT_URI || `${PUBLIC_BACKEND_URL}/api/auth/sso/google/callback`,
    scopes: "openid email profile",
    tokenBodyStyle: "form",
    hostedDomainParam: "hd"
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    authUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/oauth2/v2.0/token`,
    userInfoUrl: "https://graph.microsoft.com/oidc/userinfo",
    clientId: process.env.MICROSOFT_SSO_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_SSO_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET,
    redirectUri: process.env.MICROSOFT_SSO_REDIRECT_URI || `${PUBLIC_BACKEND_URL}/api/auth/sso/microsoft/callback`,
    scopes: "openid email profile offline_access User.Read",
    tokenBodyStyle: "form"
  }
};

ensureStore();
ensurePostgresRuntimeSchema().catch((error) => console.warn(`PostgreSQL schema check failed: ${normalizeError(error)}`));
processDueReminders().catch((error) => console.warn(`Reminder worker failed: ${normalizeError(error)}`));
setInterval(() => {
  processDueReminders().catch((error) => console.warn(`Reminder worker failed: ${normalizeError(error)}`));
}, 30000);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, PUBLIC_BACKEND_URL);
    applyResponseSecurity(req, res);

    if (!isCorsOriginAllowed(req)) {
      sendJson(res, 403, { error: "Origin is not allowed." });
      return;
    }

    if (req.method === "OPTIONS") {
      sendNoContent(res);
      return;
    }

    enforceRateLimit(req, url);

    if (req.method === "GET" && url.pathname === "/") {
      sendJson(res, 200, {
        ok: true,
        app: "TodoMessenger backend",
        health: `${PUBLIC_BACKEND_URL}/health`,
        ai: `${PUBLIC_BACKEND_URL}/api/ai/blu`,
        note: "This is the API server. The frontend runs separately on Netlify or local index.html."
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        database: await databaseStatus(),
        providers: providerStatus(),
        sso: ssoProviderStatus(),
        email: emailDeliveryStatus()
      });
      return;
    }

    const oauthStart = url.pathname.match(/^\/oauth\/([^/]+)\/start$/);
    if (req.method === "GET" && oauthStart) {
      await startOAuth(oauthStart[1], url, res);
      return;
    }

    const oauthCallback = url.pathname.match(/^\/oauth\/([^/]+)\/callback$/);
    if (req.method === "GET" && oauthCallback) {
      await finishOAuth(oauthCallback[1], url, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/integrations") {
      const auth = await optionalAuth(req);
      sendJson(res, 200, await listIntegrations(auth));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/me") {
      const auth = await requireAuth(req);
      sendJson(res, 200, { ok: true, user: auth.user, workspace: auth.workspace });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/auth/sso/options") {
      sendJson(res, 200, await getSsoOptions(url.searchParams));
      return;
    }

    const ssoStart = url.pathname.match(/^\/api\/auth\/sso\/([^/]+)\/start$/);
    if (req.method === "GET" && ssoStart) {
      await startSsoLogin(ssoStart[1], url, res);
      return;
    }

    const ssoCallback = url.pathname.match(/^\/api\/auth\/sso\/([^/]+)\/callback$/);
    if (req.method === "GET" && ssoCallback) {
      await finishSsoLogin(ssoCallback[1], url, res);
      return;
    }

    if (req.method === "PATCH" && url.pathname === "/api/me") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await updateCurrentUser(auth, body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/email/start") {
      const body = await readJson(req);
      sendJson(res, 200, await startEmailAuth(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/email/complete") {
      const body = await readJson(req);
      sendJson(res, 200, await completeEmailAuth(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await revokeCurrentSession(auth));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout-all") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await revokeAllSessions(auth));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/workspaces") {
      const body = await readJson(req);
      sendJson(res, 200, await createWorkspace(body));
      return;
    }

    if (req.method === "PATCH" && url.pathname === "/api/workspaces/current") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await updateCurrentWorkspace(auth, body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/workspaces/members") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await listWorkspaceMembers(auth));
      return;
    }

    const memberRoleMatch = url.pathname.match(/^\/api\/workspaces\/members\/([^/]+)\/role$/);
    if (req.method === "PATCH" && memberRoleMatch) {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await updateWorkspaceMemberRole(auth, memberRoleMatch[1], body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/workspaces/sso") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await getWorkspaceSsoSettings(auth.companyId));
      return;
    }

    if (req.method === "PATCH" && url.pathname === "/api/workspaces/sso") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await updateWorkspaceSsoSettings(auth, body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/workspaces/invites") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await createWorkspaceInvite(auth, body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/conversations") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await listConversations(auth));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/conversations") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await createConversation(auth, body));
      return;
    }

    const conversationMessages = url.pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
    if (req.method === "GET" && conversationMessages) {
      const auth = await requireAuth(req);
      sendJson(res, 200, await listMessages(auth, conversationMessages[1]));
      return;
    }

    if (req.method === "POST" && conversationMessages) {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await createMessage(auth, conversationMessages[1], body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/tasks") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await listTasks(auth));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/tasks") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await createTaskRecord(auth, body));
      return;
    }

    const taskRoute = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === "PATCH" && taskRoute) {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await updateTaskRecord(auth, taskRoute[1], body));
      return;
    }

    const messageReaction = url.pathname.match(/^\/api\/messages\/([^/]+)\/reactions$/);
    if (req.method === "POST" && messageReaction) {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await addMessageReaction(auth, messageReaction[1], body));
      return;
    }

    const messageRead = url.pathname.match(/^\/api\/messages\/([^/]+)\/read$/);
    if (req.method === "POST" && messageRead) {
      const auth = await requireAuth(req);
      sendJson(res, 200, await markMessageRead(auth, messageRead[1]));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/e2ee/devices") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await listOwnDevices(auth));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/e2ee/devices") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await registerE2eeDevice(auth, body));
      return;
    }

    const e2eeDeviceRoute = url.pathname.match(/^\/api\/e2ee\/devices\/([^/]+)$/);
    if (req.method === "PATCH" && e2eeDeviceRoute) {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await updateE2eeDevice(auth, decodeURIComponent(e2eeDeviceRoute[1]), body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/e2ee/prekey-bundles") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await claimPrekeyBundles(auth, body));
      return;
    }

    const conversationKeyEnvelopes = url.pathname.match(/^\/api\/e2ee\/conversations\/([^/]+)\/key-envelopes$/);
    if (req.method === "GET" && conversationKeyEnvelopes) {
      const auth = await requireAuth(req);
      sendJson(res, 200, await listConversationKeyEnvelopes(auth, conversationKeyEnvelopes[1], url.searchParams));
      return;
    }

    if (req.method === "POST" && conversationKeyEnvelopes) {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await saveConversationKeyEnvelopes(auth, conversationKeyEnvelopes[1], body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/push/register") {
      const auth = await optionalAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await registerPushToken(auth, body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/push/send-test") {
      const auth = await optionalAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await sendTestPush(auth, body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reminders/schedule") {
      const auth = await optionalAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await scheduleReminder(auth, body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reminders/cancel") {
      const auth = await optionalAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await cancelReminder(auth, body));
      return;
    }

    if (req.method === "POST" && ["/api/ai/blu", "/api/ai/chatgpt"].includes(url.pathname)) {
      const body = await readJson(req);
      sendJson(res, 200, await askBlu(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ai/suggest-tasks") {
      const body = await readJson(req);
      sendJson(res, 200, await suggestTasks(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/ai/agent-plan") {
      const auth = await optionalAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await planBluAgentActions(auth, body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/agent/audit") {
      const auth = await optionalAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await recordBluAgentEvent(auth, body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/agent/actions") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await listBluAgentActions(auth));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/agent/actions") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await createBluAgentAction(auth, body));
      return;
    }

    const bluAgentActionRoute = url.pathname.match(/^\/api\/agent\/actions\/([^/]+)$/);
    if (req.method === "PATCH" && bluAgentActionRoute) {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await updateBluAgentAction(auth, bluAgentActionRoute[1], body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/agent/policy") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await getBluAgentPolicy(auth));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/realtime/session") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await createRealtimeSession(auth));
      return;
    }

    if (req.method === "PATCH" && url.pathname === "/api/agent/policy") {
      const auth = await requireAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await updateBluAgentPolicy(auth, body));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/admin/audit") {
      const auth = await requireAuth(req);
      sendJson(res, 200, await listAdminAuditEvents(auth, url.searchParams));
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

    if (req.method === "POST" && url.pathname === "/api/sync/google-calendar/event") {
      const auth = await optionalAuth(req);
      const body = await readJson(req);
      sendJson(res, 200, await createGoogleCalendarEvent(auth, body));
      return;
    }

    sendJson(res, 404, { error: "Route not found" });
  } catch (error) {
    sendJson(res, Number(error?.statusCode || 500), { error: normalizeError(error) });
  }
});

server.listen(PORT, () => {
  console.log(`TodoMessenger backend listening on ${PUBLIC_BACKEND_URL}`);
});
setupRealtime(server);

async function startEmailAuth(body) {
  const email = normalizeEmail(body.email);
  if (!email) {
    throw new Error("A valid work email is required.");
  }
  const ssoOptions = await getSsoOptions(new URLSearchParams({ email }));
  if (ssoOptions.requireSso && ssoOptions.allowEmailFallback === false) {
    throw new Error("This workspace requires Team SSO. Use your company sign-in provider instead of an email code.");
  }

  const useDemoCode = isDevAuthCodeEnabled();
  if (!useDemoCode) {
    assertEmailDeliveryConfigured();
  }

  if (hasPostgresConfig()) {
    return startEmailAuthPostgres(email);
  }

  const store = readStore();
  const code = createAuthCode();
  store.authCodes[email] = {
    email,
    codeHash: hashSecret(code),
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString(),
    createdAt: new Date().toISOString()
  };
  writeStore(store);

  if (!useDemoCode) {
    await sendVerificationCodeEmail({ email, code });
  }

  return {
    ok: true,
    email,
    delivery: useDemoCode ? "demo" : "email",
    demoCode: useDemoCode ? code : "",
    message: useDemoCode
      ? (isStagingEnvironment()
        ? "Staging mode: use the returned code. Production must use real email delivery."
        : "Development mode: use the returned code. Production must use real email delivery.")
      : "Verification code sent by email."
  };
}

async function completeEmailAuth(body) {
  const email = normalizeEmail(body.email);
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  if (!email || !code) {
    throw new Error("Email and verification code are required.");
  }

  if (hasPostgresConfig()) {
    return completeEmailAuthPostgres({ email, code, name });
  }

  const store = readStore();
  const authCode = store.authCodes[email];
  if (!isValidAuthCode(authCode, code, "json")) {
    throw new Error("Invalid or expired email code.");
  }

  const domain = email.split("@")[1];
  const company = Object.values(store.workspaces).find((workspace) => workspace.domain === domain) || createWorkspaceRecord({
    name: body.companyName || `${domain} Workspace`,
    domain
  });
  store.workspaces[company.id] = company;

  const user = Object.values(store.users).find((item) => item.email === email) || {
    id: crypto.randomUUID(),
    companyId: company.id,
    email,
    name: name || email.split("@")[0],
    role: Object.values(store.users).some((item) => item.companyId === company.id) ? "employee" : "admin",
    status: "active",
    createdAt: new Date().toISOString()
  };
  user.name = name || user.name;
  user.lastLoginAt = new Date().toISOString();
  store.users[user.id] = user;
  delete store.authCodes[email];

  const session = createSessionRecord(user.id);
  store.sessions[session.token] = session;
  writeStore(store);

  return { ok: true, token: session.token, user, workspace: company };
}

async function revokeCurrentSession(auth) {
  if (hasPostgresConfig()) {
    await postgresQuery(
      "update sessions set revoked_at = now() where token_hash = $1 and revoked_at is null",
      [hashSecret(auth.token)]
    );
    await recordAdminAudit(auth, "session.logout", { session: "current" }, false);
    return { ok: true, revoked: true };
  }

  const store = readStore();
  delete store.sessions[auth.token];
  writeStore(store);
  return { ok: true, revoked: true };
}

async function revokeAllSessions(auth) {
  if (hasPostgresConfig()) {
    await postgresQuery(
      `update sessions
       set revoked_at = now()
       where user_id = $1
         and revoked_at is null`,
      [auth.user.id]
    );
    await recordAdminAudit(auth, "session.logout_all", { userId: auth.user.id }, false);
    return { ok: true, revoked: true };
  }

  const store = readStore();
  Object.keys(store.sessions).forEach((token) => {
    if (store.sessions[token]?.userId === auth.user.id) {
      delete store.sessions[token];
    }
  });
  writeStore(store);
  return { ok: true, revoked: true };
}

async function createWorkspace(body) {
  const name = String(body.name || "").trim();
  const domain = normalizeDomain(body.domain || "");
  if (!name || !domain) {
    throw new Error("Workspace name and company domain are required.");
  }

  if (hasPostgresConfig()) {
    const id = crypto.randomUUID();
    await postgresQuery(
      "insert into companies (id, name, domain, created_at, updated_at) values ($1, $2, $3, now(), now())",
      [id, name, domain]
    );
    return { ok: true, workspace: { id, name, domain } };
  }

  const store = readStore();
  const workspace = createWorkspaceRecord({ name, domain });
  store.workspaces[workspace.id] = workspace;
  writeStore(store);
  return { ok: true, workspace };
}

async function updateCurrentWorkspace(auth, body) {
  const name = String(body.name || "").trim().slice(0, 160);
  const domain = normalizeDomain(body.domain || "");
  if (!["admin", "team_lead"].includes(auth.user.role)) {
    throw new Error("Only admins and team leads can update workspace settings.");
  }
  if (!name || !domain) {
    throw new Error("Workspace name and company domain are required.");
  }

  await postgresQuery(
    "update companies set name = $1, domain = $2, updated_at = now() where id = $3",
    [name, domain, auth.companyId]
  );
  const workspace = { id: auth.companyId, name, domain };
  await recordAdminAudit(auth, "workspace.updated", workspace);
  broadcastRealtime(auth.companyId, { type: "workspace.updated", workspace });
  return { ok: true, workspace };
}

async function getWorkspaceSsoSettings(companyId = "", workspace = null) {
  const baseDomain = workspace?.domain || "";
  const fallback = {
    ok: true,
    sso: {
      requireSso: false,
      allowEmailFallback: true,
      providers: Object.keys(SSO_PROVIDERS).map((providerId) => ({
        provider: providerId,
        name: SSO_PROVIDERS[providerId].name,
        enabled: false,
        configured: isSsoProviderConfigured(providerId),
        domainHint: baseDomain,
        tenantHint: providerId === "microsoft" ? (process.env.MICROSOFT_TENANT_ID || "common") : ""
      }))
    }
  };

  if (!companyId) {
    return fallback;
  }

  if (!hasPostgresConfig()) {
    const store = readStore();
    store.workspaceSsoConfigs ||= {};
    const saved = store.workspaceSsoConfigs[companyId] || {};
    return {
      ok: true,
      sso: {
        requireSso: saved.requireSso === true,
        allowEmailFallback: saved.allowEmailFallback !== false,
        providers: Object.keys(SSO_PROVIDERS).map((providerId) => {
          const provider = saved.providers?.[providerId] || {};
          return {
            provider: providerId,
            name: SSO_PROVIDERS[providerId].name,
            enabled: provider.enabled === true,
            configured: isSsoProviderConfigured(providerId),
            domainHint: provider.domainHint || baseDomain,
            tenantHint: provider.tenantHint || (providerId === "microsoft" ? (process.env.MICROSOFT_TENANT_ID || "common") : "")
          };
        })
      }
    };
  }

  await ensurePostgresRuntimeSchema();
  const [configRow] = await postgresRows(
    `select require_sso, allow_email_fallback
     from workspace_sso_configs
     where company_id = $1
     limit 1`,
    [companyId]
  );
  const providerRows = await postgresRows(
    `select provider, enabled, domain_hint, tenant_hint
     from workspace_sso_providers
     where company_id = $1
     order by provider asc`,
    [companyId]
  );
  const byProvider = new Map(providerRows.map((row) => [row.provider, row]));
  return {
    ok: true,
    sso: {
      requireSso: configRow?.require_sso === true,
      allowEmailFallback: configRow ? configRow.allow_email_fallback !== false : true,
      providers: Object.keys(SSO_PROVIDERS).map((providerId) => {
        const row = byProvider.get(providerId);
        return {
          provider: providerId,
          name: SSO_PROVIDERS[providerId].name,
          enabled: row?.enabled === true,
          configured: isSsoProviderConfigured(providerId),
          domainHint: row?.domain_hint || baseDomain,
          tenantHint: row?.tenant_hint || (providerId === "microsoft" ? (process.env.MICROSOFT_TENANT_ID || "common") : "")
        };
      })
    }
  };
}

async function updateWorkspaceSsoSettings(auth, body) {
  if (!["admin", "team_lead"].includes(auth.user.role)) {
    throw new Error("Only admins and team leads can manage Team SSO.");
  }
  const requireSso = body.requireSso === true;
  const allowEmailFallback = body.allowEmailFallback !== false;
  const providers = Array.isArray(body.providers) ? body.providers : [];
  const activeConfiguredProviders = providers.filter((item) => item.enabled === true && isSsoProviderConfigured(item.provider));
  if (requireSso && !activeConfiguredProviders.length) {
    throw new Error("Enable and configure at least one Team SSO provider before requiring SSO for the workspace.");
  }

  if (!hasPostgresConfig()) {
    const store = readStore();
    store.workspaceSsoConfigs ||= {};
    store.workspaceSsoConfigs[auth.companyId] = {
      requireSso,
      allowEmailFallback,
      providers: Object.fromEntries(Object.keys(SSO_PROVIDERS).map((providerId) => {
        const incoming = providers.find((item) => item.provider === providerId) || {};
        return [providerId, {
          enabled: incoming.enabled === true,
          domainHint: normalizeDomain(incoming.domainHint || auth.workspace.domain || ""),
          tenantHint: String(incoming.tenantHint || "").trim()
        }];
      }))
    };
    writeStore(store);
    return getWorkspaceSsoSettings(auth.companyId, auth.workspace);
  }

  await ensurePostgresRuntimeSchema();
  await postgresQuery(
    `insert into workspace_sso_configs (company_id, require_sso, allow_email_fallback, updated_at, updated_by)
     values ($1, $2, $3, now(), $4)
     on conflict (company_id)
     do update set
       require_sso = excluded.require_sso,
       allow_email_fallback = excluded.allow_email_fallback,
       updated_at = now(),
       updated_by = excluded.updated_by`,
    [auth.companyId, requireSso, allowEmailFallback, auth.user.id]
  );
  for (const providerId of Object.keys(SSO_PROVIDERS)) {
    const incoming = providers.find((item) => item.provider === providerId) || {};
    await postgresQuery(
      `insert into workspace_sso_providers (company_id, provider, enabled, domain_hint, tenant_hint, created_at, updated_at)
       values ($1, $2, $3, $4, $5, now(), now())
       on conflict (company_id, provider)
       do update set
         enabled = excluded.enabled,
         domain_hint = excluded.domain_hint,
         tenant_hint = excluded.tenant_hint,
         updated_at = now()`,
      [
        auth.companyId,
        providerId,
        incoming.enabled === true,
        normalizeDomain(incoming.domainHint || auth.workspace.domain || "") || null,
        String(incoming.tenantHint || "").trim() || null
      ]
    );
  }
  const result = await getWorkspaceSsoSettings(auth.companyId, auth.workspace);
  await recordAdminAudit(auth, "workspace.sso.updated", result.sso);
  return result;
}

async function getSsoOptions(searchParams) {
  const email = normalizeEmail(searchParams.get("email") || "");
  const domain = email.split("@")[1] || normalizeDomain(searchParams.get("domain") || "");
  if (!domain) {
    return {
      ok: true,
      email: "",
      requireSso: false,
      allowEmailFallback: true,
      providers: []
    };
  }

  if (!hasPostgresConfig()) {
    const store = readStore();
    const workspace = Object.values(store.workspaces || {}).find((item) => item.domain === domain);
    if (!workspace) {
      return { ok: true, email, requireSso: false, allowEmailFallback: true, providers: [] };
    }
    const config = await getWorkspaceSsoSettings(workspace.id, workspace);
    return {
      ok: true,
      email,
      requireSso: config.sso.requireSso,
      allowEmailFallback: config.sso.allowEmailFallback,
      providers: config.sso.providers.filter((provider) => provider.enabled && provider.configured)
    };
  }

  await ensurePostgresRuntimeSchema();
  const workspace = (await postgresRows("select id, name, domain from companies where domain = $1 limit 1", [domain]))[0];
  if (!workspace) {
    return { ok: true, email, requireSso: false, allowEmailFallback: true, providers: [] };
  }
  const config = await getWorkspaceSsoSettings(workspace.id, workspace);
  return {
    ok: true,
    email,
    companyId: workspace.id,
    workspace: { id: workspace.id, name: workspace.name, domain: workspace.domain },
    requireSso: config.sso.requireSso,
    allowEmailFallback: config.sso.allowEmailFallback,
    providers: config.sso.providers.filter((provider) => provider.enabled && provider.configured)
  };
}

async function listWorkspaceMembers(auth) {
  const users = await postgresRows(
    `select id, company_id, email, name, role, status, created_at, last_login_at
     from users
     where company_id = $1
     order by
       case role when 'admin' then 1 when 'team_lead' then 2 else 3 end,
       name asc`,
    [auth.companyId]
  );
  const invites = await postgresRows(
    `select id, email, role, token, expires_at, accepted_at, created_at
     from invites
     where company_id = $1
     order by created_at desc`,
    [auth.companyId]
  );
  return {
    ok: true,
    sso: (await getWorkspaceSsoSettings(auth.companyId, auth.workspace)).sso,
    members: users.map((user) => ({
      id: user.id,
      companyId: user.company_id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      available: user.status !== "away" && user.status !== "disabled",
      joinedAt: user.created_at,
      lastLoginAt: user.last_login_at
    })),
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      inviteCode: invite.token,
      inviteLink: createInviteUrl(invite.token),
      expiresAt: invite.expires_at,
      acceptedAt: invite.accepted_at,
      status: invite.accepted_at ? "accepted" : "pending"
    }))
  };
}

async function createWorkspaceInvite(auth, body) {
  const email = normalizeEmail(body.email);
  const companyId = auth?.companyId || String(body.companyId || body.workspaceId || "").trim();
  const role = normalizeRole(body.role || "employee");
  if (!email || !companyId) {
    throw new Error("Invite requires employee email and companyId.");
  }
  if (auth) {
    assertRoleGrantAllowed(auth.user.role, role);
  }

  if (hasPostgresConfig()) {
    const id = crypto.randomUUID();
    const token = createInviteToken();
    const rows = await postgresRows(
      `insert into invites (id, company_id, email, role, token, expires_at, accepted_at, created_at)
       values ($1, $2, $3, $4, $5, now() + interval '14 days', null, now())
       on conflict (company_id, email)
       do update set role = excluded.role, token = excluded.token, expires_at = excluded.expires_at, accepted_at = null
       returning id, company_id, email, role, token, expires_at, accepted_at, created_at`,
      [id, companyId, email, role, token]
    );
    await upsertInvitedUser(companyId, email, role);
    const invite = rows[0];
    const payload = {
      id: invite.id,
      companyId: invite.company_id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      inviteCode: invite.token,
      inviteLink: createInviteUrl(invite.token),
      expiresAt: invite.expires_at,
      acceptedAt: invite.accepted_at,
      status: "pending"
    };
    await recordAdminAudit(auth, "workspace.invite.created", { email, role, inviteId: invite.id });
    broadcastRealtime(companyId, { type: "workspace.invite.created", invite: payload });
    return { ok: true, invite: payload };
  }

  const store = readStore();
  const invite = {
    id: crypto.randomUUID(),
    companyId,
    email,
    role,
    token: createInviteToken(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };
  store.invites[invite.id] = invite;
  writeStore(store);
  return { ok: true, invite };
}

async function updateWorkspaceMemberRole(auth, memberId, body) {
  const targetRole = normalizeRole(body.role || "employee");
  assertRoleGrantAllowed(auth?.user?.role, targetRole);

  const member = (await postgresRows(
    "select id, company_id, email, name, role, status, created_at, last_login_at from users where id = $1 and company_id = $2 limit 1",
    [memberId, auth.companyId]
  ))[0];
  if (!member) {
    throw new Error("Workspace member not found.");
  }
  if (member.id === auth.user.id && normalizeRole(auth.user.role) !== "superadmin") {
    throw new Error("Only superadmin can change their own role.");
  }
  if (normalizeRole(member.role) === "superadmin" && normalizeRole(auth.user.role) !== "superadmin") {
    throw new Error("Only superadmin can manage another superadmin.");
  }
  const currentRole = normalizeRole(member.role);
  const isSuperadminDemotion = currentRole === "superadmin" && targetRole !== "superadmin";
  if (isSuperadminDemotion) {
    const superadminCountRows = await postgresRows(
      "select count(*)::int as count from users where company_id = $1 and role = 'superadmin'",
      [auth.companyId]
    );
    const superadminCount = Number(superadminCountRows[0]?.count || 0);
    if (superadminCount <= 1) {
      throw new Error("Cannot demote the last remaining superadmin.");
    }
    if (body.confirmSuperadminDemotion !== true) {
      throw new Error("Superadmin demotion requires explicit confirmation.");
    }
  }
  const isAdminDemotion = currentRole === "admin" && targetRole !== "admin";
  if (isAdminDemotion) {
    const adminCountRows = await postgresRows(
      "select count(*)::int as count from users where company_id = $1 and role = 'admin'",
      [auth.companyId]
    );
    const adminCount = Number(adminCountRows[0]?.count || 0);
    if (adminCount <= 1 && body.confirmLastAdminDemotion !== true) {
      throw new Error("Last admin demotion requires explicit confirmation.");
    }
  }

  const rows = await postgresRows(
    `update users
     set role = $1,
         updated_at = now()
     where id = $2
     returning id, company_id, email, name, role, status, created_at, last_login_at`,
    [targetRole, member.id]
  );
  const updated = rows[0];
  await recordAdminAudit(auth, "workspace.member.role.updated", {
    memberId: updated.id,
    email: updated.email,
    previousRole: member.role,
    newRole: updated.role
  });
  broadcastRealtime(auth.companyId, {
    type: "workspace.member.updated",
    member: {
      id: updated.id,
      companyId: updated.company_id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      status: updated.status,
      available: updated.status !== "away" && updated.status !== "disabled",
      joinedAt: updated.created_at,
      lastLoginAt: updated.last_login_at
    }
  });
  return {
    ok: true,
    member: {
      id: updated.id,
      companyId: updated.company_id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      status: updated.status,
      available: updated.status !== "away" && updated.status !== "disabled",
      joinedAt: updated.created_at,
      lastLoginAt: updated.last_login_at
    }
  };
}

async function upsertInvitedUser(companyId, email, role) {
  const existing = (await postgresRows("select id, status from users where email = $1 limit 1", [email]))[0];
  if (existing) {
    await postgresQuery(
      "update users set company_id = $1, role = $2, status = case when status = 'active' then status else 'invited' end, updated_at = now() where id = $3",
      [companyId, role, existing.id]
    );
    return existing.id;
  }

  const userId = crypto.randomUUID();
  await postgresQuery(
    "insert into users (id, company_id, email, name, role, status, created_at, updated_at) values ($1, $2, $3, $4, $5, 'invited', now(), now())",
    [userId, companyId, email, getNameFromEmail(email), role]
  );
  return userId;
}

async function startEmailAuthPostgres(email) {
  const useDemoCode = isDevAuthCodeEnabled();
  if (!useDemoCode) {
    assertEmailDeliveryConfigured();
  }
  const code = createAuthCode();
  await postgresQuery(
    "insert into auth_codes (id, email, code_hash, expires_at, created_at) values ($1, $2, $3, now() + interval '15 minutes', now())",
    [crypto.randomUUID(), email, hashSecret(code)]
  );

  if (!useDemoCode) {
    await sendVerificationCodeEmail({ email, code });
  }

  return {
    ok: true,
    email,
    delivery: useDemoCode ? "demo" : "email",
    demoCode: useDemoCode ? code : undefined,
    message: useDemoCode
      ? (isStagingEnvironment() ? "Staging mode: use the returned code." : "Development mode: use the returned code.")
      : "Verification code sent by email."
  };
}

async function completeEmailAuthPostgres({ email, code, name }) {
  const codes = await postgresRows(
    "select id, code_hash, expires_at from auth_codes where email = $1 order by created_at desc limit 1",
    [email]
  );
  const authCode = codes[0];
  if (!isValidAuthCode(authCode, code, "postgres")) {
    throw new Error("Invalid or expired email code.");
  }

  const domain = email.split("@")[1];
  const pendingInvite = (await postgresRows(
    `select i.id, i.company_id, i.role, i.token, c.name, c.domain
     from invites i
     join companies c on c.id = i.company_id
     where i.email = $1
       and i.accepted_at is null
       and i.expires_at > now()
     order by i.created_at desc
     limit 1`,
    [email]
  ))[0];
  let company = pendingInvite
    ? { id: pendingInvite.company_id, name: pendingInvite.name, domain: pendingInvite.domain }
    : (await postgresRows("select id, name, domain from companies where domain = $1 limit 1", [domain]))[0];
  if (!company) {
    const companyId = crypto.randomUUID();
    await postgresQuery(
      "insert into companies (id, name, domain, created_at, updated_at) values ($1, $2, $3, now(), now())",
      [companyId, `${domain} Workspace`, domain]
    );
    company = { id: companyId, name: `${domain} Workspace`, domain };
  }

  let user = (await postgresRows("select id, company_id, email, name, role, status from users where email = $1 limit 1", [email]))[0];
  if (!user) {
    const existingUsers = await postgresRows("select id from users where company_id = $1 limit 1", [company.id]);
    const userId = crypto.randomUUID();
    const role = getProvisionedRole({
      requestedRole: pendingInvite?.role,
      existingRole: "",
      existingUsersCount: existingUsers.length
    });
    await postgresQuery(
      "insert into users (id, company_id, email, name, role, status, created_at, updated_at, last_login_at) values ($1, $2, $3, $4, $5, 'active', now(), now(), now())",
      [userId, company.id, email, name || getNameFromEmail(email), role]
    );
    user = { id: userId, company_id: company.id, email, name: name || getNameFromEmail(email), role, status: "active" };
  } else {
    const role = getProvisionedRole({
      requestedRole: pendingInvite?.role,
      existingRole: user.role,
      existingUsersCount: 1
    });
    await postgresQuery(
      "update users set company_id = $1, name = $2, role = $3, status = 'active', last_login_at = now(), updated_at = now() where id = $4",
      [company.id, name || user.name, role, user.id]
    );
    user.company_id = company.id;
    user.name = name || user.name;
    user.role = role;
    user.status = "active";
  }

  await postgresQuery("delete from auth_codes where email = $1", [email]);
  if (pendingInvite) {
    await postgresQuery("update invites set accepted_at = now() where id = $1", [pendingInvite.id]);
  }
  const token = crypto.randomBytes(32).toString("hex");
  await postgresQuery(
    "insert into sessions (id, user_id, token_hash, expires_at, created_at) values ($1, $2, $3, now() + interval '30 days', now())",
    [crypto.randomUUID(), user.id, hashSecret(token)]
  );
  await ensureCompanyDefaultConversation(company.id, user.id, company.name);

  return {
    ok: true,
    token,
    user: normalizeDbUser(user),
    workspace: { id: company.id, name: company.name, domain: company.domain }
  };
}

async function ensureCompanyDefaultConversation(companyId, userId, companyName) {
  const existing = (await postgresRows("select id from conversations where company_id = $1 limit 1", [companyId]))[0];
  if (existing) {
    await postgresQuery(
      "insert into conversation_members (conversation_id, user_id, role, joined_at) values ($1, $2, 'member', now()) on conflict do nothing",
      [existing.id, userId]
    );
    return existing.id;
  }

  const conversationId = crypto.randomUUID();
  await postgresQuery(
    "insert into conversations (id, company_id, name, type, created_by, created_at, updated_at) values ($1, $2, $3, 'group', $4, now(), now())",
    [conversationId, companyId, companyName || "Workspace chat", userId]
  );
  await postgresQuery(
    "insert into conversation_members (conversation_id, user_id, role, joined_at) values ($1, $2, 'owner', now())",
    [conversationId, userId]
  );
  await postgresQuery(
    `insert into messages (id, conversation_id, sender_id, encrypted_body, plain_preview, attachment_json, created_at)
     values ($1, $2, $3, $4, $5, '[]'::jsonb, now())`,
    [
      crypto.randomUUID(),
      conversationId,
      userId,
      "Welcome to TodoMessenger. Start chatting or turn a message into a task.",
      "Welcome to TodoMessenger. Start chatting or turn a message into a task."
    ]
  );
  return conversationId;
}

async function requireAuth(req) {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("Authentication required.");
  }
  return getAuthContextByToken(token);
}

async function optionalAuth(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    return await getAuthContextByToken(token);
  } catch {
    return null;
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function getAuthContextByToken(token) {
  if (!hasPostgresConfig()) {
    throw new Error("Authenticated app data requires PostgreSQL. Configure DATABASE_URL or POSTGRES_*.");
  }
  await ensurePostgresRuntimeSchema();

  const rows = await postgresRows(
    `select
       u.id, u.company_id, u.email, u.name, u.about, u.role, u.status,
       c.name as company_name, c.domain as company_domain
     from sessions s
     join users u on u.id = s.user_id
     join companies c on c.id = u.company_id
     where s.token_hash = $1
       and s.revoked_at is null
       and s.expires_at > now()
     limit 1`,
    [hashSecret(token)]
  );
  const row = rows[0];
  if (!row) {
    throw new Error("Session expired. Please sign in again.");
  }

  return {
    token,
    user: normalizeDbUser(row),
    companyId: row.company_id,
    workspace: {
      id: row.company_id,
      name: row.company_name,
      domain: row.company_domain,
      sso: (await getWorkspaceSsoSettings(row.company_id, { id: row.company_id, name: row.company_name, domain: row.company_domain })).sso
    }
  };
}

async function updateCurrentUser(auth, body) {
  const name = String(body.name || "").trim().slice(0, 160);
  const about = String(body.about || "Available").trim().slice(0, 240) || "Available";
  if (!name) {
    throw new Error("Profile name is required.");
  }

  await ensurePostgresRuntimeSchema();
  const rows = await postgresRows(
    `update users
     set name = $1,
         about = $2,
         updated_at = now()
     where id = $3
     returning id, company_id, email, name, about, role, status`,
    [name, about, auth.user.id]
  );
  const user = normalizeDbUser(rows[0]);
  broadcastRealtime(auth.companyId, { type: "user.updated", user });
  return { ok: true, user };
}

async function listConversations(auth) {
  await syncCompanyConversationMemberships(auth.companyId);
  const rows = await postgresRows(
    `select c.id, c.name, c.type, c.created_at, c.updated_at,
       coalesce(
         json_agg(
           json_build_object(
             'id', m.id,
             'senderId', m.sender_id,
             'sender', case when m.sender_id = $2 then 'me' else 'them' end,
             'preview', case when coalesce(m.plain_preview, '') <> '' then m.plain_preview else '[Encrypted message]' end,
             'encrypted', m.encrypted_body,
             'attachments', coalesce(m.attachment_json, '[]'::jsonb),
             'time', to_char(m.created_at, 'HH24:MI'),
             'createdAt', m.created_at,
             'reactions', coalesce(m.reactions, '[]'::json),
             'readBy', coalesce(m.read_by, '[]'::json)
           )
           order by m.created_at
         ) filter (where m.id is not null),
         '[]'::json
       ) as messages
     from conversations c
     left join lateral (
       select msg.*,
         (
           select json_agg(json_build_object('userId', mr.user_id, 'reaction', mr.reaction, 'createdAt', mr.created_at))
           from message_reactions mr
           where mr.message_id = msg.id
         ) as reactions,
         (
           select json_agg(json_build_object('userId', rd.user_id, 'readAt', rd.read_at))
           from message_reads rd
           where rd.message_id = msg.id
         ) as read_by
       from (
         select *
         from messages
         where conversation_id = c.id
         order by created_at desc
         limit 50
       ) msg
       order by msg.created_at
     ) m on true
     where c.company_id = $1
       and (
         c.type in ('group', 'system')
         or exists (
           select 1 from conversation_members cm
           where cm.conversation_id = c.id and cm.user_id = $2
         )
       )
     group by c.id
     order by c.updated_at desc`,
    [auth.companyId, auth.user.id]
  );

  const conversationIds = rows.map((row) => row.id).filter(Boolean);
  const memberRows = conversationIds.length
    ? await postgresRows(
        `select cm.conversation_id, cm.user_id, u.name
         from conversation_members cm
         join users u on u.id = cm.user_id
         where cm.conversation_id = any($1::uuid[])`,
        [conversationIds]
      )
    : [];
  const membersByConversation = new Map();
  memberRows.forEach((row) => {
    const current = membersByConversation.get(row.conversation_id) || [];
    current.push({ userId: row.user_id, name: row.name });
    membersByConversation.set(row.conversation_id, current);
  });

  return {
    ok: true,
    conversations: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.type === "direct" ? "private chat" : "workspace chat",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      memberIds: (membersByConversation.get(row.id) || []).map((member) => member.userId),
      members: membersByConversation.get(row.id) || [],
      messages: row.messages || []
    }))
  };
}

async function createConversation(auth, body) {
  const id = crypto.randomUUID();
  const name = String(body.name || "New chat").trim().slice(0, 180);
  const type = ["direct", "group", "system"].includes(body.type) ? body.type : "group";
  await postgresQuery(
    "insert into conversations (id, company_id, name, type, created_by, created_at, updated_at) values ($1, $2, $3, $4, $5, now(), now())",
    [id, auth.companyId, name, type, auth.user.id]
  );
  await postgresQuery(
    "insert into conversation_members (conversation_id, user_id, role, joined_at) values ($1, $2, 'owner', now()) on conflict do nothing",
    [id, auth.user.id]
  );

  const conversation = { id, name, type, status: type === "direct" ? "private chat" : "workspace chat", messages: [] };
  broadcastRealtime(auth.companyId, { type: "conversation.created", conversation });
  return { ok: true, conversation };
}

async function ensureConversationAccess(auth, conversationId) {
  await syncCompanyConversationMemberships(auth.companyId);
  const rows = await postgresRows(
    `select id, name, type
     from conversations
     where id = $1
       and company_id = $2
       and exists (
         select 1 from conversation_members cm
         where cm.conversation_id = conversations.id and cm.user_id = $3
       )
     limit 1`,
    [conversationId, auth.companyId, auth.user.id]
  );
  if (!rows[0]) {
    throw new Error("Conversation not found.");
  }
  return rows[0];
}

async function listMessages(auth, conversationId) {
  await ensureConversationAccess(auth, conversationId);
  const rows = await postgresRows(
    `select m.id, m.sender_id, m.encrypted_body, m.plain_preview, m.attachment_json, m.reply_to_json, m.created_at,
       coalesce(
         (select json_agg(json_build_object('userId', mr.user_id, 'reaction', mr.reaction, 'createdAt', mr.created_at))
          from message_reactions mr where mr.message_id = m.id),
         '[]'::json
       ) as reactions,
       coalesce(
         (select json_agg(json_build_object('userId', rd.user_id, 'readAt', rd.read_at))
          from message_reads rd where rd.message_id = m.id),
         '[]'::json
       ) as read_by
     from messages m
     where m.conversation_id = $1
     order by m.created_at asc
     limit 200`,
    [conversationId]
  );

  return {
    ok: true,
    messages: rows.map((row) => mapMessageRow(row, auth.user.id))
  };
}

async function createMessage(auth, conversationId, body) {
  await ensureConversationAccess(auth, conversationId);
  const text = String(body.text || body.preview || "").trim();
  const allowServerPreview = body.allowServerPreview === true;
  const preview = allowServerPreview ? String(body.preview || text).slice(0, 280) : "";
  const encryptedBody = String(body.encryptedBody || body.encrypted || text).slice(0, 20000);
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const replyTo = normalizeReplyTo(body.replyTo);
  const messageId = crypto.randomUUID();

  const rows = await postgresRows(
    `insert into messages (id, conversation_id, sender_id, encrypted_body, plain_preview, attachment_json, reply_to_json, created_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, now())
     returning id, sender_id, encrypted_body, plain_preview, attachment_json, reply_to_json, created_at`,
    [messageId, conversationId, auth.user.id, encryptedBody, preview, JSON.stringify(attachments), JSON.stringify(replyTo)]
  );
  await postgresQuery("update conversations set updated_at = now() where id = $1", [conversationId]);

  const message = mapMessageRow({ ...rows[0], reactions: [], read_by: [] }, auth.user.id);
  broadcastRealtime(auth.companyId, { type: "message.created", conversationId, message });
  return { ok: true, message };
}

async function listTasks(auth) {
  const rows = await postgresRows(
    `select t.*, assignee.name as assignee_name, assignee.email as assignee_email, creator.name as creator_name
     from tasks t
     left join users assignee on assignee.id = t.assignee_id
     join users creator on creator.id = t.created_by
     where t.company_id = $1
     order by t.created_at desc`,
    [auth.companyId]
  );
  return { ok: true, tasks: rows.map(mapTaskRow) };
}

async function createTaskRecord(auth, body) {
  const title = String(body.title || "").trim().slice(0, 220);
  if (!title) {
    throw new Error("Task title is required.");
  }
  const assigneeName = String(body.assignee || "").trim();
  const assignee = assigneeName && assigneeName.toLowerCase() !== "me"
    ? (await postgresRows(
        "select id, name, email from users where company_id = $1 and lower(name) = lower($2) limit 1",
        [auth.companyId, assigneeName]
      ))[0]
    : null;
  const taskId = crypto.randomUUID();
  const rows = await postgresRows(
    `insert into tasks (
       id, company_id, conversation_id, title, description, assignee_id, assignee_external,
       created_by, priority, status, due_at, reminder_at, fallback_message, created_at, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10, $11, $12, now(), now())
     returning *`,
    [
      taskId,
      auth.companyId,
      body.conversationId || null,
      title,
      body.description || null,
      assignee?.id || (assigneeName.toLowerCase() === "me" ? auth.user.id : null),
      assignee ? null : (assigneeName && assigneeName.toLowerCase() !== "me" ? assigneeName : null),
      auth.user.id,
      normalizePriority(body.priority),
      normalizeOptionalDate(body.due || body.dueAt),
      normalizeOptionalDate(body.reminderAt),
      body.fallbackMessage || body.assignmentFallback?.message || null
    ]
  );

  const task = mapTaskRow(rows[0], assignee || null, auth.user);
  broadcastRealtime(auth.companyId, { type: "task.created", task });
  return { ok: true, task };
}

async function updateTaskRecord(auth, taskId, body) {
  const existing = (await postgresRows("select id from tasks where id = $1 and company_id = $2 limit 1", [taskId, auth.companyId]))[0];
  if (!existing) {
    throw new Error("Task not found.");
  }

  const done = typeof body.done === "boolean" ? body.done : undefined;
  const rows = await postgresRows(
    `update tasks
     set title = coalesce($3, title),
         priority = coalesce($4, priority),
         status = coalesce($5, status),
         due_at = coalesce($6, due_at),
         reminder_at = coalesce($7, reminder_at),
         updated_at = now()
     where id = $1 and company_id = $2
     returning *`,
    [
      taskId,
      auth.companyId,
      body.title ? String(body.title).trim().slice(0, 220) : null,
      body.priority ? normalizePriority(body.priority) : null,
      done === undefined ? (body.status ? normalizeTaskStatus(body.status) : null) : (done ? "done" : "open"),
      body.due || body.dueAt ? normalizeOptionalDate(body.due || body.dueAt) : null,
      body.reminderAt ? normalizeOptionalDate(body.reminderAt) : null
    ]
  );

  const task = mapTaskRow(rows[0]);
  broadcastRealtime(auth.companyId, { type: "task.updated", task });
  return { ok: true, task };
}

async function addMessageReaction(auth, messageId, body) {
  const reaction = String(body.reaction || "").trim().slice(0, 16);
  if (!reaction) {
    throw new Error("Reaction is required.");
  }
  const conversation = await getMessageConversation(auth, messageId);
  await postgresQuery(
    `insert into message_reactions (message_id, user_id, reaction, created_at)
     values ($1, $2, $3, now())
     on conflict (message_id, user_id, reaction) do update set created_at = excluded.created_at`,
    [messageId, auth.user.id, reaction]
  );
  const payload = { messageId, userId: auth.user.id, reaction, conversationId: conversation.id };
  broadcastRealtime(auth.companyId, { type: "message.reaction", ...payload });
  return { ok: true, reaction: payload };
}

async function markMessageRead(auth, messageId) {
  const conversation = await getMessageConversation(auth, messageId);
  await postgresQuery(
    `insert into message_reads (message_id, user_id, read_at)
     values ($1, $2, now())
     on conflict (message_id, user_id) do update set read_at = excluded.read_at`,
    [messageId, auth.user.id]
  );
  const payload = { messageId, userId: auth.user.id, conversationId: conversation.id, readAt: new Date().toISOString() };
  broadcastRealtime(auth.companyId, { type: "message.read", ...payload });
  return { ok: true, read: payload };
}

async function listOwnDevices(auth) {
  await ensurePostgresRuntimeSchema();
  const rows = await postgresRows(
    `select device_id, device_label, identity_key, signed_prekey_id, signed_prekey,
            signed_prekey_signature, registration_id, created_at, updated_at, revoked_at
     from e2ee_devices
     where user_id = $1 and revoked_at is null
     order by updated_at desc`,
    [auth.user.id]
  );
  return { ok: true, devices: rows.map(mapE2eeDeviceRow) };
}

async function registerE2eeDevice(auth, body) {
  await ensurePostgresRuntimeSchema();
  const deviceId = normalizeDeviceId(body.deviceId);
  const deviceLabel = String(body.deviceLabel || "Device").trim().slice(0, 160) || "Device";
  const identityKey = normalizePublicKeyJson(body.identityKey, "identityKey");
  const signedPrekey = normalizePublicKeyJson(body.signedPrekey, "signedPrekey");
  const signedPrekeyId = String(body.signedPrekeyId || "").trim().slice(0, 120);
  const signedPrekeySignature = String(body.signedPrekeySignature || "").trim();
  const registrationId = String(body.registrationId || "").trim().slice(0, 120);
  const oneTimePrekeys = Array.isArray(body.oneTimePrekeys) ? body.oneTimePrekeys.slice(0, 100) : [];
  if (!signedPrekeyId || !signedPrekeySignature) {
    throw new Error("signedPrekeyId and signedPrekeySignature are required.");
  }

  await postgresQuery(
    `insert into e2ee_devices (
       id, user_id, device_id, device_label, identity_key, signed_prekey_id,
       signed_prekey, signed_prekey_signature, registration_id, created_at, updated_at, revoked_at
     )
     values ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9, now(), now(), null)
     on conflict (user_id, device_id)
     do update set
       device_label = excluded.device_label,
       identity_key = excluded.identity_key,
       signed_prekey_id = excluded.signed_prekey_id,
       signed_prekey = excluded.signed_prekey,
       signed_prekey_signature = excluded.signed_prekey_signature,
       registration_id = excluded.registration_id,
       revoked_at = null,
       updated_at = now()`,
    [
      crypto.randomUUID(),
      auth.user.id,
      deviceId,
      deviceLabel,
      JSON.stringify(identityKey),
      signedPrekeyId,
      JSON.stringify(signedPrekey),
      signedPrekeySignature,
      registrationId || null
    ]
  );

  let prekeyCount = 0;
  for (const item of oneTimePrekeys) {
    const prekeyId = String(item?.id || item?.prekeyId || "").trim().slice(0, 120);
    if (!prekeyId) continue;
    const prekey = normalizePublicKeyJson(item?.key || item?.prekey, "oneTimePrekey");
    await postgresQuery(
      `insert into e2ee_one_time_prekeys (user_id, device_id, prekey_id, prekey, created_at, claimed_at)
       values ($1, $2, $3, $4::jsonb, now(), null)
       on conflict (user_id, device_id, prekey_id)
       do update set prekey = excluded.prekey, claimed_at = null, created_at = now()`,
      [auth.user.id, deviceId, prekeyId, JSON.stringify(prekey)]
    );
    prekeyCount += 1;
  }

  broadcastRealtime(auth.companyId, { type: "e2ee.device.updated", userId: auth.user.id, deviceId });
  return { ok: true, deviceId, oneTimePrekeys: prekeyCount };
}

async function updateE2eeDevice(auth, deviceId, body) {
  await ensurePostgresRuntimeSchema();
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  const action = String(body.action || "").trim().toLowerCase();
  if (action !== "revoke") {
    throw new Error("Only revoke is supported for device updates.");
  }

  const rows = await postgresRows(
    `update e2ee_devices
     set revoked_at = now(), updated_at = now()
     where user_id = $1 and device_id = $2 and revoked_at is null
     returning device_id, device_label, updated_at, revoked_at`,
    [auth.user.id, normalizedDeviceId]
  );
  if (!rows[0]) {
    throw new Error("Device not found.");
  }

  await postgresQuery(
    `delete from e2ee_conversation_key_envelopes
     where recipient_user_id = $1 and recipient_device_id = $2`,
    [auth.user.id, normalizedDeviceId]
  );
  await recordAdminAudit(auth, "e2ee.device.revoked", { deviceId: normalizedDeviceId }, false);
  broadcastRealtime(auth.companyId, { type: "e2ee.device.updated", userId: auth.user.id, deviceId: normalizedDeviceId });
  return { ok: true, device: mapE2eeDeviceRow(rows[0]) };
}

async function claimPrekeyBundles(auth, body) {
  await ensurePostgresRuntimeSchema();
  const userIds = Array.isArray(body.userIds) ? body.userIds.map(String).slice(0, 50) : [];
  if (!userIds.length) {
    throw new Error("userIds is required.");
  }

  const membershipRows = await postgresRows(
    "select id from users where company_id = $1 and id = any($2::uuid[])",
    [auth.companyId, userIds]
  );
  const allowedUserIds = new Set(membershipRows.map((row) => row.id));
  const bundles = [];
  for (const userId of userIds.filter((id) => allowedUserIds.has(id))) {
    const deviceRows = await postgresRows(
      `select device_id, device_label, identity_key, signed_prekey_id, signed_prekey,
              signed_prekey_signature, registration_id, updated_at
       from e2ee_devices
       where user_id = $1 and revoked_at is null
       order by updated_at desc`,
      [userId]
    );
    for (const device of deviceRows) {
      bundles.push({
        userId,
        ...mapE2eeDeviceRow(device),
        oneTimePrekey: await claimOneTimePrekey(userId, device.device_id)
      });
    }
  }

  return { ok: true, bundles };
}

async function syncCompanyConversationMemberships(companyId) {
  if (!companyId || !hasPostgresConfig()) return;
  await postgresQuery(
    `insert into conversation_members (conversation_id, user_id, role, joined_at)
     select c.id, u.id, 'member', now()
     from conversations c
     join users u on u.company_id = c.company_id
     where c.company_id = $1
       and c.type in ('group', 'system')
       and u.status <> 'disabled'
       and not exists (
         select 1
         from conversation_members cm
         where cm.conversation_id = c.id and cm.user_id = u.id
       )`,
    [companyId]
  );
}

async function claimOneTimePrekey(userId, deviceId) {
  const rows = await postgresRows(
    `update e2ee_one_time_prekeys
     set claimed_at = now()
     where user_id = $1
       and device_id = $2
       and prekey_id = (
         select prekey_id
         from e2ee_one_time_prekeys
         where user_id = $1 and device_id = $2 and claimed_at is null
         order by created_at asc
         limit 1
       )
     returning prekey_id, prekey`,
    [userId, deviceId]
  );
  const row = rows[0];
  return row ? { id: row.prekey_id, key: row.prekey } : null;
}

async function listConversationKeyEnvelopes(auth, conversationId, searchParams) {
  await ensureConversationAccess(auth, conversationId);
  await ensurePostgresRuntimeSchema();
  const deviceId = normalizeDeviceId(searchParams.get("deviceId") || "");
  const rows = await postgresRows(
    `select conversation_id, recipient_user_id, recipient_device_id, sender_user_id,
            envelope_version, algorithm, encrypted_key, created_at, updated_at
     from e2ee_conversation_key_envelopes
     where conversation_id = $1
       and recipient_user_id = $2
       and recipient_device_id = $3
     order by updated_at desc`,
    [conversationId, auth.user.id, deviceId]
  );
  return { ok: true, envelopes: rows.map(mapKeyEnvelopeRow) };
}

async function saveConversationKeyEnvelopes(auth, conversationId, body) {
  await ensureConversationAccess(auth, conversationId);
  await ensurePostgresRuntimeSchema();
  const envelopes = Array.isArray(body.envelopes) ? body.envelopes.slice(0, 250) : [];
  if (!envelopes.length) {
    throw new Error("At least one key envelope is required.");
  }

  const saved = [];
  for (const envelope of envelopes) {
    const recipientUserId = String(envelope.recipientUserId || "").trim();
    const recipientDeviceId = normalizeDeviceId(envelope.recipientDeviceId || "");
    const encryptedKey = String(envelope.encryptedKey || "").trim();
    const algorithm = String(envelope.algorithm || "x3dh-aes-gcm").trim().slice(0, 80);
    if (!recipientUserId || !encryptedKey) {
      throw new Error("recipientUserId, recipientDeviceId, and encryptedKey are required.");
    }
    await ensureConversationMember(conversationId, recipientUserId, auth.companyId);
    const rows = await postgresRows(
      `insert into e2ee_conversation_key_envelopes (
         conversation_id, recipient_user_id, recipient_device_id, sender_user_id,
         envelope_version, algorithm, encrypted_key, created_at, updated_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, now(), now())
       on conflict (conversation_id, recipient_user_id, recipient_device_id)
       do update set
         sender_user_id = excluded.sender_user_id,
         envelope_version = e2ee_conversation_key_envelopes.envelope_version + 1,
         algorithm = excluded.algorithm,
         encrypted_key = excluded.encrypted_key,
         updated_at = now()
       returning conversation_id, recipient_user_id, recipient_device_id, sender_user_id,
                 envelope_version, algorithm, encrypted_key, created_at, updated_at`,
      [
        conversationId,
        recipientUserId,
        recipientDeviceId,
        auth.user.id,
        Number(envelope.envelopeVersion || 1),
        algorithm,
        encryptedKey
      ]
    );
    saved.push(mapKeyEnvelopeRow(rows[0]));
  }

  broadcastRealtime(auth.companyId, { type: "e2ee.key-envelopes.updated", conversationId });
  return { ok: true, envelopes: saved };
}

async function ensureConversationMember(conversationId, userId, companyId) {
  await syncCompanyConversationMemberships(companyId);
  const rows = await postgresRows(
    `select cm.user_id
     from conversation_members cm
     join conversations c on c.id = cm.conversation_id
     where cm.conversation_id = $1 and cm.user_id = $2 and c.company_id = $3
     limit 1`,
    [conversationId, userId, companyId]
  );
  if (!rows[0]) {
    throw new Error("Recipient is not in this workspace.");
  }
}

function mapE2eeDeviceRow(row) {
  return {
    deviceId: row.device_id,
    deviceLabel: row.device_label,
    identityKey: row.identity_key,
    signedPrekeyId: row.signed_prekey_id,
    signedPrekey: row.signed_prekey,
    signedPrekeySignature: row.signed_prekey_signature,
    registrationId: row.registration_id || "",
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at || null
  };
}

function mapKeyEnvelopeRow(row) {
  return {
    conversationId: row.conversation_id,
    recipientUserId: row.recipient_user_id,
    recipientDeviceId: row.recipient_device_id,
    senderUserId: row.sender_user_id,
    envelopeVersion: row.envelope_version,
    algorithm: row.algorithm,
    encryptedKey: row.encrypted_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeDeviceId(value) {
  const deviceId = String(value || "").trim().slice(0, 120);
  if (!deviceId) {
    throw new Error("deviceId is required.");
  }
  return deviceId;
}

function normalizePublicKeyJson(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a public JWK object.`);
  }
  const json = JSON.stringify(value);
  if (json.length > 5000) {
    throw new Error(`${label} is too large.`);
  }
  return value;
}

async function getMessageConversation(auth, messageId) {
  const rows = await postgresRows(
    `select c.id
     from messages m
     join conversations c on c.id = m.conversation_id
     where m.id = $1 and c.company_id = $2
     limit 1`,
    [messageId, auth.companyId]
  );
  if (!rows[0]) {
    throw new Error("Message not found.");
  }
  return rows[0];
}

function mapMessageRow(row, currentUserId) {
  return {
    id: row.id,
    senderId: row.sender_id,
    sender: row.sender_id === currentUserId ? "me" : "them",
    preview: row.plain_preview || "[Encrypted message]",
    encrypted: row.encrypted_body || "",
    attachments: row.attachment_json || [],
    replyTo: row.reply_to_json || null,
    reactions: row.reactions || [],
    readBy: row.read_by || [],
    time: formatServerTime(row.created_at),
    createdAt: row.created_at
  };
}

function mapTaskRow(row) {
  const assignee = row.assignee_name || row.assignee_external || (row.assignee_id ? "Assigned" : "Me");
  return {
    id: row.id,
    conversationId: row.conversation_id || "",
    title: row.title,
    description: row.description || "",
    assignee,
    priority: row.priority || "normal",
    due: row.due_at ? new Date(row.due_at).toISOString().slice(0, 10) : "",
    dueAt: row.due_at || null,
    reminderAt: row.reminder_at || "",
    remindedAt: row.reminder_sent_at || "",
    done: row.status === "done",
    status: row.status,
    assignmentFallback: row.fallback_message ? { message: row.fallback_message, reason: "Assignee is outside TodoMessenger." } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizePriority(value) {
  return ["low", "normal", "high"].includes(String(value)) ? String(value) : "normal";
}

function normalizeTaskStatus(value) {
  return ["open", "done", "cancelled"].includes(String(value)) ? String(value) : "open";
}

function normalizeOptionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function normalizeReplyTo(replyTo) {
  if (!replyTo || typeof replyTo !== "object" || !replyTo.text) return null;
  return {
    id: String(replyTo.id || "").slice(0, 120),
    sender: String(replyTo.sender || "Message").slice(0, 80),
    text: String(replyTo.text || "").replace(/\s+/g, " ").trim().slice(0, 120)
  };
}

function formatServerTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function setupRealtime(httpServer) {
  if (!WebSocketServer) {
    console.warn("WebSocket realtime disabled. Run npm install so the ws package is available.");
    return;
  }

  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  wss.on("connection", async (socket, req) => {
    try {
      const url = new URL(req.url, PUBLIC_BACKEND_URL);
      const ticket = url.searchParams.get("ticket") || "";
      const auth = await consumeRealtimeTicket(ticket);
      const companyClients = realtimeClients.get(auth.companyId) || new Set();
      companyClients.add(socket);
      realtimeClients.set(auth.companyId, companyClients);
      socket.send(JSON.stringify({ type: "connected", userId: auth.user.id }));
      socket.on("close", () => {
        companyClients.delete(socket);
        if (!companyClients.size) {
          realtimeClients.delete(auth.companyId);
        }
      });
    } catch (error) {
      socket.close(1008, normalizeError(error));
    }
  });
}

function broadcastRealtime(companyId, payload) {
  const clients = realtimeClients.get(companyId);
  if (!clients?.size) return;
  const message = JSON.stringify({ ...payload, at: new Date().toISOString() });
  clients.forEach((socket) => {
    if (socket.readyState === 1) {
      socket.send(message);
    }
  });
}

async function createRealtimeSession(auth) {
  const ticket = crypto.randomBytes(24).toString("base64url");
  realtimeTickets.set(ticket, {
    token: auth.token,
    companyId: auth.companyId,
    userId: auth.user.id,
    expiresAt: Date.now() + REALTIME_TICKET_TTL_MS
  });
  pruneRealtimeTickets();
  return { ok: true, ticket, expiresInMs: REALTIME_TICKET_TTL_MS };
}

async function consumeRealtimeTicket(ticket) {
  if (!ticket) {
    throw new Error("Realtime ticket is required.");
  }
  const record = realtimeTickets.get(ticket);
  realtimeTickets.delete(ticket);
  if (!record || record.expiresAt < Date.now()) {
    throw new Error("Realtime session expired. Please reconnect.");
  }
  return getAuthContextByToken(record.token);
}

function pruneRealtimeTickets() {
  const now = Date.now();
  realtimeTickets.forEach((value, key) => {
    if (!value || value.expiresAt < now) {
      realtimeTickets.delete(key);
    }
  });
}

async function startSsoLogin(providerId, url, res) {
  const provider = getSsoProvider(providerId);
  requireSsoProviderConfig(provider);
  const redirectTo = sanitizeFrontendRedirect(url.searchParams.get("redirectTo") || "");
  const emailHint = normalizeEmail(url.searchParams.get("emailHint") || "");
  const options = await getSsoOptions(new URLSearchParams(emailHint ? { email: emailHint } : {}));
  const matchingProvider = options.providers.find((item) => item.provider === providerId);
  if (!matchingProvider) {
    sendHtml(res, 400, `<h1>Team SSO unavailable</h1><p>${escapeHtml(provider.name)} is not enabled for this workspace yet.</p>`);
    return;
  }

  const state = crypto.randomBytes(24).toString("hex");
  const store = readStore();
  store.oauthStates[state] = {
    type: "sso",
    provider: providerId,
    redirectTo,
    companyId: options.companyId || "",
    emailHint,
    createdAt: new Date().toISOString()
  };
  writeStore(store);

  const authUrl = new URL(provider.authUrl);
  authUrl.searchParams.set("client_id", provider.clientId);
  authUrl.searchParams.set("redirect_uri", provider.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", provider.scopes);
  if (emailHint) authUrl.searchParams.set("login_hint", emailHint);
  if (provider.hostedDomainParam && matchingProvider.domainHint) {
    authUrl.searchParams.set(provider.hostedDomainParam, matchingProvider.domainHint);
  }
  if (providerId === "google" || providerId === "microsoft") {
    authUrl.searchParams.set("prompt", "select_account");
  }
  redirect(res, authUrl.toString());
}

async function finishSsoLogin(providerId, url, res) {
  const provider = getSsoProvider(providerId);
  requireSsoProviderConfig(provider);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    redirect(res, buildSsoRedirectUrl(FRONTEND_ORIGIN, { error: "Missing code or state." }));
    return;
  }

  const store = readStore();
  const storedState = store.oauthStates[state];
  if (!storedState || storedState.provider !== providerId || storedState.type !== "sso") {
    redirect(res, buildSsoRedirectUrl(FRONTEND_ORIGIN, { error: "State did not match." }));
    return;
  }

  try {
    const token = await exchangeCode(provider, code);
    const identity = await fetchSsoIdentity(provider, token);
    const email = normalizeEmail(identity.email || storedState.emailHint || "");
    if (!email) {
      throw new Error("The identity provider did not return a work email.");
    }
    const auth = await signInWithSsoIdentity({
      providerId,
      identity,
      email,
      companyId: storedState.companyId
    });
    delete store.oauthStates[state];
    writeStore(store);
    redirect(res, buildSsoRedirectUrl(storedState.redirectTo || FRONTEND_ORIGIN, {
      token: auth.token,
      provider: providerId
    }));
  } catch (error) {
    delete store.oauthStates[state];
    writeStore(store);
    redirect(res, buildSsoRedirectUrl(storedState.redirectTo || FRONTEND_ORIGIN, {
      error: normalizeError(error)
    }));
  }
}

async function startOAuth(providerId, url, res) {
  const provider = getProvider(providerId);
  requireProviderConfig(provider);

  let auth = null;
  const token = url.searchParams.get("token") || "";
  if (token) {
    try {
      auth = await getAuthContextByToken(token);
    } catch {
      auth = null;
    }
  }

  const userId = auth?.user?.id || url.searchParams.get("userId") || "demo-user";
  const state = crypto.randomBytes(24).toString("hex");
  const store = readStore();
  store.oauthStates[state] = {
    provider: providerId,
    userId,
    companyId: auth?.companyId || "",
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

  if (providerId === "google_calendar") {
    authUrl.searchParams.set("access_type", "offline");
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
  if (hasPostgresConfig() && storedState.companyId) {
    await saveIntegrationConnection({
      companyId: storedState.companyId,
      providerId,
      token,
      connectedBy: storedState.userId
    });
  } else {
    store.connections[providerId] = {
      provider: providerId,
      userId: storedState.userId,
      token,
      connectedAt: new Date().toISOString()
    };
  }
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

async function fetchSsoIdentity(provider, token) {
  let profile = {};
  if (provider.userInfoUrl && token.access_token) {
    profile = await getJson(provider.userInfoUrl, {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/json"
    }).catch(() => ({}));
  }
  const idTokenClaims = parseJwtClaims(token.id_token);
  const claims = { ...idTokenClaims, ...profile };
  return {
    subject: String(claims.sub || claims.oid || claims.id || "").trim(),
    email: String(claims.email || claims.preferred_username || claims.upn || "").trim(),
    name: String(claims.name || claims.given_name || claims.preferred_username || "").trim(),
    picture: String(claims.picture || "").trim(),
    hostedDomain: String(claims.hd || "").trim(),
    tenantId: String(claims.tid || "").trim(),
    raw: claims
  };
}

async function signInWithSsoIdentity({ providerId, identity, email, companyId = "" }) {
  await ensurePostgresRuntimeSchema();
  const domain = email.split("@")[1];
  let workspace = companyId
    ? (await postgresRows("select id, name, domain from companies where id = $1 limit 1", [companyId]))[0]
    : (await postgresRows("select id, name, domain from companies where domain = $1 limit 1", [domain]))[0];
  if (!workspace) {
    throw new Error("This company has not enabled Team SSO yet.");
  }

  const sso = await getWorkspaceSsoSettings(workspace.id, workspace);
  const providerConfig = sso.sso.providers.find((item) => item.provider === providerId);
  if (!providerConfig?.enabled || !providerConfig.configured) {
    throw new Error("This Team SSO provider is not enabled for the workspace.");
  }
  if (providerConfig.domainHint && domain !== providerConfig.domainHint) {
    throw new Error("This account email does not match the workspace SSO domain.");
  }

  const providerUserId = identity.subject || email;
  let user = (await postgresRows(
    `select u.id, u.company_id, u.email, u.name, u.about, u.role, u.status
     from user_identities i
     join users u on u.id = i.user_id
     where i.company_id = $1 and i.provider = $2 and i.provider_user_id = $3
     limit 1`,
    [workspace.id, providerId, providerUserId]
  ))[0];

  const pendingInvite = (await postgresRows(
    `select id, role from invites
     where company_id = $1
       and email = $2
       and accepted_at is null
       and expires_at > now()
     order by created_at desc
     limit 1`,
    [workspace.id, email]
  ))[0];

  if (!user) {
    user = (await postgresRows(
      "select id, company_id, email, name, about, role, status from users where company_id = $1 and email = $2 limit 1",
      [workspace.id, email]
    ))[0];
  }

  if (!user) {
    const existingUsers = await postgresRows("select id from users where company_id = $1 limit 1", [workspace.id]);
    const role = getProvisionedRole({
      requestedRole: pendingInvite?.role,
      existingRole: "",
      existingUsersCount: existingUsers.length
    });
    const userId = crypto.randomUUID();
    await postgresQuery(
      `insert into users (id, company_id, email, name, about, role, status, created_at, updated_at, last_login_at)
       values ($1, $2, $3, $4, 'Available', $5, 'active', now(), now(), now())`,
      [userId, workspace.id, email, identity.name || getNameFromEmail(email), role]
    );
    user = { id: userId, company_id: workspace.id, email, name: identity.name || getNameFromEmail(email), about: "Available", role, status: "active" };
  } else {
    const nextRole = getProvisionedRole({
      requestedRole: pendingInvite?.role,
      existingRole: user.role,
      existingUsersCount: 1
    });
    await postgresQuery(
      `update users
       set name = $1,
           role = $2,
           status = 'active',
           last_login_at = now(),
           updated_at = now()
       where id = $3`,
      [identity.name || user.name, nextRole, user.id]
    );
    user.name = identity.name || user.name;
    user.role = nextRole;
    user.status = "active";
  }

  await postgresQuery(
    `insert into user_identities (id, user_id, company_id, provider, provider_user_id, email, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())
     on conflict (company_id, provider, provider_user_id)
     do update set
       user_id = excluded.user_id,
       email = excluded.email,
       updated_at = now()`,
    [crypto.randomUUID(), user.id, workspace.id, providerId, providerUserId, email]
  );
  if (pendingInvite) {
    await postgresQuery("update invites set accepted_at = now() where id = $1", [pendingInvite.id]);
  }

  const session = await createPersistedSessionForUser(user.id);
  await ensureCompanyDefaultConversation(workspace.id, user.id, workspace.name);
  return {
    token: session.token,
    user: normalizeDbUser(user),
    workspace
  };
}

async function createAsanaTask(body) {
  const connection = await getConnection("asana", body.companyId);
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

async function createGoogleCalendarEvent(auth, body) {
  const companyId = auth?.companyId || body.companyId || "";
  const connection = await getConnection("google_calendar", companyId);
  const calendarId = encodeURIComponent(body.calendarId || "primary");
  const title = String(body.title || "TodoMessenger follow-up").slice(0, 220);
  const due = body.due || body.start || new Date().toISOString();
  const start = normalizeOptionalDate(due) || new Date().toISOString();
  const endDate = new Date(start);
  endDate.setMinutes(endDate.getMinutes() + Number(body.durationMinutes || 30));

  return postJson(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    JSON.stringify({
      summary: title,
      description: body.description || body.reason || "Created from TodoMessenger Blu.",
      start: { dateTime: start },
      end: { dateTime: endDate.toISOString() }
    }),
    {
      Authorization: `Bearer ${connection.token.access_token}`,
      "Content-Type": "application/json"
    }
  );
}

async function askBlu(body) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      answer: createBluFallbackAnswer(body.prompt || "", body.context || ""),
      mode: "local-fallback"
    };
  }

  const prompt = body.prompt || "Help with this TodoMessenger conversation.";
  const context = body.context ? `Recent encrypted-chat context, decrypted on the user's device:\n${body.context}` : "";
  const locale = normalizeLocale(body.locale || body.language || "");
  try {
    const data = await postJson(
      "https://api.openai.com/v1/responses",
      JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        instructions:
          "You are Blu, the AI assistant inside TodoMessenger. You must understand and answer in any language used by the user or chat context. Prefer replying in the user's latest language. Preserve names, task titles, and important quoted text in the original language when that is clearer. Answer clearly and concisely in mobile-friendly formatting. Use short section headings on their own lines and bullet points on separate lines. Do not write dense paragraphs. Do not use markdown heading symbols like ###. If the user asks for a task, suggest a short actionable task title in the same language as the request unless the user asks otherwise.",
        input: `Preferred locale: ${locale || "auto"}\n${context}\n\nUser request:\n${prompt}`,
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
  } catch (error) {
    return {
      answer: `${createBluFallbackAnswer(body.prompt || "", body.context || "")}\n\nLive AI is not available yet: ${normalizeError(error)}.`,
      mode: "local-fallback"
    };
  }
}

function createBluFallbackAnswer(prompt, context) {
  const question = String(prompt || "").trim().toLowerCase();
  if (!question || ["hi", "hello", "hey"].includes(question)) {
    return "Hi, I am Blu. I can help turn chat messages into tasks, summarize recent conversation points, spot follow-ups, and prepare task assignments. Live AI answers need OPENAI_API_KEY, but basic task detection still works here.";
  }
  if (question.includes("what") && question.includes("answer")) {
    return "I can answer questions about the current chat, suggest tasks, draft follow-up messages, and help assign work. Right now I am running in local fallback mode because OPENAI_API_KEY is not configured.";
  }
  const suggested = extractTasksWithoutAi(context);
  if (question.includes("task") || question.includes("todo")) {
    if (suggested.tasks.length) {
      return `I found ${suggested.tasks.length} possible task${suggested.tasks.length === 1 ? "" : "s"} in this chat: ${suggested.tasks.map((task) => task.title).join("; ")}.`;
    }
    return "I did not find a clear task in the recent messages yet. Try writing something like: please send the report tomorrow.";
  }
  if (question.includes("summar")) {
    const lines = String(context || "").split(/\r?\n+/).filter(Boolean).slice(-5);
    return lines.length
      ? `Recent chat summary: ${lines.join(" ")}`
      : "There is not enough recent chat context to summarize yet.";
  }
  return "Blu is online in local fallback mode. For full answers, add OPENAI_API_KEY to the backend environment and restart the backend.";
}

async function suggestTasks(body) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ...extractTasksWithoutAi(body.context || ""),
      mode: "local-fallback",
      message: "OPENAI_API_KEY is not configured, so TodoMessenger used basic local task detection."
    };
  }

  const locale = normalizeLocale(body.locale || body.language || "");
  const data = await postJson(
    "https://api.openai.com/v1/responses",
    JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      instructions:
        "You extract actionable to-do tasks from a chat in any language. Return only JSON with a tasks array. Detect tasks even when the chat uses non-English text, mixed languages, or informal shorthand. Preserve the task title and reason in the language of the original message whenever possible. Each task must have title, assignee, priority, due, and reason. assignee may contain multiple people as a comma-separated string, for example \"Alex, Sarah\". priority must be low, normal, or high. due should be an ISO date string or empty string. If the assignee is unclear, use Me. Keep titles short and actionable.",
      input: `Preferred locale: ${locale || "auto"}\nConversation: ${body.conversationName || "Current chat"}\n\nRecent chat messages:\n${body.context || ""}\n\nReturn JSON only, shaped like {"tasks":[{"title":"...","assignee":"Alex, Sarah","priority":"normal","due":"","reason":"..."}]}.`,
      max_output_tokens: 800
    }),
    {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  );

  return normalizeSuggestedTasks(extractResponseText(data));
}

async function planBluAgentActions(auth, body) {
  const prompt = String(body.prompt || "").trim();
  const context = String(body.context || "").trim();
  const conversationName = String(body.conversationName || "Current chat").trim();
  const conversationId = String(body.conversationId || "").trim();
  const locale = normalizeLocale(body.locale || body.language || "");

  if (process.env.OPENAI_API_KEY) {
    try {
      const data = await postJson(
        "https://api.openai.com/v1/responses",
        JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
          instructions:
            "You are Blu, an AI workspace agent inside TodoMessenger. Understand and reason over chats in any language. Return only JSON. Propose actions the user can approve. Never claim an action is completed. Preserve titles and reasons in the source language when practical. Supported action types: create_task, draft_reply, schedule_reminder, sync_external. Every action needs approval. Keep task titles short. assignee may contain multiple names separated by commas. due must be ISO date or empty. When the user asks to put something on a calendar or schedule an event, return sync_external with provider set to google_calendar.",
          input: `Preferred locale: ${locale || "auto"}\nConversation: ${conversationName}\nUser request: ${prompt}\n\nRecent context:\n${context}\n\nReturn JSON shaped like {"summary":"...","actions":[{"type":"create_task","title":"...","assignee":"Me","priority":"normal","due":"","reason":"...","needsApproval":true,"provider":""}]}.`,
          max_output_tokens: 900
        }),
        {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      );
      const plan = normalizeAgentPlan(extractResponseText(data), { prompt, context });
      plan.actions = await persistBluAgentActions(auth, plan.actions, {
        prompt,
        summary: plan.summary,
        source: "blu-plan",
        conversationId
      });
      await recordBluAgentEvent(auth, { eventType: "plan.created", prompt, summary: plan.summary, actions: plan.actions });
      return { ok: true, ...plan, responseId: data.id };
    } catch (error) {
      const plan = createFallbackAgentPlan({ prompt, context });
      plan.actions = await persistBluAgentActions(auth, plan.actions, {
        prompt,
        summary: plan.summary,
        source: "blu-plan-fallback",
        conversationId
      });
      await recordBluAgentEvent(auth, { eventType: "plan.fallback", prompt, summary: plan.summary, actions: plan.actions, error: normalizeError(error) });
      return { ok: true, ...plan, mode: "local-fallback", message: normalizeError(error) };
    }
  }

  const plan = createFallbackAgentPlan({ prompt, context });
  plan.actions = await persistBluAgentActions(auth, plan.actions, {
    prompt,
    summary: plan.summary,
    source: "blu-plan-fallback",
    conversationId
  });
  await recordBluAgentEvent(auth, { eventType: "plan.fallback", prompt, summary: plan.summary, actions: plan.actions });
  return { ok: true, ...plan, mode: "local-fallback" };
}

function normalizeAgentPlan(text, fallbackSource = {}) {
  try {
    const parsed = JSON.parse(stripCodeFence(text));
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    return {
      summary: String(parsed.summary || "Blu prepared a plan for this conversation.").slice(0, 260),
      actions: actions.map(normalizeAgentAction).filter(Boolean).slice(0, 6)
    };
  } catch {
    return createFallbackAgentPlan(fallbackSource);
  }
}

function normalizeAgentAction(action) {
  const type = String(action.type || "").trim();
  if (!["create_task", "draft_reply", "schedule_reminder", "sync_external"].includes(type)) return null;
  const title = String(action.title || action.text || action.message || "").trim().slice(0, 220);
  if (!title) return null;
  const priority = normalizePriority(action.priority || "normal");
  return {
    id: crypto.randomUUID(),
    type,
    title,
    assignee: String(action.assignee || "Me").slice(0, 120),
    priority,
    due: typeof action.due === "string" ? action.due : "",
    reminderAt: typeof action.reminderAt === "string" ? action.reminderAt : "",
    provider: String(action.provider || "").slice(0, 80),
    reason: String(action.reason || "Blu suggested this action from the chat.").slice(0, 180),
    needsApproval: action.needsApproval !== false,
    status: "pending"
  };
}

function createFallbackAgentPlan({ prompt = "", context = "" } = {}) {
  const lowerPrompt = String(prompt || "").toLowerCase();
  const extracted = extractTasksWithoutAi(context || prompt);
  const actions = extracted.tasks.map((task) => normalizeAgentAction({
    type: "create_task",
    title: task.title,
    assignee: task.assignee,
    priority: task.priority,
    due: task.due,
    reason: task.reason,
    needsApproval: true
  })).filter(Boolean);

  if (lowerPrompt.includes("reply") || lowerPrompt.includes("draft")) {
    actions.push(normalizeAgentAction({
      type: "draft_reply",
      title: "Thanks. I will review this and come back with the next update.",
      reason: "Drafted from the requested reply intent.",
      needsApproval: true
    }));
  }

  if ((/\b(calendar|schedule|event|meeting reminder)\b/i.test(lowerPrompt) || /\b(calendar|event)\b/i.test(String(context || ""))) && actions.length) {
    actions.push(normalizeAgentAction({
      type: "sync_external",
      title: actions[0].title,
      due: actions[0].due,
      provider: "google_calendar",
      reason: "Blu can place this approved follow-up on Google Calendar.",
      needsApproval: true
    }));
  }

  return {
    summary: actions.length
      ? `Blu found ${actions.length} action${actions.length === 1 ? "" : "s"} you can approve.`
      : "Blu did not find a safe action to take yet. Try asking Blu to organize the chat, create a task, or draft a reply.",
    actions: actions.slice(0, 6)
  };
}

async function recordBluAgentEvent(auth, body) {
  const eventType = String(body.eventType || body.type || "agent.event").slice(0, 80);
  const payload = {
    prompt: body.prompt || "",
    summary: body.summary || "",
    actions: Array.isArray(body.actions) ? body.actions : [],
    action: body.action || null,
    result: body.result || null,
    error: body.error || null
  };

  if (auth && hasPostgresConfig()) {
    await ensurePostgresRuntimeSchema();
    await postgresQuery(
      `insert into blu_agent_events (id, company_id, user_id, event_type, payload_json, created_at)
       values ($1, $2, $3, $4, $5, now())`,
      [crypto.randomUUID(), auth.companyId, auth.user.id, eventType, JSON.stringify(payload)]
    );
  }

  return { ok: true };
}

async function recordAdminAudit(auth, actionType, target = {}, requireAdmin = true) {
  if (!auth?.companyId || !hasPostgresConfig()) return;
  if (requireAdmin && !["admin", "team_lead"].includes(auth.user?.role)) return;
  await ensurePostgresRuntimeSchema();
  await postgresQuery(
    `insert into admin_audit_events (id, company_id, actor_user_id, action_type, target_json, created_at)
     values ($1, $2, $3, $4, $5::jsonb, now())`,
    [
      crypto.randomUUID(),
      auth.companyId,
      auth.user?.id || null,
      String(actionType || "admin.event").slice(0, 120),
      JSON.stringify(target || {})
    ]
  );
}

async function listAdminAuditEvents(auth, searchParams) {
  if (!["admin", "team_lead"].includes(auth.user?.role)) {
    throw new Error("Only admins and team leads can view the audit log.");
  }
  if (!hasPostgresConfig()) return { ok: true, events: [] };
  await ensurePostgresRuntimeSchema();
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 200);
  const rows = await postgresRows(
    `select a.id, a.action_type, a.target_json, a.created_at, a.actor_user_id, u.name as actor_name, u.email as actor_email
     from admin_audit_events a
     left join users u on u.id = a.actor_user_id
     where a.company_id = $1
     order by a.created_at desc
     limit $2`,
    [auth.companyId, limit]
  );
  return {
    ok: true,
    events: rows.map((row) => ({
      id: row.id,
      actionType: row.action_type,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name || row.actor_email || "Unknown user",
      actorEmail: row.actor_email || "",
      target: row.target_json || {},
      createdAt: row.created_at
    }))
  };
}

async function listBluAgentActions(auth) {
  if (!hasPostgresConfig()) return { ok: true, actions: [] };
  await ensurePostgresRuntimeSchema();
  const rows = await postgresRows(
    `select *
     from blu_agent_actions
     where company_id = $1
     order by created_at desc
     limit 100`,
    [auth.companyId]
  );
  return { ok: true, actions: rows.map(mapBluAgentActionRow) };
}

async function createBluAgentAction(auth, body) {
  if (!hasPostgresConfig()) {
    const action = normalizeAgentAction({ ...body, type: body.type || body.actionType });
    if (!action) throw new Error("A valid Blu action is required.");
    return { ok: true, action };
  }
  await ensurePostgresRuntimeSchema();
  const action = normalizeAgentAction({
    ...body,
    type: body.type || body.actionType,
    needsApproval: body.needsApproval !== false
  });
  if (!action) throw new Error("A valid Blu action is required.");
  const saved = await insertBluAgentAction(auth, action, body.source || "manual", body);
  await recordBluAgentEvent(auth, { eventType: "action.created", action: saved });
  return { ok: true, action: saved };
}

async function updateBluAgentAction(auth, actionId, body) {
  if (!hasPostgresConfig()) {
    return { ok: true, action: { id: actionId, status: normalizeAgentStatus(body.status) || "pending" } };
  }
  await ensurePostgresRuntimeSchema();
  const status = normalizeAgentStatus(body.status || (body.approved ? "approved" : ""));
  if (!status) throw new Error("A valid action status is required.");
  const rows = await postgresRows(
    `update blu_agent_actions
     set status = $3,
         payload_json = payload_json || $4::jsonb,
         updated_at = now(),
         completed_at = case when $3 in ('completed', 'rejected', 'failed') then now() else completed_at end
     where id = $1 and company_id = $2
     returning *`,
    [
      actionId,
      auth.companyId,
      status,
      JSON.stringify({
        result: body.result || null,
        error: body.error || null,
        updatedBy: auth.user.id
      })
    ]
  );
  if (!rows[0]) throw new Error("Blu action not found.");
  const action = mapBluAgentActionRow(rows[0]);
  await recordBluAgentEvent(auth, { eventType: `action.${status}`, action });
  broadcastRealtime(auth.companyId, { type: "blu.action.updated", action });
  return { ok: true, action };
}

async function getBluAgentPolicy(auth) {
  if (!hasPostgresConfig()) {
    return { ok: true, policy: mapBluPolicyRow({}) };
  }
  await ensurePostgresRuntimeSchema();
  return { ok: true, policy: await ensureBluAgentPolicy(auth.companyId) };
}

async function updateBluAgentPolicy(auth, body) {
  if (!["admin", "team_lead"].includes(auth.user.role)) {
    throw new Error("Only admins and team leads can update Blu policy.");
  }
  if (!hasPostgresConfig()) return { ok: true, policy: normalizeBluPolicy(body) };
  await ensurePostgresRuntimeSchema();
  const policy = normalizeBluPolicy(body);
  const rows = await postgresRows(
    `insert into blu_agent_policy (
       company_id, require_approval, allow_internal_task_creation,
       allow_external_sync, allow_background_jobs, allowed_providers, updated_at
     )
     values ($1, $2, $3, $4, $5, $6::jsonb, now())
     on conflict (company_id)
     do update set
       require_approval = excluded.require_approval,
       allow_internal_task_creation = excluded.allow_internal_task_creation,
       allow_external_sync = excluded.allow_external_sync,
       allow_background_jobs = excluded.allow_background_jobs,
       allowed_providers = excluded.allowed_providers,
       updated_at = now()
     returning *`,
    [
      auth.companyId,
      policy.requireApproval,
      policy.allowInternalTaskCreation,
      policy.allowExternalSync,
      policy.allowBackgroundJobs,
      JSON.stringify(policy.allowedProviders)
    ]
  );
  const saved = mapBluPolicyRow(rows[0]);
  await recordAdminAudit(auth, "blu.policy.updated", saved);
  await recordBluAgentEvent(auth, { eventType: "policy.updated", result: saved });
  broadcastRealtime(auth.companyId, { type: "blu.policy.updated", policy: saved });
  return { ok: true, policy: saved };
}

async function persistBluAgentActions(auth, actions, meta = {}) {
  if (!auth || !hasPostgresConfig() || !Array.isArray(actions) || !actions.length) return actions;
  await ensurePostgresRuntimeSchema();
  const saved = [];
  for (const action of actions) {
    saved.push(await insertBluAgentAction(auth, action, meta.source || "blu", meta));
  }
  return saved;
}

async function insertBluAgentAction(auth, action, source = "blu", meta = {}) {
  const rows = await postgresRows(
    `insert into blu_agent_actions (
       id, company_id, user_id, conversation_id, action_type, title, assignee,
       priority, due_at, status, source, reason, payload_json, created_at, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12::jsonb, now(), now())
     returning *`,
    [
      action.id || crypto.randomUUID(),
      auth.companyId,
      auth.user.id,
      meta.conversationId || null,
      action.type,
      action.title,
      action.assignee || "Me",
      normalizePriority(action.priority),
      normalizeOptionalDate(action.due),
      source,
      action.reason || "",
      JSON.stringify({ ...action, prompt: meta.prompt || "", summary: meta.summary || "" })
    ]
  );
  const saved = mapBluAgentActionRow(rows[0]);
  broadcastRealtime(auth.companyId, { type: "blu.action.created", action: saved });
  return saved;
}

async function ensureBluAgentPolicy(companyId) {
  const rows = await postgresRows("select * from blu_agent_policy where company_id = $1 limit 1", [companyId]);
  if (rows[0]) return mapBluPolicyRow(rows[0]);
  const inserted = await postgresRows(
    `insert into blu_agent_policy (
       company_id, require_approval, allow_internal_task_creation,
       allow_external_sync, allow_background_jobs, allowed_providers, created_at, updated_at
     )
     values ($1, true, true, false, false, $2::jsonb, now(), now())
     returning *`,
    [companyId, JSON.stringify(["google_calendar"])]
  );
  return mapBluPolicyRow(inserted[0]);
}

function normalizeBluPolicy(body) {
  return {
    requireApproval: body.requireApproval !== false,
    allowInternalTaskCreation: body.allowInternalTaskCreation !== false,
    allowExternalSync: body.allowExternalSync === true,
    allowBackgroundJobs: body.allowBackgroundJobs === true,
    allowedProviders: Array.isArray(body.allowedProviders)
      ? body.allowedProviders.map((provider) => String(provider).slice(0, 80)).filter(Boolean)
      : ["google_calendar"]
  };
}

function normalizeAgentStatus(value) {
  const status = String(value || "").toLowerCase();
  return ["pending", "approved", "rejected", "completed", "failed"].includes(status) ? status : "";
}

function mapBluAgentActionRow(row) {
  const payload = row.payload_json || {};
  return {
    id: row.id,
    conversationId: row.conversation_id || (typeof payload.conversationId === "string" ? payload.conversationId : ""),
    type: row.action_type,
    title: row.title,
    assignee: row.assignee || "Me",
    priority: row.priority || "normal",
    due: row.due_at ? new Date(row.due_at).toISOString().slice(0, 10) : "",
    reminderAt: typeof payload.reminderAt === "string" ? payload.reminderAt : "",
    provider: typeof payload.provider === "string" ? payload.provider : "",
    status: row.status || "pending",
    source: row.source || "blu",
    reason: row.reason || "",
    payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || null
  };
}

function mapBluPolicyRow(row) {
  return {
    requireApproval: row.require_approval !== false,
    allowInternalTaskCreation: row.allow_internal_task_creation !== false,
    allowExternalSync: row.allow_external_sync === true,
    allowBackgroundJobs: row.allow_background_jobs === true,
    allowedProviders: row.allowed_providers || []
  };
}

function normalizeSuggestedTasks(text) {
  try {
    const parsed = JSON.parse(stripCodeFence(text));
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    return {
      tasks: tasks.slice(0, 6).map((task) => ({
        title: String(task.title || "").slice(0, 120),
        assignee: String(task.assignee || "Me").slice(0, 80),
        priority: ["low", "normal", "high"].includes(task.priority) ? task.priority : "normal",
        due: typeof task.due === "string" ? task.due : "",
        reason: String(task.reason || "Suggested from chat").slice(0, 160)
      })).filter((task) => task.title)
    };
  } catch {
    return { tasks: [] };
  }
}

function extractTasksWithoutAi(context) {
  const taskVerbs = [
    "send",
    "share",
    "prepare",
    "create",
    "review",
    "update",
    "call",
    "schedule",
    "follow up",
    "finish",
    "check",
    "confirm",
    "assign",
    "remind",
    "complete",
    "envoyer",
    "partager",
    "preparer",
    "préparer",
    "creer",
    "créer",
    "revoir",
    "mettre a jour",
    "mettre à jour",
    "appeler",
    "planifier",
    "suivre",
    "terminer",
    "verifier",
    "vérifier",
    "confirmer",
    "attribuer",
    "rappeler",
    "completer",
    "compléter",
    "enviar",
    "compartir",
    "preparar",
    "crear",
    "revisar",
    "actualizar",
    "llamar",
    "programar",
    "seguir",
    "finalizar",
    "comprobar",
    "confirmar",
    "asignar",
    "recordar",
    "completar",
    "senden",
    "teilen",
    "vorbereiten",
    "erstellen",
    "prufen",
    "prüfen",
    "aktualisieren",
    "anrufen",
    "planen",
    "nachfassen",
    "abschliessen",
    "abschließen",
    "bestatigen",
    "bestätigen",
    "zuweisen",
    "erinnern",
    "completar",
    "mandare",
    "condividere",
    "preparare",
    "creare",
    "rivedere",
    "aggiornare",
    "chiamare",
    "pianificare",
    "seguire",
    "finire",
    "verificare",
    "assegnare",
    "ricordare",
    "fazer",
    "enviar",
    "compartilhar",
    "preparar",
    "criar",
    "revisar",
    "atualizar",
    "ligar",
    "agendar",
    "acompanhar",
    "terminar",
    "verificar",
    "atribuir",
    "lembrar"
  ];
  const taskSignals = [
    "todo",
    "to-do",
    "task",
    "need to",
    "needs to",
    "please",
    "can you",
    "could you",
    "by tomorrow",
    "by today",
    "deadline",
    "due",
    "a faire",
    "à faire",
    "tache",
    "tâche",
    "il faut",
    "besoin de",
    "merci de",
    "avant demain",
    "aujourd'hui",
    "echeance",
    "échéance",
    "pendiente",
    "tarea",
    "hay que",
    "necesito",
    "por favor",
    "antes de mañana",
    "hoy",
    "fecha limite",
    "fecha límite",
    "aufgabe",
    "bitte",
    "heute",
    "morgen",
    "frist",
    "promemoria",
    "devo",
    "per favore",
    "oggi",
    "domani",
    "prazo",
    "hoje",
    "amanha",
    "amanhã"
  ];
  const lines = String(context || "")
    .split(/\r?\n+/)
    .map((line) => line.replace(/^(me|them|blu|user|assistant):\s*/i, "").trim())
    .filter(Boolean);

  const tasks = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hasSignal = taskSignals.some((signal) => lower.includes(signal)) ||
      taskVerbs.some((verb) => lower.startsWith(`${verb} `) || lower.includes(` ${verb} `)) ||
      /(?:^|[\s:])(?:@[\p{L}\p{N}._-]+\s+)?(?:please|svp|por favor|bitte)\b/iu.test(line);
    if (!hasSignal) continue;

    const title = line
      .replace(/^\/todo\s+/i, "")
      .replace(/^(please|can you|could you|we need to|i need to|need to|svp|merci de|il faut|por favor|hay que|necesito|bitte|wir mussen|wir müssen|devo|precisamos)\s+/i, "")
      .replace(/[.!?]+$/g, "")
      .slice(0, 120)
      .trim();
    if (!title || tasks.some((task) => task.title.toLowerCase() === title.toLowerCase())) continue;

    tasks.push({
      title,
      assignee: "Me",
      priority: /(urgent|asap|deadline|échéance|echeance|urgente|dringend|prazo)/i.test(lower) ? "high" : "normal",
      due: inferDueDate(lower),
      reason: "Detected from an action-oriented chat message"
    });
    if (tasks.length >= 6) break;
  }

  return { tasks };
}

function inferDueDate(text) {
  const relativeDue = parseRelativeDueDate(text);
  if (relativeDue) return relativeDue;
  const weekdayDue = inferWeekdayDue(text);
  if (weekdayDue) return weekdayDue;
  const dayOfMonthDue = inferDayOfMonthDue(text);
  if (dayOfMonthDue) return dayOfMonthDue;
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  return inferMonthDayDue(text);
}

function inferWeekdayDue(text) {
  const match = String(text || "").match(/\b(next|this|before|by|on|ce|cet|cette|prochain|prochaine|este|esta|el|la|pr[oó]ximo|pr[oó]xima|n[aä]chsten?|diesen|diese|diesem|questo|questa|prossim[oa]|na|no|em)?\s*(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lunes|martes|mi[eé]rcoles|jueves|viernes|s[áa]bado|domingo|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|luned[ìi]|marted[ìi]|mercoled[ìi]|gioved[ìi]|venerd[ìi]|sabato|domenica|segunda|ter[cç]a|quarta|quinta|sexta|s[áa]bado|domingo)\b/i);
  if (!match) return "";
  const modifier = (match[1] || "").toLowerCase();
  const targetDay = mapWeekdayTokenToIndex(match[2]);
  if (targetDay == null) return "";
  const due = new Date();
  let daysUntil = (targetDay - due.getDay() + 7) % 7;
  if (/\bnext|prochain|prochaine|pr[oó]ximo|pr[oó]xima|n[aä]chsten?|prossim[oa]\b/i.test(modifier)) {
    daysUntil = daysUntil === 0 ? 7 : daysUntil + 7;
  }
  due.setDate(due.getDate() + daysUntil);
  return due.toISOString().slice(0, 10);
}

function inferDayOfMonthDue(text) {
  const match = String(text || "").match(/\b(\d{1,2})\s*(?:st|nd|rd|th)?(?:'s)?\s*(?:eod|end of day|cob|close of business)\b/i);
  if (!match) return "";
  const day = Number(match[1]);
  if (!Number.isInteger(day) || day < 1 || day > 31) return "";

  const now = new Date();
  let due = new Date(now.getFullYear(), now.getMonth(), day);
  if (due.getMonth() !== now.getMonth()) return "";
  if (due < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    due = new Date(now.getFullYear(), now.getMonth() + 1, day);
    if (due.getDate() !== day) return "";
  }
  return due.toISOString().slice(0, 10);
}

function parseRelativeDueDate(text) {
  const source = String(text || "");
  const now = new Date();
  if (/\b(today|aujourd'hui|hoy|heute|oggi|hoje|eod|end of day|cob|close of business|fin de journ[ée]e|fim do dia)\b/i.test(source)) {
    return now.toISOString().slice(0, 10);
  }
  if (/\b(tomorrow|demain|ma[ñn]ana|morgen|domani|amanh[ãa])\b/i.test(source)) {
    now.setDate(now.getDate() + 1);
    return now.toISOString().slice(0, 10);
  }
  if (/\b(next week|semaine prochaine|pr[oó]xima semana|n[aä]chste woche|prossima settimana)\b/i.test(source)) {
    now.setDate(now.getDate() + 7);
    return now.toISOString().slice(0, 10);
  }
  return "";
}

function mapWeekdayTokenToIndex(token) {
  const normalized = String(token || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const map = {
    sun: 0, sunday: 0, dimanche: 0, domingo: 0, sonntag: 0, domenica: 0,
    mon: 1, monday: 1, lundi: 1, lunes: 1, montag: 1, lunedi: 1, segunda: 1,
    tue: 2, tuesday: 2, mardi: 2, martes: 2, dienstag: 2, martedi: 2, terca: 2,
    wed: 3, wednesday: 3, mercredi: 3, miercoles: 3, mittwoch: 3, mercoledi: 3, quarta: 3,
    thu: 4, thursday: 4, jeudi: 4, jueves: 4, donnerstag: 4, giovedi: 4, quinta: 4,
    fri: 5, friday: 5, vendredi: 5, viernes: 5, freitag: 5, venerdi: 5, sexta: 5,
    sat: 6, saturday: 6, samedi: 6, sabado: 6, samstag: 6, sabato: 6
  };
  return map[normalized];
}

function inferMonthDayDue(text) {
  const source = String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const match = source.match(/\b(?:by|due|before|on|para|avant|antes de|entro il|ate|at[eé])?\s*(\d{1,2})\s*(?:st|nd|rd|th|er|o|a)?\s+(jan(?:uary|viero)?|feb(?:ruary|rero|braio|vrier)?|mar(?:ch|zo)?|apr(?:il|ile)?|may|mai|mayo|jun(?:e|io)?|jul(?:y|io)?|aug(?:ust|osto)?|sep(?:t(?:ember)?|tiembre)?|oct(?:ober|ubre)?|nov(?:ember|iembre)?|dec(?:ember|iembre)?|janvier|fevrier|mars|avril|juin|juillet|aout|septembre|octobre|novembre|decembre|enero|abril|agosto|diciembre|gennaio|maggio|giugno|luglio|settembre|ottobre|dicembre)\b/i);
  if (!match) return "";
  const monthIndex = mapMonthTokenToIndex(match[2]);
  if (monthIndex == null) return "";
  const now = new Date();
  let due = new Date(now.getFullYear(), monthIndex, Number(match[1]));
  if (due < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    due = new Date(now.getFullYear() + 1, monthIndex, Number(match[1]));
  }
  return due.toISOString().slice(0, 10);
}

function mapMonthTokenToIndex(token) {
  const normalized = String(token || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const map = {
    jan: 0, january: 0, janvier: 0, enero: 0, gennaio: 0,
    feb: 1, february: 1, fevrier: 1, febrero: 1, febbraio: 1,
    mar: 2, march: 2, mars: 2, marzo: 2,
    apr: 3, april: 3, avril: 3, abril: 3, aprile: 3,
    may: 4, mai: 4, mayo: 4, maggio: 4,
    jun: 5, june: 5, juin: 5, junio: 5, giugno: 5,
    jul: 6, july: 6, juillet: 6, julio: 6, luglio: 6,
    aug: 7, august: 7, aout: 7, agosto: 7,
    sep: 8, sept: 8, september: 8, septembre: 8, septiembre: 8, settembre: 8,
    oct: 9, october: 9, octobre: 9, octubre: 9, ottobre: 9,
    nov: 10, november: 10, novembre: 10, noviembre: 10,
    dec: 11, december: 11, decembre: 11, diciembre: 11, dicembre: 11
  };
  return map[normalized];
}

function normalizeLocale(value) {
  const locale = String(value || "").trim().replace(/_/g, "-");
  if (!locale) return "";
  return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ? locale : "";
}

async function registerPushToken(auth, body) {
  if (!body.token) {
    throw new Error("Missing push token.");
  }

  if (auth && hasPostgresConfig()) {
    await postgresQuery(
      `insert into push_tokens (id, user_id, token, platform, created_at, updated_at)
       values ($1, $2, $3, $4, now(), now())
       on conflict (token)
       do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now()`,
      [
        crypto.randomUUID(),
        auth.user.id,
        String(body.token),
        String(body.platform || "android").slice(0, 40)
      ]
    );
    return { ok: true, registered: true, storage: "postgresql" };
  }

  const store = readStore();
  const tokenRecord = {
    token: String(body.token),
    userId: String(body.userId || "demo-user"),
    platform: String(body.platform || "android"),
    updatedAt: new Date().toISOString()
  };
  store.pushTokens = [
    tokenRecord,
    ...store.pushTokens.filter((item) => item.token !== tokenRecord.token)
  ].slice(0, 1000);
  writeStore(store);
  return { ok: true, registered: true, storage: "json-store" };
}

async function sendTestPush(auth, body) {
  if (auth && hasPostgresConfig() && !body.token) {
    const rows = await postgresRows(
      `select token from push_tokens
       where user_id = $1
       order by updated_at desc
       limit 1`,
      [auth.user.id]
    );
    if (rows[0]?.token) {
      return sendFcmMessage({
        token: rows[0].token,
        title: body.title || "TodoMessenger reminder",
        body: body.body || "This is a Firebase Cloud Messaging test.",
        data: body.data || {}
      });
    }
  }

  const store = readStore();
  const token = body.token ||
    (body.userId ? store.pushTokens.find((item) => item.userId === body.userId)?.token : store.pushTokens[0]?.token);
  if (!token) {
    throw new Error("No push token registered for this user.");
  }

  return sendFcmMessage({
    token,
    title: body.title || "TodoMessenger reminder",
    body: body.body || "This is a Firebase Cloud Messaging test.",
    data: body.data || {}
  });
}

async function scheduleReminder(auth, body) {
  if (!body.id || !body.title || !body.reminderAt) {
    throw new Error("Reminder requires id, title, and reminderAt.");
  }

  const reminderTime = new Date(body.reminderAt).getTime();
  if (!Number.isFinite(reminderTime)) {
    throw new Error("Invalid reminderAt.");
  }

  if (auth && hasPostgresConfig()) {
    const rows = await postgresRows(
      `update tasks
       set reminder_at = $3,
           reminder_sent_at = null,
           updated_at = now()
       where id = $1 and company_id = $2
       returning id, reminder_at`,
      [String(body.id), auth.companyId, new Date(reminderTime).toISOString()]
    );
    if (!rows[0]) {
      throw new Error("Task not found for reminder scheduling.");
    }
    return { ok: true, scheduled: true, reminderAt: rows[0].reminder_at, storage: "postgresql" };
  }

  const store = readStore();
  const reminder = {
    id: String(body.id),
    title: String(body.title).slice(0, 160),
    conversationName: String(body.conversationName || "TodoMessenger").slice(0, 100),
    assignee: String(body.assignee || "Me").slice(0, 80),
    userId: String(body.userId || "demo-user"),
    fallbackUserId: String(body.fallbackUserId || "android-device"),
    reminderAt: new Date(reminderTime).toISOString(),
    createdAt: new Date().toISOString(),
    sentAt: "",
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
    lastError: ""
  };

  store.scheduledReminders = [
    reminder,
    ...store.scheduledReminders.filter((item) => item.id !== reminder.id)
  ].slice(0, 2000);
  writeStore(store);
  return { ok: true, scheduled: true, reminderAt: reminder.reminderAt, storage: "json-store" };
}

async function cancelReminder(auth, body) {
  if (!body.id) {
    throw new Error("Missing reminder id.");
  }

  if (auth && hasPostgresConfig()) {
    const result = await postgresQuery(
      `update tasks
       set reminder_at = null,
           reminder_sent_at = null,
           updated_at = now()
       where id = $1 and company_id = $2`,
      [String(body.id), auth.companyId]
    );
    return { ok: true, cancelled: result.rowCount > 0, storage: "postgresql" };
  }

  const store = readStore();
  const before = store.scheduledReminders.length;
  store.scheduledReminders = store.scheduledReminders.filter((item) => item.id !== String(body.id));
  writeStore(store);
  return { ok: true, cancelled: before !== store.scheduledReminders.length, storage: "json-store" };
}

async function processDueReminders() {
  if (hasPostgresConfig()) {
    await processDuePostgresReminders();
  }

  const store = readStore();
  const now = Date.now();
  const due = store.scheduledReminders.filter((reminder) => (
    !reminder.sentAt &&
    new Date(reminder.reminderAt).getTime() <= now &&
    new Date(reminder.nextAttemptAt || reminder.reminderAt).getTime() <= now
  ));

  if (!due.length) return;

  let changed = false;
  for (const reminder of due) {
    try {
      const token = getPushTokenForReminder(store, reminder);
      if (!token) {
        throw new Error("No push token registered.");
      }
      await sendFcmMessage({
        token,
        title: `Reminder: ${reminder.title}`,
        body: `${reminder.conversationName} - assigned to ${reminder.assignee || "Me"}`,
        data: {
          reminderId: reminder.id,
          type: "task_reminder"
        }
      });
      reminder.sentAt = new Date().toISOString();
      reminder.lastError = "";
      changed = true;
    } catch (error) {
      reminder.attempts = Number(reminder.attempts || 0) + 1;
      reminder.lastError = normalizeError(error);
      reminder.nextAttemptAt = new Date(Date.now() + Math.min(reminder.attempts, 10) * 60000).toISOString();
      changed = true;
    }
  }

  if (changed) {
    store.scheduledReminders = store.scheduledReminders.slice(0, 2000);
    writeStore(store);
  }
}

async function processDuePostgresReminders() {
  const dueTasks = await postgresRows(
    `select
       t.id, t.title, t.assignee_id, t.created_by, t.company_id, t.reminder_at,
       coalesce(c.name, 'TodoMessenger') as conversation_name,
       coalesce(assignee.name, creator.name, 'Me') as assignee_name
     from tasks t
     left join conversations c on c.id = t.conversation_id
     left join users assignee on assignee.id = t.assignee_id
     join users creator on creator.id = t.created_by
     where t.status = 'open'
       and t.reminder_at is not null
       and t.reminder_sent_at is null
       and t.reminder_at <= now()
     order by t.reminder_at asc
     limit 25`
  );

  for (const task of dueTasks) {
    try {
      const token = await getPostgresPushToken(task.assignee_id || task.created_by, task.created_by);
      if (!token) {
        throw new Error("No push token registered.");
      }
      await sendFcmMessage({
        token,
        title: `Reminder: ${task.title}`,
        body: `${task.conversation_name} - assigned to ${task.assignee_name || "Me"}`,
        data: {
          reminderId: task.id,
          taskId: task.id,
          type: "task_reminder"
        }
      });
      await postgresQuery("update tasks set reminder_sent_at = now(), updated_at = now() where id = $1", [task.id]);
    } catch (error) {
      console.warn(`Reminder ${task.id} was not sent: ${normalizeError(error)}`);
    }
  }
}

async function getPostgresPushToken(primaryUserId, fallbackUserId) {
  const rows = await postgresRows(
    `select token
     from push_tokens
     where user_id = $1 or user_id = $2
     order by case when user_id = $1 then 0 else 1 end, updated_at desc
     limit 1`,
    [primaryUserId, fallbackUserId]
  );
  return rows[0]?.token || "";
}

function getPushTokenForReminder(store, reminder) {
  return (
    store.pushTokens.find((item) => item.userId === reminder.userId)?.token ||
    store.pushTokens.find((item) => item.userId === reminder.fallbackUserId)?.token ||
    store.pushTokens[0]?.token ||
    ""
  );
}

async function sendFcmMessage({ token, title, body, data = {} }) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("Missing FIREBASE_PROJECT_ID.");
  }

  const accessToken = await getFirebaseAccessToken();
  return postJson(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)])),
        android: {
          priority: "HIGH",
          notification: {
            channel_id: "task_reminders"
          }
        }
      }
    }),
    {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  );
}

async function getFirebaseAccessToken() {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey);
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const data = await postJson(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }),
    {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  );
  return data.access_token;
}

function base64UrlJson(value) {
  return base64Url(Buffer.from(JSON.stringify(value)));
}

function base64Url(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stripCodeFence(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
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
  const connection = await getConnection("jira", body.companyId);
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
    throw new Error(normalizeError(data.error_description || data.error || data.message || data || `HTTP ${response.status}`));
  }
  return data;
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { method: "GET", headers });
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
    throw new Error(normalizeError(data.error_description || data.error || data.message || data || `HTTP ${response.status}`));
  }
  return data;
}

async function listIntegrations(auth = null) {
  if (auth && hasPostgresConfig()) {
    const rows = await postgresRows(
      "select provider, connected_at from integrations where company_id = $1 order by provider asc",
      [auth.companyId]
    );
    const byProvider = new Map(rows.map((row) => [row.provider, row]));
    return Object.fromEntries(
      Object.keys(PROVIDERS).map((providerId) => [
        providerId,
        {
          configured: Boolean(PROVIDERS[providerId].clientId && PROVIDERS[providerId].clientSecret),
          connected: byProvider.has(providerId),
          connectedAt: byProvider.get(providerId)?.connected_at || null
        }
      ])
    );
  }

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

function emailDeliveryStatus() {
  const provider = getEmailDeliveryProvider() || (isResendConfigured() ? "resend" : isPostmarkConfigured() ? "postmark" : "");
  const from = getEmailFromAddress();
  return {
    provider: provider || "not_configured",
    configured: hasConfiguredEmailDelivery(),
    from: from ? maskEmail(from) : "",
    fromDomain: getEmailAddressDomain(from),
    resend: {
      configured: isResendConfigured()
    },
    postmark: {
      configured: isPostmarkConfigured()
    }
  };
}

function ssoProviderStatus() {
  return Object.fromEntries(
    Object.keys(SSO_PROVIDERS).map((providerId) => [
      providerId,
      {
        configured: isSsoProviderConfigured(providerId)
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

function getSsoProvider(providerId) {
  const provider = SSO_PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown SSO provider: ${providerId}`);
  }
  return provider;
}

function requireProviderConfig(provider) {
  if (!provider.clientId || !provider.clientSecret) {
    throw new Error(`${provider.name} OAuth is missing client ID or secret.`);
  }
}

function requireSsoProviderConfig(provider) {
  if (!provider.clientId || !provider.clientSecret) {
    throw new Error(`${provider.name} Team SSO is missing client ID or secret.`);
  }
}

function isSsoProviderConfigured(providerId) {
  const provider = SSO_PROVIDERS[providerId];
  return Boolean(provider?.clientId && provider?.clientSecret);
}

async function getConnection(providerId, companyId = "") {
  if (hasPostgresConfig()) {
    const params = companyId ? [providerId, companyId] : [providerId];
    const rows = await postgresRows(
      companyId
        ? `select provider, access_token_encrypted, refresh_token_encrypted, connected_at
           from integrations
           where provider = $1 and company_id = $2
           limit 1`
        : `select provider, access_token_encrypted, refresh_token_encrypted, connected_at
           from integrations
           where provider = $1
           order by connected_at desc nulls last
           limit 1`,
      params
    );
    const row = rows[0];
    if (!row?.access_token_encrypted) {
      throw new Error(`${providerId} is not connected yet.`);
    }
    return {
      provider: providerId,
      token: {
        access_token: decryptSecret(row.access_token_encrypted),
        refresh_token: row.refresh_token_encrypted ? decryptSecret(row.refresh_token_encrypted) : ""
      },
      connectedAt: row.connected_at
    };
  }

  const connection = readStore().connections[providerId];
  if (!connection?.token?.access_token) {
    throw new Error(`${providerId} is not connected yet.`);
  }
  return connection;
}

async function saveIntegrationConnection({ companyId, providerId, token, connectedBy }) {
  const accessToken = token.access_token;
  if (!accessToken) {
    throw new Error(`${providerId} OAuth did not return an access token.`);
  }
  await postgresQuery(
    `insert into integrations (
       id, company_id, provider, access_token_encrypted, refresh_token_encrypted,
       connected_by, connected_at, created_at, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, now(), now(), now())
     on conflict (company_id, provider)
     do update set
       access_token_encrypted = excluded.access_token_encrypted,
       refresh_token_encrypted = excluded.refresh_token_encrypted,
       connected_by = excluded.connected_by,
       connected_at = now(),
       updated_at = now()`,
    [
      crypto.randomUUID(),
      companyId,
      providerId,
      encryptSecret(accessToken),
      token.refresh_token ? encryptSecret(token.refresh_token) : null,
      connectedBy || null
    ]
  );
}

function encryptSecret(value) {
  const key = getTokenEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return JSON.stringify({
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    data: encrypted.toString("base64url")
  });
}

function decryptSecret(payload) {
  const parsed = JSON.parse(payload);
  const key = getTokenEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function getTokenEncryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || "";
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOKEN_ENCRYPTION_KEY is required in production.");
    }
    return crypto.createHash("sha256").update("todomessenger-local-token-key").digest();
  }

  const decoded = Buffer.from(raw, "base64url");
  if (decoded.length === 32) return decoded;
  if (/^[a-f0-9]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return crypto.createHash("sha256").update(raw).digest();
}

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    writeStore({
      oauthStates: {},
      connections: {},
      workspaceSsoConfigs: {},
      userIdentities: [],
      pushTokens: [],
      scheduledReminders: [],
      authCodes: {},
      workspaces: {},
      users: {},
      invites: {},
      sessions: {}
    });
  }
}

function readStore() {
  const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  store.oauthStates ||= {};
  store.connections ||= {};
  store.workspaceSsoConfigs ||= {};
  store.userIdentities ||= [];
  store.pushTokens ||= [];
  store.scheduledReminders ||= [];
  store.authCodes ||= {};
  store.workspaces ||= {};
  store.users ||= {};
  store.invites ||= {};
  store.sessions ||= {};
  return store;
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
  res.writeHead(204);
  res.end();
}

function send(res, status, body, contentType) {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function applyResponseSecurity(req, res) {
  addCors(req, res);
  res.setHeader("Vary", appendVaryHeader(res.getHeader("Vary"), "Origin"));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cache-Control", "no-store");
  if (isProduction()) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if ((req.headers.accept || "").includes("text/html")) {
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  }
}

function addCors(req, res) {
  const origin = getRequestOrigin(req);
  if (origin && isAllowedOriginValue(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function getRequestOrigin(req) {
  return String(req.headers.origin || "").trim();
}

function isCorsOriginAllowed(req) {
  const origin = getRequestOrigin(req);
  if (!origin) return true;
  return isAllowedOriginValue(origin);
}

function isAllowedOriginValue(origin) {
  if (!origin) return true;
  if (origin === "null") {
    return !isProduction() || process.env.ALLOW_NULL_ORIGIN === "true";
  }
  return FRONTEND_ORIGINS.has(origin);
}

function appendVaryHeader(existing, value) {
  const items = String(existing || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.includes(value)) items.push(value);
  return items.join(", ");
}

function enforceRateLimit(req, url) {
  const ip = getClientIp(req);
  const bucket = getRateLimitBucket(url.pathname);
  const config = getRateLimitConfig(bucket);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + config.windowMs });
    pruneRateLimitBuckets(now);
    return;
  }
  current.count += 1;
  if (current.count > config.max) {
    const error = new Error("Too many requests. Please slow down and try again.");
    error.statusCode = 429;
    throw error;
  }
}

function pruneRateLimitBuckets(now = Date.now()) {
  rateLimitBuckets.forEach((value, key) => {
    if (!value || value.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  });
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "local";
}

function getRateLimitBucket(pathname) {
  if (/^\/api\/auth\/email\//.test(pathname)) return "auth";
  if (/^\/api\/ai\//.test(pathname)) return "ai";
  return "default";
}

function getRateLimitConfig(bucket) {
  if (bucket === "auth") {
    return { windowMs: AUTH_RATE_LIMIT_WINDOW_MS, max: AUTH_RATE_LIMIT_MAX_REQUESTS };
  }
  if (bucket === "ai") {
    return { windowMs: AI_RATE_LIMIT_WINDOW_MS, max: AI_RATE_LIMIT_MAX_REQUESTS };
  }
  return { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX_REQUESTS };
}

function getAppEnvironment() {
  return String(
    process.env.APP_ENV ||
    process.env.DEPLOY_ENV ||
    process.env.ENVIRONMENT ||
    process.env.NODE_ENV ||
    ""
  ).trim().toLowerCase();
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isStagingEnvironment() {
  return getAppEnvironment() === "staging";
}

function isDevAuthCodeEnabled() {
  if (process.env.ALLOW_DEV_AUTH_CODE === "true" && !isProduction()) {
    return true;
  }
  return isStagingEnvironment() && process.env.ALLOW_STAGING_DEV_AUTH_CODE === "true";
}

function parseAllowedOrigins(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function normalizeError(error) {
  if (!error) return "Server error";
  if (typeof error === "string") return error;
  if (typeof error.detail === "string") return error.detail;
  if (typeof error.code === "string" && typeof error.routine === "string") {
    return `${error.code}: ${error.routine}`;
  }
  if (typeof error.message === "string") return error.message;
  if (error.message) return normalizeError(error.message);
  if (typeof error.error === "string") return error.error;
  if (error.error) return normalizeError(error.error);
  try {
    return JSON.stringify(error);
  } catch {
    return "Server error";
  }
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function extractEmailAddress(value) {
  const text = String(value || "").trim();
  const bracketMatch = text.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/);
  if (bracketMatch) return bracketMatch[1].toLowerCase();
  const plainMatch = text.match(/([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)/);
  return plainMatch ? plainMatch[1].toLowerCase() : "";
}

function getEmailAddressDomain(value) {
  const email = extractEmailAddress(value);
  return email.includes("@") ? email.split("@").pop() : "";
}

function maskEmail(value) {
  const email = extractEmailAddress(value);
  if (!email) return "";
  const [local, domain] = email.split("@");
  const safeLocal = local.length <= 2 ? `${local.slice(0, 1)}*` : `${local.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
}

function normalizeDomain(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function sanitizeFrontendRedirect(value) {
  const fallback = `${String(FRONTEND_ORIGIN || "https://todomessenger.example").replace(/\/$/, "")}/app.html`;
  if (!value) return fallback;
  try {
    const target = new URL(value);
    if (target.protocol === "file:") {
      return isProduction() ? fallback : target.toString();
    }
    const allowedOrigin = new URL(FRONTEND_ORIGIN).origin;
    if (target.origin === allowedOrigin || FRONTEND_ORIGINS.has(target.origin)) {
      return target.toString();
    }
  } catch {}
  return fallback;
}

function buildSsoRedirectUrl(base, { token = "", provider = "", error = "" } = {}) {
  const redirectTarget = sanitizeFrontendRedirect(base);
  const params = new URLSearchParams();
  if (token) params.set("sso_token", token);
  if (provider) params.set("sso_provider", provider);
  if (error) params.set("sso_error", error);
  return `${redirectTarget.replace(/#.*$/, "")}#${params.toString()}`;
}

function parseJwtClaims(token) {
  try {
    const [, payload = ""] = String(token || "").split(".");
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = Buffer.from(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "="), "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

function normalizeRole(value) {
  const role = String(value || "").toLowerCase();
  if (role === "super_admin") return "superadmin";
  return ["superadmin", "admin", "manager", "team_lead", "employee"].includes(role) ? role : "employee";
}

function getGrantableRolesForRole(role) {
  switch (normalizeRole(role)) {
    case "superadmin":
      return ["employee", "manager", "team_lead", "admin"];
    case "admin":
      return ["employee", "manager", "team_lead"];
    case "manager":
    case "team_lead":
      return ["employee"];
    default:
      return [];
  }
}

function getProvisionedRole({ requestedRole = "", existingRole = "", existingUsersCount = 0 } = {}) {
  const hasRequestedRole = String(requestedRole || "").trim().length > 0;
  const hasExistingRole = String(existingRole || "").trim().length > 0;
  const normalizedRequestedRole = hasRequestedRole ? normalizeRole(requestedRole) : "";
  const normalizedExistingRole = hasExistingRole ? normalizeRole(existingRole) : "";
  if (normalizedRequestedRole) {
    if (["admin", "manager", "team_lead", "employee"].includes(normalizedRequestedRole)) {
      return normalizedRequestedRole;
    }
  }
  if (normalizedExistingRole) {
    return normalizedExistingRole;
  }
  if (Number(existingUsersCount || 0) === 0) {
    return "superadmin";
  }
  return "employee";
}

function assertRoleGrantAllowed(actorRole, targetRole) {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTargetRole = normalizeRole(targetRole);
  const grantableRoles = getGrantableRolesForRole(normalizedActorRole);
  if (!grantableRoles.length) {
    throw new Error("Only workspace leadership can invite employees.");
  }
  if (!grantableRoles.includes(normalizedTargetRole)) {
    if (normalizedActorRole === "superadmin") {
      throw new Error("That access level cannot be granted from this flow.");
    }
    throw new Error("You do not have permission to grant that access level.");
  }
}

function createAuthCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getEmailDeliveryProvider() {
  return String(process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
}

function getEmailFromAddress() {
  return String(process.env.EMAIL_FROM || process.env.AUTH_EMAIL_FROM || "").trim();
}

function getEmailReplyToAddress() {
  return String(process.env.EMAIL_REPLY_TO || "").trim();
}

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && getEmailFromAddress());
}

function isPostmarkConfigured() {
  return Boolean(process.env.POSTMARK_SERVER_TOKEN && getEmailFromAddress());
}

function hasConfiguredEmailDelivery() {
  const provider = getEmailDeliveryProvider();
  if (provider === "resend") return isResendConfigured();
  if (provider === "postmark") return isPostmarkConfigured();
  return isResendConfigured() || isPostmarkConfigured();
}

function assertEmailDeliveryConfigured() {
  if (hasConfiguredEmailDelivery()) return;
  throw new Error(
    "Email delivery is not configured. Set EMAIL_PROVIDER plus provider credentials, for example RESEND_API_KEY and EMAIL_FROM."
  );
}

async function sendVerificationCodeEmail({ email, code }) {
  const provider = getEmailDeliveryProvider() || (isResendConfigured() ? "resend" : isPostmarkConfigured() ? "postmark" : "");
  const appName = process.env.APP_NAME || "TodoMessenger";
  const from = getEmailFromAddress();
  const replyTo = getEmailReplyToAddress();
  const subject = `${appName} verification code`;
  const intro = `Your ${appName} verification code is:`;
  const expiresMinutes = Math.round(AUTH_CODE_TTL_MS / 60000);
  const text = `${intro}\n\n${code}\n\nThis code expires in ${expiresMinutes} minutes.`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #101820;">
      <h1 style="font-size: 22px; margin-bottom: 12px;">${escapeHtml(appName)} verification code</h1>
      <p style="font-size: 16px; line-height: 1.5;">Your verification code is:</p>
      <div style="margin: 20px 0; padding: 16px 20px; background: #f3f7fb; border: 1px solid #d9e3ec; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 6px; text-align: center;">
        ${escapeHtml(code)}
      </div>
      <p style="font-size: 14px; line-height: 1.5; color: #667789;">This code expires in ${expiresMinutes} minutes.</p>
    </div>
  `.trim();

  if (provider === "resend") {
    await sendEmailWithResend({ to: email, from, replyTo, subject, text, html });
    console.log(`Email verification code sent via Resend to ${maskEmail(email)} from ${maskEmail(from)}.`);
    return;
  }
  if (provider === "postmark") {
    await sendEmailWithPostmark({ to: email, from, replyTo, subject, text, html });
    console.log(`Email verification code sent via Postmark to ${maskEmail(email)} from ${maskEmail(from)}.`);
    return;
  }

  throw new Error("No supported email provider is configured. Use EMAIL_PROVIDER=resend or EMAIL_PROVIDER=postmark.");
}

async function sendEmailWithResend({ to, from, replyTo, subject, text, html }) {
  await postJson(
    "https://api.resend.com/emails",
    JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo || undefined,
      subject,
      text,
      html
    }),
    {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    }
  );
}

async function sendEmailWithPostmark({ to, from, replyTo, subject, text, html }) {
  await postJson(
    "https://api.postmarkapp.com/email",
    JSON.stringify({
      From: from,
      To: to,
      ReplyTo: replyTo || undefined,
      Subject: subject,
      TextBody: text,
      HtmlBody: html,
      MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound"
    }),
    {
      "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json"
    }
  );
}

function isValidAuthCode(authCode, code, mode) {
  if (isDevAuthCodeEnabled() && code === DEV_AUTH_CODE) {
    return true;
  }
  if (!authCode) return false;
  const codeHash = mode === "postgres" ? authCode.code_hash : authCode.codeHash;
  const expiresAt = mode === "postgres" ? authCode.expires_at : authCode.expiresAt;
  return codeHash === hashSecret(code) && new Date(expiresAt).getTime() >= Date.now();
}

function createInviteToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function createInviteUrl(token) {
  const base = FRONTEND_ORIGIN || "https://todomessenger.example";
  return `${base.replace(/\/$/, "")}?invite=${encodeURIComponent(token)}`;
}

function getNameFromEmail(email) {
  return String(email || "User")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function hashSecret(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createWorkspaceRecord({ name, domain }) {
  return {
    id: crypto.randomUUID(),
    name,
    domain,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function createSessionRecord(userId) {
  return {
    token: crypto.randomBytes(32).toString("hex"),
    userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };
}

async function createPersistedSessionForUser(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  await postgresQuery(
    "insert into sessions (id, user_id, token_hash, expires_at, created_at) values ($1, $2, $3, now() + interval '30 days', now())",
    [crypto.randomUUID(), userId, hashSecret(token)]
  );
  return { token };
}

function normalizeDbUser(user) {
  return {
    id: user.id,
    companyId: user.company_id || user.companyId,
    email: user.email,
    name: user.name,
    about: user.about || "Available",
    role: user.role,
    status: user.status
  };
}

function hasPostgresConfig() {
  return Boolean(process.env.DATABASE_URL || (process.env.POSTGRES_HOST && process.env.POSTGRES_DATABASE));
}

async function databaseStatus() {
  const status = {
    engine: hasPostgresConfig() ? "postgresql" : "json-store",
    configured: hasPostgresConfig()
  };
  if (!hasPostgresConfig()) return status;

  try {
    const rows = await postgresRows(
      `select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'auth_codes'
      ) as has_auth_codes`
    );
    status.connected = true;
    status.schemaReady = Boolean(rows[0]?.has_auth_codes);
  } catch (error) {
    status.connected = false;
    status.schemaReady = false;
    status.error = normalizeError(error);
  }
  return status;
}

async function ensurePostgresRuntimeSchema() {
  if (!hasPostgresConfig() || postgresRuntimeSchemaReady) return;
  await postgresQuery(`
    create table if not exists workspace_sso_configs (
      company_id uuid primary key references companies(id) on delete cascade,
      require_sso boolean not null default false,
      allow_email_fallback boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      updated_by uuid null references users(id) on delete set null
    )
  `);
  await postgresQuery(`
    create table if not exists workspace_sso_providers (
      company_id uuid not null references companies(id) on delete cascade,
      provider varchar(80) not null,
      enabled boolean not null default false,
      domain_hint varchar(160) null,
      tenant_hint varchar(160) null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (company_id, provider)
    )
  `);
  await postgresQuery(`
    create table if not exists user_identities (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      company_id uuid not null references companies(id) on delete cascade,
      provider varchar(80) not null,
      provider_user_id varchar(255) not null,
      email varchar(255) null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (company_id, provider, provider_user_id),
      unique (user_id, provider)
    )
  `);
  await postgresQuery("create index if not exists user_identities_company_provider_idx on user_identities(company_id, provider)");
  await postgresQuery("alter table users add column if not exists about varchar(240) not null default 'Available'");
  await postgresQuery("alter table messages add column if not exists reply_to_json jsonb null");
  await postgresQuery(`
    create table if not exists e2ee_devices (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      device_id varchar(120) not null,
      device_label varchar(160) not null default 'Device',
      identity_key jsonb not null,
      signed_prekey_id varchar(120) not null,
      signed_prekey jsonb not null,
      signed_prekey_signature text not null,
      registration_id varchar(120) null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      revoked_at timestamptz null,
      unique (user_id, device_id)
    )
  `);
  await postgresQuery("create index if not exists e2ee_devices_user_active_idx on e2ee_devices(user_id, revoked_at)");
  await postgresQuery(`
    create table if not exists e2ee_one_time_prekeys (
      user_id uuid not null references users(id) on delete cascade,
      device_id varchar(120) not null,
      prekey_id varchar(120) not null,
      prekey jsonb not null,
      created_at timestamptz not null default now(),
      claimed_at timestamptz null,
      primary key (user_id, device_id, prekey_id)
    )
  `);
  await postgresQuery("create index if not exists e2ee_one_time_prekeys_claim_idx on e2ee_one_time_prekeys(user_id, device_id, claimed_at)");
  await postgresQuery(`
    create table if not exists e2ee_conversation_key_envelopes (
      conversation_id uuid not null references conversations(id) on delete cascade,
      recipient_user_id uuid not null references users(id) on delete cascade,
      recipient_device_id varchar(120) not null,
      sender_user_id uuid not null references users(id) on delete cascade,
      envelope_version integer not null default 1,
      algorithm varchar(80) not null default 'x3dh-aes-gcm',
      encrypted_key text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (conversation_id, recipient_user_id, recipient_device_id)
    )
  `);
  await postgresQuery("create index if not exists e2ee_key_envelopes_recipient_idx on e2ee_conversation_key_envelopes(recipient_user_id, recipient_device_id)");
  await postgresQuery(`
    create table if not exists blu_agent_events (
      id uuid primary key default gen_random_uuid(),
      company_id uuid null references companies(id) on delete cascade,
      user_id uuid null references users(id) on delete set null,
      event_type varchar(80) not null,
      payload_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await postgresQuery("create index if not exists blu_agent_events_company_created_idx on blu_agent_events(company_id, created_at desc)");
  await postgresQuery(`
    create table if not exists blu_agent_policy (
      company_id uuid primary key references companies(id) on delete cascade,
      require_approval boolean not null default true,
      allow_internal_task_creation boolean not null default true,
      allow_external_sync boolean not null default false,
      allow_background_jobs boolean not null default false,
      allowed_providers jsonb not null default '["google_calendar"]'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await postgresQuery(`
    create table if not exists blu_agent_actions (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      user_id uuid null references users(id) on delete set null,
      conversation_id uuid null references conversations(id) on delete set null,
      action_type varchar(80) not null,
      title varchar(220) not null,
      assignee varchar(255) not null default 'Me',
      priority task_priority not null default 'normal',
      due_at timestamptz null,
      status varchar(40) not null default 'pending',
      source varchar(80) not null default 'blu',
      reason text null,
      payload_json jsonb not null default '{}'::jsonb,
      completed_at timestamptz null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await postgresQuery("create index if not exists blu_agent_actions_company_status_idx on blu_agent_actions(company_id, status, created_at desc)");
  await postgresQuery(`
    create table if not exists admin_audit_events (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references companies(id) on delete cascade,
      actor_user_id uuid null references users(id) on delete set null,
      action_type varchar(120) not null,
      target_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await postgresQuery("create index if not exists admin_audit_events_company_created_idx on admin_audit_events(company_id, created_at desc)");
  postgresRuntimeSchemaReady = true;
}

async function getPostgresPool() {
  if (postgresPool) return postgresPool;
  let pg;
  try {
    pg = require("pg");
  } catch {
    throw new Error("PostgreSQL mode requires the pg package. Run npm install before starting the backend.");
  }

  postgresPool = process.env.DATABASE_URL
    ? new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.POSTGRES_CONNECTION_LIMIT || 10),
        ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined
      })
    : new pg.Pool({
        host: process.env.POSTGRES_HOST || "localhost",
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: process.env.POSTGRES_USER || "postgres",
        password: process.env.POSTGRES_PASSWORD || "",
        database: process.env.POSTGRES_DATABASE,
        max: Number(process.env.POSTGRES_CONNECTION_LIMIT || 10),
        ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined
      });
  return postgresPool;
}

async function postgresQuery(sql, params = []) {
  const pool = await getPostgresPool();
  return pool.query(sql, params);
}

async function postgresRows(sql, params = []) {
  return (await postgresQuery(sql, params)).rows;
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

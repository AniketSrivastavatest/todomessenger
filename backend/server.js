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
const PUBLIC_BACKEND_URL = process.env.PUBLIC_BACKEND_URL || `http://localhost:${PORT}`;
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const AUTH_CODE_TTL_MS = 15 * 60 * 1000;
const DEV_AUTH_CODE = process.env.DEV_AUTH_CODE || "123456";
let postgresPool;
const realtimeClients = new Map();

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
processDueReminders();
setInterval(processDueReminders, 30000);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, PUBLIC_BACKEND_URL);

    if (req.method === "OPTIONS") {
      sendNoContent(res);
      return;
    }

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
      sendJson(res, 200, { ok: true, database: databaseStatus(), providers: providerStatus() });
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

    if (req.method === "GET" && url.pathname === "/api/me") {
      const auth = await requireAuth(req);
      sendJson(res, 200, { ok: true, user: auth.user, workspace: auth.workspace });
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

    if (req.method === "POST" && url.pathname === "/api/workspaces") {
      const body = await readJson(req);
      sendJson(res, 200, await createWorkspace(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/workspaces/invites") {
      const body = await readJson(req);
      sendJson(res, 200, await createWorkspaceInvite(body));
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

    if (req.method === "POST" && url.pathname === "/api/push/register") {
      const body = await readJson(req);
      sendJson(res, 200, registerPushToken(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/push/send-test") {
      const body = await readJson(req);
      sendJson(res, 200, await sendTestPush(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reminders/schedule") {
      const body = await readJson(req);
      sendJson(res, 200, scheduleReminder(body));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/reminders/cancel") {
      const body = await readJson(req);
      sendJson(res, 200, cancelReminder(body));
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
setupRealtime(server);

async function startEmailAuth(body) {
  const email = normalizeEmail(body.email);
  if (!email) {
    throw new Error("A valid work email is required.");
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

  return {
    ok: true,
    email,
    delivery: "demo",
    demoCode: code,
    message: "Demo mode: use the returned code. In production this is emailed."
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

async function createWorkspaceInvite(body) {
  const email = normalizeEmail(body.email);
  const companyId = String(body.companyId || body.workspaceId || "").trim();
  const role = normalizeRole(body.role || "employee");
  if (!email || !companyId) {
    throw new Error("Invite requires employee email and companyId.");
  }

  if (hasPostgresConfig()) {
    const id = crypto.randomUUID();
    const token = createInviteToken();
    await postgresQuery(
      "insert into invites (id, company_id, email, role, token, expires_at, created_at) values ($1, $2, $3, $4, $5, now() + interval '14 days', now())",
      [id, companyId, email, role, token]
    );
    return { ok: true, invite: { id, companyId, email, role, token } };
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

async function startEmailAuthPostgres(email) {
  const code = createAuthCode();
  await postgresQuery(
    "insert into auth_codes (id, email, code_hash, expires_at, created_at) values ($1, $2, $3, now() + interval '15 minutes', now())",
    [crypto.randomUUID(), email, hashSecret(code)]
  );

  return {
    ok: true,
    email,
    delivery: "email",
    demoCode: process.env.NODE_ENV === "production" ? undefined : code,
    message: process.env.NODE_ENV === "production" ? "Verification code sent by email." : "Local mode: use the returned code."
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
  let company = (await postgresRows("select id, name, domain from companies where domain = $1 limit 1", [domain]))[0];
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
    await postgresQuery(
      "insert into users (id, company_id, email, name, role, status, created_at, updated_at, last_login_at) values ($1, $2, $3, $4, $5, 'active', now(), now(), now())",
      [userId, company.id, email, name || email.split("@")[0], existingUsers.length ? "employee" : "admin"]
    );
    user = { id: userId, company_id: company.id, email, name: name || email.split("@")[0], role: existingUsers.length ? "employee" : "admin", status: "active" };
  } else {
    await postgresQuery("update users set name = $1, last_login_at = now(), updated_at = now() where id = $2", [name || user.name, user.id]);
    user.name = name || user.name;
  }

  await postgresQuery("delete from auth_codes where email = $1", [email]);
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

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

async function getAuthContextByToken(token) {
  if (!hasPostgresConfig()) {
    throw new Error("Authenticated app data requires PostgreSQL. Configure DATABASE_URL or POSTGRES_*.");
  }

  const rows = await postgresRows(
    `select
       u.id, u.company_id, u.email, u.name, u.role, u.status,
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
      domain: row.company_domain
    }
  };
}

async function listConversations(auth) {
  const rows = await postgresRows(
    `select c.id, c.name, c.type, c.created_at, c.updated_at,
       coalesce(
         json_agg(
           json_build_object(
             'id', m.id,
             'senderId', m.sender_id,
             'sender', case when m.sender_id = $2 then 'me' else 'them' end,
             'preview', coalesce(m.plain_preview, ''),
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

  return {
    ok: true,
    conversations: rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.type === "direct" ? "private chat" : "workspace chat",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
  const rows = await postgresRows(
    `select id, name, type
     from conversations
     where id = $1
       and company_id = $2
       and (
         type in ('group', 'system')
         or exists (
           select 1 from conversation_members cm
           where cm.conversation_id = conversations.id and cm.user_id = $3
         )
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
    `select m.id, m.sender_id, m.encrypted_body, m.plain_preview, m.attachment_json, m.created_at,
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
  const preview = String(body.preview || text).slice(0, 280);
  const encryptedBody = String(body.encryptedBody || body.encrypted || text).slice(0, 20000);
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const messageId = crypto.randomUUID();

  const rows = await postgresRows(
    `insert into messages (id, conversation_id, sender_id, encrypted_body, plain_preview, attachment_json, created_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, now())
     returning id, sender_id, encrypted_body, plain_preview, attachment_json, created_at`,
    [messageId, conversationId, auth.user.id, encryptedBody, preview, JSON.stringify(attachments)]
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
    preview: row.plain_preview || "",
    encrypted: row.encrypted_body || "",
    attachments: row.attachment_json || [],
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
      const token = url.searchParams.get("token") || "";
      const auth = await getAuthContextByToken(token);
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

async function askBlu(body) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      answer: createBluFallbackAnswer(body.prompt || "", body.context || ""),
      mode: "local-fallback"
    };
  }

  const prompt = body.prompt || "Help with this TodoMessenger conversation.";
  const context = body.context ? `Recent encrypted-chat context, decrypted on the user's device:\n${body.context}` : "";
  try {
    const data = await postJson(
      "https://api.openai.com/v1/responses",
      JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        instructions:
          "You are Blu, the AI assistant inside TodoMessenger. Answer clearly and concisely. If the user asks for a task, suggest a short actionable task title.",
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

  const data = await postJson(
    "https://api.openai.com/v1/responses",
    JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      instructions:
        "You extract actionable to-do tasks from a chat. Return only JSON with a tasks array. Each task must have title, assignee, priority, due, and reason. priority must be low, normal, or high. due should be an ISO date string or empty string. If the assignee is unclear, use Me. Keep titles short.",
      input: `Conversation: ${body.conversationName || "Current chat"}\n\nRecent chat messages:\n${body.context || ""}\n\nReturn JSON only, shaped like {"tasks":[{"title":"...","assignee":"Me","priority":"normal","due":"","reason":"..."}]}.`,
      max_output_tokens: 800
    }),
    {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    }
  );

  return normalizeSuggestedTasks(extractResponseText(data));
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
    "complete"
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
    "due"
  ];
  const lines = String(context || "")
    .split(/\r?\n+/)
    .map((line) => line.replace(/^(me|them|blu|user|assistant):\s*/i, "").trim())
    .filter(Boolean);

  const tasks = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    const hasSignal = taskSignals.some((signal) => lower.includes(signal)) ||
      taskVerbs.some((verb) => lower.startsWith(`${verb} `) || lower.includes(` ${verb} `));
    if (!hasSignal) continue;

    const title = line
      .replace(/^\/todo\s+/i, "")
      .replace(/^(please|can you|could you|we need to|i need to|need to)\s+/i, "")
      .replace(/[.!?]+$/g, "")
      .slice(0, 120)
      .trim();
    if (!title || tasks.some((task) => task.title.toLowerCase() === title.toLowerCase())) continue;

    tasks.push({
      title,
      assignee: "Me",
      priority: lower.includes("urgent") || lower.includes("asap") || lower.includes("deadline") ? "high" : "normal",
      due: inferDueDate(lower),
      reason: "Detected from an action-oriented chat message"
    });
    if (tasks.length >= 6) break;
  }

  return { tasks };
}

function inferDueDate(text) {
  const now = new Date();
  if (text.includes("today")) return now.toISOString().slice(0, 10);
  if (text.includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }
  const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  return isoMatch ? isoMatch[1] : "";
}

function registerPushToken(body) {
  if (!body.token) {
    throw new Error("Missing push token.");
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
  return { ok: true, registered: true };
}

async function sendTestPush(body) {
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

function scheduleReminder(body) {
  if (!body.id || !body.title || !body.reminderAt) {
    throw new Error("Reminder requires id, title, and reminderAt.");
  }

  const reminderTime = new Date(body.reminderAt).getTime();
  if (!Number.isFinite(reminderTime)) {
    throw new Error("Invalid reminderAt.");
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
  return { ok: true, scheduled: true, reminderAt: reminder.reminderAt };
}

function cancelReminder(body) {
  if (!body.id) {
    throw new Error("Missing reminder id.");
  }

  const store = readStore();
  const before = store.scheduledReminders.length;
  store.scheduledReminders = store.scheduledReminders.filter((item) => item.id !== String(body.id));
  writeStore(store);
  return { ok: true, cancelled: before !== store.scheduledReminders.length };
}

async function processDueReminders() {
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
    throw new Error(normalizeError(data.error_description || data.error || data.message || data || `HTTP ${response.status}`));
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
    writeStore({
      oauthStates: {},
      connections: {},
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
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
}

function normalizeError(error) {
  if (!error) return "Server error";
  if (typeof error === "string") return error;
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

function normalizeDomain(value) {
  return String(value || "").trim().replace(/^@/, "").toLowerCase();
}

function normalizeRole(value) {
  const role = String(value || "").toLowerCase();
  return ["admin", "team_lead", "employee"].includes(role) ? role : "employee";
}

function createAuthCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidAuthCode(authCode, code, mode) {
  if (process.env.NODE_ENV !== "production" && code === DEV_AUTH_CODE) {
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

function hashSecret(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
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

function normalizeDbUser(user) {
  return {
    id: user.id,
    companyId: user.company_id || user.companyId,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status
  };
}

function hasPostgresConfig() {
  return Boolean(process.env.DATABASE_URL || (process.env.POSTGRES_HOST && process.env.POSTGRES_DATABASE));
}

function databaseStatus() {
  return {
    engine: hasPostgresConfig() ? "postgresql" : "json-store",
    configured: hasPostgresConfig()
  };
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

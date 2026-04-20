const todayIso = new Date().toISOString().slice(0, 10);
const maxInlineAttachmentBytes = 2_000_000;

const seedState = {
  activeId: "launch",
  registration: {
    step: "email",
    pendingEmail: "",
    pendingCode: "",
    demoCode: "",
    sessionToken: "",
    user: null
  },
  workspace: {
    id: "acme",
    name: "Acme Operations",
    domain: "acme.com",
    inviteCode: "TM-482913",
    role: "Admin",
    software: [
      { id: "teams", name: "Microsoft Teams", type: "Chat and calls", enabled: true },
      { id: "gmail", name: "Gmail", type: "Email", enabled: true },
      { id: "meet", name: "Google Meet", type: "Meeting transcripts", enabled: true },
      { id: "zoom", name: "Zoom", type: "Meeting transcripts", enabled: true },
      { id: "outlook", name: "Outlook", type: "Email and calendar", enabled: false },
      { id: "slack", name: "Slack", type: "Chat", enabled: false }
    ],
    employees: [
      { id: "emp_maia", name: "Maia Chen", email: "maia@acme.com", role: "Manager", available: true, joinedAt: "2026-04-19T09:00:00.000Z" },
      { id: "emp_nina", name: "Nina Patel", email: "nina@acme.com", role: "Employee", available: true, joinedAt: "2026-04-19T09:10:00.000Z" }
    ]
  },
  connectedApps: [
    { id: "asana", name: "Asana", endpoint: "/oauth/asana/start", connected: false, tools: ["create_task", "sync_due_date"], provider: "asana" },
    { id: "jira", name: "Jira", endpoint: "/oauth/jira/start", connected: false, tools: ["create_issue", "sync_status"], provider: "jira" },
    { id: "calendar", name: "Calendar", endpoint: "todomessenger://mcp/calendar", connected: false, tools: ["create_reminder", "read_events"] },
    { id: "notes", name: "Notes", endpoint: "todomessenger://mcp/notes", connected: false, tools: ["create_note", "search_notes"] },
    { id: "files", name: "Files", endpoint: "todomessenger://mcp/files", connected: false, tools: ["attach_file", "save_export"] }
  ],
  conversations: [
    {
      id: "launch",
      name: "Launch Squad",
      status: "8 members, Maia typing",
      avatar: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=160&q=80",
      messages: [
        { id: "m1", sender: "them", text: "Can we lock the beta checklist before lunch?", time: "09:12" },
        { id: "m2", sender: "me", text: "Yes. I added the onboarding fixes as tasks so we can track them here.", time: "09:14" },
        { id: "m3", sender: "them", text: "Perfect. Please tag payment copy as high priority.", time: "09:15" }
      ]
    },
    {
      id: "nina",
      name: "Nina Patel",
      status: "online",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
      messages: [
        { id: "m4", sender: "them", text: "I sent the venue shortlist.", time: "08:42" },
        { id: "m5", sender: "me", text: "Got it. I will compare prices and add a decision task.", time: "08:45" }
      ]
    },
    {
      id: "support",
      name: "Customer Support",
      status: "away",
      avatar: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=160&q=80",
      messages: [
        { id: "m6", sender: "them", text: "Refund macro needs one more approval.", time: "Yesterday" },
        { id: "m7", sender: "me", text: "I will make that visible in the shared tasks.", time: "Yesterday" }
      ]
    }
  ],
  tasks: [
    { id: "t1", conversationId: "launch", title: "Review payment confirmation copy", due: todayIso, priority: "high", assignee: "Me", done: false },
    { id: "t2", conversationId: "launch", title: "Publish beta onboarding checklist", due: todayIso, priority: "normal", assignee: "Launch Squad", done: false },
    { id: "t3", conversationId: "nina", title: "Compare venue shortlist prices", due: "", priority: "normal", assignee: "Nina Patel", done: false },
    { id: "t4", conversationId: "support", title: "Approve refund macro update", due: "", priority: "low", assignee: "Customer Support", done: true }
  ]
};

let state = loadState();
let currentView = "home";
let encryptionKey;
let activeReminderTaskId = "";
let nativePushRegistration;
let activeFallbackTaskId = "";
let taskToastTimer;
let realtimeSocket;
let realtimeReconnectTimer;
let backendSyncInFlight = false;

const els = {
  activeAvatar: document.querySelector("#activeAvatar"),
  activeName: document.querySelector("#activeName"),
  activeStatus: document.querySelector("#activeStatus"),
  assignmentFallbackDialog: document.querySelector("#assignmentFallbackDialog"),
  assignmentFallbackMessage: document.querySelector("#assignmentFallbackMessage"),
  assignmentFallbackMeta: document.querySelector("#assignmentFallbackMeta"),
  assignmentFallbackStatus: document.querySelector("#assignmentFallbackStatus"),
  assignmentFallbackTitle: document.querySelector("#assignmentFallbackTitle"),
  attachButton: document.querySelector("#attachButton"),
  attachmentInput: document.querySelector("#attachmentInput"),
  backToChatsButton: document.querySelector("#backToChatsButton"),
  cancelNewChat: document.querySelector("#cancelNewChat"),
  cancelQuickTask: document.querySelector("#cancelQuickTask"),
  chatSearch: document.querySelector("#chatSearch"),
  chatsTabButton: document.querySelector("#chatsTabButton"),
  chatsTabView: document.querySelector("#chatsTabView"),
  closeInviteDialog: document.querySelector("#closeInviteDialog"),
  closeAssignmentFallbackDialog: document.querySelector("#closeAssignmentFallbackDialog"),
  closeMcpDialog: document.querySelector("#closeMcpDialog"),
  closeQuickTaskDialog: document.querySelector("#closeQuickTaskDialog"),
  contactSyncDialog: document.querySelector("#contactSyncDialog"),
  connectedApps: document.querySelector("#connectedApps"),
  copyAssignmentFallbackButton: document.querySelector("#copyAssignmentFallbackButton"),
  copyInviteButton: document.querySelector("#copyInviteButton"),
  customMcpForm: document.querySelector("#customMcpForm"),
  emailAssignmentFallbackLink: document.querySelector("#emailAssignmentFallbackLink"),
  emailForm: document.querySelector("#emailForm"),
  emailShareLink: document.querySelector("#emailShareLink"),
  employeeCount: document.querySelector("#employeeCount"),
  employeeJoinCode: document.querySelector("#employeeJoinCode"),
  employeeJoinEmail: document.querySelector("#employeeJoinEmail"),
  employeeJoinForm: document.querySelector("#employeeJoinForm"),
  employeeJoinName: document.querySelector("#employeeJoinName"),
  employeeList: document.querySelector("#employeeList"),
  employeeOptions: document.querySelector("#employeeOptions"),
  conversationList: document.querySelector("#conversationList"),
  copyWorkspaceInviteButton: document.querySelector("#copyWorkspaceInviteButton"),
  dueTodayCount: document.querySelector("#dueTodayCount"),
  editEmailButton: document.querySelector("#editEmailButton"),
  emailCode: document.querySelector("#emailCode"),
  appShell: document.querySelector("#appShell"),
  instagramShareLink: document.querySelector("#instagramShareLink"),
  importSourceChips: document.querySelector("#importSourceChips"),
  importWorkAppButton: document.querySelector("#importWorkAppButton"),
  inviteButton: document.querySelector("#inviteButton"),
  inviteContactsButton: document.querySelector("#inviteContactsButton"),
  inviteContactsDialog: document.querySelector("#inviteContactsDialog"),
  inviteDialog: document.querySelector("#inviteDialog"),
  inviteLink: document.querySelector("#inviteLink"),
  mcpAppName: document.querySelector("#mcpAppName"),
  mcpButton: document.querySelector("#mcpButton"),
  mcpDialog: document.querySelector("#mcpDialog"),
  mcpEndpoint: document.querySelector("#mcpEndpoint"),
  mcpManifest: document.querySelector("#mcpManifest"),
  messageForm: document.querySelector("#messageForm"),
  messageInput: document.querySelector("#messageInput"),
  messageStream: document.querySelector("#messageStream"),
  moreButton: document.querySelector("#moreButton"),
  moreMenuPanel: document.querySelector("#moreMenuPanel"),
  newChatButton: document.querySelector("#newChatButton"),
  newChatDialog: document.querySelector("#newChatDialog"),
  newChatForm: document.querySelector("#newChatForm"),
  newChatName: document.querySelector("#newChatName"),
  newChatStatus: document.querySelector("#newChatStatus"),
  notificationButton: document.querySelector("#notificationButton"),
  notificationStatus: document.querySelector("#notificationStatus"),
  openTaskCount: document.querySelector("#openTaskCount"),
  profileAbout: document.querySelector("#profileAbout"),
  profileForm: document.querySelector("#profileForm"),
  profileName: document.querySelector("#profileName"),
  quickTaskAssignee: document.querySelector("#quickTaskAssignee"),
  quickTaskDialog: document.querySelector("#quickTaskDialog"),
  quickTaskButton: document.querySelector("#quickTaskButton"),
  quickTaskDue: document.querySelector("#quickTaskDue"),
  quickTaskForm: document.querySelector("#quickTaskForm"),
  quickTaskPriority: document.querySelector("#quickTaskPriority"),
  quickTaskReminderAt: document.querySelector("#quickTaskReminderAt"),
  quickTaskSource: document.querySelector("#quickTaskSource"),
  quickTaskTitle: document.querySelector("#quickTaskTitle"),
  registrationCopy: document.querySelector("#registrationCopy"),
  registrationScreen: document.querySelector("#registrationScreen"),
  registrationTitle: document.querySelector("#registrationTitle"),
  regenerateInviteButton: document.querySelector("#regenerateInviteButton"),
  reminderCount: document.querySelector("#reminderCount"),
  reminderDialog: document.querySelector("#reminderDialog"),
  reminderMeta: document.querySelector("#reminderMeta"),
  reminderTitle: document.querySelector("#reminderTitle"),
  resendEmailCodeButton: document.querySelector("#resendEmailCodeButton"),
  roleViewSelect: document.querySelector("#roleViewSelect"),
  shareImportDialog: document.querySelector("#shareImportDialog"),
  shareImportText: document.querySelector("#shareImportText"),
  shareAssignmentFallbackButton: document.querySelector("#shareAssignmentFallbackButton"),
  shareStatus: document.querySelector("#shareStatus"),
  shareToTaskButton: document.querySelector("#shareToTaskButton"),
  showPinnedTasks: document.querySelector("#showPinnedTasks"),
  skipContactSyncButton: document.querySelector("#skipContactSyncButton"),
  skipInviteContactsButton: document.querySelector("#skipInviteContactsButton"),
  smsShareLink: document.querySelector("#smsShareLink"),
  softwareList: document.querySelector("#softwareList"),
  syncContactsButton: document.querySelector("#syncContactsButton"),
  taskAssignee: document.querySelector("#taskAssignee"),
  taskDue: document.querySelector("#taskDue"),
  taskFilter: document.querySelector("#taskFilter"),
  taskForm: document.querySelector("#taskForm"),
  taskList: document.querySelector("#taskList"),
  taskPriority: document.querySelector("#taskPriority"),
  taskReminderAt: document.querySelector("#taskReminderAt"),
  taskSuggestionList: document.querySelector("#taskSuggestionList"),
  taskTitle: document.querySelector("#taskTitle"),
  taskToast: document.querySelector("#taskToast"),
  tasksTabButton: document.querySelector("#tasksTabButton"),
  tasksTabView: document.querySelector("#tasksTabView"),
  useDevCodeButton: document.querySelector("#useDevCodeButton"),
  videoCallButton: document.querySelector("#videoCallButton"),
  voiceCallButton: document.querySelector("#voiceCallButton"),
  verifyForm: document.querySelector("#verifyForm"),
  verifyTarget: document.querySelector("#verifyTarget"),
  closeShareImportDialog: document.querySelector("#closeShareImportDialog"),
  dismissReminderButton: document.querySelector("#dismissReminderButton"),
  nativeShareButton: document.querySelector("#nativeShareButton"),
  openReminderChatButton: document.querySelector("#openReminderChatButton"),
  saveShareToChatButton: document.querySelector("#saveShareToChatButton"),
  shareWorkspaceInviteButton: document.querySelector("#shareWorkspaceInviteButton"),
  suggestTasksButton: document.querySelector("#suggestTasksButton"),
  whatsappAssignmentFallbackLink: document.querySelector("#whatsappAssignmentFallbackLink"),
  whatsappShareLink: document.querySelector("#whatsappShareLink"),
  workEmail: document.querySelector("#workEmail"),
  workspaceCompanyName: document.querySelector("#workspaceCompanyName"),
  workspaceDomain: document.querySelector("#workspaceDomain"),
  workspaceForm: document.querySelector("#workspaceForm"),
  workspaceInviteEmail: document.querySelector("#workspaceInviteEmail"),
  workspaceInviteLink: document.querySelector("#workspaceInviteLink"),
  workspaceInviteRole: document.querySelector("#workspaceInviteRole"),
  workspaceInviteStatus: document.querySelector("#workspaceInviteStatus"),
  workspaceName: document.querySelector("#workspaceName"),
  workspaceRole: document.querySelector("#workspaceRole"),
  workspaceTabButton: document.querySelector("#workspaceTabButton"),
  workspaceTabView: document.querySelector("#workspaceTabView")
};

normalizeRegistrationState();
normalizeWorkspace();
normalizeConversations();
normalizeConnectedApps();
normalizeTasks();
bootstrap();

els.emailForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = els.workEmail.value.trim().toLowerCase();
  if (!isValidEmail(email)) {
    els.workEmail.setCustomValidity("Enter a valid work email.");
    els.workEmail.reportValidity();
    return;
  }

  els.workEmail.setCustomValidity("");
  await startEmailRegistration(email);
});

els.verifyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = els.emailCode.value.trim();
  if (!/^\d{6}$/.test(code)) {
    els.emailCode.setCustomValidity("Enter the 6-digit email code.");
    els.emailCode.reportValidity();
    return;
  }

  els.emailCode.setCustomValidity("");
  state.registration.pendingCode = code;
  verifyEmailCode();
});

els.editEmailButton.addEventListener("click", () => {
  state.registration.step = "email";
  state.registration.pendingCode = "";
  state.registration.demoCode = "";
  saveState();
  renderRegistration();
  els.workEmail.focus();
});
els.resendEmailCodeButton.addEventListener("click", async () => {
  if (!state.registration.pendingEmail) {
    state.registration.step = "email";
    renderRegistration();
    els.workEmail.focus();
    return;
  }
  await startEmailRegistration(state.registration.pendingEmail);
});
els.emailCode.addEventListener("input", () => {
  els.emailCode.setCustomValidity("");
});
els.useDevCodeButton.addEventListener("click", () => {
  if (!state.registration.demoCode) return;
  els.emailCode.value = state.registration.demoCode;
  els.emailCode.setCustomValidity("");
  els.emailCode.focus();
});

els.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = els.profileName.value.trim();
  if (!name) return;

  await completeProfile(name, els.profileAbout.value.trim() || "Available");
});

els.chatSearch.addEventListener("input", renderConversations);
els.taskFilter.addEventListener("change", renderTasks);
els.chatsTabButton.addEventListener("click", () => switchTab("chats"));
els.tasksTabButton.addEventListener("click", () => switchTab("tasks"));
els.workspaceTabButton.addEventListener("click", () => switchTab("workspace"));
els.roleViewSelect.addEventListener("change", () => {
  state.workspace.role = els.roleViewSelect.value;
  if (!isAdminView()) {
    switchTab("chats");
  }
  saveState();
  renderRoleUI();
  renderWorkspace();
});
els.suggestTasksButton.addEventListener("click", suggestTasksFromChat);
els.backToChatsButton.addEventListener("click", () => setView("home"));
els.newChatButton.addEventListener("click", () => els.newChatDialog.showModal());
els.cancelNewChat.addEventListener("click", () => els.newChatDialog.close());
els.voiceCallButton.addEventListener("click", () => addSystemMessage("Voice call started"));
els.videoCallButton.addEventListener("click", () => addSystemMessage("Video call started"));
els.moreButton.addEventListener("click", () => {
  els.moreMenuPanel.hidden = !els.moreMenuPanel.hidden;
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".more-menu")) {
    els.moreMenuPanel.hidden = true;
  }
});
window.addEventListener("todomessenger:fcmToken", registerFcmToken);
window.addEventListener("todomessenger:sharedContent", handleSharedContent);
els.quickTaskButton.addEventListener("click", () => openQuickTaskDialog(els.messageInput.value.trim(), "current chat"));
els.cancelQuickTask.addEventListener("click", () => els.quickTaskDialog.close());
els.closeQuickTaskDialog.addEventListener("click", () => els.quickTaskDialog.close());
els.quickTaskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = els.quickTaskTitle.value.trim();
  if (!title) return;

  await createTaskWithFeedback({
    title,
    due: els.quickTaskDue.value,
    priority: els.quickTaskPriority.value,
    assignee: els.quickTaskAssignee.value,
    reminderAt: els.quickTaskReminderAt.value,
    source: "chat"
  });
  els.quickTaskForm.reset();
  els.quickTaskDialog.close();
});
els.notificationButton.addEventListener("click", requestNotificationPermission);
els.dismissReminderButton.addEventListener("click", () => els.reminderDialog.close());
els.closeShareImportDialog.addEventListener("click", () => els.shareImportDialog.close());
els.saveShareToChatButton.addEventListener("click", saveSharedContentToChat);
els.shareToTaskButton.addEventListener("click", addSharedContentAsTask);
els.openReminderChatButton.addEventListener("click", () => {
  const task = state.tasks.find((item) => item.id === activeReminderTaskId);
  if (task) {
    state.activeId = task.conversationId;
    currentView = "chat";
    saveState();
    render();
  }
  els.reminderDialog.close();
});
els.closeAssignmentFallbackDialog.addEventListener("click", () => els.assignmentFallbackDialog.close());
els.copyAssignmentFallbackButton.addEventListener("click", copyAssignmentFallbackMessage);
els.shareAssignmentFallbackButton.addEventListener("click", shareAssignmentFallbackMessage);

els.inviteButton.addEventListener("click", openInviteDialog);
els.closeInviteDialog.addEventListener("click", () => els.inviteDialog.close());
els.copyInviteButton.addEventListener("click", copyInviteLink);
els.nativeShareButton.addEventListener("click", shareInvite);
els.syncContactsButton.addEventListener("click", completeContactSyncPrompt);
els.skipContactSyncButton.addEventListener("click", completeContactSyncPrompt);
els.inviteContactsButton.addEventListener("click", () => {
  completeInviteContactsPrompt();
  openInviteDialog();
});
els.skipInviteContactsButton.addEventListener("click", completeInviteContactsPrompt);

els.mcpButton.addEventListener("click", () => {
  els.moreMenuPanel.hidden = true;
  renderConnectedApps();
  els.mcpDialog.showModal();
});
els.closeMcpDialog.addEventListener("click", () => els.mcpDialog.close());
els.customMcpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.mcpAppName.value.trim();
  const endpoint = els.mcpEndpoint.value.trim();
  if (!name || !endpoint) return;

  state.connectedApps.push({
    id: createId("mcp"),
    name,
    endpoint,
    connected: true,
    tools: ["read_context", "create_task"]
  });
  els.customMcpForm.reset();
  saveState();
  renderConnectedApps();
});

els.showPinnedTasks.addEventListener("click", () => {
  els.taskFilter.value = "open";
  els.moreMenuPanel.hidden = true;
  setView("home");
  switchTab("tasks");
  renderTasks();
});
els.importWorkAppButton.addEventListener("click", () => {
  els.moreMenuPanel.hidden = true;
  openShareImportDialog("", "manual");
});

els.workspaceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.workspace.name = els.workspaceCompanyName.value.trim() || "Company Workspace";
  state.workspace.domain = normalizeDomain(els.workspaceDomain.value);
  saveState();
  await syncWorkspaceToBackend();
  renderWorkspace();
});

els.regenerateInviteButton.addEventListener("click", async () => {
  await createEmployeeInvite();
});

els.copyWorkspaceInviteButton.addEventListener("click", copyWorkspaceInvite);
els.shareWorkspaceInviteButton.addEventListener("click", shareWorkspaceInvite);
els.employeeJoinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  joinWorkspaceFromInvite();
});

els.attachButton.addEventListener("click", () => els.attachmentInput.click());
els.attachmentInput.addEventListener("change", async () => {
  const files = Array.from(els.attachmentInput.files || []);
  els.attachmentInput.value = "";
  if (!files.length) return;
  await addAttachmentMessage(files);
});

els.messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text) return;

  if (text.toLowerCase().startsWith("/todo ")) {
    await createTaskWithFeedback({
      title: text.slice(6).trim(),
      due: "",
      priority: "normal",
      assignee: "Me",
      reminderAt: "",
      source: "composer"
    });
  } else if (/^@(blu|chatgpt)\b/i.test(text)) {
    await addMessage(text);
    await answerWithBlu(text.replace(/^@(blu|chatgpt)\b/i, "").trim());
  } else {
    await addMessage(text);
  }

  els.messageInput.value = "";
});

els.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = els.taskTitle.value.trim();
  if (!title) return;
  await createTaskWithFeedback({
    title,
    due: els.taskDue.value,
    priority: els.taskPriority.value,
    assignee: els.taskAssignee.value,
    reminderAt: els.taskReminderAt.value,
    source: "tasks tab"
  });
  els.taskForm.reset();
});

els.newChatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.newChatName.value.trim();
  if (!name) return;

  const id = `${Date.now()}`;
  state.conversations.unshift({
    id,
    name,
    status: els.newChatStatus.value.trim() || "new conversation",
    avatar: `https://source.unsplash.com/160x160/?portrait&sig=${id}`,
    messages: [
      {
        id: createId("m"),
        sender: "them",
        text: "New chat ready. Add messages or tasks whenever you need.",
        time: formatTime()
      }
    ]
  });
  state.activeId = id;
  currentView = "chat";
  els.newChatForm.reset();
  els.newChatDialog.close();
  saveState();
  render();
});

function loadState() {
  const saved = localStorage.getItem("taskchat-state");
  if (!saved) return structuredClone(seedState);

  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem("taskchat-state", JSON.stringify(state));
}

async function bootstrap() {
  encryptionKey = await loadEncryptionKey();
  normalizeConversations();
  await normalizeEncryptedMessages();
  if (isRegistered() && getAuthToken()) {
    await syncFromBackend();
    connectRealtime();
  }
  saveState();
  render();
  renderNotificationStatus();
  checkReminders();
  window.setInterval(checkReminders, 30000);
}

async function render() {
  renderRegistration();
  if (!isRegistered()) return;

  normalizeConversations();
  renderView();
  renderConnectedApps();
  renderStats();
  renderNotificationStatus();
  renderRoleUI();
  renderWorkspace();
  renderConversations();
  await renderActiveChat();
  renderTasks();
  queueContactPrompts();
}

function setView(view) {
  currentView = view;
  renderView();
}

function renderView() {
  els.appShell.dataset.view = currentView;
}

async function startEmailRegistration(email) {
  try {
    els.emailForm.querySelector("button[type='submit']").disabled = true;
    const response = await fetch(`${getBackendUrl()}/api/auth/email/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(formatApiError(data.error || data));
    }

    state.registration.pendingEmail = email;
    state.registration.pendingCode = "";
    state.registration.demoCode = data.demoCode || "";
    state.registration.step = "verify";
    saveState();
    renderRegistration();
    if (state.registration.demoCode) {
      els.emailCode.value = state.registration.demoCode;
    }
    els.emailCode.focus();
  } catch (error) {
    els.workEmail.setCustomValidity(`Could not start email login. ${formatApiError(error.message || error)}`);
    els.workEmail.reportValidity();
  } finally {
    els.emailForm.querySelector("button[type='submit']").disabled = false;
  }
}

async function verifyEmailCode() {
  try {
    els.verifyForm.querySelector("button[type='submit']").disabled = true;
    const response = await fetch(`${getBackendUrl()}/api/auth/email/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: state.registration.pendingEmail,
        code: state.registration.pendingCode,
        name: getNameFromEmail(state.registration.pendingEmail)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(formatApiError(data.error || data));
    }

    const user = data.user || {};
    const workspace = data.workspace || {};
    state.registration.user = {
      id: user.id || createId("user"),
      name: user.name || getNameFromEmail(state.registration.pendingEmail),
      about: "Available",
      email: user.email || state.registration.pendingEmail,
      role: user.role || "employee",
      joinedAt: new Date().toISOString()
    };
    state.registration.sessionToken = data.token || "";
    state.registration.step = "profile";
    state.workspace.id = workspace.id || state.workspace.id;
    state.workspace.name = workspace.name || state.workspace.name;
    state.workspace.domain = workspace.domain || state.workspace.domain;
    state.workspace.role = toDisplayRole(user.role || state.workspace.role);
    saveState();
    renderRegistration();
    els.profileName.value = state.registration.user.name || "";
    els.profileName.focus();
  } catch (error) {
    state.registration.step = "verify";
    saveState();
    renderRegistration();
    els.emailCode.setCustomValidity(`Could not verify email. ${formatApiError(error.message || error)}`);
    els.emailCode.reportValidity();
  } finally {
    els.verifyForm.querySelector("button[type='submit']").disabled = false;
  }
}

async function completeProfile(name, about) {
  state.registration.user = {
    ...state.registration.user,
    name,
    about
  };
  state.registration.step = "complete";
  currentView = "home";
  saveState();
  await syncFromBackend();
  connectRealtime();
  render();
  sendStoredFcmToken();
}

function normalizeRegistrationState() {
  state.registration ||= structuredClone(seedState.registration);
  if (state.registration.step === "phone" || state.registration.step === "verify") {
    state.registration.step = state.registration.pendingEmail ? "verify" : "email";
  }
  state.registration.step ||= state.registration.user ? "complete" : "email";
  state.registration.pendingEmail ||= state.registration.user?.email || "";
  state.registration.pendingCode ||= "";
  state.registration.demoCode ||= "";
  state.registration.sessionToken ||= "";
  if (state.registration.user && !state.registration.user.email) {
    state.registration.user = null;
    state.registration.step = "email";
  }
  if (state.user && !state.registration.user) {
    state.registration.user = state.user;
    if (!state.registration.user.email) {
      state.registration.user = null;
      state.registration.step = "email";
      delete state.user;
      return;
    }
    state.registration.step = "complete";
    delete state.user;
  }
}

function normalizeWorkspace() {
  state.workspace ||= structuredClone(seedState.workspace);
  state.workspace.id ||= createId("workspace");
  state.workspace.name ||= "Company Workspace";
  state.workspace.domain ||= "";
  state.workspace.inviteCode ||= createWorkspaceInviteCode();
  state.workspace.inviteLink ||= "";
  state.workspace.invites ||= [];
  state.workspace.role ||= "Admin";
  state.workspace.employees ||= [];
  state.workspace.software ||= structuredClone(seedState.workspace.software);
  seedState.workspace.software.forEach((tool) => {
    if (!state.workspace.software.some((item) => item.id === tool.id)) {
      state.workspace.software.push(structuredClone(tool));
    }
  });
  if (state.registration?.user && !state.workspace.employees.some((employee) => employee.id === "me")) {
    state.workspace.employees.unshift({
      id: "me",
      name: state.registration.user.name,
      email: state.registration.user.email || "",
      role: "Admin",
      available: true,
      joinedAt: state.registration.user.joinedAt || new Date().toISOString()
    });
  }
  state.workspace.employees.forEach((employee) => {
    employee.available ??= true;
  });
}

function normalizeConversations() {
  if (!Array.isArray(state.conversations) || !state.conversations.length) {
    state.conversations = structuredClone(seedState.conversations);
  }

  state.conversations.forEach((conversation, index) => {
    conversation.id ||= createId("chat");
    conversation.name ||= index === 0 ? "Launch Squad" : "TodoMessenger";
    conversation.status ||= "online";
    conversation.avatar ||= createAvatarDataUrl(conversation.name);
    conversation.messages ||= [];
    if (!conversation.messages.length) {
      conversation.messages.push({
        id: createId("m"),
        sender: "them",
        text: `Welcome to ${conversation.name}. Start chatting or add a task from here.`,
        time: formatTime()
      });
    }
  });

  if (!state.conversations.some((conversation) => conversation.id === state.activeId)) {
    state.activeId = state.conversations[0].id;
  }
}

function normalizeConnectedApps() {
  state.connectedApps ||= structuredClone(seedState.connectedApps);
  seedState.connectedApps.forEach((seedApp) => {
    if (!state.connectedApps.some((app) => app.id === seedApp.id)) {
      state.connectedApps.push(structuredClone(seedApp));
    }
  });
}

function normalizeTasks() {
  state.tasks ||= [];
  state.tasks.forEach((task) => {
    task.assignee ||= "Me";
    task.reminderAt ||= "";
    task.remindedAt ||= "";
  });
}

function isRegistered() {
  return Boolean(state.registration.user);
}

function queueContactPrompts() {
  if (currentView !== "home") return;
  if (!localStorage.getItem("todomessenger-contact-sync-prompted")) {
    window.setTimeout(() => {
      if (isRegistered() && !localStorage.getItem("todomessenger-contact-sync-prompted") && !els.contactSyncDialog.open) {
        els.contactSyncDialog.showModal();
      }
    }, 700);
    return;
  }

  if (!localStorage.getItem("todomessenger-invite-contacts-prompted")) {
    window.setTimeout(() => {
      if (isRegistered() && !localStorage.getItem("todomessenger-invite-contacts-prompted") && !els.inviteContactsDialog.open) {
        els.inviteContactsDialog.showModal();
      }
    }, 900);
  }
}

function completeContactSyncPrompt() {
  localStorage.setItem("todomessenger-contact-sync-prompted", "true");
  els.contactSyncDialog.close();
  queueContactPrompts();
}

function completeInviteContactsPrompt() {
  localStorage.setItem("todomessenger-invite-contacts-prompted", "true");
  els.inviteContactsDialog.close();
}

function renderRegistration() {
  const registered = isRegistered();
  els.registrationScreen.hidden = registered;
  els.appShell.hidden = !registered;

  if (registered) return;

  const step = state.registration.step;
  document.querySelectorAll(".registration-form").forEach((form) => {
    form.classList.toggle("active", form.id === `${step}Form`);
  });
  document.querySelectorAll("[data-step-dot]").forEach((item) => {
    item.classList.toggle("active", item.dataset.stepDot === step);
    item.classList.toggle("done", stepOrder(item.dataset.stepDot) < stepOrder(step));
  });

  const copy = {
    email: {
      title: "Enter your work email",
      body: "Use your company email to join TodoMessenger and open your chats and tasks."
    },
    verify: {
      title: "Verify your email",
      body: "Enter the code created by the backend to continue."
    },
    profile: {
      title: "Set up your profile",
      body: "Add your name so people know who is messaging them."
    }
  };

  els.registrationTitle.textContent = copy[step].title;
  els.registrationCopy.textContent = copy[step].body;
  els.workEmail.value = state.registration.pendingEmail || "";
  els.verifyTarget.textContent = `Code for ${state.registration.pendingEmail || "your work email"}`;
  els.demoCodeText.textContent = state.registration.demoCode
    ? `Local development code: ${state.registration.demoCode}`
    : "No local code is saved for this attempt. Click Resend code.";
  els.useDevCodeButton.hidden = !state.registration.demoCode;
  els.useDevCodeButton.textContent = state.registration.demoCode
    ? `Use local code ${state.registration.demoCode}`
    : "Use local code";
}

function switchTab(tab) {
  if (tab === "workspace" && !isAdminView()) {
    tab = "chats";
  }
  const isTasks = tab === "tasks";
  const isWorkspace = tab === "workspace";
  const isChats = tab === "chats";
  els.chatsTabButton.classList.toggle("active", isChats);
  els.tasksTabButton.classList.toggle("active", isTasks);
  els.workspaceTabButton.classList.toggle("active", isWorkspace);
  els.chatsTabView.classList.toggle("active", isChats);
  els.tasksTabView.classList.toggle("active", isTasks);
  els.workspaceTabView.classList.toggle("active", isWorkspace);
}

function isAdminView() {
  return state.workspace?.role !== "Employee";
}

function renderRoleUI() {
  const isAdmin = isAdminView();
  els.roleViewSelect.value = isAdmin ? "Admin" : "Employee";
  els.workspaceTabButton.hidden = !isAdmin;
  els.newChatButton.hidden = !isAdmin;
  els.inviteButton.hidden = !isAdmin;
  if (!isAdmin && els.workspaceTabView.classList.contains("active")) {
    switchTab("chats");
  }
}

function resetDemo() {
  state = structuredClone(seedState);
  currentView = "home";
  normalizeRegistrationState();
  normalizeWorkspace();
  normalizeConnectedApps();
  normalizeTasks();
  saveState();
  render();
}

function renderStats() {
  const openTasks = state.tasks.filter((task) => !task.done);
  els.openTaskCount.textContent = openTasks.length;
  els.dueTodayCount.textContent = openTasks.filter((task) => task.due === todayIso).length;
  els.reminderCount.textContent = openTasks.filter((task) => task.reminderAt && !task.remindedAt).length;
}

function renderWorkspace() {
  if (!els.workspaceName) return;
  normalizeWorkspace();
  const inviteLink = getWorkspaceInviteLink();
  els.workspaceName.textContent = state.workspace.name;
  els.workspaceRole.textContent = state.workspace.role || "Admin";
  els.workspaceCompanyName.value = state.workspace.name;
  els.workspaceDomain.value = state.workspace.domain;
  els.workspaceInviteLink.value = inviteLink;
  els.employeeJoinCode.value ||= state.workspace.inviteCode;
  els.employeeCount.textContent = `${state.workspace.employees.length} ${state.workspace.employees.length === 1 ? "person" : "people"}`;

  els.employeeOptions.innerHTML = "";
  ["Me", state.workspace.name, ...state.workspace.employees.map((employee) => employee.name)].forEach((name) => {
    if (!name) return;
    const option = document.createElement("option");
    option.value = name;
    els.employeeOptions.append(option);
  });

  els.employeeList.innerHTML = "";
  state.workspace.employees.forEach((employee) => {
    const row = document.createElement("article");
    row.className = "employee-card";
    row.innerHTML = `
      <span class="employee-avatar">${escapeHtml(getInitials(employee.name))}</span>
      <div>
        <strong>${escapeHtml(employee.name)}</strong>
        <span>${escapeHtml(employee.email || "No email added")}</span>
      </div>
      <span class="pill">${escapeHtml(employee.role || "Employee")}</span>
      <span class="pill ${employee.status === "invited" ? "pending-pill" : employee.available ? "available-pill" : "unavailable-pill"}">${employee.status === "invited" ? "Pending invite" : employee.available ? "Available" : "Unavailable"}</span>
      <button class="ghost-button availability-toggle" type="button">${employee.available ? "Mark away" : "Mark available"}</button>
    `;
    row.addEventListener("click", () => openEmployeeChat(employee));
    row.querySelector(".availability-toggle").addEventListener("click", (event) => {
      event.stopPropagation();
      employee.available = !employee.available;
      saveState();
      renderWorkspace();
    });
    els.employeeList.append(row);
  });

  renderCompanySoftware();
}

function renderCompanySoftware() {
  els.softwareList.innerHTML = "";
  state.workspace.software.forEach((tool) => {
    const item = document.createElement("article");
    item.className = `software-card ${tool.enabled ? "connected" : ""}`;
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(tool.name)}</strong>
        <span>${escapeHtml(tool.type)}</span>
      </div>
      <button class="${tool.enabled ? "ghost-button" : "primary-button"}" type="button">${tool.enabled ? "Enabled" : "Enable"}</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      tool.enabled = !tool.enabled;
      saveState();
      renderWorkspace();
    });
    els.softwareList.append(item);
  });
  renderImportSourceChips();
}

function openEmployeeChat(employee) {
  const existing = state.conversations.find((conversation) => conversation.employeeId === employee.id || conversation.name === employee.name);
  if (existing) {
    state.activeId = existing.id;
  } else {
    const id = createId("chat");
    state.conversations.unshift({
      id,
      employeeId: employee.id,
      name: employee.name,
      status: `${employee.role || "Employee"} in ${state.workspace.name}`,
      avatar: `https://source.unsplash.com/160x160/?employee,portrait&sig=${encodeURIComponent(employee.id)}`,
      messages: [
        {
          id: createId("m"),
          sender: "them",
          text: `${employee.name} is ready in ${state.workspace.name}. Assign a task or start a chat.`,
          time: formatTime()
        }
      ]
    });
    state.activeId = id;
  }
  currentView = "chat";
  saveState();
  render();
}

function renderConversations() {
  const query = els.chatSearch.value.trim().toLowerCase();
  const matching = state.conversations.filter((conversation) => {
    const taskText = state.tasks
      .filter((task) => task.conversationId === conversation.id)
      .map((task) => task.title)
      .join(" ");
    return `${conversation.name} ${conversation.status} ${taskText}`.toLowerCase().includes(query);
  });

  els.conversationList.innerHTML = "";
  matching.forEach((conversation) => {
    const openCount = state.tasks.filter((task) => task.conversationId === conversation.id && !task.done).length;
    const latestMessage = conversation.messages.at(-1);
    const latest = latestMessage?.text || latestMessage?.preview || "Encrypted message";
    const button = document.createElement("button");
    button.className = `conversation-item ${conversation.id === state.activeId ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <img src="${getConversationAvatar(conversation)}" alt="">
      <span class="conversation-copy">
        <strong>${escapeHtml(conversation.name)}</strong>
        <span>${escapeHtml(latest)}</span>
      </span>
      ${openCount ? `<span class="task-dot">${openCount}</span>` : ""}
    `;
    button.querySelector("img").addEventListener("error", (event) => {
      event.currentTarget.src = createAvatarDataUrl(conversation.name);
    });
    button.addEventListener("click", () => {
      state.activeId = conversation.id;
      currentView = "chat";
      saveState();
      render();
    });
    els.conversationList.append(button);
  });
}

async function renderActiveChat() {
  const conversation = getActiveConversation();
  if (!conversation) {
    els.activeAvatar.src = createAvatarDataUrl("TodoMessenger");
    els.activeAvatar.alt = "TodoMessenger avatar";
    els.activeName.textContent = "TodoMessenger";
    els.activeStatus.textContent = "Start a chat or add your first task";
    els.messageStream.innerHTML = `<p class="empty-state">Your workspace is ready. Start a chat from the left panel.</p>`;
    return;
  }
  els.activeAvatar.onerror = () => {
    els.activeAvatar.src = createAvatarDataUrl(conversation.name);
  };
  els.activeAvatar.src = getConversationAvatar(conversation);
  els.activeAvatar.alt = `${conversation.name} avatar`;
  els.activeName.textContent = conversation.name;
  els.activeStatus.textContent = conversation.status;

  els.messageStream.innerHTML = "";
  const decryptedMessages = await Promise.all(
    conversation.messages.map(async (message) => ({
      ...message,
      displayText: await getMessageText(message)
    }))
  );

  const notice = document.createElement("div");
  notice.className = "encryption-notice";
  notice.textContent = "Messages are end-to-end encrypted in this demo. Only this browser has the chat key.";
  els.messageStream.append(notice);

  decryptedMessages.forEach((message) => {
    const bubble = document.createElement("article");
    const isTaskCard = Boolean(message.taskCard);
    bubble.className = `message ${message.sender} ${isTaskCard ? "task-message" : ""}`;
    bubble.innerHTML = `
      ${isTaskCard ? renderInlineTaskCard(message.taskCard) : `<p>${escapeHtml(message.displayText)}</p>`}
      ${renderMessageAttachments(message.attachments)}
      <footer class="message-footer">
        ${isTaskCard ? "" : `<button class="message-task-button" type="button">Add task</button>`}
        <span class="meta">${escapeHtml(message.time)}</span>
      </footer>
    `;
    bubble.querySelector(".message-task-button")?.addEventListener("click", () => {
      openQuickTaskDialog(message.displayText, `${conversation.name} message`);
    });
    els.messageStream.append(bubble);
  });
  els.messageStream.scrollTop = els.messageStream.scrollHeight;
}

function renderInlineTaskCard(task) {
  return `
    <section class="inline-task-card ${escapeHtml(task.priority || "normal")}">
      <p class="eyebrow">Task created</p>
      <strong>${escapeHtml(task.title || "Untitled task")}</strong>
      <div class="inline-task-meta">
        <span>Assigned to ${escapeHtml(task.assignee || "Me")}</span>
        <span>${task.due ? `Due ${escapeHtml(formatDate(task.due))}` : "No due date"}</span>
        <span>${escapeHtml(task.priority || "normal")} priority</span>
      </div>
    </section>
  `;
}

function renderMessageAttachments(attachments = []) {
  if (!attachments.length) return "";
  return `
    <div class="attachment-list">
      ${attachments.map((attachment) => {
        const isImage = attachment.type.startsWith("image/") && attachment.dataUrl;
        const fileLink = attachment.dataUrl
          ? `<a href="${attachment.dataUrl}" download="${escapeHtml(attachment.name)}">Open</a>`
          : `<span>Stored on this device</span>`;
        return `
          <article class="attachment-card">
            ${isImage ? `<img src="${attachment.dataUrl}" alt="${escapeHtml(attachment.name)}">` : `<span class="attachment-file-icon">${getAttachmentIcon(attachment.type)}</span>`}
            <div>
              <strong>${escapeHtml(attachment.name)}</strong>
              <span>${escapeHtml(formatFileSize(attachment.size))} ${escapeHtml(attachment.type || "file")}</span>
              ${fileLink}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function getAttachmentIcon(type = "") {
  if (type.includes("pdf")) return "PDF";
  if (type.startsWith("image/")) return "IMG";
  if (type.startsWith("video/")) return "VID";
  if (type.startsWith("audio/")) return "AUD";
  return "DOC";
}

function openQuickTaskDialog(prefill = "", source = "current chat") {
  els.quickTaskTitle.value = prefill;
  els.quickTaskSource.textContent = `Linked to ${source}.`;
  els.quickTaskDialog.showModal();
  els.quickTaskTitle.focus();
}

function openInviteDialog() {
  els.moreMenuPanel.hidden = true;
  const inviteLink = getInviteLink();
  const inviteText = getInviteText(inviteLink);
  els.inviteLink.value = inviteLink;
  els.whatsappShareLink.href = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
  els.instagramShareLink.href = "https://www.instagram.com/direct/inbox/";
  els.smsShareLink.href = `sms:?&body=${encodeURIComponent(inviteText)}`;
  els.emailShareLink.href = `mailto:?subject=${encodeURIComponent("Join me on TodoMessenger")}&body=${encodeURIComponent(inviteText)}`;
  els.shareStatus.textContent = "Instagram web does not accept pre-filled link text, so copy the link before opening it.";
  els.inviteDialog.showModal();
}

async function copyInviteLink() {
  const link = els.inviteLink.value || getInviteLink();
  try {
    await navigator.clipboard.writeText(link);
    els.shareStatus.textContent = "Invite link copied.";
  } catch {
    els.inviteLink.select();
    document.execCommand("copy");
    els.shareStatus.textContent = "Invite link selected and copied.";
  }
}

async function shareInvite() {
  const inviteLink = getInviteLink();
  const shareData = {
    title: "Join me on TodoMessenger",
    text: "Chat with me and turn messages into tasks on TodoMessenger.",
    url: inviteLink
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      els.shareStatus.textContent = "Invite shared.";
    } catch {
      els.shareStatus.textContent = "Sharing was cancelled.";
    }
    return;
  }

  await copyInviteLink();
  els.shareStatus.textContent = "Native sharing is not available here, so the invite link was copied.";
}

function renderConnectedApps() {
  if (!els.connectedApps) return;
  els.connectedApps.innerHTML = "";
  state.connectedApps.forEach((app) => {
    const isOAuthProvider = Boolean(app.provider);
    const card = document.createElement("article");
    card.className = `mcp-card ${app.connected ? "connected" : ""}`;
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(app.name)}</strong>
        <span>${escapeHtml(app.endpoint)}</span>
      </div>
      <p>${escapeHtml(app.tools.join(", "))}</p>
      <button class="${app.connected ? "ghost-button" : "primary-button"}" type="button">${app.connected ? "Disconnect" : isOAuthProvider ? "Connect OAuth" : "Connect"}</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      if (isOAuthProvider && !app.connected) {
        window.open(`${getBackendUrl()}${app.endpoint}?userId=${encodeURIComponent(getUserId())}`, "_blank", "noopener,noreferrer");
        return;
      }
      app.connected = !app.connected;
      saveState();
      renderConnectedApps();
    });
    els.connectedApps.append(card);
  });

  els.mcpManifest.value = JSON.stringify(createMcpManifest(), null, 2);
}

function createMcpManifest() {
  return {
    protocol: "mcp",
    app: "TodoMessenger",
    transport: ["todomessenger://mcp", "https://todomessenger.example/mcp"],
    user: state.registration.user?.email || "unregistered",
    tools: [
      { name: "create_task", description: "Create a task from a chat, contact, or connected app." },
      { name: "send_message", description: "Send a TodoMessenger message to an existing conversation." },
      { name: "read_open_tasks", description: "Read open tasks for the active TodoMessenger account." }
    ],
    connectedApps: state.connectedApps.filter((app) => app.connected)
  };
}

function getBackendUrl() {
  return (
    localStorage.getItem("taskchat-backend-url") ||
    window.TODOMESSENGER_CONFIG?.backendUrl ||
    (window.location.protocol === "file:" ? "http://localhost:8787" : "") ||
    "http://localhost:8787"
  );
}

function getAuthToken() {
  return state.registration?.sessionToken || "";
}

async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatApiError(data.error || data || `HTTP ${response.status}`));
  }
  return data;
}

async function syncFromBackend() {
  if (!getAuthToken() || backendSyncInFlight) return;
  backendSyncInFlight = true;
  try {
    const [profileData, conversationData, taskData, memberData] = await Promise.all([
      apiFetch("/api/me"),
      apiFetch("/api/conversations"),
      apiFetch("/api/tasks"),
      apiFetch("/api/workspaces/members")
    ]);
    if (profileData.user) {
      state.registration.user = {
        ...state.registration.user,
        ...profileData.user,
        about: state.registration.user?.about || "Available"
      };
      state.workspace.role = toDisplayRole(profileData.user.role || state.workspace.role);
    }
    if (profileData.workspace) {
      state.workspace.id = profileData.workspace.id || state.workspace.id;
      state.workspace.name = profileData.workspace.name || state.workspace.name;
      state.workspace.domain = profileData.workspace.domain || state.workspace.domain;
    }
    if (Array.isArray(conversationData.conversations) && conversationData.conversations.length) {
      state.conversations = conversationData.conversations.map(mapBackendConversation);
      if (!state.conversations.some((conversation) => conversation.id === state.activeId)) {
        state.activeId = state.conversations[0].id;
      }
    }
    if (Array.isArray(taskData.tasks)) {
      state.tasks = taskData.tasks.map(mapBackendTask);
    }
    if (Array.isArray(memberData.members)) {
      state.workspace.employees = memberData.members.map(mapBackendMember);
    }
    if (Array.isArray(memberData.invites)) {
      state.workspace.invites = memberData.invites;
      const latestPendingInvite = memberData.invites.find((invite) => invite.status === "pending");
      if (latestPendingInvite) {
        state.workspace.inviteCode = latestPendingInvite.inviteCode || latestPendingInvite.token || state.workspace.inviteCode;
        state.workspace.inviteLink = latestPendingInvite.inviteLink || "";
      }
    }
    saveState();
  } catch (error) {
    console.warn("Backend sync unavailable:", error);
  } finally {
    backendSyncInFlight = false;
  }
}

function connectRealtime() {
  if (!getAuthToken() || realtimeSocket?.readyState === WebSocket.OPEN) return;
  if (realtimeReconnectTimer) {
    window.clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = null;
  }

  const backendUrl = new URL(getBackendUrl());
  backendUrl.protocol = backendUrl.protocol === "https:" ? "wss:" : "ws:";
  backendUrl.pathname = "/ws";
  backendUrl.search = `token=${encodeURIComponent(getAuthToken())}`;

  try {
    realtimeSocket = new WebSocket(backendUrl.toString());
  } catch {
    return;
  }

  realtimeSocket.addEventListener("message", async (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    if (["message.created", "task.created", "task.updated", "conversation.created", "message.reaction", "message.read"].includes(payload.type)) {
      await syncFromBackend();
      render();
    }
  });
  realtimeSocket.addEventListener("close", () => {
    realtimeReconnectTimer = window.setTimeout(connectRealtime, 4000);
  });
}

function mapBackendConversation(conversation) {
  return {
    id: conversation.id,
    name: conversation.name || "Workspace chat",
    status: conversation.status || "workspace chat",
    avatar: conversation.avatar || createAvatarDataUrl(conversation.name || "Workspace chat"),
    messages: (conversation.messages || []).map(mapBackendMessage)
  };
}

function mapBackendMessage(message) {
  return {
    id: message.id,
    sender: message.sender || "them",
    text: message.preview || "",
    preview: message.preview || "",
    encrypted: parseEncryptedPayload(message.encrypted),
    attachments: message.attachments || [],
    reactions: message.reactions || [],
    readBy: message.readBy || [],
    time: message.time || formatTime(),
    createdAt: message.createdAt
  };
}

function parseEncryptedPayload(value) {
  if (!value) return "";
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return "";
  }
}

function mapBackendTask(task) {
  return {
    ...task,
    due: task.due || "",
    done: Boolean(task.done),
    priority: task.priority || "normal",
    assignee: task.assignee || "Me",
    reminderAt: task.reminderAt || "",
    remindedAt: task.remindedAt || ""
  };
}

function mapBackendMember(member) {
  return {
    id: member.id,
    name: member.name || getNameFromEmail(member.email),
    email: member.email || "",
    role: toDisplayRole(member.role),
    status: member.status || "active",
    available: member.available !== false,
    joinedAt: member.joinedAt || member.createdAt || "",
    lastLoginAt: member.lastLoginAt || ""
  };
}

function getUserId() {
  return normalizeEmailUserId(state.registration.user?.email || "demo-user");
}

function formatApiError(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error.message === "string") return error.message;
  if (error.message) return formatApiError(error.message);
  if (typeof error.error?.message === "string") return error.error.message;
  if (error.error?.message) return formatApiError(error.error.message);
  if (typeof error.error === "string") return error.error;
  if (error.error) return formatApiError(error.error);
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

async function answerWithBlu(prompt) {
  const question = prompt || "Tell me what you can help with in this chat.";
  await addMessage("Thinking...", "them");
  const conversation = getActiveConversation();
  const thinkingMessage = conversation.messages.at(-1);

  try {
    const response = await fetch(`${getBackendUrl()}/api/ai/blu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: question,
        context: await getRecentMessageContext(conversation)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(formatApiError(data.error || data));
    }
    thinkingMessage.encrypted = await encryptText(data.answer);
  } catch (error) {
    thinkingMessage.encrypted = await encryptText(
      `Blu could not reach the AI backend yet. Check OPENAI_API_KEY on Render and redeploy the backend. (${formatApiError(error.message || error)})`
    );
  }

  saveState();
  render();
}

async function suggestTasksFromChat() {
  const conversation = getActiveConversation();
  els.taskSuggestionList.innerHTML = `<p class="helper-text">Reading this chat and looking for useful tasks...</p>`;

  try {
    const response = await fetch(`${getBackendUrl()}/api/ai/suggest-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationName: conversation.name,
        context: await getRecentMessageContext(conversation)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(formatApiError(data.error || data));
    }
    renderTaskSuggestions(data.tasks || []);
  } catch (error) {
    els.taskSuggestionList.innerHTML = `
      <p class="helper-text">Could not suggest tasks yet. ${escapeHtml(formatApiError(error.message || error))}</p>
    `;
  }
}

function renderTaskSuggestions(tasks) {
  els.taskSuggestionList.innerHTML = "";
  if (!tasks.length) {
    els.taskSuggestionList.innerHTML = `<p class="helper-text">No clear tasks found in the recent chat.</p>`;
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "suggestion-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(task.title || "Untitled task")}</strong>
        <span>${escapeHtml(task.reason || "Suggested from recent messages")}</span>
        <span>Assign to ${escapeHtml(task.assignee || "Me")}</span>
      </div>
      <button class="primary-button" type="button">Add</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      await createTaskWithFeedback({
        title: task.title || "Untitled task",
        due: task.due || "",
        priority: task.priority || "normal",
        assignee: task.assignee || "Me",
        reminderAt: "",
        source: "Blu"
      });
      card.remove();
    });
    els.taskSuggestionList.append(card);
  });
}

async function getRecentMessageContext(conversation) {
  const recent = conversation.messages.slice(-8);
  const lines = [];
  for (const message of recent) {
    lines.push(`${message.sender}: ${await getMessageText(message)}`);
  }
  return lines.join("\n");
}

async function normalizeEncryptedMessages() {
  for (const conversation of state.conversations) {
    for (const message of conversation.messages) {
      if (message.encrypted) continue;
      message.encrypted = await encryptText(message.text || "");
      delete message.text;
    }
  }
}

async function getMessageText(message) {
  if (message.encrypted) {
    return decryptText(message.encrypted);
  }
  return message.text || "";
}

async function loadEncryptionKey() {
  const stored = localStorage.getItem("todomessenger-e2ee-key");
  if (stored) {
    return crypto.subtle.importKey("raw", base64ToBytes(stored), "AES-GCM", false, ["encrypt", "decrypt"]);
  }

  const raw = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem("todomessenger-e2ee-key", bytesToBase64(raw));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptText(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encryptionKey, encoded);
  return {
    algorithm: "AES-GCM",
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipherBuffer))
  };
}

async function decryptText(encrypted) {
  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(encrypted.iv) },
      encryptionKey,
      base64ToBytes(encrypted.data)
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return "[Encrypted message unavailable on this device]";
  }
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function renderTasks() {
  const filter = els.taskFilter.value;
  let tasks = [...state.tasks];

  if (filter === "open") tasks = tasks.filter((task) => !task.done);
  if (filter === "today") tasks = tasks.filter((task) => !task.done && task.due === todayIso);
  if (filter === "done") tasks = tasks.filter((task) => task.done);

  els.taskList.innerHTML = "";
  if (!tasks.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No matching tasks in this chat yet.";
    els.taskList.append(empty);
    return;
  }

  tasks.forEach((task) => {
    const fallback = task.assignmentFallback;
    const fallbackHtml = fallback ? `
      <div class="assignment-fallback">
        <span>${escapeHtml(fallback.reason)}</span>
        <button class="ghost-button assignment-message-button" type="button">Send message</button>
      </div>
    ` : "";
    const card = document.createElement("article");
    card.className = `task-card ${task.priority} ${task.done ? "done" : ""}`;
    card.innerHTML = `
      <label>
        <input type="checkbox" ${task.done ? "checked" : ""} aria-label="Mark task done">
        <span>${escapeHtml(task.title)}</span>
      </label>
      <footer>
        <span class="pill">${escapeHtml(getConversationName(task.conversationId))}</span>
        <span class="pill">Assigned to ${escapeHtml(task.assignee || "Me")}</span>
        <span class="pill">${task.due ? `Due ${formatDate(task.due)}` : "No due date"}</span>
        ${task.reminderAt ? `<span class="pill reminder-pill">Remind ${escapeHtml(formatDateTime(task.reminderAt))}</span>` : ""}
        <span class="pill">${escapeHtml(task.priority)} priority</span>
        <button class="delete-button" type="button">Delete</button>
      </footer>
      ${fallbackHtml}
    `;

    card.querySelector("input").addEventListener("change", (event) => {
      task.done = event.target.checked;
      if (task.done) {
        cancelPushReminder(task.id);
      } else if (task.reminderAt && !task.remindedAt) {
        schedulePushReminder(task);
      }
      saveState();
      updateTaskOnBackend(task);
      render();
    });
    card.querySelector(".delete-button").addEventListener("click", () => {
      cancelPushReminder(task.id);
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      saveState();
      render();
    });
    card.querySelector(".assignment-message-button")?.addEventListener("click", () => openAssignmentFallbackDialog(task));
    els.taskList.append(card);
  });
}

async function addMessage(text, sender = "me", extra = {}) {
  const conversation = getActiveConversation();
  const encrypted = await encryptText(text);
  const message = {
    id: createId("m"),
    sender,
    preview: text,
    encrypted,
    time: formatTime(),
    ...extra
  };
  conversation.messages.push(message);
  saveState();
  render();
  if (sender === "me" && getAuthToken() && !extra.remote) {
    syncMessageToBackend(conversation.id, message, text, encrypted, extra);
  }
}

async function syncMessageToBackend(conversationId, message, text, encrypted, extra = {}) {
  try {
    const data = await apiFetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      body: {
        text,
        preview: text,
        encryptedBody: JSON.stringify(encrypted),
        attachments: extra.attachments || []
      }
    });
    if (data.message?.id) {
      message.id = data.message.id;
      saveState();
    }
  } catch (error) {
    console.warn("Message saved locally but backend sync failed:", error);
  }
}

async function addAttachmentMessage(files) {
  const attachments = await Promise.all(files.map(createAttachment));
  const fileCount = attachments.length;
  const fileNames = attachments.map((attachment) => attachment.name).join(", ");
  const label = fileCount === 1 ? `Attached ${fileNames}` : `Attached ${fileCount} files: ${fileNames}`;
  await addMessage(label, "me", { attachments });
}

function createAttachment(file) {
  return new Promise((resolve) => {
    const attachment = {
      id: createId("att"),
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      dataUrl: ""
    };

    if (file.size > maxInlineAttachmentBytes) {
      resolve(attachment);
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      attachment.dataUrl = reader.result;
      resolve(attachment);
    });
    reader.addEventListener("error", () => resolve(attachment));
    reader.readAsDataURL(file);
  });
}

async function addSystemMessage(text) {
  await addMessage(text, "them");
}

function getAssignmentFallback(assignee, title, due) {
  if (!assignee || assignee.toLowerCase() === "me") return null;
  if (assignee === state.workspace.name) return null;
  if (state.conversations.some((conversation) => conversation.name.toLowerCase() === assignee.toLowerCase())) return null;

  const employee = findEmployeeByName(assignee);
  if (employee?.available) return null;

  const reason = employee
    ? `${employee.name} is not available on TodoMessenger right now.`
    : `${assignee} is not in this workspace yet.`;

  return {
    reason,
    email: employee?.email || "",
    message: createAssignmentMessage(assignee, title, due)
  };
}

function findEmployeeByName(name) {
  const target = name.trim().toLowerCase();
  return state.workspace.employees.find((employee) => employee.name.toLowerCase() === target);
}

function createAssignmentMessage(assignee, title, due) {
  const dueText = due ? ` Due: ${formatDate(due)}.` : "";
  return `Hi ${assignee}, you have been assigned a TodoMessenger task: ${title}.${dueText} Please join the workspace or reply here so the team can track it.`;
}

function openAssignmentFallbackDialog(task) {
  if (!task?.assignmentFallback) return;
  activeFallbackTaskId = task.id;
  const fallback = task.assignmentFallback;
  els.assignmentFallbackTitle.textContent = `Message ${task.assignee}`;
  els.assignmentFallbackMeta.textContent = fallback.reason;
  els.assignmentFallbackMessage.value = fallback.message;
  els.assignmentFallbackStatus.textContent = "Message ready.";
  els.emailAssignmentFallbackLink.href = `mailto:${encodeURIComponent(fallback.email || "")}?subject=${encodeURIComponent(`Task assigned: ${task.title}`)}&body=${encodeURIComponent(fallback.message)}`;
  els.whatsappAssignmentFallbackLink.href = `https://wa.me/?text=${encodeURIComponent(fallback.message)}`;
  if (!els.assignmentFallbackDialog.open) {
    els.assignmentFallbackDialog.showModal();
  }
}

async function copyAssignmentFallbackMessage() {
  const task = state.tasks.find((item) => item.id === activeFallbackTaskId);
  const message = task?.assignmentFallback?.message || els.assignmentFallbackMessage.value;
  try {
    await navigator.clipboard.writeText(message);
    els.assignmentFallbackStatus.textContent = "Task message copied.";
  } catch {
    els.assignmentFallbackMessage.select();
    document.execCommand("copy");
    els.assignmentFallbackStatus.textContent = "Task message selected and copied.";
  }
}

async function shareAssignmentFallbackMessage() {
  const task = state.tasks.find((item) => item.id === activeFallbackTaskId);
  const message = task?.assignmentFallback?.message || els.assignmentFallbackMessage.value;
  if (navigator.share) {
    try {
      await navigator.share({
        title: task ? `Task assigned: ${task.title}` : "TodoMessenger task",
        text: message
      });
      els.assignmentFallbackStatus.textContent = "Task message shared.";
    } catch {
      els.assignmentFallbackStatus.textContent = "Sharing was cancelled.";
    }
    return;
  }

  await copyAssignmentFallbackMessage();
  els.assignmentFallbackStatus.textContent = "Native sharing is not available here, so the task message was copied.";
}

async function createTaskWithFeedback({ title, due = "", priority = "normal", assignee = "Me", reminderAt = "", source = "chat" }) {
  const task = addTask(title, due, priority, assignee, reminderAt);
  if (!task) return null;
  await addTaskCardMessage(task, source);
  showTaskConfirmation(task);
  return task;
}

async function addTaskCardMessage(task, source) {
  await addMessage(`Task created: ${task.title}`, "me", {
    taskCard: {
      id: task.id,
      title: task.title,
      assignee: task.assignee,
      due: task.due,
      priority: task.priority,
      source
    }
  });
}

function showTaskConfirmation(task) {
  if (!els.taskToast) return;
  clearTimeout(taskToastTimer);
  els.taskToast.innerHTML = `
    <strong>Task added</strong>
    <span>${escapeHtml(task.title)} - ${escapeHtml(task.assignee || "Me")}${task.due ? ` - Due ${escapeHtml(formatDate(task.due))}` : ""}</span>
  `;
  els.taskToast.hidden = false;
  taskToastTimer = setTimeout(() => {
    els.taskToast.hidden = true;
  }, 3200);
}

function addTask(title, due, priority, assignee = "Me", reminderAt = "") {
  if (!title) return null;
  const trimmedAssignee = assignee.trim() || "Me";
  const assignmentFallback = getAssignmentFallback(trimmedAssignee, title, due);
  const task = {
    id: createId("t"),
    conversationId: state.activeId,
    title,
    due,
    priority,
    assignee: trimmedAssignee,
    assignmentFallback,
    reminderAt,
    remindedAt: "",
    done: false
  };
  state.tasks.unshift(task);
  saveState();
  schedulePushReminder(task);
  syncTaskToBackend(task);
  if (assignmentFallback) {
    openAssignmentFallbackDialog(task);
  }
  return task;
}

async function syncTaskToBackend(task) {
  if (!getAuthToken() || task.backendSynced) return;
  try {
    const data = await apiFetch("/api/tasks", {
      method: "POST",
      body: {
        conversationId: task.conversationId,
        title: task.title,
        due: task.due,
        priority: task.priority,
        assignee: task.assignee,
        reminderAt: task.reminderAt,
        assignmentFallback: task.assignmentFallback
      }
    });
    if (data.task?.id) {
      task.id = data.task.id;
      task.backendSynced = true;
      saveState();
    }
  } catch (error) {
    console.warn("Task saved locally but backend sync failed:", error);
  }
}

async function updateTaskOnBackend(task) {
  if (!getAuthToken() || !task.id) return;
  try {
    await apiFetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
      method: "PATCH",
      body: {
        done: Boolean(task.done),
        title: task.title,
        due: task.due,
        priority: task.priority,
        reminderAt: task.reminderAt
      }
    });
  } catch (error) {
    console.warn("Task updated locally but backend sync failed:", error);
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    els.notificationStatus.textContent = "Browser notifications are not available here.";
    return;
  }

  if (Notification.permission === "granted") {
    renderNotificationStatus();
    return;
  }

  const permission = await Notification.requestPermission();
  renderNotificationStatus();
  if (permission === "granted") {
    new Notification("TodoMessenger reminders are on", {
      body: "Blu can now remind you when a task is due.",
      tag: "todomessenger-reminders-on"
    });
  }
}

function renderNotificationStatus() {
  if (!els.notificationStatus || !els.notificationButton) return;
  if (!("Notification" in window)) {
    els.notificationStatus.textContent = "Notifications are not supported in this browser.";
    els.notificationButton.disabled = true;
    return;
  }

  if (Notification.permission === "granted") {
    els.notificationStatus.textContent = "Notifications are enabled for task reminders.";
    els.notificationButton.textContent = "Enabled";
    els.notificationButton.disabled = true;
  } else if (Notification.permission === "denied") {
    els.notificationStatus.textContent = "Notifications are blocked. Enable them in browser settings.";
    els.notificationButton.textContent = "Blocked";
    els.notificationButton.disabled = true;
  } else {
    els.notificationStatus.textContent = "Enable notifications to get task reminders while TodoMessenger is open.";
    els.notificationButton.textContent = "Enable notifications";
    els.notificationButton.disabled = false;
  }
}

function checkReminders() {
  if (!isRegistered()) return;
  const now = Date.now();
  const dueTasks = state.tasks.filter((task) => (
    !task.done &&
    task.reminderAt &&
    !task.remindedAt &&
    new Date(task.reminderAt).getTime() <= now
  ));

  if (!dueTasks.length) return;
  dueTasks.forEach((task) => {
    task.remindedAt = new Date().toISOString();
    notifyTaskReminder(task);
  });
  saveState();
  renderStats();
  renderTasks();
}

function notifyTaskReminder(task) {
  const conversationName = getConversationName(task.conversationId);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`Reminder: ${task.title}`, {
      body: `${conversationName} - assigned to ${task.assignee || "Me"}`,
      tag: `task-${task.id}`
    });
  }

  if (!els.reminderDialog.open) {
    activeReminderTaskId = task.id;
    els.reminderTitle.textContent = task.title;
    els.reminderMeta.textContent = `${conversationName} - assigned to ${task.assignee || "Me"}`;
    try {
      els.reminderDialog.showModal();
    } catch {
      els.reminderDialog.show();
    }
  }
}

function handleSharedContent(event) {
  const text = event.detail?.text?.trim();
  if (!text) return;
  openShareImportDialog(text, event.detail?.source || "shared");
}

function openShareImportDialog(text = "", source = "manual") {
  renderImportSourceChips();
  els.shareImportText.value = text;
  els.shareImportText.dataset.source = source;
  try {
    els.shareImportDialog.showModal();
  } catch {
    els.shareImportDialog.show();
  }
}

function renderImportSourceChips() {
  if (!els.importSourceChips) return;
  const tools = (state.workspace.software || []).filter((tool) => tool.enabled);
  els.importSourceChips.innerHTML = "";
  tools.forEach((tool) => {
    const chip = document.createElement("button");
    chip.className = "software-chip";
    chip.type = "button";
    chip.textContent = tool.name;
    chip.addEventListener("click", () => {
      els.shareImportText.placeholder = `Paste ${tool.name} content here.`;
      els.shareImportText.focus();
    });
    els.importSourceChips.append(chip);
  });
}

async function saveSharedContentToChat() {
  const text = els.shareImportText.value.trim();
  if (!text) return;
  await addMessage(`Imported from work app:\n${text}`);
  els.shareImportDialog.close();
}

function addSharedContentAsTask() {
  const text = els.shareImportText.value.trim();
  if (!text) return;
  openQuickTaskDialog(summarizeSharedText(text), "work app import");
  els.shareImportDialog.close();
}

function summarizeSharedText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, "").trim())
    .filter(Boolean)
    .find((line) => !line.toLowerCase().startsWith("attachment:"))
    ?.slice(0, 140) || text.slice(0, 140);
}

async function schedulePushReminder(task) {
  if (!task.reminderAt) return;
  try {
    await fetch(`${getBackendUrl()}/api/reminders/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id,
        title: task.title,
        assignee: task.assignee || "Me",
        conversationName: getConversationName(task.conversationId),
        reminderAt: new Date(task.reminderAt).toISOString(),
        userId: getPushUserId(),
        fallbackUserId: "android-device"
      })
    });
  } catch {
    // Local reminders still work if the backend reminder queue cannot be reached.
  }
}

async function cancelPushReminder(taskId) {
  if (!taskId) return;
  try {
    await fetch(`${getBackendUrl()}/api/reminders/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId })
    });
  } catch {
    // Cancelling is best-effort for the prototype.
  }
}

async function registerFcmToken(event) {
  const token = event.detail?.token;
  if (!token) return;
  nativePushRegistration = {
    token,
    platform: event.detail?.platform || "webview"
  };
  await sendStoredFcmToken();
}

async function sendStoredFcmToken() {
  if (!nativePushRegistration?.token) return;
  try {
    await fetch(`${getBackendUrl()}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: nativePushRegistration.token,
        platform: nativePushRegistration.platform,
        userId: getPushUserId()
      })
    });
  } catch {
    // Push is optional; reminders still work in-app if backend registration fails.
  }
}

function getPushUserId() {
  const user = state.registration.user;
  if (!user?.email) return "demo-user";
  return normalizeEmailUserId(user.email) || "demo-user";
}

function getActiveConversation() {
  normalizeConversations();
  return state.conversations.find((conversation) => conversation.id === state.activeId) || state.conversations[0];
}

function getConversationName(conversationId) {
  return state.conversations.find((conversation) => conversation.id === conversationId)?.name || "Chat";
}

function getConversationAvatar(conversation) {
  return conversation?.avatar || createAvatarDataUrl(conversation?.name || "TodoMessenger");
}

function createAvatarDataUrl(name) {
  const initials = getInitials(name);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="18" fill="#006699"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="700">${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getInviteLink() {
  const user = state.registration.user;
  const owner = user?.email ? normalizeEmailUserId(user.email) : "demo";
  return `https://todomessenger.example/invite/${owner}`;
}

function getInviteText(inviteLink) {
  return `Join me on TodoMessenger: ${inviteLink}`;
}

function getWorkspaceInviteLink() {
  if (state.workspace.inviteLink) return state.workspace.inviteLink;
  const code = encodeURIComponent(state.workspace.inviteCode);
  const company = encodeURIComponent(state.workspace.name);
  return `${getFrontendOrigin()}?company=${company}&invite=${code}`;
}

function getWorkspaceInviteText() {
  return `Join ${state.workspace.name} on TodoMessenger. Use your invited work email and this link: ${getWorkspaceInviteLink()}`;
}

function getFrontendOrigin() {
  if (window.location.protocol === "file:") {
    return "https://todomessenger26.netlify.app/";
  }
  return window.location.origin + window.location.pathname;
}

async function syncWorkspaceToBackend() {
  if (!getAuthToken()) return;
  try {
    const data = await apiFetch("/api/workspaces/current", {
      method: "PATCH",
      body: {
        name: state.workspace.name,
        domain: state.workspace.domain
      }
    });
    if (data.workspace) {
      state.workspace.id = data.workspace.id || state.workspace.id;
      state.workspace.name = data.workspace.name || state.workspace.name;
      state.workspace.domain = data.workspace.domain || state.workspace.domain;
      saveState();
    }
    els.workspaceInviteStatus.textContent = "Workspace saved.";
  } catch (error) {
    els.workspaceInviteStatus.textContent = `Workspace saved locally. Backend update failed: ${formatApiError(error.message || error)}`;
  }
}

async function createEmployeeInvite() {
  const email = els.workspaceInviteEmail.value.trim().toLowerCase();
  const role = els.workspaceInviteRole.value || "employee";
  if (!isValidEmail(email)) {
    els.workspaceInviteEmail.setCustomValidity("Enter the employee work email first.");
    els.workspaceInviteEmail.reportValidity();
    return;
  }
  els.workspaceInviteEmail.setCustomValidity("");

  if (!getAuthToken()) {
    state.workspace.inviteCode = createWorkspaceInviteCode();
    state.workspace.inviteLink = getWorkspaceInviteLink();
    els.workspaceInviteStatus.textContent = "Local invite created. Sign in with backend auth to save invites.";
    saveState();
    renderWorkspace();
    return;
  }

  try {
    els.regenerateInviteButton.disabled = true;
    els.workspaceInviteStatus.textContent = "Creating invite...";
    const data = await apiFetch("/api/workspaces/invites", {
      method: "POST",
      body: { email, role }
    });
    const invite = data.invite || {};
    state.workspace.inviteCode = invite.inviteCode || invite.token || state.workspace.inviteCode;
    state.workspace.inviteLink = invite.inviteLink || state.workspace.inviteLink || "";
    state.workspace.invites ||= [];
    state.workspace.invites.unshift(invite);
    upsertWorkspaceEmployee({
      id: invite.id || createId("emp"),
      name: getNameFromEmail(email),
      email,
      role: toDisplayRole(role),
      status: "invited",
      available: false,
      joinedAt: new Date().toISOString()
    });
    els.workspaceInviteEmail.value = "";
    els.workspaceInviteLink.value = getWorkspaceInviteLink();
    els.workspaceInviteStatus.textContent = `Invite created for ${email}.`;
    saveState();
    renderWorkspace();
  } catch (error) {
    els.workspaceInviteStatus.textContent = `Could not create invite. ${formatApiError(error.message || error)}`;
  } finally {
    els.regenerateInviteButton.disabled = false;
  }
}

function upsertWorkspaceEmployee(employee) {
  const existing = state.workspace.employees.find((item) => item.email && employee.email && item.email.toLowerCase() === employee.email.toLowerCase());
  if (existing) {
    Object.assign(existing, employee);
    return existing;
  }
  state.workspace.employees.push(employee);
  return employee;
}

async function copyWorkspaceInvite() {
  try {
    await navigator.clipboard.writeText(getWorkspaceInviteText());
    els.workspaceInviteStatus.textContent = "Workspace invite copied.";
  } catch {
    els.workspaceInviteLink.select();
    document.execCommand("copy");
    els.workspaceInviteStatus.textContent = "Invite link selected and copied.";
  }
}

async function shareWorkspaceInvite() {
  const shareData = {
    title: `Join ${state.workspace.name}`,
    text: getWorkspaceInviteText(),
    url: getWorkspaceInviteLink()
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      els.workspaceInviteStatus.textContent = "Workspace invite shared.";
    } catch {
      els.workspaceInviteStatus.textContent = "Sharing was cancelled.";
    }
    return;
  }

  await copyWorkspaceInvite();
}

function joinWorkspaceFromInvite() {
  const name = els.employeeJoinName.value.trim();
  const email = els.employeeJoinEmail.value.trim();
  const code = els.employeeJoinCode.value.trim().toUpperCase();
  if (!name) return;
  if (code !== state.workspace.inviteCode.toUpperCase()) {
    els.employeeJoinCode.setCustomValidity("Invite code does not match this workspace.");
    els.employeeJoinCode.reportValidity();
    return;
  }

  els.employeeJoinCode.setCustomValidity("");
  const existing = state.workspace.employees.find((employee) => (
    employee.email && email && employee.email.toLowerCase() === email.toLowerCase()
  ));
  if (existing) {
    existing.name = name;
    existing.role ||= "Employee";
  } else {
    state.workspace.employees.push({
      id: createId("emp"),
      name,
      email,
      role: "Employee",
      available: true,
      joinedAt: new Date().toISOString()
    });
  }
  addWorkspaceAnnouncement(`${name} joined ${state.workspace.name}.`);
  els.employeeJoinForm.reset();
  els.employeeJoinCode.value = state.workspace.inviteCode;
  saveState();
  renderWorkspace();
  renderConversations();
}

function addWorkspaceAnnouncement(text) {
  const conversation = state.conversations.find((item) => item.id === "launch") || state.conversations[0];
  conversation.messages.push({
    id: createId("m"),
    sender: "them",
    text,
    time: formatTime()
  });
}

function createWorkspaceInviteCode() {
  return `TM-${Math.floor(100000 + Math.random() * 900000)}`;
}

function normalizeDomain(value) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function normalizeEmailUserId(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getNameFromEmail(email) {
  return String(email || "User").split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDisplayRole(role) {
  const normalized = String(role || "").toLowerCase();
  if (normalized === "admin") return "Admin";
  if (normalized === "team_lead") return "Team Lead";
  return "Employee";
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function stepOrder(step) {
  return { email: 1, verify: 2, profile: 3, complete: 4 }[step] || 1;
}

function formatTime() {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function formatDate(value) {
  return new Intl.DateTimeFormat([], { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TM";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return entities[char];
  });
}

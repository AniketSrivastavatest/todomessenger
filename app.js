const todayIso = new Date().toISOString().slice(0, 10);
const maxInlineAttachmentBytes = 2_000_000;

const seedState = {
  activeId: "launch",
  registration: {
    step: "phone",
    pendingPhone: "",
    verificationCode: "",
    user: null
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

const els = {
  activeAvatar: document.querySelector("#activeAvatar"),
  activeName: document.querySelector("#activeName"),
  activeStatus: document.querySelector("#activeStatus"),
  attachButton: document.querySelector("#attachButton"),
  attachmentInput: document.querySelector("#attachmentInput"),
  backToChatsButton: document.querySelector("#backToChatsButton"),
  cancelNewChat: document.querySelector("#cancelNewChat"),
  cancelQuickTask: document.querySelector("#cancelQuickTask"),
  chatSearch: document.querySelector("#chatSearch"),
  chatsTabButton: document.querySelector("#chatsTabButton"),
  chatsTabView: document.querySelector("#chatsTabView"),
  closeInviteDialog: document.querySelector("#closeInviteDialog"),
  closeMcpDialog: document.querySelector("#closeMcpDialog"),
  closeQuickTaskDialog: document.querySelector("#closeQuickTaskDialog"),
  contactSyncDialog: document.querySelector("#contactSyncDialog"),
  connectedApps: document.querySelector("#connectedApps"),
  copyInviteButton: document.querySelector("#copyInviteButton"),
  countryCode: document.querySelector("#countryCode"),
  customMcpForm: document.querySelector("#customMcpForm"),
  demoCodeText: document.querySelector("#demoCodeText"),
  editPhoneButton: document.querySelector("#editPhoneButton"),
  emailShareLink: document.querySelector("#emailShareLink"),
  conversationList: document.querySelector("#conversationList"),
  dueTodayCount: document.querySelector("#dueTodayCount"),
  appShell: document.querySelector("#appShell"),
  instagramShareLink: document.querySelector("#instagramShareLink"),
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
  phoneForm: document.querySelector("#phoneForm"),
  phoneNumber: document.querySelector("#phoneNumber"),
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
  reminderCount: document.querySelector("#reminderCount"),
  reminderDialog: document.querySelector("#reminderDialog"),
  reminderMeta: document.querySelector("#reminderMeta"),
  reminderTitle: document.querySelector("#reminderTitle"),
  shareStatus: document.querySelector("#shareStatus"),
  showPinnedTasks: document.querySelector("#showPinnedTasks"),
  skipContactSyncButton: document.querySelector("#skipContactSyncButton"),
  skipInviteContactsButton: document.querySelector("#skipInviteContactsButton"),
  smsShareLink: document.querySelector("#smsShareLink"),
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
  tasksTabButton: document.querySelector("#tasksTabButton"),
  tasksTabView: document.querySelector("#tasksTabView"),
  verificationCode: document.querySelector("#verificationCode"),
  verifyForm: document.querySelector("#verifyForm"),
  verifyTarget: document.querySelector("#verifyTarget"),
  videoCallButton: document.querySelector("#videoCallButton"),
  voiceCallButton: document.querySelector("#voiceCallButton"),
  dismissReminderButton: document.querySelector("#dismissReminderButton"),
  nativeShareButton: document.querySelector("#nativeShareButton"),
  openReminderChatButton: document.querySelector("#openReminderChatButton"),
  suggestTasksButton: document.querySelector("#suggestTasksButton"),
  whatsappShareLink: document.querySelector("#whatsappShareLink")
};

normalizeRegistrationState();
normalizeConnectedApps();
normalizeTasks();
bootstrap();

els.phoneForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const localNumber = normalizePhoneNumber(els.phoneNumber.value);
  if (localNumber.length < 6) {
    els.phoneNumber.setCustomValidity("Enter a valid phone number.");
    els.phoneNumber.reportValidity();
    return;
  }

  els.phoneNumber.setCustomValidity("");
  state.registration.pendingPhone = `${els.countryCode.value} ${localNumber}`;
  state.registration.verificationCode = createVerificationCode();
  state.registration.step = "verify";
  saveState();
  renderRegistration();
  els.verificationCode.focus();
});

els.verifyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (els.verificationCode.value.trim() !== state.registration.verificationCode) {
    els.verificationCode.setCustomValidity("That code does not match.");
    els.verificationCode.reportValidity();
    return;
  }

  els.verificationCode.setCustomValidity("");
  state.registration.step = "profile";
  saveState();
  renderRegistration();
  els.profileName.focus();
});

els.editPhoneButton.addEventListener("click", () => {
  state.registration.step = "phone";
  state.registration.verificationCode = "";
  saveState();
  renderRegistration();
  els.phoneNumber.focus();
});

els.profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.profileName.value.trim();
  if (!name) return;

  state.registration.user = {
    name,
    about: els.profileAbout.value.trim() || "Available",
    phone: state.registration.pendingPhone,
    joinedAt: new Date().toISOString()
  };
  state.registration.step = "complete";
  currentView = "home";
  saveState();
  render();
});

els.chatSearch.addEventListener("input", renderConversations);
els.taskFilter.addEventListener("change", renderTasks);
els.chatsTabButton.addEventListener("click", () => switchTab("chats"));
els.tasksTabButton.addEventListener("click", () => switchTab("tasks"));
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
els.quickTaskButton.addEventListener("click", () => openQuickTaskDialog(els.messageInput.value.trim(), "current chat"));
els.cancelQuickTask.addEventListener("click", () => els.quickTaskDialog.close());
els.closeQuickTaskDialog.addEventListener("click", () => els.quickTaskDialog.close());
els.quickTaskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = els.quickTaskTitle.value.trim();
  if (!title) return;

  addTask(title, els.quickTaskDue.value, els.quickTaskPriority.value, els.quickTaskAssignee.value, els.quickTaskReminderAt.value);
  await addMessage(`Task added from chat: ${title}`);
  els.quickTaskForm.reset();
  els.quickTaskDialog.close();
});
els.notificationButton.addEventListener("click", requestNotificationPermission);
els.dismissReminderButton.addEventListener("click", () => els.reminderDialog.close());
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
    addTask(text.slice(6).trim(), "", "normal", "Me");
    await addMessage(`Task added: ${text.slice(6).trim()}`);
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
  addTask(title, els.taskDue.value, els.taskPriority.value, els.taskAssignee.value, els.taskReminderAt.value);
  await addMessage(`Task added: ${title}`);
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
  await normalizeEncryptedMessages();
  saveState();
  render();
  renderNotificationStatus();
  checkReminders();
  window.setInterval(checkReminders, 30000);
}

async function render() {
  renderRegistration();
  if (!isRegistered()) return;

  renderView();
  renderConnectedApps();
  renderStats();
  renderNotificationStatus();
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

function normalizeRegistrationState() {
  state.registration ||= structuredClone(seedState.registration);
  state.registration.step ||= state.registration.user ? "complete" : "phone";
  state.registration.pendingPhone ||= "";
  state.registration.verificationCode ||= "";
  if (state.user && !state.registration.user) {
    state.registration.user = state.user;
    state.registration.step = "complete";
    delete state.user;
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
    phone: {
      title: "Enter your phone number",
      body: "TodoMessenger will need to verify your phone number before opening your chats and tasks."
    },
    verify: {
      title: "Verify your number",
      body: "Enter the code for this device to confirm it belongs to you."
    },
    profile: {
      title: "Set up your profile",
      body: "Add your name so people know who is messaging them."
    }
  };

  els.registrationTitle.textContent = copy[step].title;
  els.registrationCopy.textContent = copy[step].body;
  els.verifyTarget.textContent = `Code sent to ${state.registration.pendingPhone}`;
  els.demoCodeText.textContent = `Demo code: ${state.registration.verificationCode || "generate one from the phone step"}`;
}

function switchTab(tab) {
  const isTasks = tab === "tasks";
  els.chatsTabButton.classList.toggle("active", !isTasks);
  els.tasksTabButton.classList.toggle("active", isTasks);
  els.chatsTabView.classList.toggle("active", !isTasks);
  els.tasksTabView.classList.toggle("active", isTasks);
}

function resetDemo() {
  state = structuredClone(seedState);
  currentView = "home";
  normalizeRegistrationState();
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
      <img src="${conversation.avatar}" alt="">
      <span class="conversation-copy">
        <strong>${escapeHtml(conversation.name)}</strong>
        <span>${escapeHtml(latest)}</span>
      </span>
      ${openCount ? `<span class="task-dot">${openCount}</span>` : ""}
    `;
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
  els.activeAvatar.src = conversation.avatar;
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
    bubble.className = `message ${message.sender}`;
    bubble.innerHTML = `
      <p>${escapeHtml(message.displayText)}</p>
      ${renderMessageAttachments(message.attachments)}
      <footer class="message-footer">
        <button class="message-task-button" type="button">Add task</button>
        <span class="meta">${escapeHtml(message.time)}</span>
      </footer>
    `;
    bubble.querySelector(".message-task-button").addEventListener("click", () => {
      openQuickTaskDialog(message.displayText, `${conversation.name} message`);
    });
    els.messageStream.append(bubble);
  });
  els.messageStream.scrollTop = els.messageStream.scrollHeight;
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
    user: state.registration.user?.phone || "unregistered",
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
    "http://localhost:8787"
  );
}

function getUserId() {
  return normalizePhoneNumber(state.registration.user?.phone || "demo-user");
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
    card.querySelector("button").addEventListener("click", () => {
      addTask(task.title || "Untitled task", task.due || "", task.priority || "normal", task.assignee || "Me");
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
    `;

    card.querySelector("input").addEventListener("change", (event) => {
      task.done = event.target.checked;
      saveState();
      render();
    });
    card.querySelector(".delete-button").addEventListener("click", () => {
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      saveState();
      render();
    });
    els.taskList.append(card);
  });
}

async function addMessage(text, sender = "me", extra = {}) {
  getActiveConversation().messages.push({
    id: createId("m"),
    sender,
    preview: text,
    encrypted: await encryptText(text),
    time: formatTime(),
    ...extra
  });
  saveState();
  render();
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

function addTask(title, due, priority, assignee = "Me", reminderAt = "") {
  if (!title) return;
  state.tasks.unshift({
    id: createId("t"),
    conversationId: state.activeId,
    title,
    due,
    priority,
    assignee: assignee.trim() || "Me",
    reminderAt,
    remindedAt: "",
    done: false
  });
  saveState();
  render();
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

function getActiveConversation() {
  return state.conversations.find((conversation) => conversation.id === state.activeId) || state.conversations[0];
}

function getConversationName(conversationId) {
  return state.conversations.find((conversation) => conversation.id === conversationId)?.name || "Chat";
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getInviteLink() {
  const user = state.registration.user;
  const owner = user?.phone ? normalizePhoneNumber(user.phone) : "demo";
  return `https://todomessenger.example/invite/${owner}`;
}

function getInviteText(inviteLink) {
  return `Join me on TodoMessenger: ${inviteLink}`;
}

function normalizePhoneNumber(value) {
  return value.replace(/[^\d]/g, "");
}

function stepOrder(step) {
  return { phone: 1, verify: 2, profile: 3, complete: 4 }[step] || 1;
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

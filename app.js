const todayIso = new Date().toISOString().slice(0, 10);
const maxInlineAttachmentBytes = 2_000_000;
const quickReactions = ["👍", "❤️", "😂", "🔥", "✅"];
const mediaLibrary = {
  emoji: ["😀", "😂", "😍", "👏", "🔥", "✅", "🙏", "🎉", "🚀", "💬", "📌", "📎"],
  gifs: [
    { id: "gif_celebrate", name: "Celebrate", type: "image/gif", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWQ4bjB6cDB3Mmk1dGRpcWI5d2s2d2cyYjQ4bzN6N3Nmb2hvNHQwdyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oz8xAFtqoOUUrsh7W/giphy.gif", caption: "Sent a celebratory GIF" },
    { id: "gif_done", name: "Done", type: "image/gif", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMG16bmM3MjBtOW53dWhnaGk1cnI2bHFmN2ZyeWNoa2s1eWQ3Y3lqMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3q2XhfQ8oCkm1Ts4/giphy.gif", caption: "Sent a done GIF" },
    { id: "gif_thumbs", name: "Thumbs up", type: "image/gif", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHBnMnB5d2duMGRnMTE4dWZtd3loMjJpMHBtY2prcXJpb2hhd2lqMCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/xT9DPIlGnuHpr2yObu/giphy.gif", caption: "Sent a thumbs-up GIF" },
    { id: "gif_focus", name: "Focus mode", type: "image/gif", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2pmd3pwM2czdzhpb3g4YjhqNDA2OHNvazY1bGljZmF0aXQ2MWhsZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26ufdipQqU2lhNA4g/giphy.gif", caption: "Sent a focus GIF" },
    { id: "gif_hello", name: "Hello", type: "image/gif", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExb2x4emM4MDJzbHJxOGM2emY2amQ4d2Frb2xpeGVzNDA1bnp4ZTk4eiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ASd0Ukj0y3qMM/giphy.gif", caption: "Sent a hello GIF" },
    { id: "gif_thankyou", name: "Thank you", type: "image/gif", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNm1uajB6ZzVmMzQ4M2g5dGt2Nmd2OHluZ3hoM3d2ZG93bXF3M3VxYiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/5bdhq6YF0szPaCEk9Y/giphy.gif", caption: "Sent a thank-you GIF" }
  ],
  stickers: [
    { id: "sticker_wave", name: "Wave", type: "image/png", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f44b.png", caption: "Sent a wave sticker" },
    { id: "sticker_party", name: "Party", type: "image/png", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f389.png", caption: "Sent a party sticker" },
    { id: "sticker_fire", name: "Fire", type: "image/png", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f525.png", caption: "Sent a fire sticker" },
    { id: "sticker_rocket", name: "Rocket", type: "image/png", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f680.png", caption: "Sent a rocket sticker" },
    { id: "sticker_star", name: "Star", type: "image/png", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2b50.png", caption: "Sent a star sticker" },
    { id: "sticker_check", name: "Check", type: "image/png", url: "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2705.png", caption: "Sent a check sticker" }
  ]
};

mediaLibrary.emoji = ["😀", "😃", "😄", "😁", "😂", "😅", "😉", "😍", "🥳", "😎", "🤔", "😢", "😭", "😡", "🥱", "🤯", "😴", "🥺", "😬", "😇", "👍", "👎", "👏", "🙏", "🤝", "💪", "👀", "👋", "✅", "❌", "❗", "⭐", "🔥", "💡", "🚀", "🎉", "🎯", "📌", "📎", "💬", "💼", "📅", "🔔", "📣", "🤖", "🧠", "🎧", "📞", "🍀", "❤️"];

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
      { id: "google-calendar", name: "Google Calendar", type: "Calendar events and reminders", enabled: true },
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
    { id: "google-calendar", name: "Google Calendar", endpoint: "/oauth/google_calendar/start", connected: false, tools: ["create_event", "read_events"], provider: "google_calendar" },
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
    },
    {
      id: "homepage-refresh",
      name: "Homepage Refresh",
      status: "David, Sarah, Alex, Emma, Rahul",
      avatar: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=160&q=80",
      messages: [
        { id: "demo_home_1", sender: "them", text: "David: Morning all — client wants the homepage updated before Friday.", time: "09:02" },
        { id: "demo_home_2", sender: "them", text: "Sarah: What exactly needs changing?", time: "09:03" },
        { id: "demo_home_3", sender: "them", text: "David: Mainly the pricing section and testimonials. They sent new ones last night.", time: "09:04" },
        { id: "demo_home_4", sender: "them", text: "Alex: I can handle design updates.", time: "09:05" },
        { id: "demo_home_5", sender: "them", text: "Sarah: Cool, I’ll update the copy then.", time: "09:06" },
        { id: "demo_home_6", sender: "them", text: "David: Great. Let’s aim to have a draft ready by Thursday so we can review.", time: "09:08" },
        { id: "demo_home_7", sender: "them", text: "Emma: Are we also updating the email campaign to match this?", time: "09:12" },
        { id: "demo_home_8", sender: "them", text: "David: Yes, that needs to go out Monday morning.", time: "09:13" },
        { id: "demo_home_9", sender: "them", text: "Rahul: Client still hasn’t approved the pricing change, right?", time: "09:18" },
        { id: "demo_home_10", sender: "them", text: "David: Not yet. Rahul, can you follow up with them?", time: "09:19" },
        { id: "demo_home_11", sender: "them", text: "John: Invoices still pending btw.", time: "09:35" },
        { id: "demo_home_12", sender: "them", text: "David: Yeah, those need to go today ideally.", time: "09:36" },
        { id: "demo_home_13", sender: "them", text: "Alex: Mobile layout was breaking yesterday. I’ll fix that too before QA.", time: "10:02" }
      ]
    },
    {
      id: "sales-handoff",
      name: "Sales Handoff",
      status: "3 open follow-ups",
      avatar: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=160&q=80",
      messages: [
        { id: "demo_sales_1", sender: "them", text: "Priya: New enterprise lead wants the security one-pager before EOD.", time: "11:10" },
        { id: "demo_sales_2", sender: "them", text: "Marc: I can update the pricing slide, but legal needs to approve the DPA by Wednesday EOD.", time: "11:12" },
        { id: "demo_sales_3", sender: "me", text: "Let’s keep this tight. Priya owns the one-pager, Marc owns pricing, and Nina should check DPA status.", time: "11:14" },
        { id: "demo_sales_4", sender: "them", text: "Nina: I’ll chase legal and send the update tomorrow EOD.", time: "11:16" }
      ]
    },
    {
      id: "ops-standup",
      name: "Ops Standup",
      status: "meeting transcript",
      avatar: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=160&q=80",
      messages: [
        { id: "demo_ops_1", sender: "them", text: "Maia: We need to finish the onboarding checklist by 22nd EOD.", time: "14:00" },
        { id: "demo_ops_2", sender: "them", text: "Omar: I’ll review the notification copy and test reminders today.", time: "14:02" },
        { id: "demo_ops_3", sender: "them", text: "Lea: Please assign me the Play Store screenshots and release notes.", time: "14:04" },
        { id: "demo_ops_4", sender: "me", text: "Good. Blu should organize these into tasks and let us confirm them one by one.", time: "14:05" }
      ]
    }
  ],
  tasks: [
    { id: "t1", conversationId: "launch", title: "Review payment confirmation copy", due: todayIso, priority: "high", assignee: "Me", done: false },
    { id: "t2", conversationId: "launch", title: "Publish beta onboarding checklist", due: todayIso, priority: "normal", assignee: "Launch Squad", done: false },
    { id: "t3", conversationId: "nina", title: "Compare venue shortlist prices", due: "", priority: "normal", assignee: "Nina Patel", done: false },
    { id: "t4", conversationId: "support", title: "Approve refund macro update", due: "", priority: "low", assignee: "Customer Support", done: true }
  ],
  bluAgent: {
    policy: {
      requireApproval: true,
      allowInternalTaskCreation: true,
      allowExternalSync: false,
      allowBackgroundJobs: false,
      allowedProviders: ["google_calendar"]
    },
    actions: []
  }
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
let activeReplyMessage = null;
let activeMediaTab = "emoji";
let activeMediaSearch = "";
let activeForwardMessage = null;
let voiceRecorder = null;
let voiceRecorderChunks = [];
let activeVoiceStream = null;
let currentSettingsView = "home";
let cryptoDbPromise;
let deviceIdentityPromise;
const conversationKeyCache = new Map();
let linkedDevices = [];
let adminAuditEvents = [];

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
  bluActionCount: document.querySelector("#bluActionCount"),
  bluActionList: document.querySelector("#bluActionList"),
  bluAllowBackgroundJobs: document.querySelector("#bluAllowBackgroundJobs"),
  bluAllowExternalSync: document.querySelector("#bluAllowExternalSync"),
  bluAllowTasks: document.querySelector("#bluAllowTasks"),
  bluPolicyForm: document.querySelector("#bluPolicyForm"),
  bluPolicyStatus: document.querySelector("#bluPolicyStatus"),
  bluRequireApproval: document.querySelector("#bluRequireApproval"),
  cancelDisappearingButton: document.querySelector("#cancelDisappearingButton"),
  cancelReplyButton: document.querySelector("#cancelReplyButton"),
  cancelNewChat: document.querySelector("#cancelNewChat"),
  cancelQuickTask: document.querySelector("#cancelQuickTask"),
  chatSearch: document.querySelector("#chatSearch"),
  chatsTabButton: document.querySelector("#chatsTabButton"),
  chatsTabView: document.querySelector("#chatsTabView"),
  closeDisappearingDialog: document.querySelector("#closeDisappearingDialog"),
  closeForwardDialog: document.querySelector("#closeForwardDialog"),
  closeInviteDialog: document.querySelector("#closeInviteDialog"),
  closeMediaTrayButton: document.querySelector("#closeMediaTrayButton"),
  closeAssignmentFallbackDialog: document.querySelector("#closeAssignmentFallbackDialog"),
  closeMcpDialog: document.querySelector("#closeMcpDialog"),
  closeQuickTaskDialog: document.querySelector("#closeQuickTaskDialog"),
  closeSettingsDialog: document.querySelector("#closeSettingsDialog"),
  contactSyncDialog: document.querySelector("#contactSyncDialog"),
  connectedApps: document.querySelector("#connectedApps"),
  copyAssignmentFallbackButton: document.querySelector("#copyAssignmentFallbackButton"),
  copyConnectCodeButton: document.querySelector("#copyConnectCodeButton"),
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
  disappearingDialog: document.querySelector("#disappearingDialog"),
  disappearingForm: document.querySelector("#disappearingForm"),
  disappearingMessagesButton: document.querySelector("#disappearingMessagesButton"),
  disappearingSelect: document.querySelector("#disappearingSelect"),
  editEmailButton: document.querySelector("#editEmailButton"),
  emailCode: document.querySelector("#emailCode"),
  appShell: document.querySelector("#appShell"),
  instagramShareLink: document.querySelector("#instagramShareLink"),
  forwardConversationList: document.querySelector("#forwardConversationList"),
  forwardDialog: document.querySelector("#forwardDialog"),
  forwardPreviewText: document.querySelector("#forwardPreviewText"),
  importAiReview: document.querySelector("#importAiReview"),
  importSourceChips: document.querySelector("#importSourceChips"),
  importSummary: document.querySelector("#importSummary"),
  importTaskReview: document.querySelector("#importTaskReview"),
  importWorkAppButton: document.querySelector("#importWorkAppButton"),
  inviteButton: document.querySelector("#inviteButton"),
  inviteContactsButton: document.querySelector("#inviteContactsButton"),
  inviteContactsDialog: document.querySelector("#inviteContactsDialog"),
  inviteDialog: document.querySelector("#inviteDialog"),
  inviteLink: document.querySelector("#inviteLink"),
  legacyConnectedApps: document.querySelector("#legacyConnectedApps"),
  mcpAppName: document.querySelector("#mcpAppName"),
  mcpButton: document.querySelector("#mcpButton"),
  mcpDialog: document.querySelector("#mcpDialog"),
  mcpEndpoint: document.querySelector("#mcpEndpoint"),
  mcpManifest: document.querySelector("#mcpManifest"),
  messageForm: document.querySelector("#messageForm"),
  messageInput: document.querySelector("#messageInput"),
  messageStream: document.querySelector("#messageStream"),
  mediaButton: document.querySelector("#mediaButton"),
  mediaGrid: document.querySelector("#mediaGrid"),
  mediaSearchInput: document.querySelector("#mediaSearchInput"),
  mediaTabs: document.querySelector("#mediaTabs"),
  mediaTray: document.querySelector("#mediaTray"),
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
  openSettingsButton: document.querySelector("#openSettingsButton"),
  openSettingsMenuButton: document.querySelector("#openSettingsMenuButton"),
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
  refreshBluActionsButton: document.querySelector("#refreshBluActionsButton"),
  refreshAdminAuditButton: document.querySelector("#refreshAdminAuditButton"),
  refreshSecurityButton: document.querySelector("#refreshSecurityButton"),
  replyPreview: document.querySelector("#replyPreview"),
  replyPreviewSender: document.querySelector("#replyPreviewSender"),
  replyPreviewText: document.querySelector("#replyPreviewText"),
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
  voiceNoteButton: document.querySelector("#voiceNoteButton"),
  closeShareImportDialog: document.querySelector("#closeShareImportDialog"),
  dismissReminderButton: document.querySelector("#dismissReminderButton"),
  nativeShareButton: document.querySelector("#nativeShareButton"),
  openReminderChatButton: document.querySelector("#openReminderChatButton"),
  saveShareToChatButton: document.querySelector("#saveShareToChatButton"),
  saveSettingsProfileButton: document.querySelector("#saveSettingsProfileButton"),
  scanQrButton: document.querySelector("#scanQrButton"),
  settingsAccountEmail: document.querySelector("#settingsAccountEmail"),
  settingsAccountRole: document.querySelector("#settingsAccountRole"),
  settingsAccountWorkspace: document.querySelector("#settingsAccountWorkspace"),
  settingsConnectCode: document.querySelector("#settingsConnectCode"),
  settingsBackButton: document.querySelector("#settingsBackButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsEyebrow: document.querySelector("#settingsEyebrow"),
  settingsHomeView: document.querySelector("#settingsHomeView"),
  settingsLastSeen: document.querySelector("#settingsLastSeen"),
  settingsMessagePreviewToggle: document.querySelector("#settingsMessagePreviewToggle"),
  settingsNotificationButton: document.querySelector("#settingsNotificationButton"),
  settingsNotificationStatus: document.querySelector("#settingsNotificationStatus"),
  settingsProfileHeading: document.querySelector("#settingsProfileHeading"),
  settingsProfileAbout: document.querySelector("#settingsProfileAbout"),
  settingsProfileName: document.querySelector("#settingsProfileName"),
  settingsProfilePhoto: document.querySelector("#settingsProfilePhoto"),
  settingsProfilePreview: document.querySelector("#settingsProfilePreview"),
  settingsProfileShell: document.querySelector("#settingsProfileShell"),
  settingsProfileSubheading: document.querySelector("#settingsProfileSubheading"),
  settingsProfileVisibility: document.querySelector("#settingsProfileVisibility"),
  settingsQrCode: document.querySelector("#settingsQrCode"),
  settingsQrStatus: document.querySelector("#settingsQrStatus"),
  settingsReadReceipts: document.querySelector("#settingsReadReceipts"),
  settingsSecurityStatus: document.querySelector("#settingsSecurityStatus"),
  settingsSessionStatus: document.querySelector("#settingsSessionStatus"),
  settingsStorageApps: document.querySelector("#settingsStorageApps"),
  settingsStorageMessages: document.querySelector("#settingsStorageMessages"),
  settingsStorageTasks: document.querySelector("#settingsStorageTasks"),
  settingsTaskReminderToggle: document.querySelector("#settingsTaskReminderToggle"),
  settingsTitle: document.querySelector("#settingsTitle"),
  revokeAllSessionsButton: document.querySelector("#revokeAllSessionsButton"),
  revokeCurrentSessionButton: document.querySelector("#revokeCurrentSessionButton"),
  rotateDeviceKeysButton: document.querySelector("#rotateDeviceKeysButton"),
  linkedDevicesList: document.querySelector("#linkedDevicesList"),
  adminAuditList: document.querySelector("#adminAuditList"),
  adminAuditStatus: document.querySelector("#adminAuditStatus"),
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
normalizeBluAgent();
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
els.workspaceTabButton?.addEventListener("click", () => switchTab("workspace"));
els.roleViewSelect.addEventListener("change", () => {
  state.workspace.role = els.roleViewSelect.value;
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
els.closeForwardDialog?.addEventListener("click", () => els.forwardDialog.close());
els.disappearingMessagesButton?.addEventListener("click", openDisappearingDialog);
els.closeDisappearingDialog?.addEventListener("click", () => els.disappearingDialog.close());
els.cancelDisappearingButton?.addEventListener("click", () => els.disappearingDialog.close());
els.disappearingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveDisappearingMode();
});
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
els.shareToTaskButton.addEventListener("click", reviewSharedContentWithBlu);
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

els.openSettingsButton?.addEventListener("click", openSettingsDialog);
els.openSettingsMenuButton?.addEventListener("click", openSettingsDialog);
els.closeSettingsDialog?.addEventListener("click", () => els.settingsDialog.close());
els.settingsBackButton?.addEventListener("click", () => setSettingsView("home"));
els.saveSettingsProfileButton?.addEventListener("click", saveSettingsProfile);
els.settingsProfilePhoto?.addEventListener("change", updateSettingsProfilePhoto);
els.copyConnectCodeButton?.addEventListener("click", copyConnectCode);
els.scanQrButton?.addEventListener("click", simulateQrScan);
els.settingsNotificationButton?.addEventListener("click", requestNotificationPermission);
els.revokeCurrentSessionButton?.addEventListener("click", () => revokeSessionFromSettings("current"));
els.revokeAllSessionsButton?.addEventListener("click", () => revokeSessionFromSettings("all"));
els.rotateDeviceKeysButton?.addEventListener("click", rotateCurrentDeviceKeys);
els.refreshSecurityButton?.addEventListener("click", syncSecurityFromBackend);
els.refreshAdminAuditButton?.addEventListener("click", syncAdminAuditFromBackend);
document.querySelectorAll("[data-settings-target]").forEach((button) => {
  button.addEventListener("click", () => setSettingsView(button.dataset.settingsTarget));
});
els.mcpButton?.addEventListener("click", () => {
  els.moreMenuPanel.hidden = true;
  openSettingsDialog();
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

els.bluPolicyForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveBluPolicy();
});

els.refreshBluActionsButton.addEventListener("click", syncBluAgentFromBackend);

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
els.mediaButton.addEventListener("click", () => {
  if (els.mediaTray.hidden) {
    openMediaTray(activeMediaTab);
    return;
  }
  closeMediaTray();
});
els.closeMediaTrayButton?.addEventListener("click", closeMediaTray);
els.mediaTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-media-tab]");
  if (!button) return;
  openMediaTray(button.dataset.mediaTab || "emoji");
});
els.mediaSearchInput?.addEventListener("input", () => {
  activeMediaSearch = els.mediaSearchInput.value.trim().toLowerCase();
  renderMediaTray();
});
els.voiceNoteButton?.addEventListener("click", toggleVoiceRecording);
document.addEventListener("click", (event) => {
  if (els.mediaTray.hidden) return;
  const insideTray = event.target.closest("#mediaTray");
  const onMediaButton = event.target.closest("#mediaButton");
  if (!insideTray && !onMediaButton) {
    closeMediaTray();
  }
});
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
  const bluCommand = parseBluCommand(text);
  const replyTo = consumeActiveReply();

  if (text.toLowerCase().startsWith("/todo ")) {
    await createTaskWithFeedback({
      title: text.slice(6).trim(),
      due: "",
      priority: "normal",
      assignee: "Me",
      reminderAt: "",
      source: "composer"
    });
  } else if (bluCommand) {
    await addMessage(text, "me", { replyTo });
    await answerWithBlu(bluCommand.prompt);
  } else {
    await addMessage(text, "me", { replyTo });
  }

  els.messageInput.value = "";
});

els.cancelReplyButton.addEventListener("click", clearActiveReply);

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

els.newChatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = els.newChatName.value.trim();
  if (!name) return;

  let conversation;
  if (getAuthToken()) {
    try {
      const data = await apiFetch("/api/conversations", {
        method: "POST",
        body: {
          name,
          type: "group"
        }
      });
      conversation = mapBackendConversation(data.conversation || {});
    } catch (error) {
      console.warn("New chat saved locally but backend creation failed:", error);
    }
  }

  const id = conversation?.id || `${Date.now()}`;
  state.conversations.unshift(conversation || {
    id,
    name,
    status: els.newChatStatus.value.trim() || "new conversation",
    avatar: createAvatarDataUrl(name),
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
  cleanupExpiredMessages();
  localStorage.setItem("taskchat-state", JSON.stringify(state));
}

async function bootstrap() {
  encryptionKey = await loadEncryptionKey();
  normalizeConversations();
  await normalizeEncryptedMessages();
  if (isRegistered() && getAuthToken()) {
    await syncFromBackend();
    await ensureDeviceRegistration().catch((error) => console.warn("Device registration unavailable:", error));
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
    els.workEmail.setCustomValidity(`Could not start email login. ${formatNetworkError(error)}`);
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
  if (getAuthToken()) {
    try {
      const data = await apiFetch("/api/me", {
        method: "PATCH",
        body: { name, about }
      });
      if (data.user) {
        state.registration.user = {
          ...state.registration.user,
          ...data.user,
          about: data.user.about || about
        };
      }
    } catch (error) {
      console.warn("Profile saved locally but backend update failed:", error);
    }
  }
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

  seedState.conversations.forEach((seedConversation) => {
    const isDemoScenario = ["homepage-refresh", "sales-handoff", "ops-standup"].includes(seedConversation.id);
    if (isDemoScenario && !state.conversations.some((conversation) => conversation.id === seedConversation.id)) {
      state.conversations.push(structuredClone(seedConversation));
    }
  });

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

function normalizeBluAgent() {
  state.bluAgent ||= structuredClone(seedState.bluAgent);
  state.bluAgent.policy = {
    ...structuredClone(seedState.bluAgent.policy),
    ...(state.bluAgent.policy || {})
  };
  state.bluAgent.actions ||= [];
}

function normalizeTasks() {
  state.tasks ||= [];
  state.tasks.forEach((task) => {
    repairInvertedTaskAssignment(task);
    task.assignees = parseAssignees(task.assignees || task.assignee || "Me");
    task.assignee = formatAssignees(task.assignees);
    task.reminderAt ||= "";
    task.remindedAt ||= "";
  });
}

function repairInvertedTaskAssignment(task) {
  if (!task) return;
  const title = String(task.title || "").trim();
  const assignee = formatAssignees(task.assignees || task.assignee || "").trim();
  if (!title || !assignee) return;
  const titleLooksLikePerson = looksLikePersonName(title);
  const assigneeLooksLikeAction = looksLikeActionText(assignee);
  if (!titleLooksLikePerson || !assigneeLooksLikeAction) return;

  task.title = cleanTaskTitle(assignee);
  task.due ||= extractTaskDue(assignee);
  task.assignee = title;
  task.assignees = [title];
  task.assignmentFallback = getAssignmentFallback(title, task.title, task.due);
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
  const isTasks = tab === "tasks";
  const isChats = tab === "chats";
  els.chatsTabButton.classList.toggle("active", isChats);
  els.tasksTabButton.classList.toggle("active", isTasks);
  els.chatsTabView.classList.toggle("active", isChats);
  els.tasksTabView.classList.toggle("active", isTasks);
  els.workspaceTabButton?.classList.toggle("active", false);
  els.workspaceTabView?.classList.toggle("active", false);
}

function isAdminView() {
  return state.workspace?.role !== "Employee";
}

function renderRoleUI() {
  const isAdmin = isAdminView();
  els.roleViewSelect.value = isAdmin ? "Admin" : "Employee";
  if (els.workspaceTabButton) {
    els.workspaceTabButton.hidden = true;
  }
  els.newChatButton.hidden = !isAdmin;
  const adminSections = document.querySelectorAll(".admin-settings-section");
  adminSections.forEach((section) => {
    section.hidden = !isAdmin;
  });
  if (!isAdmin && currentSettingsView === "admin") {
    setSettingsView("home");
  }
}

function resetDemo() {
  state = structuredClone(seedState);
  currentView = "home";
  normalizeRegistrationState();
  normalizeWorkspace();
  normalizeConnectedApps();
  normalizeBluAgent();
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

  renderConnectedApps();
  renderCompanySoftware();
  renderBluPolicy();
  renderBluActions();
  renderSettingsProfile();
  renderSettingsConnect();
  renderSecuritySettings();
  renderAdminAudit();
}

function renderSettingsProfile() {
  const user = state.registration.user || {};
  const fallbackName = user.name || getNameFromEmail(state.registration.pendingEmail || "") || "You";
  const about = user.about || "Available";
  const avatar = user.photoDataUrl || createAvatarDataUrl(fallbackName);
  if (els.settingsProfileName) els.settingsProfileName.value = fallbackName;
  if (els.settingsProfileAbout) els.settingsProfileAbout.value = about;
  if (els.settingsProfileHeading) els.settingsProfileHeading.textContent = fallbackName;
  if (els.settingsProfileSubheading) els.settingsProfileSubheading.textContent = about;
  if (els.settingsProfilePreview) {
    els.settingsProfilePreview.src = avatar;
    els.settingsProfilePreview.alt = `${fallbackName} profile picture`;
  }
  if (els.settingsAccountEmail) {
    els.settingsAccountEmail.textContent = user.email || state.registration.pendingEmail || "Add your work email";
  }
  if (els.settingsAccountWorkspace) {
    els.settingsAccountWorkspace.textContent = state.workspace.name || "Workspace";
  }
  if (els.settingsAccountRole) {
    els.settingsAccountRole.textContent = state.workspace.role || "Member";
  }
  if (els.settingsStorageMessages) {
    const messageCount = state.conversations.reduce((total, conversation) => total + (conversation.messages?.length || 0), 0);
    els.settingsStorageMessages.textContent = `${messageCount} messages`;
  }
  if (els.settingsStorageTasks) {
    els.settingsStorageTasks.textContent = `${state.tasks.length} tasks`;
  }
  if (els.settingsStorageApps) {
    const connectedCount = state.connectedApps.filter((app) => app.connected).length;
    els.settingsStorageApps.textContent = `${connectedCount} connected`;
  }
}

function renderSettingsConnect() {
  const code = getSettingsConnectCode();
  if (els.settingsConnectCode) els.settingsConnectCode.value = code;
  if (els.settingsQrCode) els.settingsQrCode.innerHTML = `<span>${escapeHtml(getInitials(state.registration.user?.name || "TM"))}</span><small>${escapeHtml(code.slice(0, 6))}</small>`;
}

function getSettingsConnectCode() {
  return `TM-${normalizeEmailUserId(state.registration.user?.email || state.workspace.domain || "guest").slice(0, 8).toUpperCase()}`;
}

function setSettingsView(view = "home") {
  currentSettingsView = view;
  const isHome = view === "home";
  if (els.settingsHomeView) {
    els.settingsHomeView.hidden = !isHome;
  }
  if (els.settingsProfileShell) {
    els.settingsProfileShell.hidden = !isHome;
  }
  if (els.settingsBackButton) {
    els.settingsBackButton.hidden = isHome;
  }
  if (els.settingsEyebrow) {
    els.settingsEyebrow.textContent = isHome ? "Settings" : "Settings";
  }
  if (els.settingsTitle) {
    els.settingsTitle.textContent = getSettingsViewTitle(view);
  }
  document.querySelectorAll("[data-settings-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.settingsPanel !== view;
  });
  if (els.workspaceTabView) {
    els.workspaceTabView.scrollTop = 0;
  }
}

function getSettingsViewTitle(view) {
  const titles = {
    home: "Settings",
    account: "Account",
    devices: "Linked devices",
    security: "Security",
    privacy: "Privacy",
    notifications: "Notifications",
    storage: "Storage and data",
    apps: "Connected apps",
    admin: "Workspace admin"
  };
  return titles[view] || "Settings";
}

function openSettingsDialog() {
  els.moreMenuPanel.hidden = true;
  renderWorkspace();
  setSettingsView("home");
  syncSecurityFromBackend();
  syncAdminAuditFromBackend();
  try {
    els.settingsDialog.showModal();
  } catch {
    els.settingsDialog.show();
  }
}

async function saveSettingsProfile() {
  const name = els.settingsProfileName.value.trim() || state.registration.user?.name || "You";
  const about = els.settingsProfileAbout.value.trim() || "Available";
  state.registration.user ||= {};
  state.registration.user.name = name;
  state.registration.user.about = about;
  if (els.settingsProfilePreview?.src) {
    state.registration.user.photoDataUrl = els.settingsProfilePreview.src;
  }
  saveState();
  renderSettingsProfile();
  if (getAuthToken()) {
    try {
      const data = await apiFetch("/api/me", {
        method: "PATCH",
        body: { name, about }
      });
      state.registration.user = {
        ...state.registration.user,
        ...(data.user || {})
      };
      saveState();
    } catch (error) {
      console.warn("Settings profile saved locally but backend update failed:", error);
    }
  }
  render();
}

function updateSettingsProfilePhoto() {
  const file = els.settingsProfilePhoto.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === "string" ? reader.result : "";
    if (!result) return;
    state.registration.user ||= {};
    state.registration.user.photoDataUrl = result;
    saveState();
    renderSettingsProfile();
  };
  reader.readAsDataURL(file);
}

async function copyConnectCode() {
  const code = els.settingsConnectCode.value || getSettingsConnectCode();
  try {
    await navigator.clipboard.writeText(code);
    els.settingsQrStatus.textContent = "Connect code copied.";
  } catch {
    els.settingsConnectCode.select();
    document.execCommand("copy");
    els.settingsQrStatus.textContent = "Connect code selected and copied.";
  }
}

function simulateQrScan() {
  els.settingsQrStatus.textContent = "Camera scanning can be linked here. For now, paste or share your TodoMessenger connect code.";
}

async function buildDeviceFingerprint(identityKey) {
  try {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableJson(identityKey || {})));
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return hex.match(/.{1,4}/g)?.slice(0, 8).join(" ") || hex.slice(0, 32);
  } catch {
    return "Unavailable";
  }
}

async function getTrustedDeviceStore() {
  return (await getCryptoStoreValue("kv", "trustedDevices")) || {};
}

async function setTrustedDeviceState(deviceId, value) {
  const trustedDevices = await getTrustedDeviceStore();
  if (value) {
    trustedDevices[deviceId] = value;
  } else {
    delete trustedDevices[deviceId];
  }
  await setCryptoStoreValue("kv", "trustedDevices", trustedDevices);
}

function renderSecuritySettings() {
  if (els.settingsSessionStatus) {
    els.settingsSessionStatus.textContent = getAuthToken()
      ? "Your current session is active."
      : "You are signed out on this device.";
  }
  if (els.settingsSecurityStatus) {
    els.settingsSecurityStatus.textContent = linkedDevices.length
      ? `TodoMessenger sees ${linkedDevices.length} active device${linkedDevices.length === 1 ? "" : "s"} for this account.`
      : "TodoMessenger stores device keys in secure browser storage.";
  }
  if (!els.linkedDevicesList) return;

  els.linkedDevicesList.innerHTML = "";
  if (!linkedDevices.length) {
    els.linkedDevicesList.innerHTML = `<p class="helper-text">No linked devices are synced yet.</p>`;
    return;
  }

  getCurrentDeviceId().then((currentDeviceId) => {
    return getTrustedDeviceStore().then(async (trustedDevices) => {
      els.linkedDevicesList.innerHTML = "";
      for (const device of linkedDevices) {
      const isCurrent = device.deviceId === currentDeviceId;
      const fingerprint = await buildDeviceFingerprint(device.identityKey);
      const trusted = Boolean(trustedDevices?.[device.deviceId]?.trusted);
      const card = document.createElement("article");
      card.className = "settings-device-card";
      card.innerHTML = `
        <div>
          <strong>${escapeHtml(device.deviceLabel || "Device")}</strong>
          <span>${isCurrent ? "This browser" : "Linked device"} - ${escapeHtml(formatDateTime(device.updatedAt || ""))}</span>
          <div class="settings-device-meta">
            <span class="pill">${escapeHtml(device.deviceId)}</span>
            ${isCurrent ? `<span class="pill">Current</span>` : ""}
            ${trusted ? `<span class="pill">Trusted</span>` : `<span class="pill">Unverified</span>`}
          </div>
          <span class="helper-text">Fingerprint: ${escapeHtml(fingerprint)}</span>
        </div>
        <div class="settings-device-actions">
          <button class="ghost-button" type="button" data-action="trust">${trusted ? "Untrust" : "Trust device"}</button>
          <button class="ghost-button" type="button" data-action="revoke">${isCurrent ? "Revoke and sign out" : "Revoke device"}</button>
        </div>
      `;
      card.querySelector('[data-action="trust"]').addEventListener("click", async () => {
        await setTrustedDeviceState(device.deviceId, trusted ? null : {
          trusted: true,
          fingerprint,
          trustedAt: new Date().toISOString()
        });
        renderSecuritySettings();
      });
      card.querySelector('[data-action="revoke"]').addEventListener("click", () => revokeLinkedDevice(device, isCurrent));
      els.linkedDevicesList.append(card);
      }
    });
  }).catch(() => {
    els.linkedDevicesList.innerHTML = `<p class="helper-text">Could not load the current device identity.</p>`;
  });
}

function renderAdminAudit() {
  if (!els.adminAuditList || !els.adminAuditStatus) return;
  if (!isAdminView()) {
    els.adminAuditStatus.textContent = "Admin audit is available to admins and team leads.";
    els.adminAuditList.innerHTML = "";
    return;
  }
  if (!adminAuditEvents.length) {
    els.adminAuditStatus.textContent = "No admin audit events yet.";
    els.adminAuditList.innerHTML = "";
    return;
  }

  els.adminAuditStatus.textContent = `${adminAuditEvents.length} recent audit event${adminAuditEvents.length === 1 ? "" : "s"}.`;
  els.adminAuditList.innerHTML = "";
  adminAuditEvents.forEach((event) => {
    const card = document.createElement("article");
    card.className = "settings-audit-card";
    card.innerHTML = `
      <div class="settings-audit-header">
        <strong>${escapeHtml(event.actionType || "admin.event")}</strong>
        <span>${escapeHtml(formatDateTime(event.createdAt || ""))}</span>
      </div>
      <span class="helper-text">${escapeHtml(event.actorName || "Unknown user")}${event.actorEmail ? ` - ${escapeHtml(event.actorEmail)}` : ""}</span>
      <pre class="settings-audit-target">${escapeHtml(formatAuditTarget(event.target))}</pre>
    `;
    els.adminAuditList.append(card);
  });
}

function formatAuditTarget(target) {
  try {
    return JSON.stringify(target || {}, null, 2);
  } catch {
    return "{}";
  }
}

async function syncSecurityFromBackend() {
  if (!getAuthToken()) {
    linkedDevices = [];
    renderSecuritySettings();
    return;
  }
  try {
    const data = await apiFetch("/api/e2ee/devices");
    linkedDevices = Array.isArray(data.devices) ? data.devices : [];
    renderSecuritySettings();
  } catch (error) {
    if (els.settingsSecurityStatus) {
      els.settingsSecurityStatus.textContent = `Could not load device security. ${formatApiError(error.message || error)}`;
    }
  }
}

async function syncAdminAuditFromBackend() {
  if (!getAuthToken() || !isAdminView()) {
    adminAuditEvents = [];
    renderAdminAudit();
    return;
  }
  try {
    const data = await apiFetch("/api/admin/audit?limit=50");
    adminAuditEvents = Array.isArray(data.events) ? data.events : [];
    renderAdminAudit();
  } catch (error) {
    if (els.adminAuditStatus) {
      els.adminAuditStatus.textContent = `Could not load admin audit. ${formatApiError(error.message || error)}`;
    }
  }
}

async function syncConversationMembershipSecurity() {
  if (!getAuthToken()) return;
  for (const conversation of state.conversations) {
    if (!conversation?.id) continue;
    const memberSignature = getConversationMemberSignature(conversation.id);
    if (!memberSignature) continue;
    const record = await loadConversationKeyRecord(conversation.id);
    if (!record) continue;
    if (record.memberSignature && record.memberSignature !== memberSignature) {
      await rotateConversationKeyForMembershipChange(conversation.id, memberSignature);
      continue;
    }
    if (!record.memberSignature) {
      record.memberSignature = memberSignature;
      await saveConversationKeyRecord(conversation.id, record);
    }
  }
}

async function rotateConversationKeyForMembershipChange(conversationId, memberSignature) {
  const nextVersion = Number(((await loadConversationKeyRecord(conversationId))?.currentVersion || 1) + 1);
  const nextKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  await persistConversationKey(conversationId, nextKey, {
    version: nextVersion,
    memberSignature,
    rekeyedAt: new Date().toISOString()
  });
  conversationKeyCache.delete(`${conversationId}:current`);
  await shareConversationKey(conversationId, nextKey);
}

async function revokeSessionFromSettings(scope) {
  if (!getAuthToken()) return;
  const isAll = scope === "all";
  const confirmed = window.confirm(
    isAll
      ? "Log out from all devices and revoke every active session?"
      : "Log out from this device and revoke the current session?"
  );
  if (!confirmed) return;

  try {
    await apiFetch(isAll ? "/api/auth/logout-all" : "/api/auth/logout", { method: "POST" });
  } catch (error) {
    if (els.settingsSessionStatus) {
      els.settingsSessionStatus.textContent = `Could not revoke the session. ${formatApiError(error.message || error)}`;
    }
    return;
  }

  await completeLocalSignOut(isAll ? "All sessions were revoked." : "This device was signed out.");
}

async function completeLocalSignOut(statusText = "Signed out.") {
  if (realtimeSocket) {
    try {
      realtimeSocket.close();
    } catch {}
    realtimeSocket = null;
  }
  state.registration.sessionToken = "";
  state.registration.user = null;
  state.registration.step = "email";
  state.registration.pendingCode = "";
  state.registration.demoCode = "";
  linkedDevices = [];
  adminAuditEvents = [];
  saveState();
  renderRegistration();
  render();
  if (els.settingsSessionStatus) {
    els.settingsSessionStatus.textContent = statusText;
  }
  els.settingsDialog?.close();
}

async function revokeLinkedDevice(device, isCurrent = false) {
  if (!device?.deviceId || !getAuthToken()) return;
  const confirmed = window.confirm(
    isCurrent
      ? "Revoke this current device? You will be signed out and this browser will need to register again."
      : `Revoke ${device.deviceLabel || "this device"}?`
  );
  if (!confirmed) return;

  try {
    await apiFetch(`/api/e2ee/devices/${encodeURIComponent(device.deviceId)}`, {
      method: "PATCH",
      body: { action: "revoke" }
    });
  } catch (error) {
    if (els.settingsSecurityStatus) {
      els.settingsSecurityStatus.textContent = `Could not revoke the device. ${formatApiError(error.message || error)}`;
    }
    return;
  }

  if (isCurrent) {
    await setTrustedDeviceState(device.deviceId, null);
    await deleteCryptoStoreValue("kv", "deviceIdentity").catch(() => {});
    deviceIdentityPromise = null;
    await completeLocalSignOut("This device was revoked and signed out.");
    return;
  }

  await setTrustedDeviceState(device.deviceId, null);
  linkedDevices = linkedDevices.filter((item) => item.deviceId !== device.deviceId);
  renderSecuritySettings();
  syncAdminAuditFromBackend();
}

async function rotateCurrentDeviceKeys() {
  if (!getAuthToken()) return;
  if (!window.confirm("Rotate this device key now? Existing local conversation keys stay on this browser, and new envelopes will be re-shared.")) {
    return;
  }

  try {
    const conversationIds = state.conversations.map((conversation) => conversation.id).filter(Boolean);
    await deleteCryptoStoreValue("kv", "deviceIdentity").catch(() => {});
    deviceIdentityPromise = null;
    await ensureDeviceRegistration();
    for (const conversationId of conversationIds) {
      const key = await getConversationKey(conversationId, { skipShare: true });
      if (key) {
        await shareConversationKey(conversationId, key);
      }
    }
    await syncSecurityFromBackend();
    await syncAdminAuditFromBackend();
    if (els.settingsSecurityStatus) {
      els.settingsSecurityStatus.textContent = "This device key was rotated and conversation keys were re-shared.";
    }
  } catch (error) {
    if (els.settingsSecurityStatus) {
      els.settingsSecurityStatus.textContent = `Could not rotate this device key. ${formatApiError(error.message || error)}`;
    }
  }
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

function renderBluPolicy() {
  normalizeBluAgent();
  const policy = state.bluAgent.policy;
  els.bluRequireApproval.checked = policy.requireApproval !== false;
  els.bluAllowTasks.checked = policy.allowInternalTaskCreation !== false;
  els.bluAllowExternalSync.checked = policy.allowExternalSync === true;
  els.bluAllowBackgroundJobs.checked = policy.allowBackgroundJobs === true;
}

function renderBluActions() {
  normalizeBluAgent();
  const actions = state.bluAgent.actions;
  const pending = actions.filter((action) => action.status === "pending").length;
  els.bluActionCount.textContent = `${pending} pending`;
  els.bluActionList.innerHTML = "";
  if (!actions.length) {
    els.bluActionList.innerHTML = `<p class="helper-text">Blu actions will appear here when Blu suggests work.</p>`;
    return;
  }

  actions.slice(0, 12).forEach((action) => {
    const card = document.createElement("article");
    card.className = `blu-action-card ${action.status || "pending"}`;
    card.innerHTML = `
      <div>
        <span class="agent-action-type">${escapeHtml(formatAgentActionType(action.type))}</span>
        <strong>${escapeHtml(action.title || "Untitled action")}</strong>
        <span>${escapeHtml(action.reason || action.source || "Suggested by Blu")}</span>
        <div class="inline-task-meta">
          <span>${escapeHtml(action.assignee || "Me")}</span>
          ${action.due ? `<span>Due ${escapeHtml(formatDate(action.due))}</span>` : ""}
          <span>${escapeHtml(action.status || "pending")}</span>
        </div>
      </div>
      <menu>
        ${action.status === "pending" ? `<button class="primary-button" type="button" data-action="approve">Approve</button><button class="ghost-button" type="button" data-action="reject">Reject</button>` : `<span class="helper-text">${escapeHtml(action.status)}</span>`}
      </menu>
    `;
    card.querySelector('[data-action="approve"]')?.addEventListener("click", () => updateBluActionStatus(action, "approved"));
    card.querySelector('[data-action="reject"]')?.addEventListener("click", () => updateBluActionStatus(action, "rejected"));
    els.bluActionList.append(card);
  });
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
      clearActiveReply();
      saveState();
      render();
    });
    els.conversationList.append(button);
  });
}

async function renderActiveChat() {
  cleanupExpiredMessages();
  const conversation = getActiveConversation();
  if (!conversation) {
    els.activeAvatar.src = createAvatarDataUrl("TodoMessenger");
    els.activeAvatar.alt = "TodoMessenger avatar";
    els.activeName.textContent = "TodoMessenger";
    els.activeStatus.textContent = "Start a chat or add your first task";
    els.messageStream.innerHTML = `<p class="empty-state">Your workspace is ready. Start a chat from the left panel.</p>`;
    return;
  }
  closeMediaTray();
  if (activeReplyMessage && !conversation.messages.some((message) => message.id === activeReplyMessage.id)) {
    clearActiveReply();
  } else {
    renderReplyPreview();
  }
  els.activeAvatar.onerror = () => {
    els.activeAvatar.src = createAvatarDataUrl(conversation.name);
  };
  els.activeAvatar.src = getConversationAvatar(conversation);
  els.activeAvatar.alt = `${conversation.name} avatar`;
  els.activeName.textContent = conversation.name;
  els.activeStatus.textContent = conversation.disappearingMode && conversation.disappearingMode !== "off"
    ? `${conversation.status} · disappearing ${formatDisappearingMode(conversation.disappearingMode)}`
    : conversation.status;

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
    const isAgentPlan = Boolean(message.agentPlan);
    bubble.className = `message ${message.sender} ${isTaskCard ? "task-message" : ""} ${isAgentPlan ? "agent-message" : ""}`;
    bubble.innerHTML = `
      ${renderForwardBadge(message)}
      ${renderReplyQuote(message.replyTo)}
      ${isTaskCard ? renderInlineTaskCard(message.taskCard) : isAgentPlan ? renderAgentPlan(message.agentPlan) : renderMessageText(message.displayText)}
      ${renderBluTaskSuggestions(message.bluTaskSuggestions)}
      ${renderMessageAttachments(message.attachments)}
      ${renderMessageReactions(message)}
      ${renderReactionPicker(message)}
      <footer class="message-footer">
        <span class="message-actions">
          <button class="message-reply-button" type="button">Reply</button>
          ${isTaskCard || isAgentPlan ? "" : `<button class="message-task-button" type="button">Add task</button>`}
          <button class="message-forward-button" type="button">Forward</button>
          <button class="message-react-button" type="button">React</button>
        </span>
        <span class="meta">${escapeHtml(message.time)}${renderReadReceipt(message)}</span>
      </footer>
    `;
    bubble.querySelector(".message-reply-button")?.addEventListener("click", () => {
      startReplyToMessage(message);
    });
    bubble.querySelector(".message-task-button")?.addEventListener("click", () => {
      openQuickTaskDialog(message.displayText, `${conversation.name} message`);
    });
    bubble.querySelector(".message-forward-button")?.addEventListener("click", () => {
      openForwardDialog(message);
    });
    bubble.querySelector(".message-react-button")?.addEventListener("click", () => {
      toggleReactionPicker(message.id);
    });
    bubble.querySelectorAll("[data-reaction]").forEach((button) => {
      button.addEventListener("click", async () => {
        await addReactionToMessage(message.id, button.dataset.reaction || "");
      });
    });
    bubble.querySelectorAll("[data-agent-action-id]").forEach((button) => {
      button.addEventListener("click", () => approveAgentAction(message, button.dataset.agentActionId));
    });
    bubble.querySelectorAll("[data-blu-task-id]").forEach((button) => {
      button.addEventListener("click", () => addBluSuggestedTask(message, button.dataset.bluTaskId));
    });
    els.messageStream.append(bubble);
  });
  els.messageStream.scrollTop = els.messageStream.scrollHeight;
  void markConversationRead(conversation.id);
}

function renderReplyQuote(replyTo) {
  if (!replyTo?.text) return "";
  return `
    <div class="reply-quote">
      <strong>${escapeHtml(replyTo.sender || "Message")}</strong>
      <span>${escapeHtml(replyTo.text)}</span>
    </div>
  `;
}

function renderForwardBadge(message) {
  if (!message.forwarded) return "";
  return `<span class="message-forwarded">Forwarded</span>`;
}

function startReplyToMessage(message) {
  activeReplyMessage = {
    id: message.id,
    sender: message.sender === "me" ? "You" : getActiveConversation()?.name || "Them",
    text: getReplyPreviewText(message)
  };
  renderReplyPreview();
  els.messageInput.focus();
}

function getReplyPreviewText(message) {
  const text = message.displayText || message.preview || "";
  if (text) return text.replace(/\s+/g, " ").trim().slice(0, 120);
  if (message.taskCard?.title) return `Task: ${message.taskCard.title}`.slice(0, 120);
  if (message.agentPlan?.summary) return `Blu: ${message.agentPlan.summary}`.slice(0, 120);
  if (message.attachments?.length) return `Attachment: ${message.attachments[0].name || "file"}`.slice(0, 120);
  return "Message";
}

function renderReplyPreview() {
  if (!activeReplyMessage) {
    els.replyPreview.hidden = true;
    els.messageForm.classList.remove("is-replying");
    return;
  }
  els.replyPreviewSender.textContent = `Replying to ${activeReplyMessage.sender}`;
  els.replyPreviewText.textContent = activeReplyMessage.text;
  els.replyPreview.hidden = false;
  els.messageForm.classList.add("is-replying");
}

function clearActiveReply() {
  activeReplyMessage = null;
  renderReplyPreview();
}

function consumeActiveReply() {
  const replyTo = activeReplyMessage ? { ...activeReplyMessage } : null;
  clearActiveReply();
  return replyTo;
}

function normalizeReplyTo(replyTo) {
  if (!replyTo?.text) return null;
  return {
    id: String(replyTo.id || "").slice(0, 120),
    sender: String(replyTo.sender || "Message").slice(0, 80),
    text: String(replyTo.text || "").replace(/\s+/g, " ").trim().slice(0, 120)
  };
}

function renderMessageText(text) {
  const normalized = normalizeBluDisplayText(text);
  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) return "<p></p>";

  return `<div class="message-text">${blocks.map(renderMessageBlock).join("")}</div>`;
}

function renderMessageBlock(block) {
  const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return "";

  const heading = lines[0].match(/^#{1,3}\s+(.+)$/) || lines[0].match(/^([A-Z][A-Za-z /&-]{2,36}):$/);
  if (heading && lines.length === 1) {
    return `<h3>${renderInlineFormatting(heading[1])}</h3>`;
  }

  if (lines.every((line) => /^[-*]\s+/.test(line))) {
    return `<ul>${lines.map((line) => `<li>${renderInlineFormatting(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
  }

  if (heading && lines.length > 1) {
    const rest = lines.slice(1);
    const body = rest.every((line) => /^[-*]\s+/.test(line))
      ? `<ul>${rest.map((line) => `<li>${renderInlineFormatting(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`
      : rest.map((line) => `<p>${renderInlineFormatting(line)}</p>`).join("");
    return `<section><h3>${renderInlineFormatting(heading[1])}</h3>${body}</section>`;
  }

  return lines.map((line) => `<p>${renderInlineFormatting(line)}</p>`).join("");
}

function renderInlineFormatting(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function normalizeBluDisplayText(text) {
  return String(text || "")
    .replace(/\s*###\s+/g, "\n\n### ")
    .replace(/\s+-\s+(?=(?:\*\*)?[A-Z0-9])/g, "\n- ")
    .replace(/\s+(\*\*Suggested task title:\*\*)/i, "\n\n$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderInlineTaskCard(task) {
  return `
    <section class="inline-task-card ${escapeHtml(task.priority || "normal")}">
      <p class="eyebrow">Task created</p>
      <strong>${escapeHtml(task.title || "Untitled task")}</strong>
      <div class="inline-task-meta">
        ${renderAssigneePills(task)}
        <span>${task.due ? `Due ${escapeHtml(formatDate(task.due))}` : "No due date"}</span>
        <span>${escapeHtml(task.priority || "normal")} priority</span>
      </div>
    </section>
  `;
}

function renderAgentPlan(plan) {
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  return `
    <section class="agent-plan-card">
      <p class="eyebrow">Blu agent plan</p>
      <strong>${escapeHtml(plan.summary || "Blu found actions to review.")}</strong>
      <div class="agent-action-list">
        ${actions.length ? actions.map(renderAgentAction).join("") : `<p class="helper-text">No safe action found yet.</p>`}
      </div>
    </section>
  `;
}

function renderBluTaskSuggestions(tasks = []) {
  const pendingTasks = tasks.filter((task) => task.status !== "added");
  if (!pendingTasks.length) return "";
  return `
    <section class="blu-task-suggestions">
      <p class="eyebrow">Add from Blu</p>
      ${pendingTasks.map((task) => `
        <article class="blu-task-suggestion">
          <div>
            <strong>${escapeHtml(task.title || "Untitled task")}</strong>
            <span>${escapeHtml(task.reason || "Suggested from Blu's organization")}</span>
            <div class="inline-task-meta">
              <span>${escapeHtml(formatAssignees(task.assignees || task.assignee || "Me"))}</span>
              ${task.due ? `<span>Due ${escapeHtml(formatDate(task.due))}</span>` : ""}
              <span>${escapeHtml(task.priority || "normal")} priority</span>
            </div>
          </div>
          <button class="primary-button" type="button" data-blu-task-id="${escapeHtml(task.id)}">Add task</button>
        </article>
      `).join("")}
    </section>
  `;
}

function renderMessageReactions(message) {
  const groups = summarizeReactions(message.reactions);
  if (!groups.length) return "";
  return `
    <div class="message-reaction-bar">
      ${groups.map((group) => `<span class="reaction-pill">${escapeHtml(group.emoji)} <span>${group.count}</span></span>`).join("")}
    </div>
  `;
}

function renderReactionPicker(message) {
  if (message.reactionPickerOpen !== true) return "";
  return `
    <div class="reaction-picker">
      ${quickReactions.map((reaction) => `<button class="reaction-option" type="button" data-reaction="${escapeHtml(reaction)}" aria-label="React with ${escapeHtml(reaction)}">${escapeHtml(reaction)}</button>`).join("")}
    </div>
  `;
}

function renderReadReceipt(message) {
  if (message.sender !== "me") return "";
  const readCount = Array.isArray(message.readBy) ? message.readBy.length : 0;
  return `<span class="message-status">${readCount ? "Seen" : "Delivered"}</span>`;
}

function renderAgentAction(action) {
  const status = action.status || "pending";
  const disabled = status !== "pending" ? "disabled" : "";
  const actionLabel = {
    create_task: "Create task",
    draft_reply: "Use reply",
    schedule_reminder: "Schedule",
    sync_external: "Prepare sync"
  }[action.type] || "Approve";
  return `
    <article class="agent-action-card ${escapeHtml(status)}">
      <div>
        <span class="agent-action-type">${escapeHtml(formatAgentActionType(action.type))}</span>
        <strong>${escapeHtml(action.title || "Untitled action")}</strong>
        <span>${escapeHtml(action.reason || "Suggested by Blu")}</span>
        <div class="inline-task-meta">
          ${action.assignee ? `<span>${escapeHtml(action.assignee)}</span>` : ""}
          ${action.due ? `<span>Due ${escapeHtml(formatDate(action.due))}</span>` : ""}
          ${action.priority ? `<span>${escapeHtml(action.priority)} priority</span>` : ""}
        </div>
      </div>
      <button class="primary-button" type="button" data-agent-action-id="${escapeHtml(action.id)}" ${disabled}>${status === "approved" ? "Approved" : actionLabel}</button>
    </article>
  `;
}

function formatAgentActionType(type) {
  return {
    create_task: "Task",
    draft_reply: "Reply",
    schedule_reminder: "Reminder",
    sync_external: "Integration"
  }[type] || "Action";
}

async function approveAgentAction(message, actionId) {
  const action = message.agentPlan?.actions?.find((item) => item.id === actionId);
  if (!action || action.status !== "pending") return;

  try {
    if (action.type === "create_task" || action.type === "schedule_reminder") {
      await createTaskWithFeedback({
        title: action.title,
        due: action.due || "",
        priority: action.priority || "normal",
        assignee: action.assignee || "Me",
        reminderAt: action.reminderAt || "",
        source: "Blu agent"
      });
    } else if (action.type === "draft_reply") {
      els.messageInput.value = action.title || "";
      els.messageInput.focus();
    } else if (action.type === "sync_external") {
      await addMessage(`Blu prepared external sync: ${action.title}`, "me");
    }

    action.status = "approved";
    await recordAgentAudit("action.approved", action);
    await syncBluActionStatus(action, action.type === "create_task" || action.type === "schedule_reminder" ? "completed" : "approved");
  } catch (error) {
    action.status = "failed";
    await recordAgentAudit("action.failed", action, formatApiError(error.message || error));
    await syncBluActionStatus(action, "failed", formatApiError(error.message || error));
  }

  saveState();
  render();
}

async function addBluSuggestedTask(message, taskId) {
  const suggestion = message.bluTaskSuggestions?.find((task) => task.id === taskId);
  if (!suggestion || suggestion.status === "added") return;

  await createTaskWithFeedback({
    title: suggestion.title,
    due: suggestion.due || "",
    priority: suggestion.priority || "normal",
    assignee: formatAssignees(suggestion.assignees || suggestion.assignee || "Me"),
    reminderAt: "",
    source: "Blu organized response"
  });

  suggestion.status = "added";
  upsertBluAction({ ...suggestion, status: "completed" });
  if (getAuthToken() && suggestion.id) {
    try {
      await apiFetch(`/api/agent/actions/${encodeURIComponent(suggestion.id)}`, {
        method: "PATCH",
        body: { status: "completed", result: "Created as TodoMessenger task" }
      });
    } catch (error) {
      console.warn("Blu suggestion completed locally but backend sync failed:", error);
    }
  }
  saveState();
  render();
}

async function recordAgentAudit(eventType, action, error = "") {
  try {
    await apiFetch("/api/agent/audit", {
      method: "POST",
      body: {
        eventType,
        action,
        error
      }
    });
  } catch (auditError) {
    console.warn("Blu agent audit saved locally only:", auditError);
  }
}

async function syncBluActionStatus(action, status, error = "") {
  action.status = status;
  upsertBluAction(action);
  if (!getAuthToken() || !action.id) return;
  try {
    const data = await apiFetch(`/api/agent/actions/${encodeURIComponent(action.id)}`, {
      method: "PATCH",
      body: { status, error }
    });
    Object.assign(action, data.action || {});
    upsertBluAction(action);
  } catch (syncError) {
    console.warn("Blu action status saved locally but backend sync failed:", syncError);
  }
}

function renderMessageAttachments(attachments = []) {
  if (!attachments.length) return "";
  const listClass = attachments.some((attachment) => attachment.mediaKind === "sticker") ? "attachment-list sticker-list" : "attachment-list";
  return `
    <div class="${listClass}">
      ${attachments.map((attachment) => {
        const source = attachment.dataUrl || attachment.url || "";
        const isImage = attachment.type.startsWith("image/") && source;
        const isAudio = attachment.type.startsWith("audio/") && source;
        const mediaKind = attachment.mediaKind || (attachment.type === "image/gif" ? "gif" : "");
        const cardClass = mediaKind === "sticker" ? "attachment-card sticker-card" : mediaKind === "gif" ? "attachment-card gif-card" : "attachment-card";
        const fileLink = source
          ? `<a href="${source}" target="_blank" rel="noreferrer">${mediaKind === "gif" ? "Open GIF" : mediaKind === "sticker" ? "Open sticker" : "Open"}</a>`
          : `<span>Stored on this device</span>`;
        return `
          <article class="${cardClass}">
            ${isImage ? `<img src="${source}" alt="${escapeHtml(attachment.name)}">` : isAudio ? `<span class="attachment-file-icon">AUD</span>` : `<span class="attachment-file-icon">${getAttachmentIcon(attachment.type)}</span>`}
            <div>
              <strong>${escapeHtml(attachment.name)}</strong>
              <span>${escapeHtml(formatFileSize(attachment.size))} ${escapeHtml(attachment.type || "file")}</span>
              ${isAudio ? `<audio controls preload="metadata" src="${source}"></audio>` : ""}
              ${fileLink}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function summarizeReactions(reactions = []) {
  const grouped = new Map();
  reactions.forEach((reaction) => {
    const emoji = typeof reaction === "string" ? reaction : reaction?.reaction;
    if (!emoji) return;
    grouped.set(emoji, (grouped.get(emoji) || 0) + 1);
  });
  return Array.from(grouped.entries()).map(([emoji, count]) => ({ emoji, count }));
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
  if (els.legacyConnectedApps) {
    els.legacyConnectedApps.innerHTML = "";
  }
  state.connectedApps.forEach((app) => {
    const isOAuthProvider = Boolean(app.provider);
    const cardMarkup = `
      <div>
        <strong>${escapeHtml(app.name)}</strong>
        <span>${escapeHtml(app.endpoint)}</span>
      </div>
      <p>${escapeHtml(app.tools.join(", "))}</p>
      <button class="${app.connected ? "ghost-button" : "primary-button"}" type="button">${app.connected ? "Disconnect" : isOAuthProvider ? "Connect OAuth" : "Connect"}</button>
    `;
    const handleToggle = () => {
      if (isOAuthProvider && !app.connected) {
        const params = new URLSearchParams();
        params.set("userId", getUserId());
        if (getAuthToken()) params.set("token", getAuthToken());
        window.open(`${getBackendUrl()}${app.endpoint}?${params.toString()}`, "_blank", "noopener,noreferrer");
        return;
      }
      app.connected = !app.connected;
      saveState();
      renderConnectedApps();
    };

    const card = document.createElement("article");
    card.className = `mcp-card ${app.connected ? "connected" : ""}`;
    card.innerHTML = cardMarkup;
    card.querySelector("button").addEventListener("click", handleToggle);
    els.connectedApps.append(card);

    if (els.legacyConnectedApps) {
      const legacyCard = document.createElement("article");
      legacyCard.className = `mcp-card ${app.connected ? "connected" : ""}`;
      legacyCard.innerHTML = cardMarkup;
      legacyCard.querySelector("button").addEventListener("click", handleToggle);
      els.legacyConnectedApps.append(legacyCard);
    }
  });

  if (els.mcpManifest) {
    els.mcpManifest.value = JSON.stringify(createMcpManifest(), null, 2);
  }
}

async function syncBluAgentFromBackend() {
  if (!getAuthToken()) {
    renderBluActions();
    els.bluPolicyStatus.textContent = "Sign in with the backend to sync Blu actions.";
    return;
  }
  try {
    const [actionsData, policyData] = await Promise.all([
      apiFetch("/api/agent/actions"),
      apiFetch("/api/agent/policy")
    ]);
    state.bluAgent.actions = Array.isArray(actionsData.actions) ? actionsData.actions : state.bluAgent.actions;
    state.bluAgent.policy = policyData.policy || state.bluAgent.policy;
    saveState();
    renderBluPolicy();
    renderBluActions();
    els.bluPolicyStatus.textContent = "Blu actions synced.";
  } catch (error) {
    els.bluPolicyStatus.textContent = `Could not sync Blu actions. ${formatApiError(error.message || error)}`;
  }
}

async function saveBluPolicy() {
  const policy = {
    requireApproval: els.bluRequireApproval.checked,
    allowInternalTaskCreation: els.bluAllowTasks.checked,
    allowExternalSync: els.bluAllowExternalSync.checked,
    allowBackgroundJobs: els.bluAllowBackgroundJobs.checked,
    allowedProviders: ["google_calendar"]
  };
  state.bluAgent.policy = policy;
  saveState();
  renderBluPolicy();

  if (!getAuthToken()) {
    els.bluPolicyStatus.textContent = "Blu controls saved locally. Sign in to sync with backend.";
    return;
  }

  try {
    const data = await apiFetch("/api/agent/policy", {
      method: "PATCH",
      body: policy
    });
    state.bluAgent.policy = data.policy || policy;
    saveState();
    els.bluPolicyStatus.textContent = "Blu controls saved to backend.";
  } catch (error) {
    els.bluPolicyStatus.textContent = `Blu controls saved locally, backend failed: ${formatApiError(error.message || error)}`;
  }
}

async function updateBluActionStatus(action, status) {
  action.status = status;
  saveState();
  renderBluActions();
  if (status === "approved" && (action.type === "create_task" || action.type === "schedule_reminder")) {
    await createTaskWithFeedback({
      title: action.title,
      due: action.due || "",
      priority: action.priority || "normal",
      assignee: action.assignee || "Me",
      reminderAt: action.reminderAt || "",
      source: "Blu Actions panel"
    });
    action.status = "completed";
  }

  if (getAuthToken() && action.id) {
    try {
      const data = await apiFetch(`/api/agent/actions/${encodeURIComponent(action.id)}`, {
        method: "PATCH",
        body: { status: action.status }
      });
      Object.assign(action, data.action || {});
    } catch (error) {
      console.warn("Blu action updated locally but backend sync failed:", error);
    }
  }
  saveState();
  renderBluActions();
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
  const override = localStorage.getItem("taskchat-backend-url");
  if (override) return override;
  if (window.location.protocol === "file:") return "http://localhost:8787";
  return (
    window.TODOMESSENGER_CONFIG?.backendUrl ||
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
    const [profileData, conversationData, taskData, memberData, bluActionsData, bluPolicyData] = await Promise.all([
      apiFetch("/api/me"),
      apiFetch("/api/conversations"),
      apiFetch("/api/tasks"),
      apiFetch("/api/workspaces/members"),
      apiFetch("/api/agent/actions"),
      apiFetch("/api/agent/policy")
    ]);
    if (profileData.user) {
      state.registration.user = {
        ...state.registration.user,
        ...profileData.user,
        about: profileData.user.about || state.registration.user?.about || "Available"
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
    if (Array.isArray(bluActionsData.actions)) {
      state.bluAgent.actions = bluActionsData.actions;
    }
    if (bluPolicyData.policy) {
      state.bluAgent.policy = bluPolicyData.policy;
    }
    await syncConversationMembershipSecurity();
    saveState();
    renderSecuritySettings();
    renderAdminAudit();
  } catch (error) {
    console.warn("Backend sync unavailable:", error);
  } finally {
    backendSyncInFlight = false;
  }
}

async function connectRealtime() {
  if (!getAuthToken() || realtimeSocket?.readyState === WebSocket.OPEN) return;
  if (realtimeReconnectTimer) {
    window.clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = null;
  }

  let ticket = "";
  try {
    const data = await apiFetch("/api/realtime/session", { method: "POST" });
    ticket = data.ticket || "";
  } catch (error) {
    console.warn("Realtime session ticket unavailable:", error);
    return;
  }
  if (!ticket) return;

  const backendUrl = new URL(getBackendUrl());
  backendUrl.protocol = backendUrl.protocol === "https:" ? "wss:" : "ws:";
  backendUrl.pathname = "/ws";
  backendUrl.search = `ticket=${encodeURIComponent(ticket)}`;

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
    if (payload.type === "e2ee.key-envelopes.updated" && payload.conversationId) {
      conversationKeyCache.delete(payload.conversationId);
      await deleteCryptoStoreValue("conversationKeys", payload.conversationId).catch(() => {});
    }
    if (payload.type === "e2ee.device.updated") {
      syncSecurityFromBackend().catch((error) => console.warn("Security sync failed:", error));
    }
    if (payload.type === "blu.policy.updated" || payload.type === "blu.action.updated") {
      syncAdminAuditFromBackend().catch((error) => console.warn("Admin audit sync failed:", error));
    }
    if (["message.created", "task.created", "task.updated", "conversation.created", "message.reaction", "message.read", "blu.action.created", "blu.action.updated", "blu.policy.updated", "e2ee.key-envelopes.updated", "e2ee.device.updated"].includes(payload.type)) {
      await syncFromBackend();
      render();
    }
  });
  realtimeSocket.addEventListener("close", () => {
    realtimeReconnectTimer = window.setTimeout(() => {
      connectRealtime();
    }, 4000);
  });
}

function mapBackendConversation(conversation) {
  return {
    id: conversation.id,
    name: conversation.name || "Workspace chat",
    status: conversation.status || "workspace chat",
    avatar: conversation.avatar || createAvatarDataUrl(conversation.name || "Workspace chat"),
    memberIds: Array.isArray(conversation.memberIds) ? conversation.memberIds : [],
    members: Array.isArray(conversation.members) ? conversation.members : [],
    messages: (conversation.messages || []).map((message) => mapBackendMessage(message, conversation.id))
  };
}

function mapBackendMessage(message, conversationId = "") {
  return {
    id: message.id,
    sender: message.sender || "them",
    text: message.preview || "",
    preview: message.preview || "",
    encrypted: parseEncryptedPayload(message.encrypted),
    conversationId,
    attachments: message.attachments || [],
    replyTo: normalizeReplyTo(message.replyTo),
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
  const mapped = {
    ...task,
    due: task.due || "",
    done: Boolean(task.done),
    priority: task.priority || "normal",
    assignee: task.assignee || "Me",
    assignees: parseAssignees(task.assignees || task.assignee || "Me"),
    reminderAt: task.reminderAt || "",
    remindedAt: task.remindedAt || ""
  };
  repairInvertedTaskAssignment(mapped);
  mapped.assignees = parseAssignees(mapped.assignees || mapped.assignee || "Me");
  mapped.assignee = formatAssignees(mapped.assignees);
  return mapped;
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

function formatNetworkError(error) {
  const message = formatApiError(error?.message || error);
  if (/failed to fetch|load failed|networkerror/i.test(message)) {
    return `Could not reach ${getBackendUrl()}. Make sure the backend is running.`;
  }
  return message;
}

function parseBluCommand(text) {
  const match = String(text || "").match(/^@\s*(blu|chatgpt)\b\s*(.*)$/i);
  if (!match) return null;
  return {
    assistant: match[1].toLowerCase(),
    prompt: match[2].trim()
  };
}

async function answerWithBlu(prompt) {
  const question = prompt || "Tell me what you can help with in this chat.";
  if (isDeleteLastTaskIntent(question)) {
    await deleteLastTaskWithBlu();
    return;
  }
  if (isAddPreviousBluTasksIntent(question)) {
    await addPreviousBluItemsAsSeparateTasks();
    return;
  }

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
    const answer = normalizeBluDisplayText(data.answer || "");
    thinkingMessage.encrypted = await encryptText(answer);
    const bluTaskSuggestions = await persistBluTaskSuggestions(extractBluOrganizedTaskSuggestions(question, answer));
    if (bluTaskSuggestions.length) {
      thinkingMessage.bluTaskSuggestions = bluTaskSuggestions;
    }
    const createdTask = isDirectTaskCreationIntent(question) && !bluTaskSuggestions.length
      ? await createTaskFromBluIfNeeded(question, answer)
      : null;
    if (!createdTask) {
      await addBluAgentPlan(question, conversation);
    }
  } catch (error) {
    thinkingMessage.encrypted = await encryptText(
      `Blu could not reach the AI backend yet. Check OPENAI_API_KEY on Render and redeploy the backend. (${formatApiError(error.message || error)})`
    );
  }

  saveState();
  render();
}

async function addBluAgentPlan(prompt, conversation) {
  if (!/\b(organize|plan|agent|follow up|follow-up|tasks?|todo|reply|draft|remind|schedule|sync)\b/i.test(prompt)) return;

  try {
    const response = await apiFetch("/api/ai/agent-plan", {
      method: "POST",
      body: {
        prompt,
        conversationName: conversation.name,
        context: await getRecentMessageContext(conversation)
      }
    });
    if (!Array.isArray(response.actions) || !response.actions.length) return;
    await addMessage("Blu prepared actions for your approval.", "them", {
      agentPlan: {
        summary: response.summary || "Blu prepared actions for your approval.",
        actions: response.actions.map((action) => ({
          ...action,
          id: action.id || createId("agent"),
          status: action.status || "pending"
        }))
      }
    });
  } catch (error) {
    console.warn("Blu agent plan unavailable:", error);
  }
}

function isDirectTaskCreationIntent(text) {
  return /^(add|create|make)\s+(?:a\s+)?(?:task|to-?do)\b/i.test(String(text || "").trim()) ||
    /\b(add|create|make)\b.+\b(task|to-?do)\b/i.test(text);
}

function isAddPreviousBluTasksIntent(text) {
  return /\b(add|create|make)\b.+\b(them|these|those|all|separate|individual)\b.+\b(tasks?|to-?dos?)\b/i.test(text) ||
    /\b(add|create|make)\b.+\b(tasks?|to-?dos?)\b.+\b(them|these|those|all|separate|individual)\b/i.test(text);
}

async function addPreviousBluItemsAsSeparateTasks() {
  const conversation = getActiveConversation();
  const sourceMessage = [...conversation.messages].reverse().find((message) => (
    message.sender === "them" &&
    (message.bluTaskSuggestions?.length || message.preview || message.text || message.encrypted)
  ));

  if (!sourceMessage) {
    await addMessage("I could not find the previous Blu task list to add.", "them");
    return;
  }

  const sourceText = await getMessageText(sourceMessage);
  const suggestions = sourceMessage.bluTaskSuggestions?.length
    ? sourceMessage.bluTaskSuggestions.filter((task) => task.status !== "added")
    : extractSeparateTasksFromBluText(sourceText);

  const uniqueSuggestions = suggestions.filter((suggestion, index, list) => (
    suggestion.title &&
    list.findIndex((item) => normalizeTaskTitle(item.title) === normalizeTaskTitle(suggestion.title)) === index &&
    !state.tasks.some((task) => task.conversationId === state.activeId && !task.done && normalizeTaskTitle(task.title) === normalizeTaskTitle(suggestion.title))
  ));

  if (!uniqueSuggestions.length) {
    await addMessage("Those items are already added as tasks, or I could not detect separate tasks from the last Blu response.", "them");
    return;
  }

  const created = [];
  for (const suggestion of uniqueSuggestions) {
    const task = await createTaskWithFeedback({
      title: suggestion.title,
      due: suggestion.due || "",
      priority: suggestion.priority || "normal",
      assignee: formatAssignees(suggestion.assignees || suggestion.assignee || "Me"),
      reminderAt: "",
      source: "Blu direct add"
    });
    if (task) {
      created.push(task);
      suggestion.status = "added";
      upsertBluAction({ ...suggestion, status: "completed" });
      if (getAuthToken() && suggestion.id) {
        syncBluActionStatus(suggestion, "completed").catch((error) => console.warn("Blu direct task action sync failed:", error));
      }
    }
  }

  saveState();
  await addMessage(
    `Added as separate tasks:\n${created.map((task, index) => `${index + 1}. ${task.title} — ${formatTaskAssignees(task)}`).join("\n")}`,
    "them"
  );
}

function extractSeparateTasksFromBluText(text) {
  const direct = extractBluOrganizedTaskSuggestions("organize follow-ups assignment summary urgent tasks", text);
  if (direct.length) return direct;

  return String(text || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]|\d+[.)]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s*/, "").replace(/^\d+[.)]\s+/, "").trim())
    .map((line) => createTaskSuggestionFromBluLine(line, "follow-ups"))
    .filter(Boolean)
    .slice(0, 8);
}

async function persistBluTaskSuggestions(suggestions) {
  if (!Array.isArray(suggestions) || !suggestions.length) return [];
  normalizeBluAgent();
  const saved = [];

  for (const suggestion of suggestions) {
    let action = {
      ...suggestion,
      type: "create_task",
      status: "pending",
      source: "blu-summary"
    };
    if (getAuthToken()) {
      try {
        const data = await apiFetch("/api/agent/actions", {
          method: "POST",
          body: action
        });
        action = data.action || action;
      } catch (error) {
        console.warn("Blu suggestion saved locally but backend action sync failed:", error);
      }
    }
    upsertBluAction(action);
    saved.push(action);
  }

  saveState();
  renderBluActions();
  return saved;
}

function upsertBluAction(action) {
  normalizeBluAgent();
  const existingIndex = state.bluAgent.actions.findIndex((item) => item.id === action.id);
  if (existingIndex >= 0) {
    state.bluAgent.actions[existingIndex] = { ...state.bluAgent.actions[existingIndex], ...action };
  } else {
    state.bluAgent.actions.unshift(action);
  }
}

function isDeleteLastTaskIntent(text) {
  return /\b(delete|remove|undo)\b.+\b(last|latest|recent)\b.+\b(task|to-?do)\b/i.test(text) ||
    /\b(delete|remove|undo)\b.+\b(task|to-?do)\b/i.test(text);
}

async function deleteLastTaskWithBlu() {
  const task = state.tasks.find((item) => item.conversationId === state.activeId && !item.done) ||
    state.tasks.find((item) => !item.done);
  if (!task) {
    await addMessage("I could not find an open task to delete.", "them");
    return;
  }

  await deleteTask(task);
  await addMessage(`Deleted task: ${task.title}`, "them");
}

async function deleteTask(task) {
  if (!task) return;
  cancelPushReminder(task.id);
  await updateTaskOnBackend({ ...task, done: true });
  state.tasks = state.tasks.filter((item) => item.id !== task.id);
  saveState();
  render();
}

async function createTaskFromBluIfNeeded(question, answer) {
  const task = parseBluTask(question, answer);
  if (!task) return null;

  const existing = state.tasks.some((item) => (
    item.conversationId === state.activeId &&
    normalizeTaskTitle(item.title) === normalizeTaskTitle(task.title) &&
    !item.done
  ));
  if (existing) return null;

  return createTaskWithFeedback({
    title: task.title,
    due: task.due,
    priority: task.priority,
    assignee: formatAssignees(task.assignees || task.assignee || "Me"),
    reminderAt: "",
    source: "Blu"
  });
}

function parseBluTask(question, answer) {
  const answerText = String(answer || "");
  const questionText = String(question || "");
  const combined = `${questionText}\n${answerText}`;
  const shouldCreate = /\b(task added|task created|added\s+(?:a\s+)?task|created\s+(?:a\s+)?task|i added|i created|to-?do|need to|please|submit|send|tag|follow up|follow-up|due|priority)\b/i.test(combined);
  if (!shouldCreate) return null;

  const title = extractBluTaskTitle(answerText) || extractBluTaskTitle(questionText) || inferTaskTitleFromPrompt(questionText);
  if (!title) return null;

  return {
    title,
    due: extractTaskDue(combined),
    priority: extractTaskPriority(combined),
    assignee: extractTaskAssignee(combined)
  };
}

function extractBluOrganizedTaskSuggestions(question, answer) {
  const combined = `${question || ""}\n${answer || ""}`;
  if (!/\b(organize|follow-?ups?|assignment summary|urgent tasks|suggested task title|decisions|plans)\b/i.test(combined)) {
    return [];
  }

  const lines = String(answer || "")
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
  const sectionHeadings = new Set(["decisions / plans", "decisions", "plans", "follow-ups", "followups", "urgent tasks", "assignment summary"]);
  const suggestions = [];
  let section = "";

  lines.forEach((line) => {
    const normalized = line.replace(/:$/, "").toLowerCase();
    if (sectionHeadings.has(normalized)) {
      section = normalized;
      return;
    }
    if (!section || /^suggested task title/i.test(line)) return;

    const task = createTaskSuggestionFromBluLine(line, section);
    if (!task) return;
    const key = normalizeTaskTitle(task.title);
    if (!key || suggestions.some((item) => normalizeTaskTitle(item.title) === key)) return;
    suggestions.push(task);
  });

  return suggestions.slice(0, 6);
}

function createTaskSuggestionFromBluLine(line, section) {
  const cleanLine = line
    .replace(/\*\*/g, "")
    .replace(/â€”/g, "—")
    .replace(/[.]+$/g, "")
    .trim();
  if (!cleanLine || cleanLine.length < 8) return null;

  const assignmentMatch = cleanLine.match(/^([A-Z][A-Za-z .'-]{1,40})\s*(?::|—|-)\s*(.+)$/);
  const assignee = assignmentMatch ? assignmentMatch[1].trim() : "Me";
  let title = assignmentMatch ? assignmentMatch[2].trim() : cleanLine;

  title = title
    .replace(/^owns?\s+(?:the\s+)?(.+?),?\s+due\s+(.+)$/i, "$1 due $2")
    .replace(/^should\s+/i, "")
    .replace(/^needs?\s+to\s+/i, "")
    .replace(/^owns?\s+(?:the\s+)?/i, "")
    .replace(/^must\s+/i, "")
    .replace(/^will\s+/i, "")
    .replace(/^can\s+/i, "")
    .replace(/^is\s+responsible\s+for\s+/i, "")
    .replace(/^will\s+be\s+/i, "")
    .replace(/\s+and\s+send\s+an?\s+update\b/i, " and send update")
    .trim();

  if (!/\b(send|update|fix|follow up|follow-up|handle|review|prepare|approve|go out|pending|needs?|should|will|must|owns?|one-pager|slide|dpa|invoices?|layout|pricing|legal|chase)\b/i.test(cleanLine)) {
    return null;
  }

  const due = extractTaskDue(cleanLine);
  return {
    id: createId("blu_task"),
    title: cleanTaskTitle(title),
    assignee,
    assignees: parseAssignees(assignee),
    due,
    priority: /urgent|today|pending|before qa/i.test(cleanLine) || section === "urgent tasks" ? "high" : "normal",
    reason: section === "assignment summary" ? "From Blu's assignment summary" : `From Blu's ${section} section`,
    status: "pending"
  };
}

function looksLikePersonName(value) {
  const text = String(value || "").trim();
  if (!/^[A-Z][A-Za-z .'-]{1,40}$/.test(text)) return false;
  if (looksLikeActionText(text)) return false;
  if (findEmployeeByName(text)) return true;
  return text.split(/\s+/).length <= 3;
}

function looksLikeActionText(value) {
  return /\b(send|update|fix|follow up|follow-up|handle|review|prepare|approve|go out|pending|needs?|should|will|must|owns?|one-pager|slide|dpa|invoices?|layout|pricing|legal|chase|submit|create|finish|complete)\b/i.test(String(value || ""));
}

function extractBluTaskTitle(text) {
  const source = String(text || "").trim();
  const patterns = [
    /^(?:added|created)\s+(?:a\s+)?(?:task|to-?do)\s*:\s*(.+)$/i,
    /task\s+(?:added|created)\s*:\s*(?:\*\*)?(.+?)(?:\*\*)?(?:\s+priority\s*:|\s+due\s*:|$)/i,
    /(?:i\s+added|i\s+created).+?(?:task|to-?do).*?:\s*(?:\*\*)?(.+?)(?:\*\*)?(?:\s+priority\s*:|\s+due\s*:|$)/i,
    /\b(?:need to|please|can you|could you|kindly)\s+(.+?)(?:\s+(?:by|before|due)\s+|\.\s*$|$)/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return cleanTaskTitle(match[1]);
  }

  if (source.length <= 160 && /\b(submit|send|tag|share|prepare|review|complete|finish|update|follow up|follow-up)\b/i.test(source)) {
    return cleanTaskTitle(source);
  }
  return "";
}

function inferTaskTitleFromPrompt(text) {
  const source = String(text || "")
    .replace(/^(?:add|create|make)\s+(?:a\s+)?(?:task|to-?do)\s*:?\s*/i, "")
    .trim();
  if (!source || source.length > 220) return "";
  if (!/\b(add|create|need|submit|send|tag|share|prepare|review|complete|finish|update|check|follow up|follow-up|due|eod|cob)\b/i.test(source)) {
    return "";
  }
  return cleanTaskTitle(source);
}

function cleanTaskTitle(value) {
  let title = String(value || "")
    .replace(/^["'\s*]+|["'\s*]+$/g, "")
    .replace(/\*\*/g, "")
    .replace(/^(?:added|created)\s+(?:a\s+)?(?:task|to-?do)\s*:\s*/i, "")
    .replace(/\s+(?:by|before|due)\s+.+$/i, "")
    .replace(/\s*,?\s+due\s+.+$/i, "")
    .replace(/\s+(?:today|tomorrow|eod|end of day|cob|close of business)\.?$/i, "")
    .replace(/\s+(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:eod|end of day|cob|close of business)?\.?$/i, "")
    .replace(/\s+\d{1,2}\s*(?:st|nd|rd|th)?(?:'s)?\s*(?:eod|end of day|cob|close of business)?\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.。]+$/g, "")
    .trim();
  if (!title) title = String(value || "").replace(/\*\*/g, "").trim();
  return title.slice(0, 220);
}

function normalizeTaskTitle(value) {
  return cleanTaskTitle(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseAssignees(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[,;]+/);
  const seen = new Set();
  const assignees = values
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((item) => item.replace(/^@+/, "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
  return assignees.length ? assignees : ["Me"];
}

function formatAssignees(assignees) {
  return parseAssignees(assignees).join(", ");
}

function formatTaskAssignees(task) {
  repairInvertedTaskAssignment(task);
  return formatAssignees(task?.assignees || task?.assignee || "Me");
}

function renderAssigneePills(task) {
  repairInvertedTaskAssignment(task);
  return parseAssignees(task?.assignees || task?.assignee || "Me")
    .map((assignee) => `<span class="pill">Assigned to ${escapeHtml(assignee)}</span>`)
    .join("");
}

function extractTaskPriority(text) {
  if (/\b(high priority|priority\s*:\s*(?:\*\*)?high|urgent|asap)\b/i.test(text)) return "high";
  if (/\b(low priority|priority\s*:\s*(?:\*\*)?low)\b/i.test(text)) return "low";
  return "normal";
}

function extractTaskAssignee(text) {
  const assignee = String(text || "").match(/\b(?:assign(?:ed)? to|owner)\s*:?\s*(?:\*\*)?([A-Za-z][\w .@-]{1,80})/i)?.[1];
  return assignee ? formatAssignees(parseAssignees(assignee)) : "Me";
}

function extractTaskDue(text) {
  const source = String(text || "");
  if (/\btomorrow\b/i.test(source)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  }

  const weekdayDue = extractWeekdayDue(source);
  if (weekdayDue) return weekdayDue;

  const dayOfMonthDue = extractDayOfMonthDue(source);
  if (dayOfMonthDue) return dayOfMonthDue;

  if (/\b(eod|end of day|cob|close of business)\b/i.test(source)) {
    return new Date().toISOString().slice(0, 10);
  }

  const iso = source.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const monthMatch = source.match(/\b(?:by|due|before)?\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (!monthMatch) return "";
  const monthIndex = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    .findIndex((month) => monthMatch[2].toLowerCase().startsWith(month));
  if (monthIndex < 0) return "";

  const now = new Date();
  let due = new Date(now.getFullYear(), monthIndex, Number(monthMatch[1]));
  if (due < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    due = new Date(now.getFullYear() + 1, monthIndex, Number(monthMatch[1]));
  }
  return due.toISOString().slice(0, 10);
}

function extractWeekdayDue(text) {
  const match = String(text || "").match(/\b(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i);
  if (!match) return "";
  const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const targetDay = weekdays.findIndex((day) => match[1].toLowerCase().startsWith(day));
  if (targetDay < 0) return "";
  const due = new Date();
  const daysUntil = (targetDay - due.getDay() + 7) % 7;
  due.setDate(due.getDate() + daysUntil);
  return due.toISOString().slice(0, 10);
}

function extractDayOfMonthDue(text) {
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

async function suggestTasksFromChat() {
  const conversation = getActiveConversation();
  els.taskSuggestionList.innerHTML = `<p class="helper-text">Blu is organizing this conversation and looking for useful follow-ups...</p>`;

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
      <p class="helper-text">Blu could not organize this conversation yet. ${escapeHtml(formatApiError(error.message || error))}</p>
    `;
  }
}

function renderTaskSuggestions(tasks) {
  els.taskSuggestionList.innerHTML = "";
  if (!tasks.length) {
    els.taskSuggestionList.innerHTML = `<p class="helper-text">Blu did not find clear follow-ups in the recent chat.</p>`;
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "suggestion-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(task.title || "Untitled task")}</strong>
        <span>${escapeHtml(task.reason || "Suggested from recent messages")}</span>
        <span>Assign to ${escapeHtml(formatTaskAssignees(task))}</span>
      </div>
      <button class="primary-button" type="button">Add</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      await createTaskWithFeedback({
      title: task.title || "Untitled task",
      due: task.due || "",
      priority: task.priority || "normal",
      assignee: formatAssignees(task.assignees || task.assignee || "Me"),
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
      message.conversationId ||= conversation.id;
      message.encrypted = await encryptText(message.text || "", conversation.id);
      delete message.text;
    }
  }
}

async function getMessageText(message) {
  if (message.encrypted) {
    return decryptText(message.encrypted, message.conversationId || state.activeId);
  }
  return message.text || "";
}

function openCryptoDb() {
  if (!("indexedDB" in window)) {
    throw new Error("This browser does not support secure device storage.");
  }
  if (!cryptoDbPromise) {
    cryptoDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("todomessenger-crypto", 1);
      request.onerror = () => reject(request.error || new Error("Could not open crypto storage."));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("kv")) {
          db.createObjectStore("kv");
        }
        if (!db.objectStoreNames.contains("conversationKeys")) {
          db.createObjectStore("conversationKeys");
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }
  return cryptoDbPromise;
}

async function getCryptoStoreValue(storeName, key) {
  const db = await openCryptoDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onerror = () => reject(request.error || new Error(`Could not read ${storeName}.`));
    request.onsuccess = () => resolve(request.result);
  });
}

async function setCryptoStoreValue(storeName, key, value) {
  const db = await openCryptoDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).put(value, key);
    request.onerror = () => reject(request.error || new Error(`Could not save ${storeName}.`));
    request.onsuccess = () => resolve(value);
  });
}

async function deleteCryptoStoreValue(storeName, key) {
  const db = await openCryptoDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).delete(key);
    request.onerror = () => reject(request.error || new Error(`Could not delete ${storeName}.`));
    request.onsuccess = () => resolve();
  });
}

function getSecureRandomId(prefix = "id") {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}-${bytesToBase64(bytes).replace(/[^a-z0-9]/gi, "").slice(0, 24)}`;
}

async function importAesKey(rawBytes) {
  return crypto.subtle.importKey("raw", rawBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function exportAesKey(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToBase64(new Uint8Array(raw));
}

async function getCurrentDeviceId() {
  let deviceId = await getCryptoStoreValue("kv", "deviceId");
  if (!deviceId) {
    deviceId = getSecureRandomId("web");
    await setCryptoStoreValue("kv", "deviceId", deviceId);
  }
  return deviceId;
}

function getCurrentDeviceLabel() {
  const platform = navigator.platform || "Browser";
  return `Web ${platform}`.slice(0, 120);
}

async function getDeviceIdentity() {
  if (!deviceIdentityPromise) {
    deviceIdentityPromise = loadOrCreateDeviceIdentity();
  }
  return deviceIdentityPromise;
}

async function loadOrCreateDeviceIdentity() {
  const existing = await getCryptoStoreValue("kv", "deviceIdentity");
  if (existing?.deviceId && existing?.privateKeyPkcs8 && existing?.identityKey) {
    return existing;
  }

  const deviceId = await getCurrentDeviceId();
  const encryptionPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );
  const signingPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256"
    },
    true,
    ["sign", "verify"]
  );

  const identityKey = await crypto.subtle.exportKey("jwk", encryptionPair.publicKey);
  const signedPrekey = await crypto.subtle.exportKey("jwk", encryptionPair.publicKey);
  const privateKeyPkcs8 = bytesToBase64(new Uint8Array(await crypto.subtle.exportKey("pkcs8", encryptionPair.privateKey)));
  const signingPrivateKeyPkcs8 = bytesToBase64(new Uint8Array(await crypto.subtle.exportKey("pkcs8", signingPair.privateKey)));
  const signingPublicKey = await crypto.subtle.exportKey("jwk", signingPair.publicKey);
  const signedPrekeySignature = await signPayload(signingPair.privateKey, stableJson(signedPrekey));
  const registrationId = bytesToBase64(crypto.getRandomValues(new Uint8Array(12)));

  const identity = {
    deviceId,
    deviceLabel: getCurrentDeviceLabel(),
    identityKey,
    signedPrekeyId: `${deviceId}-rsa-oaep`,
    signedPrekey,
    signedPrekeySignature,
    signingPublicKey,
    signingPrivateKeyPkcs8,
    privateKeyPkcs8,
    registrationId
  };
  await setCryptoStoreValue("kv", "deviceIdentity", identity);
  return identity;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function signPayload(privateKey, payload) {
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(payload)
  );
  return bytesToBase64(new Uint8Array(signature));
}

async function importRsaPublicKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["encrypt"]
  );
}

async function importRsaPrivateKey(pkcs8Base64) {
  return crypto.subtle.importKey(
    "pkcs8",
    base64ToBytes(pkcs8Base64),
    {
      name: "RSA-OAEP",
      hash: "SHA-256"
    },
    false,
    ["decrypt"]
  );
}

function getConversationUserIdsForEnvelopeSharing(conversationId = "") {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (conversation?.memberIds?.length) {
    return [...new Set(conversation.memberIds.filter(Boolean))];
  }
  const ids = new Set();
  if (state.registration.user?.id && /^[0-9a-f-]{36}$/i.test(state.registration.user.id)) {
    ids.add(state.registration.user.id);
  }
  return [...ids];
}

async function ensureDeviceRegistration() {
  if (!getAuthToken()) return null;
  const identity = await getDeviceIdentity();
  await apiFetch("/api/e2ee/devices", {
    method: "POST",
    body: {
      deviceId: identity.deviceId,
      deviceLabel: identity.deviceLabel,
      identityKey: identity.identityKey,
      signedPrekeyId: identity.signedPrekeyId,
      signedPrekey: identity.signedPrekey,
      signedPrekeySignature: identity.signedPrekeySignature,
      registrationId: identity.registrationId,
      oneTimePrekeys: []
    }
  });
  return identity;
}

function getConversationMemberSignature(conversationId = "") {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return "";
  const members = Array.isArray(conversation.memberIds) && conversation.memberIds.length
    ? conversation.memberIds
    : (conversation.members || []).map((member) => member.userId || member.id).filter(Boolean);
  return [...new Set(members.map((item) => String(item).trim()).filter(Boolean))]
    .sort()
    .join("|");
}

function normalizeConversationKeyRecord(record = {}) {
  if (record?.rawKey) {
    return {
      currentVersion: Number(record.currentVersion || 1),
      keys: {
        [String(record.currentVersion || 1)]: {
          rawKey: record.rawKey,
          updatedAt: record.updatedAt || new Date().toISOString()
        }
      },
      memberSignature: record.memberSignature || "",
      rekeyedAt: record.updatedAt || ""
    };
  }
  const keys = {};
  Object.entries(record?.keys || {}).forEach(([version, value]) => {
    if (!value?.rawKey) return;
    keys[String(version)] = {
      rawKey: value.rawKey,
      updatedAt: value.updatedAt || new Date().toISOString()
    };
  });
  const currentVersion = Number(record?.currentVersion || Object.keys(keys).sort((a, b) => Number(a) - Number(b)).at(-1) || 1);
  return {
    currentVersion,
    keys,
    memberSignature: record?.memberSignature || "",
    rekeyedAt: record?.rekeyedAt || ""
  };
}

async function loadConversationKeyRecord(conversationId) {
  if (!conversationId) return null;
  const stored = await getCryptoStoreValue("conversationKeys", conversationId);
  const normalized = normalizeConversationKeyRecord(stored || {});
  return Object.keys(normalized.keys).length ? normalized : null;
}

async function saveConversationKeyRecord(conversationId, record) {
  if (!conversationId || !record) return null;
  const normalized = normalizeConversationKeyRecord(record);
  await setCryptoStoreValue("conversationKeys", conversationId, normalized);
  return normalized;
}

async function getConversationKeyVersion(conversationId, version) {
  const record = await loadConversationKeyRecord(conversationId);
  const targetVersion = String(version || record?.currentVersion || 1);
  const keyEntry = record?.keys?.[targetVersion];
  if (!keyEntry?.rawKey) return null;
  return importAesKey(base64ToBytes(keyEntry.rawKey));
}

async function getConversationKey(conversationId, options = {}) {
  if (!conversationId) return encryptionKey;
  const cacheKey = `${conversationId}:current`;
  if (conversationKeyCache.has(cacheKey)) {
    return conversationKeyCache.get(cacheKey);
  }

  const stored = await loadConversationKeyRecord(conversationId);
  const currentEntry = stored?.keys?.[String(stored.currentVersion)];
  if (currentEntry?.rawKey) {
    const key = await importAesKey(base64ToBytes(currentEntry.rawKey));
    conversationKeyCache.set(cacheKey, key);
    return key;
  }

  const syncedKey = getAuthToken()
    ? await loadConversationKeyFromServer(conversationId).catch(() => null)
    : null;
  if (syncedKey) {
    conversationKeyCache.set(cacheKey, syncedKey);
    return syncedKey;
  }

  const generated = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  await persistConversationKey(conversationId, generated, {
    version: 1,
    memberSignature: getConversationMemberSignature(conversationId)
  });
  conversationKeyCache.set(cacheKey, generated);
  if (!options.skipShare && getAuthToken()) {
    shareConversationKey(conversationId, generated).catch((error) => console.warn("Conversation key share unavailable:", error));
  }
  return generated;
}

async function persistConversationKey(conversationId, key, options = {}) {
  if (!conversationId || !key) return;
  const record = normalizeConversationKeyRecord((await loadConversationKeyRecord(conversationId)) || {});
  const version = Number(options.version || record.currentVersion || 1);
  record.currentVersion = version;
  record.keys[String(version)] = {
    rawKey: await exportAesKey(key),
    updatedAt: new Date().toISOString()
  };
  const versions = Object.keys(record.keys).sort((a, b) => Number(a) - Number(b));
  while (versions.length > 6) {
    const oldest = versions.shift();
    delete record.keys[oldest];
  }
  if (options.memberSignature !== undefined) {
    record.memberSignature = options.memberSignature || "";
  }
  if (options.rekeyedAt !== undefined) {
    record.rekeyedAt = options.rekeyedAt || "";
  }
  await saveConversationKeyRecord(conversationId, record);
  conversationKeyCache.delete(`${conversationId}:current`);
  conversationKeyCache.delete(`${conversationId}:${version}`);
}

async function loadConversationKeyFromServer(conversationId) {
  const identity = await ensureDeviceRegistration();
  const data = await apiFetch(`/api/e2ee/conversations/${encodeURIComponent(conversationId)}/key-envelopes?deviceId=${encodeURIComponent(identity.deviceId)}`);
  const envelope = (data.envelopes || [])[0];
  if (!envelope?.encryptedKey) return null;
  const privateKey = await importRsaPrivateKey(identity.privateKeyPkcs8);
  const rawKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBytes(envelope.encryptedKey)
  );
  const aesKey = await importAesKey(new Uint8Array(rawKey));
  await persistConversationKey(conversationId, aesKey, {
    version: Number(envelope.envelopeVersion || 1),
    memberSignature: getConversationMemberSignature(conversationId)
  });
  return aesKey;
}

async function shareConversationKey(conversationId, key) {
  if (!getAuthToken()) return;
  const userIds = getConversationUserIdsForEnvelopeSharing(conversationId);
  if (!userIds.length) return;

  const bundleResponse = await apiFetch("/api/e2ee/prekey-bundles", {
    method: "POST",
    body: { userIds }
  });
  const rawKeyBase64 = await exportAesKey(key);
  const rawKey = base64ToBytes(rawKeyBase64);
  const envelopes = [];
  const seen = new Set();
  const record = (await loadConversationKeyRecord(conversationId)) || normalizeConversationKeyRecord({});
  const envelopeVersion = Number(record.currentVersion || 1);

  for (const bundle of bundleResponse.bundles || []) {
    const bundleKey = `${bundle.userId}:${bundle.deviceId}`;
    if (!bundle?.userId || !bundle?.deviceId || !bundle?.identityKey || seen.has(bundleKey)) continue;
    seen.add(bundleKey);
    try {
      const publicKey = await importRsaPublicKey(bundle.identityKey);
      const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawKey);
      envelopes.push({
        recipientUserId: bundle.userId,
        recipientDeviceId: bundle.deviceId,
        encryptedKey: bytesToBase64(new Uint8Array(encryptedKey)),
        algorithm: "rsa-oaep-aes-gcm",
        envelopeVersion
      });
    } catch (error) {
      console.warn("Could not encrypt conversation key for device:", bundle.deviceId, error);
    }
  }

  if (envelopes.length) {
    await apiFetch(`/api/e2ee/conversations/${encodeURIComponent(conversationId)}/key-envelopes`, {
      method: "POST",
      body: { envelopes }
    });
  }
}

async function loadEncryptionKey() {
  const stored = await getCryptoStoreValue("kv", "deviceFallbackMessageKey");
  if (stored?.rawKey) {
    return importAesKey(base64ToBytes(stored.rawKey));
  }

  const legacy = localStorage.getItem("todomessenger-e2ee-key");
  if (legacy) {
    await setCryptoStoreValue("kv", "deviceFallbackMessageKey", {
      rawKey: legacy,
      migratedFrom: "localStorage",
      updatedAt: new Date().toISOString()
    });
    localStorage.removeItem("todomessenger-e2ee-key");
    return importAesKey(base64ToBytes(legacy));
  }

  const raw = crypto.getRandomValues(new Uint8Array(32));
  await setCryptoStoreValue("kv", "deviceFallbackMessageKey", {
    rawKey: bytesToBase64(raw),
    updatedAt: new Date().toISOString()
  });
  return importAesKey(raw);
}

async function encryptText(text, conversationId = "") {
  const key = conversationId ? await getConversationKey(conversationId) : encryptionKey;
  const record = conversationId ? await loadConversationKeyRecord(conversationId) : null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    version: conversationId ? 2 : 1,
    algorithm: "AES-GCM",
    conversationId,
    keyVersion: conversationId ? Number(record?.currentVersion || 1) : 1,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipherBuffer))
  };
}

async function decryptText(encrypted, conversationId = "") {
  const payload = typeof encrypted === "string" ? parseEncryptedPayload(encrypted) : encrypted;
  if (!payload?.iv || !payload?.data) {
    return "[Encrypted message unavailable on this device]";
  }
  try {
    const key = conversationId
      ? (await getConversationKeyVersion(conversationId, payload.keyVersion)) || await getConversationKey(conversationId, { skipShare: true })
      : encryptionKey;
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
      key,
      base64ToBytes(payload.data)
    );
    return new TextDecoder().decode(plainBuffer);
  } catch {
    try {
      const plainBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
        encryptionKey,
        base64ToBytes(payload.data)
      );
      return new TextDecoder().decode(plainBuffer);
    } catch {
      return "[Encrypted message unavailable on this device]";
    }
  }
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function renderTasks() {
  normalizeTasks();
  saveState();
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
        ${renderAssigneePills(task)}
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
    card.querySelector(".delete-button").addEventListener("click", async () => {
      await deleteTask(task);
    });
    card.querySelector(".assignment-message-button")?.addEventListener("click", () => openAssignmentFallbackDialog(task));
    els.taskList.append(card);
  });
}

async function addMessage(text, sender = "me", extra = {}) {
  const conversation = getActiveConversation();
  const encrypted = await encryptText(text, conversation.id);
  const message = {
    id: createId("m"),
    sender,
    preview: text,
    encrypted,
    conversationId: conversation.id,
    time: formatTime(),
    expiresAt: extra.expiresAt || getDisappearingExpiry(conversation),
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
        preview: "",
        allowServerPreview: false,
        encryptedBody: JSON.stringify(encrypted),
        attachments: extra.attachments || [],
        replyTo: normalizeReplyTo(extra.replyTo)
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

function openMediaTray(tab = "emoji") {
  activeMediaTab = ["emoji", "gifs", "stickers"].includes(tab) ? tab : "emoji";
  els.mediaTray.hidden = false;
  if (els.mediaSearchInput) {
    els.mediaSearchInput.value = activeMediaSearch;
  }
  Array.from(els.mediaTabs?.querySelectorAll("[data-media-tab]") || []).forEach((button) => {
    const active = button.dataset.mediaTab === activeMediaTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  renderMediaTray();
}

function closeMediaTray() {
  if (els.mediaTray) {
    els.mediaTray.hidden = true;
  }
  activeMediaSearch = "";
  if (els.mediaSearchInput) {
    els.mediaSearchInput.value = "";
  }
}

function renderMediaTray() {
  if (!els.mediaGrid) return;
  const search = activeMediaSearch.trim().toLowerCase();
  if (activeMediaTab === "emoji") {
    const items = mediaLibrary.emoji.filter((emoji) => !search || emoji.includes(search));
    els.mediaGrid.innerHTML = items
      .map((emoji) => `<button class="media-item emoji-item" type="button" data-emoji="${escapeHtml(emoji)}" aria-label="Insert ${escapeHtml(emoji)} emoji">${escapeHtml(emoji)}</button>`)
      .join("");
    els.mediaGrid.querySelectorAll("[data-emoji]").forEach((button) => {
      button.addEventListener("click", () => insertEmojiAtCursor(button.dataset.emoji || ""));
    });
    return;
  }

  const items = (activeMediaTab === "gifs" ? mediaLibrary.gifs : mediaLibrary.stickers)
    .filter((item) => !search || `${item.name} ${item.caption}`.toLowerCase().includes(search));
  els.mediaGrid.innerHTML = items.map((item) => `
    <button class="media-item ${activeMediaTab === "stickers" ? "sticker-item" : ""}" type="button" data-media-id="${escapeHtml(item.id)}">
      <img src="${item.url}" alt="${escapeHtml(item.name)}">
      <span>${escapeHtml(item.name)}</span>
    </button>
  `).join("");
  els.mediaGrid.querySelectorAll("[data-media-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = items.find((entry) => entry.id === button.dataset.mediaId);
      if (!item) return;
      await sendPresetMedia(item, activeMediaTab === "gifs" ? "gif" : "sticker");
    });
  });
}

function insertEmojiAtCursor(emoji) {
  const input = els.messageInput;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
  const cursor = start + emoji.length;
  input.setSelectionRange(cursor, cursor);
  input.focus();
}

async function sendPresetMedia(item, mediaKind) {
  const attachment = {
    id: createId("att"),
    name: item.name,
    type: item.type || "image/png",
    size: 0,
    dataUrl: item.url,
    url: item.url,
    mediaKind
  };
  await addMessage(item.caption || `Sent a ${mediaKind}`, "me", { attachments: [attachment], messageKind: mediaKind });
  closeMediaTray();
}

function openForwardDialog(message) {
  activeForwardMessage = message;
  const preview = getReplyPreviewText(message);
  els.forwardPreviewText.textContent = preview ? `Forward: ${preview}` : "Select a conversation to forward this message.";
  els.forwardConversationList.innerHTML = "";
  state.conversations
    .filter((conversation) => conversation.id !== state.activeId)
    .forEach((conversation) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "forward-conversation-button";
      button.innerHTML = `
        <img src="${getConversationAvatar(conversation)}" alt="">
        <span>
          <strong>${escapeHtml(conversation.name)}</strong>
          <span>${escapeHtml(conversation.status || "chat")}</span>
        </span>
        <span class="pill">Forward</span>
      `;
      button.querySelector("img")?.addEventListener("error", (event) => {
        event.currentTarget.src = createAvatarDataUrl(conversation.name);
      });
      button.addEventListener("click", async () => {
        await forwardMessageToConversation(conversation.id);
      });
      els.forwardConversationList.append(button);
    });
  els.forwardDialog.showModal();
}

async function forwardMessageToConversation(conversationId) {
  if (!activeForwardMessage) return;
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return;
  const text = activeForwardMessage.displayText || activeForwardMessage.preview || activeForwardMessage.text || "Forwarded message";
  const clonedAttachments = Array.isArray(activeForwardMessage.attachments)
    ? activeForwardMessage.attachments.map((attachment) => ({ ...attachment, id: createId("att") }))
    : [];
  const message = {
    id: createId("m"),
    sender: "me",
    preview: text,
    text,
    conversationId: conversation.id,
    time: formatTime(),
    forwarded: true,
    attachments: clonedAttachments,
    expiresAt: getDisappearingExpiry(conversation)
  };
  conversation.messages.push(message);
  saveState();
  render();
  els.forwardDialog.close();
  activeForwardMessage = null;
}

function openDisappearingDialog() {
  const conversation = getActiveConversation();
  els.moreMenuPanel.hidden = true;
  els.disappearingSelect.value = conversation?.disappearingMode || "off";
  els.disappearingDialog.showModal();
}

async function saveDisappearingMode() {
  const conversation = getActiveConversation();
  if (!conversation) return;
  conversation.disappearingMode = els.disappearingSelect.value || "off";
  saveState();
  render();
  els.disappearingDialog.close();
  await addMessage(`Disappearing messages set to ${formatDisappearingMode(conversation.disappearingMode)}.`, "them");
}

function formatDisappearingMode(mode) {
  return {
    off: "Off",
    "1h": "1 hour",
    "24h": "24 hours",
    "7d": "7 days"
  }[mode] || "Off";
}

function getDisappearingExpiry(conversation) {
  const mode = conversation?.disappearingMode || "off";
  if (mode === "off") return "";
  const expiresAt = new Date();
  if (mode === "1h") expiresAt.setHours(expiresAt.getHours() + 1);
  if (mode === "24h") expiresAt.setHours(expiresAt.getHours() + 24);
  if (mode === "7d") expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt.toISOString();
}

function cleanupExpiredMessages() {
  const now = Date.now();
  let changed = false;
  state.conversations.forEach((conversation) => {
    const kept = conversation.messages.filter((message) => {
      if (!message.expiresAt) return true;
      const expiresAt = new Date(message.expiresAt).getTime();
      return Number.isNaN(expiresAt) || expiresAt > now;
    });
    if (kept.length !== conversation.messages.length) {
      conversation.messages = kept;
      changed = true;
    }
  });
  return changed;
}

async function toggleVoiceRecording() {
  if (voiceRecorder?.state === "recording") {
    voiceRecorder.stop();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    await addSystemMessage("Voice notes are not supported in this browser.");
    return;
  }

  try {
    const conversationId = getActiveConversation()?.id;
    activeVoiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceRecorderChunks = [];
    voiceRecorder = new MediaRecorder(activeVoiceStream);
    voiceRecorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) {
        voiceRecorderChunks.push(event.data);
      }
    });
    voiceRecorder.addEventListener("stop", async () => {
      const blob = new Blob(voiceRecorderChunks, { type: voiceRecorder.mimeType || "audio/webm" });
      const dataUrl = await blobToDataUrl(blob);
      const attachment = {
        id: createId("att"),
        name: "Voice note",
        type: blob.type || "audio/webm",
        size: blob.size,
        dataUrl,
        mediaKind: "voice"
      };
      if (conversationId && conversationId !== getActiveConversation()?.id) {
        const targetConversation = state.conversations.find((item) => item.id === conversationId);
        if (targetConversation) {
          targetConversation.messages.push({
            id: createId("m"),
            sender: "me",
            preview: "Voice note",
            text: "Voice note",
            conversationId,
            time: formatTime(),
            attachments: [attachment],
            expiresAt: getDisappearingExpiry(targetConversation)
          });
          saveState();
          render();
        }
      } else {
        await addMessage("Voice note", "me", { attachments: [attachment] });
      }
      voiceRecorderChunks = [];
      activeVoiceStream?.getTracks().forEach((track) => track.stop());
      activeVoiceStream = null;
      voiceRecorder = null;
      updateVoiceRecordingUi(false);
    });
    voiceRecorder.start();
    updateVoiceRecordingUi(true);
  } catch (error) {
    console.warn("Voice note recording failed:", error);
    await addSystemMessage("Could not start voice recording on this device.");
    updateVoiceRecordingUi(false);
  }
}

function updateVoiceRecordingUi(isRecording) {
  els.voiceNoteButton?.classList.toggle("recording", isRecording);
  els.voiceNoteButton?.setAttribute("aria-label", isRecording ? "Stop recording voice note" : "Record a voice note");
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

function toggleReactionPicker(messageId) {
  const conversation = getActiveConversation();
  if (!conversation) return;
  conversation.messages.forEach((message) => {
    message.reactionPickerOpen = message.id === messageId ? !message.reactionPickerOpen : false;
  });
  saveState();
  render();
}

async function addReactionToMessage(messageId, reaction) {
  if (!reaction) return;
  const conversation = getActiveConversation();
  const message = conversation?.messages.find((item) => item.id === messageId);
  if (!message) return;

  const currentUserId = getUserId();
  const existing = Array.isArray(message.reactions) ? message.reactions : [];
  if (!existing.some((entry) => (entry?.reaction || entry) === reaction && (entry?.userId || currentUserId) === currentUserId)) {
    message.reactions = [...existing, { reaction, userId: currentUserId }];
  }
  message.reactionPickerOpen = false;
  saveState();
  render();

  if (!getAuthToken()) return;
  try {
    await apiFetch(`/api/messages/${encodeURIComponent(messageId)}/reactions`, {
      method: "POST",
      body: { reaction }
    });
  } catch (error) {
    console.warn("Reaction saved locally but backend sync failed:", error);
  }
}

async function markConversationRead(conversationId) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) return;
  const currentUserId = getUserId();
  const unread = conversation.messages.filter((message) => (
    message.sender !== "me" &&
    message.id &&
    (
      !Array.isArray(message.readBy) ||
      !message.readBy.some((entry) => (entry?.userId || entry) === currentUserId)
    )
  ));

  if (!unread.length) return;

  unread.forEach((message) => {
    message.readBy = Array.isArray(message.readBy) ? message.readBy : [];
    if (!message.readBy.some((entry) => (entry?.userId || entry) === currentUserId)) {
      message.readBy.push({ userId: currentUserId, readAt: new Date().toISOString() });
    }
  });
  saveState();

  if (!getAuthToken()) return;
  await Promise.all(unread.map(async (message) => {
    try {
      await apiFetch(`/api/messages/${encodeURIComponent(message.id)}/read`, {
        method: "POST"
      });
    } catch (error) {
      console.warn("Read receipt saved locally but backend sync failed:", error);
    }
  }));
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
  const assignees = parseAssignees(assignee);
  if (assignees.length > 1) {
    const unavailable = assignees
      .map((person) => ({ person, employee: findEmployeeByName(person) }))
      .filter(({ person, employee }) => (
        person.toLowerCase() !== "me" &&
        person !== state.workspace.name &&
        !state.conversations.some((conversation) => conversation.name.toLowerCase() === person.toLowerCase()) &&
        !employee?.available
      ));
    if (!unavailable.length) return null;
    const names = unavailable.map(({ person }) => person).join(", ");
    return {
      reason: `${names} ${unavailable.length === 1 ? "is" : "are"} not active on TodoMessenger yet.`,
      email: unavailable[0].employee?.email || "",
      message: createAssignmentMessage(names, title, due)
    };
  }

  assignee = assignees[0];
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
  return state.workspace.employees.find((employee) => {
    const employeeName = employee.name.toLowerCase();
    return employeeName === target || employeeName.split(/\s+/)[0] === target;
  });
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
      assignee: formatTaskAssignees(task),
      assignees: task.assignees || parseAssignees(task.assignee),
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
    <span>${escapeHtml(task.title)} - ${escapeHtml(formatTaskAssignees(task))}${task.due ? ` - Due ${escapeHtml(formatDate(task.due))}` : ""}</span>
  `;
  els.taskToast.hidden = false;
  taskToastTimer = setTimeout(() => {
    els.taskToast.hidden = true;
  }, 3200);
}

function addTask(title, due, priority, assignee = "Me", reminderAt = "") {
  if (!title) return null;
  const repaired = repairTaskInput(title, assignee);
  const normalizedDue = due || extractTaskDue(repaired.title) || extractTaskDue(repaired.assignee);
  const normalizedTitle = cleanTaskTitle(repaired.title);
  const assignees = parseAssignees(repaired.assignee);
  const trimmedAssignee = formatAssignees(assignees);
  const assignmentFallback = getAssignmentFallback(trimmedAssignee, normalizedTitle, normalizedDue);
  const task = {
    id: createId("t"),
    conversationId: state.activeId,
    title: normalizedTitle,
    due: normalizedDue,
    priority,
    assignee: trimmedAssignee,
    assignees,
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

function repairTaskInput(title, assignee) {
  const titleText = String(title || "").trim();
  const assigneeText = formatAssignees(assignee || "Me").trim();
  if (looksLikePersonName(titleText) && looksLikeActionText(assigneeText)) {
    return {
      title: assigneeText,
      assignee: titleText
    };
  }
  return {
    title: titleText,
    assignee: assigneeText || "Me"
  };
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
        assignee: formatTaskAssignees(task),
        assignees: task.assignees || parseAssignees(task.assignee),
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
        assignees: task.assignees || parseAssignees(task.assignee),
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
  const updateNotificationCopy = (statusText, buttonText, disabled) => {
    els.notificationStatus.textContent = statusText;
    els.notificationButton.textContent = buttonText;
    els.notificationButton.disabled = disabled;
    if (els.settingsNotificationStatus) {
      els.settingsNotificationStatus.textContent = statusText;
    }
    if (els.settingsNotificationButton) {
      els.settingsNotificationButton.textContent = buttonText;
      els.settingsNotificationButton.disabled = disabled;
    }
  };
  if (!("Notification" in window)) {
    updateNotificationCopy("Notifications are not supported in this browser.", "Unavailable", true);
    return;
  }

  if (Notification.permission === "granted") {
    updateNotificationCopy("Notifications are enabled for task reminders.", "Enabled", true);
  } else if (Notification.permission === "denied") {
    updateNotificationCopy("Notifications are blocked. Enable them in browser settings.", "Blocked", true);
  } else {
    updateNotificationCopy("Enable notifications to get task reminders while TodoMessenger is open.", "Enable notifications", false);
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
      body: `${conversationName} - assigned to ${formatTaskAssignees(task)}`,
      tag: `task-${task.id}`
    });
  }

  if (!els.reminderDialog.open) {
    activeReminderTaskId = task.id;
    els.reminderTitle.textContent = task.title;
    els.reminderMeta.textContent = `${conversationName} - assigned to ${formatTaskAssignees(task)}`;
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
  resetImportAiReview();
  try {
    els.shareImportDialog.showModal();
  } catch {
    els.shareImportDialog.show();
  }
}

function resetImportAiReview() {
  if (!els.importAiReview) return;
  els.importAiReview.hidden = true;
  els.importSummary.textContent = "Blu will summarize this content before creating tasks.";
  els.importTaskReview.innerHTML = "";
  els.shareToTaskButton.disabled = false;
  els.shareToTaskButton.textContent = "Review with Blu";
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

async function reviewSharedContentWithBlu() {
  const text = els.shareImportText.value.trim();
  if (!text) return;
  els.importAiReview.hidden = false;
  els.importSummary.textContent = "Blu is summarizing this content...";
  els.importTaskReview.innerHTML = `<p class="helper-text">Looking for action items. Nothing will be added until you confirm it.</p>`;
  els.shareToTaskButton.disabled = true;
  els.shareToTaskButton.textContent = "Reviewing...";

  try {
    const [summary, tasks] = await Promise.all([
      summarizeImportedContent(text),
      findImportedTasks(text)
    ]);
    els.importSummary.textContent = summary;
    renderImportedTaskConfirmations(tasks);
  } catch (error) {
    els.importSummary.textContent = `Could not complete Blu review. ${formatApiError(error.message || error)}`;
    renderImportedTaskConfirmations(extractTasksFromImportedText(text));
  } finally {
    els.shareToTaskButton.disabled = false;
    els.shareToTaskButton.textContent = "Review again";
  }
}

function summarizeSharedText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, "").trim())
    .filter(Boolean)
    .find((line) => !line.toLowerCase().startsWith("attachment:"))
    ?.slice(0, 140) || text.slice(0, 140);
}

async function summarizeImportedContent(text) {
  try {
    const response = await fetch(`${getBackendUrl()}/api/ai/blu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Summarize this imported workplace content in 2 short sentences. Mention the main decision and the main follow-up.",
        context: text
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(formatApiError(data.error || data));
    return data.answer || createLocalImportSummary(text);
  } catch {
    return createLocalImportSummary(text);
  }
}

async function findImportedTasks(text) {
  try {
    const response = await fetch(`${getBackendUrl()}/api/ai/suggest-tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationName: "Imported work app content",
        context: text
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(formatApiError(data.error || data));
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    return tasks.length ? tasks : extractTasksFromImportedText(text);
  } catch {
    return extractTasksFromImportedText(text);
  }
}

function renderImportedTaskConfirmations(tasks) {
  els.importTaskReview.innerHTML = "";
  if (!tasks.length) {
    els.importTaskReview.innerHTML = `<p class="helper-text">Blu did not find clear tasks. You can edit the text and review again.</p>`;
    return;
  }

  tasks.forEach((task, index) => {
    const card = document.createElement("article");
    card.className = "import-task-card";
    card.innerHTML = `
      <div class="import-task-fields">
        <label>
          <span>Task</span>
          <textarea rows="2" data-field="title">${escapeHtml(task.title || "Untitled task")}</textarea>
        </label>
        <span>${escapeHtml(task.reason || "Found in imported content")}</span>
        <div class="import-task-edit-grid">
          <label>
            <span>Assign to</span>
            <input data-field="assignee" value="${escapeHtml(formatAssignees(task.assignees || task.assignee || "Me"))}" placeholder="Me, Alex, Sarah">
          </label>
          <label>
            <span>Due</span>
            <input data-field="due" type="date" value="${escapeHtml(task.due || "")}">
          </label>
          <label>
            <span>Priority</span>
            <select data-field="priority">
              <option value="low" ${task.priority === "low" ? "selected" : ""}>Low</option>
              <option value="normal" ${!task.priority || task.priority === "normal" ? "selected" : ""}>Normal</option>
              <option value="high" ${task.priority === "high" ? "selected" : ""}>High</option>
            </select>
          </label>
        </div>
      </div>
      <menu>
        <button class="ghost-button" type="button" data-action="skip">Skip</button>
        <button class="primary-button" type="button" data-action="confirm">Confirm task ${index + 1}</button>
      </menu>
    `;
    card.querySelector('[data-action="confirm"]').addEventListener("click", async () => {
      const editedTask = getEditedImportTask(card);
      if (!editedTask.title) {
        card.querySelector('[data-field="title"]').focus();
        return;
      }
      await createTaskWithFeedback({
        title: editedTask.title,
        due: editedTask.due,
        priority: editedTask.priority,
        assignee: formatAssignees(editedTask.assignees),
        reminderAt: "",
        source: "work app import"
      });
      card.classList.add("confirmed");
      card.querySelector("menu").innerHTML = `<span class="helper-text">Confirmed as task.</span>`;
    });
    card.querySelector('[data-action="skip"]').addEventListener("click", () => {
      card.remove();
      if (!els.importTaskReview.children.length) {
        els.importTaskReview.innerHTML = `<p class="helper-text">All suggestions reviewed.</p>`;
      }
    });
    els.importTaskReview.append(card);
  });
}

function getEditedImportTask(card) {
  const assignees = parseAssignees(card.querySelector('[data-field="assignee"]')?.value || "Me");
  return {
    title: card.querySelector('[data-field="title"]')?.value.trim() || "",
    assignee: formatAssignees(assignees),
    assignees,
    due: card.querySelector('[data-field="due"]')?.value || "",
    priority: card.querySelector('[data-field="priority"]')?.value || "normal"
  };
}

function createLocalImportSummary(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, "").trim())
    .filter(Boolean);
  const first = lines[0] || "Imported content was received.";
  const actionLines = lines.filter((line) => /\b(please|need to|can you|submit|send|tag|review|prepare|update|follow up|follow-up|due|eod|cob)\b/i.test(line));
  return actionLines.length
    ? `${first.slice(0, 180)} Blu found ${actionLines.length} possible follow-up${actionLines.length === 1 ? "" : "s"} to review.`
    : `${first.slice(0, 180)} Blu did not find a clear action item yet.`;
}

function extractTasksFromImportedText(text) {
  return text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter((line) => /\b(please|need to|can you|could you|submit|send|tag|review|prepare|update|follow up|follow-up|due|eod|cob)\b/i.test(line))
    .slice(0, 8)
    .map((line) => ({
      title: cleanTaskTitle(line),
      assignee: "Me",
      due: extractTaskDue(line),
      priority: extractTaskPriority(line),
      reason: "Detected from imported content"
    }))
    .filter((task) => task.title);
}

async function schedulePushReminder(task) {
  if (!task.reminderAt) return;
  try {
    const payload = {
      id: task.id,
      title: task.title,
      assignee: formatTaskAssignees(task),
      conversationName: getConversationName(task.conversationId),
      reminderAt: new Date(task.reminderAt).toISOString(),
      userId: getPushUserId(),
      fallbackUserId: "android-device"
    };
    if (getAuthToken()) {
      await apiFetch("/api/reminders/schedule", {
        method: "POST",
        body: payload
      });
      return;
    }
    await fetch(`${getBackendUrl()}/api/reminders/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // Local reminders still work if the backend reminder queue cannot be reached.
  }
}

async function cancelPushReminder(taskId) {
  if (!taskId) return;
  try {
    if (getAuthToken()) {
      await apiFetch("/api/reminders/cancel", {
        method: "POST",
        body: { id: taskId }
      });
      return;
    }
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
    if (getAuthToken()) {
      await apiFetch("/api/push/register", {
        method: "POST",
        body: {
          token: nativePushRegistration.token,
          platform: nativePushRegistration.platform,
          userId: getPushUserId()
        }
      });
      return;
    }
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

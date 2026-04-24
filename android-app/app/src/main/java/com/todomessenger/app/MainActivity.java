package com.todomessenger.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Parcelable;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://todomessenger.live/app";
    private static final String BACKEND_URL = "https://todomessenger-backend.onrender.com";
    private static final String PREFS_NAME = "todomessenger_native";
    private static final String PREF_SESSION_TOKEN = "session_token";
    private static final String PREF_USER_JSON = "user_json";
    private static final String PREF_WORKSPACE_JSON = "workspace_json";
    private static final String PREF_PENDING_EMAIL = "pending_email";
    private static final String PREF_DEMO_CODE = "demo_code";
    private static final String PREF_COLLAPSED_TASK_SECTIONS = "collapsed_task_sections";
    private static final String PREF_TASK_FILTER = "task_filter";
    private static final String PREF_LAST_TAB = "last_tab";
    private static final String PREF_LAST_CONVERSATION_ID = "last_conversation_id";
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1002;

    private WebView webView;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefreshLayout;
    private LinearLayout errorState;
    private LinearLayout launchOverlay;
    private TextView statusBanner;
    private TextView errorMessage;
    private Button retryButton;
    private Button navChatsButton;
    private Button navTasksButton;
    private Button navAddTaskButton;
    private Button navSettingsButton;
    private ImageButton refreshButton;
    private ImageButton searchButton;
    private ScrollView authContainer;
    private LinearLayout nativeHomeContainer;
    private TextView authTitle;
    private TextView authBody;
    private EditText emailInput;
    private Button sendCodeButton;
    private LinearLayout verifyCard;
    private TextView verifyEmailLabel;
    private EditText codeInput;
    private Button verifyCodeButton;
    private Button resendCodeButton;
    private TextView authStatusText;
    private TextView nativeWelcomeTitle;
    private TextView nativeWelcomeSubtitle;
    private EditText nativeSearchInput;
    private TextView nativeSummaryBody;
    private LinearLayout nativeTaskFilterBar;
    private Button nativeTaskFilterOpen;
    private Button nativeTaskFilterDone;
    private Button nativeTaskFilterToday;
    private Button nativeTaskFilterAll;
    private LinearLayout nativeList;
    private Button openWorkspaceButton;
    private LinearLayout nativeChatContainer;
    private Button nativeChatBackButton;
    private TextView nativeChatTitle;
    private TextView nativeChatSubtitle;
    private LinearLayout nativeMessageList;
    private EditText nativeMessageInput;
    private Button nativeChatOpenWorkspaceButton;
    private Button nativeSendMessageButton;
    private ScrollView nativeAddTaskContainer;
    private TextView nativeAddTaskTitle;
    private TextView nativeAddTaskSubtitle;
    private TextView nativeTaskConversationLabel;
    private EditText nativeTaskTitleInput;
    private EditText nativeTaskAssigneeInput;
    private EditText nativeTaskDueInput;
    private EditText nativeTaskReminderInput;
    private EditText nativeTaskPriorityInput;
    private TextView nativeAddTaskStatus;
    private Button nativeAddTaskOpenWorkspaceButton;
    private Button nativeToggleTaskStatusButton;
    private Button nativeCreateTaskButton;
    private TextView headerSubtitle;
    private LinearLayout nativeTabBar;
    private ValueCallback<Uri[]> filePathCallback;
    private SharedPreferences preferences;

    private String pendingFcmToken;
    private String pendingSharedPayload;
    private String currentUserId = "";
    private String activeDestination = "chats";
    private String currentTaskFilter = "open";
    private String selectedConversationId = "";
    private String currentSurface = "auth";
    private String editingTaskId = "";
    private boolean editingTaskDone;
    private boolean isOffline;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private final ArrayList<ConversationItem> conversations = new ArrayList<>();
    private final ArrayList<TaskItem> tasks = new ArrayList<>();
    private final ArrayList<MessageItem> activeMessages = new ArrayList<>();
    private final Set<String> collapsedTaskSections = new HashSet<>();

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        preferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);
        errorState = findViewById(R.id.errorState);
        launchOverlay = findViewById(R.id.launchOverlay);
        statusBanner = findViewById(R.id.statusBanner);
        errorMessage = findViewById(R.id.errorMessage);
        retryButton = findViewById(R.id.retryButton);
        navChatsButton = findViewById(R.id.navChatsButton);
        navTasksButton = findViewById(R.id.navTasksButton);
        navAddTaskButton = findViewById(R.id.navAddTaskButton);
        navSettingsButton = findViewById(R.id.navSettingsButton);
        refreshButton = findViewById(R.id.refreshButton);
        searchButton = findViewById(R.id.searchButton);
        authContainer = findViewById(R.id.authContainer);
        nativeHomeContainer = findViewById(R.id.nativeHomeContainer);
        authTitle = findViewById(R.id.authTitle);
        authBody = findViewById(R.id.authBody);
        emailInput = findViewById(R.id.emailInput);
        sendCodeButton = findViewById(R.id.sendCodeButton);
        verifyCard = findViewById(R.id.verifyCard);
        verifyEmailLabel = findViewById(R.id.verifyEmailLabel);
        codeInput = findViewById(R.id.codeInput);
        verifyCodeButton = findViewById(R.id.verifyCodeButton);
        resendCodeButton = findViewById(R.id.resendCodeButton);
        authStatusText = findViewById(R.id.authStatusText);
        nativeWelcomeTitle = findViewById(R.id.nativeWelcomeTitle);
        nativeWelcomeSubtitle = findViewById(R.id.nativeWelcomeSubtitle);
        nativeSearchInput = findViewById(R.id.nativeSearchInput);
        nativeSummaryBody = findViewById(R.id.nativeSummaryBody);
        nativeTaskFilterBar = findViewById(R.id.nativeTaskFilterBar);
        nativeTaskFilterOpen = findViewById(R.id.nativeTaskFilterOpen);
        nativeTaskFilterDone = findViewById(R.id.nativeTaskFilterDone);
        nativeTaskFilterToday = findViewById(R.id.nativeTaskFilterToday);
        nativeTaskFilterAll = findViewById(R.id.nativeTaskFilterAll);
        nativeList = findViewById(R.id.nativeList);
        openWorkspaceButton = findViewById(R.id.openWorkspaceButton);
        nativeChatContainer = findViewById(R.id.nativeChatContainer);
        nativeChatBackButton = findViewById(R.id.nativeChatBackButton);
        nativeChatTitle = findViewById(R.id.nativeChatTitle);
        nativeChatSubtitle = findViewById(R.id.nativeChatSubtitle);
        nativeMessageList = findViewById(R.id.nativeMessageList);
        nativeMessageInput = findViewById(R.id.nativeMessageInput);
        nativeChatOpenWorkspaceButton = findViewById(R.id.nativeChatOpenWorkspaceButton);
        nativeSendMessageButton = findViewById(R.id.nativeSendMessageButton);
        nativeAddTaskContainer = findViewById(R.id.nativeAddTaskContainer);
        nativeAddTaskTitle = findViewById(R.id.nativeAddTaskTitle);
        nativeAddTaskSubtitle = findViewById(R.id.nativeAddTaskSubtitle);
        nativeTaskConversationLabel = findViewById(R.id.nativeTaskConversationLabel);
        nativeTaskTitleInput = findViewById(R.id.nativeTaskTitleInput);
        nativeTaskAssigneeInput = findViewById(R.id.nativeTaskAssigneeInput);
        nativeTaskDueInput = findViewById(R.id.nativeTaskDueInput);
        nativeTaskReminderInput = findViewById(R.id.nativeTaskReminderInput);
        nativeTaskPriorityInput = findViewById(R.id.nativeTaskPriorityInput);
        nativeAddTaskStatus = findViewById(R.id.nativeAddTaskStatus);
        nativeAddTaskOpenWorkspaceButton = findViewById(R.id.nativeAddTaskOpenWorkspaceButton);
        nativeToggleTaskStatusButton = findViewById(R.id.nativeToggleTaskStatusButton);
        nativeCreateTaskButton = findViewById(R.id.nativeCreateTaskButton);
        headerSubtitle = findViewById(R.id.headerSubtitle);
        nativeTabBar = findViewById(R.id.nativeTabBar);

        configureWebView();

        swipeRefreshLayout.setOnRefreshListener(this::refreshWorkspace);
        retryButton.setOnClickListener((view) -> refreshWorkspace());
        refreshButton.setOnClickListener((view) -> refreshWorkspace());
        searchButton.setOnClickListener((view) -> openSearch());
        navChatsButton.setOnClickListener((view) -> openTab("chats"));
        navTasksButton.setOnClickListener((view) -> openTab("tasks"));
        navAddTaskButton.setOnClickListener((view) -> openTab("addTask"));
        navSettingsButton.setOnClickListener((view) -> openSettings());
        sendCodeButton.setOnClickListener((view) -> startEmailLogin(false));
        resendCodeButton.setOnClickListener((view) -> startEmailLogin(true));
        verifyCodeButton.setOnClickListener((view) -> verifyEmailCode());
        openWorkspaceButton.setOnClickListener((view) -> openWebWorkspace(activeDestination, selectedConversationId));
        nativeChatBackButton.setOnClickListener((view) -> showNativeHome("chats"));
        nativeChatOpenWorkspaceButton.setOnClickListener((view) -> openWebWorkspace("chats", selectedConversationId));
        nativeSendMessageButton.setOnClickListener((view) -> sendNativeMessage());
        nativeAddTaskOpenWorkspaceButton.setOnClickListener((view) -> openWebWorkspace("addTask", selectedConversationId));
        nativeToggleTaskStatusButton.setOnClickListener((view) -> toggleNativeTaskStatus());
        nativeCreateTaskButton.setOnClickListener((view) -> createNativeTask());
        nativeTaskFilterOpen.setOnClickListener((view) -> setTaskFilter("open"));
        nativeTaskFilterDone.setOnClickListener((view) -> setTaskFilter("done"));
        nativeTaskFilterToday.setOnClickListener((view) -> setTaskFilter("today"));
        nativeTaskFilterAll.setOnClickListener((view) -> setTaskFilter("all"));

        nativeSearchInput.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
            }

            @Override
            public void afterTextChanged(Editable editable) {
                if ("native".equals(currentSurface)) {
                    renderNativeHome();
                }
            }
        });

        updateNavSelection("chats");
        processLaunchIntent(getIntent());
        requestNotificationPermissionIfNeeded();
        captureSharedContent(getIntent());
        loadFcmToken();
        setupConnectivityMonitoring();
        restoreSessionOrShowAuth();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        processLaunchIntent(intent);
        captureSharedContent(intent);
        if ("web".equals(currentSurface)) {
            deliverSharedContentToWeb();
            if ("addTask".equals(activeDestination) || "settings".equals(activeDestination)) {
                syncWebDestination(activeDestination);
            }
        } else if (hasSession()) {
            if ("chats".equals(activeDestination) && selectedConversationId != null && !selectedConversationId.isEmpty()) {
                ConversationItem conversation = findConversation(selectedConversationId);
                if (conversation != null) {
                    loadNativeConversation(conversation);
                } else {
                    fetchWorkspaceData(false);
                }
            } else {
                showNativeHome(activeDestination);
            }
        }
    }

    @Override
    public void onBackPressed() {
        if ("web".equals(currentSurface)) {
            if (webView.canGoBack()) {
                webView.goBack();
                return;
            }
            showNativeHome(activeDestination);
            return;
        }
        if ("chat".equals(currentSurface)) {
            showNativeHome("chats");
            return;
        }
        if ("addTask".equals(currentSurface)) {
            clearEditingTask();
            showNativeHome("tasks");
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {
                // Ignore cleanup failure.
            }
        }
        super.onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setUserAgentString(settings.getUserAgentString() + " TodoMessengerAndroid/1.0");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (!"web".equals(currentSurface)) {
                    return;
                }
                progressBar.setVisibility(View.VISIBLE);
                errorState.setVisibility(View.GONE);
                setStatusText(getString(R.string.status_loading));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!"web".equals(currentSurface)) {
                    return;
                }
                progressBar.setVisibility(View.GONE);
                swipeRefreshLayout.setRefreshing(false);
                errorState.setVisibility(View.GONE);
                launchOverlay.setVisibility(View.GONE);
                setStatusForDestination(activeDestination);
                deliverFcmTokenToWeb();
                deliverSharedContentToWeb();
                syncWebDestination(activeDestination);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("http".equals(scheme) || "https".equals(scheme)) {
                    return false;
                }
                openExternal(uri);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, android.webkit.WebResourceError error) {
                if (request.isForMainFrame() && "web".equals(currentSurface)) {
                    showErrorState(error != null && error.getDescription() != null
                            ? error.getDescription().toString()
                            : getString(R.string.error_message));
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                if (request.isForMainFrame() && errorResponse != null && errorResponse.getStatusCode() >= 400 && "web".equals(currentSurface)) {
                    showErrorState("The live workspace returned HTTP " + errorResponse.getStatusCode() + ".");
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileChooserParams == null) {
                    return false;
                }
                MainActivity.this.filePathCallback = filePathCallback;
                setStatusText(getString(R.string.status_attachment));
                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (ActivityNotFoundException error) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });
    }

    private void restoreSessionOrShowAuth() {
        loadCollapsedTaskSections();
        loadTaskFilterPreference();
        loadLastTabPreference();
        loadLastConversationPreference();
        JSONObject storedUser = readStoredJson(PREF_USER_JSON);
        currentUserId = storedUser != null ? storedUser.optString("id", "") : "";
        String pendingEmail = preferences.getString(PREF_PENDING_EMAIL, "");
        String demoCode = preferences.getString(PREF_DEMO_CODE, "");
        if (!pendingEmail.isEmpty()) {
            emailInput.setText(pendingEmail);
            showVerifyStep(pendingEmail, demoCode, false);
        }

        if (hasSession()) {
            setStatusText(getString(R.string.native_session_restoring));
            fetchWorkspaceData(true);
            return;
        }

        showAuthScreen();
    }

    private void showAuthScreen() {
        currentSurface = "auth";
        authContainer.setVisibility(View.VISIBLE);
        nativeHomeContainer.setVisibility(View.GONE);
        nativeChatContainer.setVisibility(View.GONE);
        nativeAddTaskContainer.setVisibility(View.GONE);
        swipeRefreshLayout.setVisibility(View.GONE);
        errorState.setVisibility(View.GONE);
        launchOverlay.setVisibility(View.GONE);
        nativeTabBar.setVisibility(View.GONE);
        searchButton.setVisibility(View.GONE);
        authTitle.setText(R.string.native_auth_title);
        authBody.setText(R.string.native_auth_body);
        headerSubtitle.setText(R.string.mobile_header_subtitle);
        setStatusText(getString(R.string.native_auth_hint));
        if (verifyCard.getVisibility() != View.VISIBLE) {
            authStatusText.setText(R.string.native_auth_hint);
        }
    }

    private void showNativeHome(String destination) {
        currentSurface = "native";
        authContainer.setVisibility(View.GONE);
        nativeHomeContainer.setVisibility(View.VISIBLE);
        nativeChatContainer.setVisibility(View.GONE);
        nativeAddTaskContainer.setVisibility(View.GONE);
        swipeRefreshLayout.setVisibility(View.GONE);
        errorState.setVisibility(View.GONE);
        launchOverlay.setVisibility(View.GONE);
        nativeTabBar.setVisibility(View.VISIBLE);
        searchButton.setVisibility(View.VISIBLE);
        activeDestination = "tasks".equals(destination) ? "tasks" : "chats";
        saveLastTabPreference();
        updateNavSelection(activeDestination);
        renderNativeHome();
        setStatusForDestination(activeDestination);
    }

    private void showWebWorkspace() {
        currentSurface = "web";
        authContainer.setVisibility(View.GONE);
        nativeHomeContainer.setVisibility(View.GONE);
        nativeChatContainer.setVisibility(View.GONE);
        nativeAddTaskContainer.setVisibility(View.GONE);
        swipeRefreshLayout.setVisibility(View.VISIBLE);
        errorState.setVisibility(View.GONE);
        launchOverlay.setVisibility(View.VISIBLE);
        nativeTabBar.setVisibility(View.VISIBLE);
        searchButton.setVisibility(View.VISIBLE);
        updateNavSelection(activeDestination);
    }

    private void renderNativeHome() {
        if ("tasks".equals(activeDestination)) {
            nativeWelcomeTitle.setText(R.string.native_tasks_title);
            nativeWelcomeSubtitle.setText(R.string.native_tasks_subtitle);
            nativeSummaryBody.setText(getString(R.string.native_summary_tasks, countOpenTasks(), conversations.size()));
            nativeTaskFilterBar.setVisibility(View.VISIBLE);
            updateTaskFilterSelection();
            renderTaskCards();
        } else {
            nativeWelcomeTitle.setText(R.string.native_chats_title);
            nativeWelcomeSubtitle.setText(R.string.native_chats_subtitle);
            nativeSummaryBody.setText(getString(R.string.native_summary_chats, conversations.size(), countOpenTasks()));
            nativeTaskFilterBar.setVisibility(View.GONE);
            renderConversationCards();
        }
    }

    private void renderConversationCards() {
        nativeList.removeAllViews();
        String query = nativeSearchInput.getText().toString().trim().toLowerCase(Locale.ROOT);
        ArrayList<ConversationItem> filteredConversations = new ArrayList<>();
        int rendered = 0;
        for (ConversationItem conversation : conversations) {
            String haystack = (conversation.name + " " + conversation.status + " " + conversation.preview).toLowerCase(Locale.ROOT);
            if (!query.isEmpty() && !haystack.contains(query)) {
                continue;
            }
            filteredConversations.add(conversation);
        }
        Collections.sort(filteredConversations, this::compareConversationsForDisplay);
        for (ConversationItem conversation : filteredConversations) {
            nativeList.addView(createConversationCard(conversation));
            rendered++;
        }
        if (rendered == 0) {
            nativeList.addView(createEmptyState(getString(R.string.native_empty_chats)));
        }
    }

    private void renderTaskCards() {
        nativeList.removeAllViews();
        String query = nativeSearchInput.getText().toString().trim().toLowerCase(Locale.ROOT);
        ArrayList<TaskItem> filteredTasks = new ArrayList<>();
        for (TaskItem task : tasks) {
            String haystack = (task.title + " " + task.assignee + " " + task.priority + " " + task.due).toLowerCase(Locale.ROOT);
            if (!query.isEmpty() && !haystack.contains(query)) {
                continue;
            }
            if (!matchesTaskFilter(task)) {
                continue;
            }
            filteredTasks.add(task);
        }

        Collections.sort(filteredTasks, this::compareTasksForDisplay);

        ArrayList<TaskItem> todayTasks = new ArrayList<>();
        ArrayList<TaskItem> upcomingTasks = new ArrayList<>();
        ArrayList<TaskItem> doneTasks = new ArrayList<>();

        for (TaskItem task : filteredTasks) {
            String sectionKey = getTaskSectionKey(task);
            if ("today".equals(sectionKey)) {
                todayTasks.add(task);
            } else if ("done".equals(sectionKey)) {
                doneTasks.add(task);
            } else {
                upcomingTasks.add(task);
            }
        }

        int rendered = 0;
        rendered += appendTaskSection("today", getString(R.string.native_section_today), todayTasks);
        rendered += appendTaskSection("upcoming", getString(R.string.native_section_upcoming), upcomingTasks);
        rendered += appendTaskSection("done", getString(R.string.native_section_done), doneTasks);

        if (rendered == 0 && todayTasks.isEmpty() && upcomingTasks.isEmpty() && doneTasks.isEmpty()) {
            nativeList.addView(createEmptyState(getEmptyTaskFilterMessage()));
        }
    }

    private int appendTaskSection(String sectionKey, String sectionLabel, List<TaskItem> sectionTasks) {
        if (sectionTasks == null || sectionTasks.isEmpty()) {
            return 0;
        }
        nativeList.addView(createSectionHeader(sectionKey, sectionLabel, sectionTasks.size()));
        if (collapsedTaskSections.contains(sectionKey)) {
            return 0;
        }

        int rendered = 0;
        for (TaskItem task : sectionTasks) {
            nativeList.addView(createEditableTaskCard(task));
            rendered++;
        }
        return rendered;
    }

    private View createConversationCard(ConversationItem conversation) {
        LinearLayout card = createCardContainer();
        card.addView(createConversationHeader(conversation));
        card.addView(createMetaText(conversation.status));
        String activityLabel = formatConversationActivity(conversation.latestActivityAt);
        if (!activityLabel.isEmpty()) {
            card.addView(createMetaText(getString(R.string.native_conversation_active_prefix, activityLabel)));
        }
        card.addView(createBodyText(conversation.preview.isEmpty() ? getString(R.string.native_conversation_preview_fallback) : conversation.preview));

        int openCount = countOpenTasks(conversation.id);
        LinearLayout chipRow = new LinearLayout(this);
        LinearLayout.LayoutParams chipRowParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        chipRowParams.topMargin = dp(12);
        chipRow.setLayoutParams(chipRowParams);
        chipRow.setOrientation(LinearLayout.HORIZONTAL);

        String meta = openCount > 0
                ? openCount + " open tasks"
                : "Ready to continue";
        TextView taskChip = createChipText(meta);
        taskChip.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        chipRow.addView(taskChip);

        if (conversation.unreadCount > 0) {
            TextView unreadChip = createChipText(
                    getString(R.string.native_unread_count, conversation.unreadCount),
                    true
            );
            LinearLayout.LayoutParams unreadParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
            unreadParams.leftMargin = dp(8);
            unreadChip.setLayoutParams(unreadParams);
            chipRow.addView(unreadChip);
        }

        card.addView(chipRow);

        Button openButton = createPrimaryActionButton(getString(R.string.open_chat));
        openButton.setOnClickListener((view) -> {
            selectedConversationId = conversation.id;
            saveLastConversationPreference();
            loadNativeConversation(conversation);
        });
        card.addView(openButton);
        return card;
    }

    private View createConversationHeader(ConversationItem conversation) {
        LinearLayout row = new LinearLayout(this);
        row.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(android.view.Gravity.CENTER_VERTICAL);

        TextView title = createTitleText(conversation.name);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        row.addView(title);

        if (conversation.unreadCount > 0) {
            TextView badge = createChipText(String.valueOf(conversation.unreadCount), true);
            badge.setLayoutParams(new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            ));
            row.addView(badge);
        }

        return row;
    }

    private View createTaskCard(TaskItem task) {
        LinearLayout card = createCardContainer();
        card.addView(createTitleText(task.title));
        if (!task.assignee.isEmpty()) {
            card.addView(createMetaText(getString(R.string.native_assignee_prefix, task.assignee)));
        }
        String dueLabel = task.due.isEmpty() ? "" : getString(R.string.native_due_prefix, task.due);
        String priorityLabel = task.priority.isEmpty() ? "" : getString(R.string.native_priority_prefix, task.priority);
        String statusLabel = getString(task.done ? R.string.native_task_status_done : R.string.native_task_status_open);
        String combined = (dueLabel + (dueLabel.isEmpty() || priorityLabel.isEmpty() ? "" : " • ") + priorityLabel).trim();
        if (!combined.isEmpty()) {
            card.addView(createBodyText(combined));
        }
        Button openButton = createPrimaryActionButton(getString(R.string.native_edit_task));
        openButton.setOnClickListener((view) -> {
            if (!task.conversationId.isEmpty()) {
                selectedConversationId = task.conversationId;
                saveLastConversationPreference();
            }
            showNativeTaskEditor(task);
        });
        card.addView(openButton);
        return card;
    }

    private View createEditableTaskCard(TaskItem task) {
        LinearLayout card = createCardContainer();
        card.addView(createTitleText(task.title));
        View urgencyRow = createTaskUrgencyRow(task);
        if (urgencyRow != null) {
            card.addView(urgencyRow);
        }
        View conversationRow = createTaskConversationRow(task);
        if (conversationRow != null) {
            card.addView(conversationRow);
        }
        if (!task.assignee.isEmpty()) {
            card.addView(createMetaText(getString(R.string.native_assignee_prefix, task.assignee)));
        }

        String dueLabel = task.due.isEmpty() ? "" : getString(R.string.native_due_prefix, task.due);
        String priorityLabel = task.priority.isEmpty() ? "" : getString(R.string.native_priority_prefix, task.priority);
        if (!dueLabel.isEmpty() || !priorityLabel.isEmpty()) {
            StringBuilder builder = new StringBuilder();
            if (!dueLabel.isEmpty()) {
                builder.append(dueLabel);
            }
            if (!priorityLabel.isEmpty()) {
                if (builder.length() > 0) {
                    builder.append(" | ");
                }
                builder.append(priorityLabel);
            }
            card.addView(createBodyText(builder.toString()));
        }

        card.addView(createMetaText(getString(task.done ? R.string.native_task_status_done : R.string.native_task_status_open)));

        LinearLayout actions = new LinearLayout(this);
        LinearLayout.LayoutParams actionsParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        actionsParams.topMargin = dp(14);
        actions.setLayoutParams(actionsParams);
        actions.setOrientation(LinearLayout.HORIZONTAL);

        Button quickButton = createSecondaryActionButton(getString(task.done ? R.string.native_quick_reopen : R.string.native_quick_done));
        LinearLayout.LayoutParams quickParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        quickButton.setLayoutParams(quickParams);
        quickButton.setOnClickListener((view) -> quickToggleTaskStatus(task));
        actions.addView(quickButton);

        Button openButton = createPrimaryActionButton(getString(R.string.native_edit_task));
        LinearLayout.LayoutParams openParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        openParams.leftMargin = dp(10);
        openButton.setLayoutParams(openParams);
        openButton.setOnClickListener((view) -> {
            if (!task.conversationId.isEmpty()) {
                selectedConversationId = task.conversationId;
            }
            showNativeTaskEditor(task);
        });
        actions.addView(openButton);

        card.addView(actions);
        return card;
    }

    private LinearLayout createCardContainer() {
        LinearLayout card = new LinearLayout(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.bottomMargin = dp(12);
        card.setLayoutParams(params);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_error_card);
        card.setPadding(dp(16), dp(16), dp(16), dp(16));
        return card;
    }

    private TextView createTitleText(String text) {
        TextView view = new TextView(this);
        view.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        view.setText(text);
        view.setTextColor(getColor(R.color.bbm_dark));
        view.setTextSize(19f);
        view.setTypeface(view.getTypeface(), android.graphics.Typeface.BOLD);
        return view;
    }

    private TextView createMetaText(String text) {
        TextView view = new TextView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(4);
        view.setLayoutParams(params);
        view.setText(text);
        view.setTextColor(getColor(R.color.text_muted));
        view.setTextSize(13f);
        return view;
    }

    private TextView createBodyText(String text) {
        TextView view = new TextView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(10);
        view.setLayoutParams(params);
        view.setText(text);
        view.setTextColor(getColor(R.color.bbm_dark));
        view.setTextSize(15f);
        return view;
    }

    private TextView createChipText(String text) {
        return createChipText(text, false);
    }

    private TextView createChipText(String text, boolean highlighted) {
        TextView view = new TextView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(12);
        view.setLayoutParams(params);
        view.setBackgroundResource(highlighted ? R.drawable.bg_nav_button_selected : R.drawable.bg_nav_button_unselected);
        view.setPadding(dp(10), dp(6), dp(10), dp(6));
        view.setText(text);
        view.setTextColor(getColor(highlighted ? R.color.white : R.color.bbm_dark));
        view.setTextSize(12f);
        view.setTypeface(view.getTypeface(), android.graphics.Typeface.BOLD);
        return view;
    }

    private View createTaskUrgencyRow(TaskItem task) {
        if (task == null || task.done) {
            return null;
        }

        int urgencyBucket = getUrgencyBucket(task);
        if (urgencyBucket != 0 && urgencyBucket != 1) {
            return null;
        }

        LinearLayout row = new LinearLayout(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.topMargin = dp(10);
        row.setLayoutParams(params);
        row.setOrientation(LinearLayout.HORIZONTAL);

        TextView chip = createChipText(
                getString(urgencyBucket == 0 ? R.string.native_chip_overdue : R.string.native_chip_due_today),
                urgencyBucket == 0
        );
        LinearLayout.LayoutParams chipParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        chip.setLayoutParams(chipParams);
        row.addView(chip);
        return row;
    }

    private View createTaskConversationRow(TaskItem task) {
        if (task == null || task.conversationId == null || task.conversationId.trim().isEmpty()) {
            return null;
        }

        ConversationItem conversation = findConversation(task.conversationId);
        if (conversation == null || conversation.name == null || conversation.name.trim().isEmpty()) {
            return null;
        }

        LinearLayout row = new LinearLayout(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.topMargin = dp(10);
        row.setLayoutParams(params);
        row.setOrientation(LinearLayout.HORIZONTAL);

        TextView chip = createChipText(getString(R.string.native_task_chat_context, conversation.name));
        LinearLayout.LayoutParams chipParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        chip.setLayoutParams(chipParams);
        row.addView(chip);
        return row;
    }

    private Button createPrimaryActionButton(String text) {
        Button button = new Button(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.topMargin = dp(14);
        button.setLayoutParams(params);
        button.setBackgroundResource(R.drawable.bg_nav_button_selected);
        button.setMinHeight(0);
        button.setMinWidth(0);
        button.setPadding(dp(14), dp(12), dp(14), dp(12));
        button.setText(text);
        button.setTextColor(getColor(R.color.white));
        button.setTextSize(14f);
        button.setAllCaps(false);
        button.setTypeface(button.getTypeface(), android.graphics.Typeface.BOLD);
        return button;
    }

    private Button createSecondaryActionButton(String text) {
        Button button = new Button(this);
        button.setBackgroundResource(R.drawable.bg_nav_button_unselected);
        button.setMinHeight(0);
        button.setMinWidth(0);
        button.setPadding(dp(14), dp(12), dp(14), dp(12));
        button.setText(text);
        button.setTextColor(getColor(R.color.bbm_dark));
        button.setTextSize(14f);
        button.setAllCaps(false);
        button.setTypeface(button.getTypeface(), android.graphics.Typeface.BOLD);
        return button;
    }

    private View createEmptyState(String text) {
        LinearLayout card = createCardContainer();
        card.addView(createBodyText(text));
        return card;
    }

    private TextView createSectionHeader(String sectionKey, String text, int count) {
        TextView view = new TextView(this);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.topMargin = dp(4);
        params.bottomMargin = dp(10);
        view.setLayoutParams(params);
        boolean collapsed = collapsedTaskSections.contains(sectionKey);
        String prefix = collapsed ? "▸ " : "▾ ";
        view.setText(prefix + text + " (" + count + ")");
        view.setTextColor(getColor(R.color.text_muted));
        view.setTextSize(13f);
        view.setTypeface(view.getTypeface(), android.graphics.Typeface.BOLD);
        view.setPadding(0, dp(4), 0, dp(4));
        view.setOnClickListener((clicked) -> toggleTaskSection(sectionKey));
        return view;
    }

    private void openTab(String tab) {
        if (!hasSession()) {
            showAuthScreen();
            setStatusText(getString(R.string.native_auth_hint));
            return;
        }
        activeDestination = tab;
        saveLastTabPreference();
        if ("addTask".equals(tab)) {
            showNativeAddTask();
            return;
        }
        showNativeHome(tab);
    }

    private void openSettings() {
        if (!hasSession()) {
            showAuthScreen();
            return;
        }
        activeDestination = "settings";
        saveLastTabPreference();
        openWebWorkspace("settings", selectedConversationId);
    }

    private void openSearch() {
        if ("web".equals(currentSurface)) {
            setStatusText(getString(R.string.status_search));
            runJavascript(
                    "if (window.switchTab) { window.switchTab('chats'); }" +
                            "window.setTimeout(function() {" +
                            "var input = document.getElementById('chatSearch');" +
                            "if (input) { input.focus(); if (input.select) { input.select(); } }" +
                            "}, 120);"
            );
            return;
        }

        if ("chat".equals(currentSurface)) {
            nativeMessageInput.requestFocus();
            showKeyboard(nativeMessageInput);
            return;
        }

        if ("addTask".equals(currentSurface)) {
            nativeTaskTitleInput.requestFocus();
            showKeyboard(nativeTaskTitleInput);
            return;
        }

        if ("auth".equals(currentSurface)) {
            emailInput.requestFocus();
            showKeyboard(emailInput);
            return;
        }

        nativeSearchInput.requestFocus();
        showKeyboard(nativeSearchInput);
    }

    private void refreshWorkspace() {
        if (isOffline) {
            swipeRefreshLayout.setRefreshing(false);
            setStatusText(getString(R.string.status_offline));
            return;
        }

        if ("web".equals(currentSurface)) {
            setStatusText(getString(R.string.status_refreshing));
            errorState.setVisibility(View.GONE);
            if (!swipeRefreshLayout.isRefreshing()) {
                swipeRefreshLayout.setRefreshing(true);
            }
            webView.reload();
            return;
        }

        if ("chat".equals(currentSurface)) {
            if (!selectedConversationId.isEmpty()) {
                fetchConversationMessages(selectedConversationId, false);
            }
            return;
        }

        if ("addTask".equals(currentSurface)) {
            fetchWorkspaceData(false);
            return;
        }

        if (hasSession()) {
            setStatusText(getString(R.string.native_loading_workspace));
            fetchWorkspaceData(false);
        }
    }

    private void startEmailLogin(boolean resend) {
        String email = emailInput.getText().toString().trim().toLowerCase(Locale.ROOT);
        if (email.isEmpty()) {
            authStatusText.setText(R.string.native_auth_email_required);
            return;
        }

        emailInput.setText(email);
        setAuthBusy(true);
        authStatusText.setText(R.string.native_auth_sending);
        setStatusText(getString(R.string.native_auth_sending));

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("email", email);
                ApiResponse response = request("POST", "/api/auth/email/start", payload.toString(), null);
                JSONObject data = parseBodyObject(response.body);
                runOnUiThread(() -> {
                    setAuthBusy(false);
                    if (response.status >= 200 && response.status < 300 && data.optBoolean("ok")) {
                        String pendingEmail = data.optString("email", email);
                        String demoCode = data.optString("demoCode", "");
                        preferences.edit()
                                .putString(PREF_PENDING_EMAIL, pendingEmail)
                                .putString(PREF_DEMO_CODE, demoCode)
                                .apply();
                        showVerifyStep(pendingEmail, demoCode, true);
                        String message = data.optString("message", getString(R.string.native_auth_sent, pendingEmail));
                        if (!demoCode.isEmpty()) {
                            message = message + "\n" + getString(R.string.native_auth_demo_code, demoCode);
                        }
                        authStatusText.setText(message);
                        setStatusText(message);
                        codeInput.requestFocus();
                        showKeyboard(codeInput);
                    } else {
                        authStatusText.setText(readApiError(data, getString(R.string.error_message)));
                    }
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    setAuthBusy(false);
                    authStatusText.setText(error.getMessage() != null ? error.getMessage() : getString(R.string.error_message));
                });
            }
        }).start();
    }

    private void showVerifyStep(String email, String demoCode, boolean resetCodeField) {
        verifyCard.setVisibility(View.VISIBLE);
        verifyEmailLabel.setText(getString(R.string.native_auth_sent, email));
        if (resetCodeField) {
            codeInput.setText(demoCode);
        }
    }

    private void verifyEmailCode() {
        String email = preferences.getString(PREF_PENDING_EMAIL, emailInput.getText().toString().trim().toLowerCase(Locale.ROOT));
        String code = codeInput.getText().toString().trim();
        if (email.isEmpty()) {
            authStatusText.setText(R.string.native_auth_email_required);
            return;
        }
        if (code.isEmpty()) {
            authStatusText.setText(R.string.native_auth_code_required);
            return;
        }

        setAuthBusy(true);
        authStatusText.setText(R.string.native_auth_verifying);
        setStatusText(getString(R.string.native_auth_verifying));

        new Thread(() -> {
            try {
                JSONObject payload = new JSONObject();
                payload.put("email", email);
                payload.put("code", code);
                payload.put("name", inferNameFromEmail(email));
                ApiResponse response = request("POST", "/api/auth/email/complete", payload.toString(), null);
                JSONObject data = parseBodyObject(response.body);
                runOnUiThread(() -> {
                    setAuthBusy(false);
                    if (response.status >= 200 && response.status < 300 && data.optBoolean("ok")) {
                        persistSession(
                                data.optString("token", ""),
                                data.optJSONObject("user"),
                                data.optJSONObject("workspace")
                        );
                        preferences.edit()
                                .remove(PREF_PENDING_EMAIL)
                                .remove(PREF_DEMO_CODE)
                                .apply();
                        authStatusText.setText(R.string.native_auth_verified);
                        setStatusText(getString(R.string.native_auth_verified));
                        fetchWorkspaceData(false);
                    } else {
                        authStatusText.setText(readApiError(data, getString(R.string.native_auth_invalid)));
                    }
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    setAuthBusy(false);
                    authStatusText.setText(error.getMessage() != null ? error.getMessage() : getString(R.string.native_auth_invalid));
                });
            }
        }).start();
    }

    private void fetchWorkspaceData(boolean restoringSession) {
        if (!hasSession()) {
            showAuthScreen();
            return;
        }

        if ("native".equals(currentSurface) || restoringSession) {
            setStatusText(getString(R.string.native_loading_workspace));
        }

        new Thread(() -> {
            try {
                String token = preferences.getString(PREF_SESSION_TOKEN, "");
                ApiResponse meResponse = request("GET", "/api/me", null, token);
                if (meResponse.status == 401) {
                    runOnUiThread(() -> handleExpiredSession());
                    return;
                }
                JSONObject meData = parseBodyObject(meResponse.body);
                if (!(meResponse.status >= 200 && meResponse.status < 300 && meData.optBoolean("ok"))) {
                    throw new IllegalStateException(readApiError(meData, getString(R.string.native_workspace_failed)));
                }

                ApiResponse conversationsResponse = request("GET", "/api/conversations", null, token);
                ApiResponse tasksResponse = request("GET", "/api/tasks", null, token);
                JSONObject conversationData = parseBodyObject(conversationsResponse.body);
                JSONObject taskData = parseBodyObject(tasksResponse.body);
                if (conversationsResponse.status == 401 || tasksResponse.status == 401) {
                    runOnUiThread(() -> handleExpiredSession());
                    return;
                }
                if (!(conversationsResponse.status >= 200 && conversationsResponse.status < 300 && conversationData.optBoolean("ok"))) {
                    throw new IllegalStateException(readApiError(conversationData, getString(R.string.native_workspace_failed)));
                }
                if (!(tasksResponse.status >= 200 && tasksResponse.status < 300 && taskData.optBoolean("ok"))) {
                    throw new IllegalStateException(readApiError(taskData, getString(R.string.native_workspace_failed)));
                }

                ArrayList<ConversationItem> newConversations = parseConversations(conversationData.optJSONArray("conversations"));
                ArrayList<TaskItem> newTasks = parseTasks(taskData.optJSONArray("tasks"));
                JSONObject user = meData.optJSONObject("user");
                JSONObject workspace = meData.optJSONObject("workspace");

                runOnUiThread(() -> {
                    currentUserId = user != null ? user.optString("id", "") : "";
                    persistSession(token, user, workspace);
                    conversations.clear();
                    conversations.addAll(newConversations);
                    NotificationBadgeHelper.setUnreadBadge(this, getTotalUnreadCount(newConversations));
                    tasks.clear();
                    tasks.addAll(newTasks);
                    if (!selectedConversationId.isEmpty() && findConversation(selectedConversationId) == null) {
                        selectedConversationId = "";
                        saveLastConversationPreference();
                    }
                    if (selectedConversationId.isEmpty() && !conversations.isEmpty()) {
                        selectedConversationId = conversations.get(0).id;
                        saveLastConversationPreference();
                    }
                    if ("chat".equals(currentSurface) && !selectedConversationId.isEmpty()) {
                        fetchConversationMessages(selectedConversationId, true);
                    } else if ("addTask".equals(currentSurface)) {
                        showNativeTaskEditor(findTask(editingTaskId));
                    } else {
                        openSavedTopLevelDestination();
                    }
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    if (restoringSession) {
                        showAuthScreen();
                    }
                    setStatusText(getString(R.string.native_workspace_failed));
                    authStatusText.setText(error.getMessage() != null ? error.getMessage() : getString(R.string.native_workspace_failed));
                });
            }
        }).start();
    }

    private void handleExpiredSession() {
        clearSession();
        verifyCard.setVisibility(View.GONE);
        codeInput.setText("");
        authStatusText.setText(R.string.native_session_expired);
        setStatusText(getString(R.string.native_session_expired));
        showAuthScreen();
    }

    private void openWebWorkspace(String destination, String conversationId) {
        if (!hasSession()) {
            showAuthScreen();
            return;
        }
        activeDestination = destination == null ? "chats" : destination;
        if (conversationId != null && !conversationId.isEmpty()) {
            selectedConversationId = conversationId;
            saveLastConversationPreference();
        }
        showWebWorkspace();
        webView.loadDataWithBaseURL(HOME_URL, buildWebBootstrapHtml(activeDestination, selectedConversationId), "text/html", "utf-8", HOME_URL);
    }

    private void loadNativeConversation(ConversationItem conversation) {
        selectedConversationId = conversation.id;
        saveLastConversationPreference();
        showNativeConversation(conversation, true);
        fetchConversationMessages(conversation.id, false);
    }

    private void showNativeConversation(ConversationItem conversation, boolean loading) {
        currentSurface = "chat";
        authContainer.setVisibility(View.GONE);
        nativeHomeContainer.setVisibility(View.GONE);
        nativeChatContainer.setVisibility(View.VISIBLE);
        nativeAddTaskContainer.setVisibility(View.GONE);
        swipeRefreshLayout.setVisibility(View.GONE);
        errorState.setVisibility(View.GONE);
        launchOverlay.setVisibility(View.GONE);
        nativeTabBar.setVisibility(View.VISIBLE);
        searchButton.setVisibility(View.VISIBLE);
        updateNavSelection("chats");
        nativeChatTitle.setText(conversation != null ? conversation.name : getString(R.string.native_chat_title));
        nativeChatSubtitle.setText(conversation != null ? conversation.status : getString(R.string.native_chat_subtitle));
        nativeMessageList.removeAllViews();
        if (loading) {
            nativeMessageList.addView(createBodyText(getString(R.string.native_chat_loading)));
            setStatusText(getString(R.string.native_chat_loading));
        } else {
            renderNativeMessages();
            setStatusText(getString(R.string.status_tab_chats));
        }
    }

    private void showNativeAddTask() {
        showNativeTaskEditor(null);
    }

    private void showNativeTaskEditor(TaskItem task) {
        currentSurface = "addTask";
        authContainer.setVisibility(View.GONE);
        nativeHomeContainer.setVisibility(View.GONE);
        nativeChatContainer.setVisibility(View.GONE);
        nativeAddTaskContainer.setVisibility(View.VISIBLE);
        swipeRefreshLayout.setVisibility(View.GONE);
        errorState.setVisibility(View.GONE);
        launchOverlay.setVisibility(View.GONE);
        nativeTabBar.setVisibility(View.VISIBLE);
        searchButton.setVisibility(View.VISIBLE);
        activeDestination = "addTask";
        updateNavSelection("addTask");
        ConversationItem conversation = findConversation(selectedConversationId);
        boolean isEditing = task != null;
        editingTaskId = isEditing ? task.id : "";
        editingTaskDone = isEditing && task.done;
        nativeAddTaskTitle.setText(isEditing ? R.string.native_edit_task_title : R.string.native_add_task_title);
        nativeAddTaskSubtitle.setText(isEditing ? R.string.native_edit_task_subtitle : R.string.native_add_task_subtitle);
        nativeTaskConversationLabel.setText(conversation != null
                ? getString(R.string.native_task_for_chat, conversation.name)
                : getString(R.string.native_task_for_workspace));
        if (isEditing) {
            nativeTaskTitleInput.setText(task.title);
            nativeTaskAssigneeInput.setText(task.assignee);
            nativeTaskDueInput.setText(task.due);
            nativeTaskReminderInput.setText(formatReminderInput(task.reminderAt));
            nativeTaskPriorityInput.setText(task.priority.isEmpty() ? "normal" : task.priority);
            nativeCreateTaskButton.setText(R.string.native_save_task);
            nativeToggleTaskStatusButton.setVisibility(View.VISIBLE);
            nativeToggleTaskStatusButton.setText(task.done ? R.string.native_mark_task_open : R.string.native_mark_task_done);
            nativeAddTaskStatus.setText(task.done ? R.string.native_task_editing_done_help : R.string.native_task_editing_help);
        } else {
            clearEditingTask();
            clearTaskForm();
            nativeTaskPriorityInput.setText("normal");
            nativeCreateTaskButton.setText(R.string.native_create_task);
            nativeToggleTaskStatusButton.setVisibility(View.GONE);
            nativeAddTaskStatus.setText(R.string.native_add_task_help);
        }
        setStatusText(getString(R.string.status_tab_add));
    }

    private void fetchConversationMessages(String conversationId, boolean silent) {
        if (conversationId == null || conversationId.isEmpty()) {
            return;
        }
        ConversationItem conversation = findConversation(conversationId);
        if (!silent) {
            showNativeConversation(conversation, true);
        }
        new Thread(() -> {
            try {
                String token = preferences.getString(PREF_SESSION_TOKEN, "");
                ApiResponse response = request("GET", "/api/conversations/" + conversationId + "/messages", null, token);
                if (response.status == 401) {
                    runOnUiThread(this::handleExpiredSession);
                    return;
                }
                JSONObject data = parseBodyObject(response.body);
                if (!(response.status >= 200 && response.status < 300 && data.optBoolean("ok"))) {
                    throw new IllegalStateException(readApiError(data, getString(R.string.native_chat_failed)));
                }
                JSONArray messageArray = data.optJSONArray("messages");
                ArrayList<MessageItem> messages = parseMessages(messageArray);
                ArrayList<String> unreadMessageIds = collectUnreadMessageIds(messageArray);
                runOnUiThread(() -> {
                    activeMessages.clear();
                    activeMessages.addAll(messages);
                    showNativeConversation(findConversation(conversationId), false);
                    if (!unreadMessageIds.isEmpty()) {
                        markConversationReadLocally(conversationId);
                        markMessagesReadLocally(unreadMessageIds);
                        markMessagesReadOnServer(unreadMessageIds);
                    }
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    nativeMessageList.removeAllViews();
                    nativeMessageList.addView(createBodyText(error.getMessage() != null ? error.getMessage() : getString(R.string.native_chat_failed)));
                    setStatusText(getString(R.string.native_chat_failed));
                });
            }
        }).start();
    }

    private void renderNativeMessages() {
        nativeMessageList.removeAllViews();
        if (activeMessages.isEmpty()) {
            nativeMessageList.addView(createBodyText(getString(R.string.native_chat_empty)));
            return;
        }
        for (MessageItem message : activeMessages) {
            nativeMessageList.addView(createMessageBubble(message));
        }
    }

    private View createMessageBubble(MessageItem message) {
        LinearLayout wrapper = new LinearLayout(this);
        LinearLayout.LayoutParams wrapperParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        wrapperParams.bottomMargin = dp(10);
        wrapper.setLayoutParams(wrapperParams);
        wrapper.setOrientation(LinearLayout.HORIZONTAL);
        wrapper.setGravity("me".equals(message.sender) ? android.view.Gravity.END : android.view.Gravity.START);

        LinearLayout bubble = new LinearLayout(this);
        LinearLayout.LayoutParams bubbleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        bubble.setLayoutParams(bubbleParams);
        bubble.setOrientation(LinearLayout.VERTICAL);
        bubble.setBackgroundResource("me".equals(message.sender) ? R.drawable.bg_nav_button_selected : R.drawable.bg_error_card);
        bubble.setPadding(dp(14), dp(12), dp(14), dp(12));

        TextView body = new TextView(this);
        body.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        body.setText(message.preview);
        body.setTextColor(getColor("me".equals(message.sender) ? R.color.white : R.color.bbm_dark));
        body.setTextSize(15f);
        bubble.addView(body);

        TextView meta = new TextView(this);
        LinearLayout.LayoutParams metaParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        metaParams.topMargin = dp(6);
        meta.setLayoutParams(metaParams);
        meta.setText(message.time);
        meta.setTextColor(getColor("me".equals(message.sender) ? R.color.header_subtle : R.color.text_muted));
        meta.setTextSize(12f);
        bubble.addView(meta);

        wrapper.addView(bubble);
        return wrapper;
    }

    private void sendNativeMessage() {
        String text = nativeMessageInput.getText().toString().trim();
        if (text.isEmpty()) {
            setStatusText(getString(R.string.native_message_empty));
            return;
        }
        if (selectedConversationId.isEmpty()) {
            setStatusText(getString(R.string.native_chat_failed));
            return;
        }
        nativeSendMessageButton.setEnabled(false);
        setStatusText(getString(R.string.native_message_sending));
        new Thread(() -> {
            try {
                String token = preferences.getString(PREF_SESSION_TOKEN, "");
                JSONObject payload = new JSONObject();
                payload.put("text", text);
                payload.put("preview", text);
                payload.put("allowServerPreview", true);
                ApiResponse response = request("POST", "/api/conversations/" + selectedConversationId + "/messages", payload.toString(), token);
                if (response.status == 401) {
                    runOnUiThread(this::handleExpiredSession);
                    return;
                }
                JSONObject data = parseBodyObject(response.body);
                if (!(response.status >= 200 && response.status < 300 && data.optBoolean("ok"))) {
                    throw new IllegalStateException(readApiError(data, getString(R.string.native_chat_failed)));
                }
                runOnUiThread(() -> {
                    nativeMessageInput.setText("");
                    nativeSendMessageButton.setEnabled(true);
                    setStatusText(getString(R.string.native_message_sent));
                    fetchConversationMessages(selectedConversationId, true);
                    fetchWorkspaceData(false);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    nativeSendMessageButton.setEnabled(true);
                    setStatusText(error.getMessage() != null ? error.getMessage() : getString(R.string.native_chat_failed));
                });
            }
        }).start();
    }

    private void createNativeTask() {
        String title = nativeTaskTitleInput.getText().toString().trim();
        if (title.isEmpty()) {
            nativeAddTaskStatus.setText(R.string.native_task_title_required);
            setStatusText(getString(R.string.native_task_title_required));
            return;
        }

        String assignee = nativeTaskAssigneeInput.getText().toString().trim();
        String due = nativeTaskDueInput.getText().toString().trim();
        String reminder = normalizeReminderInput(nativeTaskReminderInput.getText().toString().trim());
        String priority = normalizePriorityInput(nativeTaskPriorityInput.getText().toString().trim());
        boolean isEditing = !editingTaskId.isEmpty();

        nativeCreateTaskButton.setEnabled(false);
        nativeAddTaskStatus.setText(isEditing ? R.string.native_task_saving : R.string.native_task_creating);
        setStatusText(getString(isEditing ? R.string.native_task_saving : R.string.native_task_creating));

        new Thread(() -> {
            try {
                String token = preferences.getString(PREF_SESSION_TOKEN, "");
                JSONObject payload = new JSONObject();
                payload.put("title", title);
                payload.put("priority", priority);
                if (!selectedConversationId.isEmpty()) {
                    payload.put("conversationId", selectedConversationId);
                }
                if (!assignee.isEmpty()) {
                    payload.put("assignee", assignee);
                }
                if (!due.isEmpty()) {
                    payload.put("due", due);
                }
                if (!reminder.isEmpty()) {
                    payload.put("reminderAt", reminder);
                }

                String method = isEditing ? "PATCH" : "POST";
                String path = isEditing ? "/api/tasks/" + editingTaskId : "/api/tasks";
                ApiResponse response = request(method, path, payload.toString(), token);
                if (response.status == 401) {
                    runOnUiThread(this::handleExpiredSession);
                    return;
                }
                JSONObject data = parseBodyObject(response.body);
                if (!(response.status >= 200 && response.status < 300 && data.optBoolean("ok"))) {
                    throw new IllegalStateException(readApiError(data, getString(R.string.native_workspace_failed)));
                }

                runOnUiThread(() -> {
                    nativeCreateTaskButton.setEnabled(true);
                    clearEditingTask();
                    clearTaskForm();
                    nativeAddTaskStatus.setText(isEditing ? R.string.native_task_saved : R.string.native_task_created);
                    setStatusText(getString(isEditing ? R.string.native_task_saved : R.string.native_task_created));
                    fetchWorkspaceData(false);
                    showNativeHome("tasks");
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    nativeCreateTaskButton.setEnabled(true);
                    String message = error.getMessage() != null ? error.getMessage() : getString(R.string.native_workspace_failed);
                    nativeAddTaskStatus.setText(message);
                    setStatusText(message);
                });
            }
        }).start();
    }

    private void toggleNativeTaskStatus() {
        if (editingTaskId.isEmpty()) {
            return;
        }

        boolean nextDone = !editingTaskDone;
        nativeToggleTaskStatusButton.setEnabled(false);
        nativeCreateTaskButton.setEnabled(false);
        nativeAddTaskStatus.setText(nextDone ? R.string.native_task_marking_done : R.string.native_task_marking_open);
        setStatusText(getString(nextDone ? R.string.native_task_marking_done : R.string.native_task_marking_open));

        new Thread(() -> {
            try {
                String token = preferences.getString(PREF_SESSION_TOKEN, "");
                JSONObject payload = new JSONObject();
                payload.put("done", nextDone);
                ApiResponse response = request("PATCH", "/api/tasks/" + editingTaskId, payload.toString(), token);
                if (response.status == 401) {
                    runOnUiThread(this::handleExpiredSession);
                    return;
                }
                JSONObject data = parseBodyObject(response.body);
                if (!(response.status >= 200 && response.status < 300 && data.optBoolean("ok"))) {
                    throw new IllegalStateException(readApiError(data, getString(R.string.native_workspace_failed)));
                }

                runOnUiThread(() -> {
                    editingTaskDone = nextDone;
                    nativeToggleTaskStatusButton.setEnabled(true);
                    nativeCreateTaskButton.setEnabled(true);
                    nativeToggleTaskStatusButton.setText(nextDone ? R.string.native_mark_task_open : R.string.native_mark_task_done);
                    nativeAddTaskStatus.setText(nextDone ? R.string.native_task_marked_done : R.string.native_task_marked_open);
                    setStatusText(getString(nextDone ? R.string.native_task_marked_done : R.string.native_task_marked_open));
                    fetchWorkspaceData(false);
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    nativeToggleTaskStatusButton.setEnabled(true);
                    nativeCreateTaskButton.setEnabled(true);
                    String message = error.getMessage() != null ? error.getMessage() : getString(R.string.native_workspace_failed);
                    nativeAddTaskStatus.setText(message);
                    setStatusText(message);
                });
            }
        }).start();
    }

    private void quickToggleTaskStatus(TaskItem task) {
        if (task == null || task.id.isEmpty()) {
            return;
        }
        boolean nextDone = !task.done;
        setStatusText(getString(nextDone ? R.string.native_task_marking_done : R.string.native_task_marking_open));

        new Thread(() -> {
            try {
                String token = preferences.getString(PREF_SESSION_TOKEN, "");
                JSONObject payload = new JSONObject();
                payload.put("done", nextDone);
                ApiResponse response = request("PATCH", "/api/tasks/" + task.id, payload.toString(), token);
                if (response.status == 401) {
                    runOnUiThread(this::handleExpiredSession);
                    return;
                }
                JSONObject data = parseBodyObject(response.body);
                if (!(response.status >= 200 && response.status < 300 && data.optBoolean("ok"))) {
                    throw new IllegalStateException(readApiError(data, getString(R.string.native_workspace_failed)));
                }

                runOnUiThread(() -> {
                    setStatusText(getString(nextDone ? R.string.native_task_marked_done : R.string.native_task_marked_open));
                    fetchWorkspaceData(false);
                });
            } catch (Exception error) {
                runOnUiThread(() -> setStatusText(error.getMessage() != null ? error.getMessage() : getString(R.string.native_workspace_failed)));
            }
        }).start();
    }

    private String buildWebBootstrapHtml(String destination, String conversationId) {
        JSONObject state = new JSONObject();
        JSONObject registration = new JSONObject();
        JSONObject workspace = readStoredJson(PREF_WORKSPACE_JSON);
        JSONObject user = readStoredJson(PREF_USER_JSON);

        try {
            registration.put("step", "complete");
            registration.put("pendingEmail", "");
            registration.put("pendingCode", "");
            registration.put("demoCode", "");
            registration.put("errorMessage", "");
            registration.put("sessionToken", preferences.getString(PREF_SESSION_TOKEN, ""));
            registration.put("user", user != null ? user : JSONObject.NULL);

            JSONObject safeWorkspace = workspace != null ? new JSONObject(workspace.toString()) : new JSONObject();
            if (!safeWorkspace.has("id")) safeWorkspace.put("id", "");
            if (!safeWorkspace.has("name")) safeWorkspace.put("name", "TodoMessenger Workspace");
            if (!safeWorkspace.has("domain")) safeWorkspace.put("domain", "");
            if (!safeWorkspace.has("role")) safeWorkspace.put("role", "Employee");
            if (!safeWorkspace.has("inviteCode")) safeWorkspace.put("inviteCode", "");
            if (!safeWorkspace.has("sso")) {
                JSONObject sso = new JSONObject();
                sso.put("requireSso", false);
                sso.put("allowEmailFallback", true);
                sso.put("providers", new JSONArray());
                safeWorkspace.put("sso", sso);
            }
            if (!safeWorkspace.has("software")) {
                safeWorkspace.put("software", defaultSoftwareArray());
            }
            if (!safeWorkspace.has("employees")) {
                safeWorkspace.put("employees", new JSONArray());
            }

            JSONObject bluAgent = new JSONObject();
            JSONObject policy = new JSONObject();
            policy.put("requireApproval", true);
            policy.put("allowInternalTaskCreation", true);
            policy.put("allowExternalSync", false);
            policy.put("allowBackgroundJobs", false);
            policy.put("allowedProviders", new JSONArray().put("google_calendar"));
            bluAgent.put("policy", policy);
            bluAgent.put("actions", new JSONArray());

            state.put("activeId", conversationId != null && !conversationId.isEmpty() ? conversationId : "launch");
            state.put("registration", registration);
            state.put("workspace", safeWorkspace);
            state.put("connectedApps", new JSONArray());
            state.put("conversations", new JSONArray());
            state.put("tasks", new JSONArray());
            state.put("bluAgent", bluAgent);
        } catch (Exception ignored) {
            // Fallback script below still opens the workspace.
        }

        String stateJson = state.toString();
        return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>TodoMessenger</title></head><body style=\"background:#101820;color:#fff;font-family:sans-serif;padding:24px;\">" +
                "<p>Opening TodoMessenger…</p>" +
                "<script>" +
                "try {" +
                "localStorage.setItem('taskchat-backend-url'," + JSONObject.quote(BACKEND_URL) + ");" +
                "localStorage.setItem('taskchat-state'," + JSONObject.quote(stateJson) + ");" +
                "window.location.replace(" + JSONObject.quote(HOME_URL) + ");" +
                "} catch (error) {" +
                "document.body.innerHTML = '<p>Could not open TodoMessenger.</p><pre>' + error + '</pre>'; " +
                "}" +
                "</script></body></html>";
    }

    private JSONArray defaultSoftwareArray() {
        JSONArray array = new JSONArray();
        try {
            array.put(new JSONObject().put("id", "teams").put("name", "Microsoft Teams").put("type", "Chat and calls").put("enabled", true));
            array.put(new JSONObject().put("id", "gmail").put("name", "Gmail").put("type", "Email").put("enabled", true));
            array.put(new JSONObject().put("id", "meet").put("name", "Google Meet").put("type", "Meeting transcripts").put("enabled", true));
            array.put(new JSONObject().put("id", "google-calendar").put("name", "Google Calendar").put("type", "Calendar events and reminders").put("enabled", true));
        } catch (Exception ignored) {
            // If default software cannot be created, the web app will still sync from backend.
        }
        return array;
    }

    private void syncWebDestination(String destination) {
        String safeDestination = destination == null ? "chats" : destination;
        if ("settings".equals(safeDestination)) {
            runJavascript(
                    "if (window.openSettingsDialog) {" +
                            "window.openSettingsDialog();" +
                            "} else {" +
                            "var btn = document.getElementById('openSettingsButton') || document.getElementById('openSettingsMenuButton');" +
                            "if (btn) { btn.click(); }" +
                            "}"
            );
            return;
        }

        StringBuilder script = new StringBuilder();
        script.append("if (window.switchTab) { window.switchTab('").append(escapeJs(safeDestination)).append("'); }");
        if (selectedConversationId != null && !selectedConversationId.isEmpty()) {
            script.append("try {")
                    .append("var saved = JSON.parse(localStorage.getItem('taskchat-state') || '{}');")
                    .append("saved.activeId = '").append(escapeJs(selectedConversationId)).append("';")
                    .append("localStorage.setItem('taskchat-state', JSON.stringify(saved));")
                    .append("} catch (error) {}");
        }
        runJavascript(script.toString());
    }

    private void updateNavSelection(String destination) {
        updateNavLabels();
        styleNavButton(navChatsButton, "chats".equals(destination));
        styleNavButton(navTasksButton, "tasks".equals(destination));
        styleNavButton(navAddTaskButton, "addTask".equals(destination));
        styleNavButton(navSettingsButton, "settings".equals(destination));
    }

    private void updateNavLabels() {
        if (navChatsButton != null) {
            navChatsButton.setText(hasUnreadConversations()
                    ? getString(R.string.nav_chats_with_unread_dot)
                    : getString(R.string.nav_chats));
        }
        if (navTasksButton != null) {
            navTasksButton.setText(R.string.nav_tasks);
        }
        if (navAddTaskButton != null) {
            navAddTaskButton.setText(R.string.nav_add_task);
        }
        if (navSettingsButton != null) {
            navSettingsButton.setText(R.string.nav_settings);
        }
    }

    private void styleNavButton(Button button, boolean selected) {
        if (button == null) {
            return;
        }
        button.setBackgroundResource(selected ? R.drawable.bg_nav_button_selected : R.drawable.bg_nav_button_unselected);
        int textColor = getColor(selected ? R.color.white : R.color.bbm_dark);
        button.setTextColor(textColor);
    }

    private void showErrorState(String detail) {
        progressBar.setVisibility(View.GONE);
        swipeRefreshLayout.setRefreshing(false);
        launchOverlay.setVisibility(View.GONE);
        errorState.setVisibility(View.VISIBLE);
        errorMessage.setText(detail == null || detail.isEmpty() ? getString(R.string.error_message) : detail);
        setStatusText(getString(R.string.error_title));
    }

    private void setStatusForDestination(String destination) {
        if (isOffline) {
            setStatusText(getString(R.string.status_offline));
            return;
        }
        if ("tasks".equals(destination)) {
            setStatusText(getString(R.string.status_tab_tasks));
        } else if ("addTask".equals(destination)) {
            setStatusText(getString(R.string.status_tab_add));
        } else if ("settings".equals(destination)) {
            setStatusText(getString(R.string.status_settings));
        } else {
            setStatusText(getString(R.string.status_tab_chats));
        }
    }

    private void setStatusText(String text) {
        statusBanner.setText(text);
    }

    private void runJavascript(String script) {
        webView.post(() -> webView.evaluateJavascript("(function(){" + script + "})();", null));
    }

    private void openExternal(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        startActivity(intent);
    }

    private void setupConnectivityMonitoring() {
        connectivityManager = getSystemService(ConnectivityManager.class);
        if (connectivityManager == null) {
            return;
        }

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                runOnUiThread(() -> {
                    isOffline = false;
                    setStatusForDestination(activeDestination);
                });
            }

            @Override
            public void onLost(Network network) {
                runOnUiThread(() -> {
                    isOffline = !hasNetworkConnection();
                    if (isOffline) {
                        setStatusText(getString(R.string.status_offline));
                    }
                });
            }
        };

        try {
            NetworkRequest request = new NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build();
            connectivityManager.registerNetworkCallback(request, networkCallback);
        } catch (Exception ignored) {
            // Manual refresh still works.
        }

        isOffline = !hasNetworkConnection();
        if (isOffline) {
            setStatusText(getString(R.string.status_offline));
        }
    }

    private boolean hasNetworkConnection() {
        if (connectivityManager == null) {
            return true;
        }
        Network activeNetwork = connectivityManager.getActiveNetwork();
        if (activeNetwork == null) {
            return false;
        }
        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
        return capabilities != null && (
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                        || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                        || capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
        );
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return;
        }
        if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
    }

    private void loadFcmToken() {
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener((task) -> {
                if (!task.isSuccessful()) {
                    return;
                }
                pendingFcmToken = task.getResult();
                registerFcmTokenWithBackend(pendingFcmToken);
                if ("web".equals(currentSurface)) {
                    deliverFcmTokenToWeb();
                }
            });
        } catch (IllegalStateException ignored) {
            // Firebase remains optional until google-services.json is added.
        }
    }

    private void processLaunchIntent(Intent intent) {
        if (intent == null) {
            return;
        }
        String destination = intent.getStringExtra("destination");
        String conversationId = intent.getStringExtra("conversationId");
        if (conversationId != null && !conversationId.isEmpty()) {
            selectedConversationId = conversationId;
            saveLastConversationPreference();
        }
        if (destination == null || destination.isEmpty()) {
            return;
        }
        if ("task".equalsIgnoreCase(destination)) {
            activeDestination = "tasks";
        } else {
            activeDestination = destination;
        }
        updateNavSelection(activeDestination);
    }

    private void deliverFcmTokenToWeb() {
        if (pendingFcmToken == null || !"web".equals(currentSurface)) {
            return;
        }
        webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('todomessenger:fcmToken',{detail:{token:" + JSONObject.quote(pendingFcmToken) + ",platform:'android'}}));",
                null
        );
    }

    private void captureSharedContent(Intent intent) {
        if (intent == null) {
            return;
        }
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            return;
        }

        StringBuilder builder = new StringBuilder();
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (subject != null && !subject.isEmpty()) {
            builder.append(subject).append("\n");
        }
        if (text != null && !text.isEmpty()) {
            builder.append(text).append("\n");
        }

        ArrayList<Uri> uris = new ArrayList<>();
        Uri singleStream = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (singleStream != null) {
            uris.add(singleStream);
        }
        ArrayList<Parcelable> streams = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
        if (streams != null) {
            for (Parcelable parcelable : streams) {
                if (parcelable instanceof Uri) {
                    uris.add((Uri) parcelable);
                }
            }
        }

        for (Uri uri : uris) {
            builder.append("Attachment: ").append(uri).append("\n");
        }

        String content = builder.toString().trim();
        if (!content.isEmpty()) {
            pendingSharedPayload = content;
        }
    }

    private void deliverSharedContentToWeb() {
        if (pendingSharedPayload == null || !"web".equals(currentSurface)) {
            return;
        }
        webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('todomessenger:sharedContent',{detail:{source:'android-share',text:" + JSONObject.quote(pendingSharedPayload) + "}}));",
                null
        );
        pendingSharedPayload = null;
    }

    private void registerFcmTokenWithBackend(String token) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                URL url = new URL(BACKEND_URL + "/api/push/register");
                connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setDoOutput(true);

                JSONObject payload = new JSONObject();
                payload.put("token", token);
                payload.put("platform", "android");
                payload.put("userId", readStoredJson(PREF_USER_JSON) != null
                        ? readStoredJson(PREF_USER_JSON).optString("id", readStoredJson(PREF_USER_JSON).optString("email", "android-device"))
                        : "android-device");

                try (OutputStream outputStream = connection.getOutputStream()) {
                    outputStream.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                }
                connection.getResponseCode();
            } catch (Exception ignored) {
                // Registration retries on the next open or token refresh.
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }

    private ApiResponse request(String method, String path, String body, String bearerToken) throws Exception {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(BACKEND_URL + path);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(12000);
            connection.setRequestProperty("Accept", "application/json");
            if (body != null) {
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);
            }
            if (bearerToken != null && !bearerToken.isEmpty()) {
                connection.setRequestProperty("Authorization", "Bearer " + bearerToken);
            }
            if (body != null) {
                try (OutputStream outputStream = connection.getOutputStream()) {
                    outputStream.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            int status = connection.getResponseCode();
            String responseBody = readStream(status >= 400 ? connection.getErrorStream() : connection.getInputStream());
            return new ApiResponse(status, responseBody == null ? "" : responseBody);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private String readStream(InputStream stream) throws Exception {
        if (stream == null) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line);
            }
        }
        return builder.toString();
    }

    private JSONObject parseBodyObject(String body) {
        try {
            return body == null || body.isEmpty() ? new JSONObject() : new JSONObject(body);
        } catch (Exception ignored) {
            return new JSONObject();
        }
    }

    private String readApiError(JSONObject data, String fallback) {
        String error = data.optString("error", "");
        String message = data.optString("message", "");
        if (!message.isEmpty()) {
            return message;
        }
        if (!error.isEmpty()) {
            return error;
        }
        return fallback;
    }

    private ArrayList<ConversationItem> parseConversations(JSONArray array) {
        ArrayList<ConversationItem> results = new ArrayList<>();
        if (array == null) {
            return results;
        }
        for (int index = 0; index < array.length(); index++) {
            JSONObject item = array.optJSONObject(index);
            if (item == null) {
                continue;
            }
            JSONArray messages = item.optJSONArray("messages");
            String preview = "";
            int unreadCount = countUnreadMessages(messages);
            String latestActivityAt = item.optString("updatedAt", "");
            if (messages != null && messages.length() > 0) {
                JSONObject latest = messages.optJSONObject(messages.length() - 1);
                if (latest != null) {
                    preview = latest.optString("text", latest.optString("preview", ""));
                    String latestMessageAt = latest.optString("createdAt", "");
                    if (!latestMessageAt.isEmpty()) {
                        latestActivityAt = latestMessageAt;
                    }
                }
            }
            results.add(new ConversationItem(
                    item.optString("id", ""),
                    item.optString("name", "Conversation"),
                    item.optString("status", "workspace chat"),
                    preview,
                    unreadCount,
                    latestActivityAt
            ));
        }
        return results;
    }

    private ArrayList<TaskItem> parseTasks(JSONArray array) {
        ArrayList<TaskItem> results = new ArrayList<>();
        if (array == null) {
            return results;
        }
        for (int index = 0; index < array.length(); index++) {
            JSONObject item = array.optJSONObject(index);
            if (item == null) {
                continue;
            }
            results.add(new TaskItem(
                    item.optString("id", ""),
                    item.optString("conversationId", ""),
                    item.optString("title", "Task"),
                    item.optString("description", ""),
                    item.optString("assignee", ""),
                    item.optString("due", ""),
                    item.optString("reminderAt", ""),
                    item.optString("priority", ""),
                    item.optBoolean("done", false),
                    item.optString("status", item.optBoolean("done", false) ? "done" : "open")
            ));
        }
        return results;
    }

    private ArrayList<MessageItem> parseMessages(JSONArray array) {
        ArrayList<MessageItem> results = new ArrayList<>();
        if (array == null) {
            return results;
        }
        for (int index = 0; index < array.length(); index++) {
            JSONObject item = array.optJSONObject(index);
            if (item == null) {
                continue;
            }
            results.add(new MessageItem(
                    item.optString("id", ""),
                    item.optString("senderId", ""),
                    item.optString("sender", "them"),
                    item.optString("preview", item.optString("encrypted", "")),
                    item.optString("time", ""),
                    isMessageReadByCurrentUser(item)
            ));
        }
        return results;
    }

    private int countUnreadMessages(JSONArray messages) {
        if (messages == null || currentUserId == null || currentUserId.isEmpty()) {
            return 0;
        }
        int count = 0;
        for (int index = 0; index < messages.length(); index++) {
            JSONObject item = messages.optJSONObject(index);
            if (item == null) {
                continue;
            }
            String senderId = item.optString("senderId", "");
            if (senderId.equals(currentUserId)) {
                continue;
            }
            if (!isMessageReadByCurrentUser(item)) {
                count++;
            }
        }
        return count;
    }

    private ArrayList<String> collectUnreadMessageIds(JSONArray messages) {
        ArrayList<String> unreadIds = new ArrayList<>();
        if (messages == null || currentUserId == null || currentUserId.isEmpty()) {
            return unreadIds;
        }
        for (int index = 0; index < messages.length(); index++) {
            JSONObject item = messages.optJSONObject(index);
            if (item == null) {
                continue;
            }
            String senderId = item.optString("senderId", "");
            String messageId = item.optString("id", "");
            if (messageId.isEmpty() || senderId.equals(currentUserId)) {
                continue;
            }
            if (!isMessageReadByCurrentUser(item)) {
                unreadIds.add(messageId);
            }
        }
        return unreadIds;
    }

    private boolean isMessageReadByCurrentUser(JSONObject item) {
        if (item == null || currentUserId == null || currentUserId.isEmpty()) {
            return true;
        }
        JSONArray readBy = item.optJSONArray("readBy");
        if (readBy == null) {
            return false;
        }
        for (int index = 0; index < readBy.length(); index++) {
            JSONObject record = readBy.optJSONObject(index);
            if (record != null && currentUserId.equals(record.optString("userId", ""))) {
                return true;
            }
        }
        return false;
    }

    private ConversationItem findConversation(String id) {
        for (ConversationItem conversation : conversations) {
            if (conversation.id.equals(id)) {
                return conversation;
            }
        }
        return null;
    }

    private void markConversationReadLocally(String conversationId) {
        if (conversationId == null || conversationId.isEmpty()) {
            return;
        }
        for (int index = 0; index < conversations.size(); index++) {
            ConversationItem conversation = conversations.get(index);
            if (!conversationId.equals(conversation.id)) {
                continue;
            }
            conversations.set(index, new ConversationItem(
                    conversation.id,
                    conversation.name,
                    conversation.status,
                    conversation.preview,
                    0,
                    conversation.latestActivityAt
            ));
            break;
        }
        if ("chats".equals(activeDestination) && "native".equals(currentSurface)) {
            renderConversationCards();
        }
        NotificationBadgeHelper.setUnreadBadge(this, getTotalUnreadCount(conversations));
    }

    private void markMessagesReadLocally(List<String> messageIds) {
        if (messageIds == null || messageIds.isEmpty()) {
            return;
        }
        Set<String> ids = new HashSet<>(messageIds);
        ArrayList<MessageItem> updatedMessages = new ArrayList<>();
        for (MessageItem message : activeMessages) {
            if (ids.contains(message.id)) {
                updatedMessages.add(new MessageItem(
                        message.id,
                        message.senderId,
                        message.sender,
                        message.preview,
                        message.time,
                        true
                ));
            } else {
                updatedMessages.add(message);
            }
        }
        activeMessages.clear();
        activeMessages.addAll(updatedMessages);
    }

    private void markMessagesReadOnServer(List<String> messageIds) {
        if (messageIds == null || messageIds.isEmpty() || !hasSession()) {
            return;
        }
        new Thread(() -> {
            try {
                String token = preferences.getString(PREF_SESSION_TOKEN, "");
                for (String messageId : messageIds) {
                    if (messageId == null || messageId.isEmpty()) {
                        continue;
                    }
                    request("POST", "/api/messages/" + messageId + "/read", "", token);
                }
            } catch (Exception ignored) {
                // Keep local unread state responsive even if the network roundtrip fails.
            }
        }).start();
    }

    private TaskItem findTask(String id) {
        for (TaskItem task : tasks) {
            if (task.id.equals(id)) {
                return task;
            }
        }
        return null;
    }

    private void setTaskFilter(String filter) {
        currentTaskFilter = filter == null || filter.isEmpty() ? "open" : filter;
        saveTaskFilterPreference();
        if ("tasks".equals(activeDestination) && "native".equals(currentSurface)) {
            updateTaskFilterSelection();
            renderTaskCards();
        }
    }

    private void toggleTaskSection(String sectionKey) {
        if (sectionKey == null || sectionKey.isEmpty()) {
            return;
        }
        if (collapsedTaskSections.contains(sectionKey)) {
            collapsedTaskSections.remove(sectionKey);
        } else {
            collapsedTaskSections.add(sectionKey);
        }
        saveCollapsedTaskSections();
        if ("tasks".equals(activeDestination) && "native".equals(currentSurface)) {
            renderTaskCards();
        }
    }

    private void loadCollapsedTaskSections() {
        collapsedTaskSections.clear();
        String raw = preferences.getString(PREF_COLLAPSED_TASK_SECTIONS, "");
        if (raw == null || raw.trim().isEmpty()) {
            return;
        }
        String[] parts = raw.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                collapsedTaskSections.add(trimmed);
            }
        }
    }

    private void saveCollapsedTaskSections() {
        if (collapsedTaskSections.isEmpty()) {
            preferences.edit().remove(PREF_COLLAPSED_TASK_SECTIONS).apply();
            return;
        }
        StringBuilder builder = new StringBuilder();
        for (String section : collapsedTaskSections) {
            if (section == null || section.trim().isEmpty()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(",");
            }
            builder.append(section.trim());
        }
        preferences.edit().putString(PREF_COLLAPSED_TASK_SECTIONS, builder.toString()).apply();
    }

    private void loadTaskFilterPreference() {
        String saved = preferences.getString(PREF_TASK_FILTER, "open");
        if ("done".equals(saved) || "today".equals(saved) || "all".equals(saved) || "open".equals(saved)) {
            currentTaskFilter = saved;
        } else {
            currentTaskFilter = "open";
        }
    }

    private void saveTaskFilterPreference() {
        preferences.edit().putString(PREF_TASK_FILTER, currentTaskFilter == null || currentTaskFilter.isEmpty() ? "open" : currentTaskFilter).apply();
    }

    private void loadLastTabPreference() {
        String saved = preferences.getString(PREF_LAST_TAB, "chats");
        if ("tasks".equals(saved) || "addTask".equals(saved) || "settings".equals(saved) || "chats".equals(saved)) {
            activeDestination = saved;
        } else {
            activeDestination = "chats";
        }
    }

    private void saveLastTabPreference() {
        String value = activeDestination == null || activeDestination.isEmpty() ? "chats" : activeDestination;
        preferences.edit().putString(PREF_LAST_TAB, value).apply();
    }

    private void loadLastConversationPreference() {
        selectedConversationId = preferences.getString(PREF_LAST_CONVERSATION_ID, "");
        if (selectedConversationId == null) {
            selectedConversationId = "";
        }
    }

    private void saveLastConversationPreference() {
        if (selectedConversationId == null || selectedConversationId.isEmpty()) {
            preferences.edit().remove(PREF_LAST_CONVERSATION_ID).apply();
            return;
        }
        preferences.edit().putString(PREF_LAST_CONVERSATION_ID, selectedConversationId).apply();
    }

    private void openSavedTopLevelDestination() {
        if ("chats".equals(activeDestination) && !selectedConversationId.isEmpty()) {
            ConversationItem savedConversation = findConversation(selectedConversationId);
            if (savedConversation != null) {
                loadNativeConversation(savedConversation);
                return;
            }
        }
        if ("addTask".equals(activeDestination)) {
            showNativeTaskEditor(null);
            return;
        }
        if ("settings".equals(activeDestination)) {
            openWebWorkspace("settings", selectedConversationId);
            return;
        }
        showNativeHome(activeDestination);
    }

    private void updateTaskFilterSelection() {
        updateFilterButtonState(nativeTaskFilterOpen, "open".equals(currentTaskFilter));
        updateFilterButtonState(nativeTaskFilterDone, "done".equals(currentTaskFilter));
        updateFilterButtonState(nativeTaskFilterToday, "today".equals(currentTaskFilter));
        updateFilterButtonState(nativeTaskFilterAll, "all".equals(currentTaskFilter));
    }

    private void updateFilterButtonState(Button button, boolean selected) {
        if (button == null) {
            return;
        }
        button.setBackgroundResource(selected ? R.drawable.bg_nav_button_selected : R.drawable.bg_nav_button_unselected);
        button.setTextColor(getColor(selected ? R.color.white : R.color.bbm_dark));
    }

    private boolean matchesTaskFilter(TaskItem task) {
        switch (currentTaskFilter) {
            case "done":
                return task.done;
            case "today":
                return !task.done && isTaskDueToday(task);
            case "all":
                return true;
            case "open":
            default:
                return !task.done;
        }
    }

    private boolean isTaskDueToday(TaskItem task) {
        if (task == null || task.due == null || task.due.trim().isEmpty()) {
            return false;
        }
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date());
        return today.equals(task.due.trim());
    }

    private int compareTasksForDisplay(TaskItem left, TaskItem right) {
        int bucketCompare = Integer.compare(getUrgencyBucket(left), getUrgencyBucket(right));
        if (bucketCompare != 0) {
            return bucketCompare;
        }

        long leftDue = getTaskDueTime(left);
        long rightDue = getTaskDueTime(right);
        int dueCompare = Long.compare(leftDue, rightDue);
        if (dueCompare != 0) {
            return dueCompare;
        }

        int priorityCompare = Integer.compare(getPriorityRank(left.priority), getPriorityRank(right.priority));
        if (priorityCompare != 0) {
            return priorityCompare;
        }

        return left.title.compareToIgnoreCase(right.title);
    }

    private int compareConversationsForDisplay(ConversationItem left, ConversationItem right) {
        int unreadCompare = Integer.compare(right.unreadCount, left.unreadCount);
        if (unreadCompare != 0) {
            return unreadCompare;
        }

        String leftActivity = left.latestActivityAt == null ? "" : left.latestActivityAt;
        String rightActivity = right.latestActivityAt == null ? "" : right.latestActivityAt;
        int activityCompare = rightActivity.compareTo(leftActivity);
        if (activityCompare != 0) {
            return activityCompare;
        }

        return left.name.compareToIgnoreCase(right.name);
    }

    private String formatConversationActivity(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "";
        }
        try {
            SimpleDateFormat serverFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.ROOT);
            serverFormat.setLenient(true);
            Date parsed = serverFormat.parse(value.trim());
            if (parsed == null) {
                return "";
            }

            SimpleDateFormat dayFormat = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
            String today = dayFormat.format(new Date());
            String parsedDay = dayFormat.format(parsed);
            if (today.equals(parsedDay)) {
                return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(parsed);
            }
            return new SimpleDateFormat("MMM d", Locale.getDefault()).format(parsed);
        } catch (Exception ignored) {
            return "";
        }
    }

    private int getUrgencyBucket(TaskItem task) {
        if (task == null) {
            return 5;
        }
        if (task.done) {
            return 4;
        }
        long dueTime = getTaskDueTime(task);
        if (dueTime == Long.MAX_VALUE) {
            return 3;
        }

        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date());
        long todayTime = parseDateOnlyMillis(today);
        if (todayTime == Long.MAX_VALUE) {
            return 2;
        }
        if (dueTime < todayTime) {
            return 0;
        }
        if (dueTime == todayTime) {
            return 1;
        }
        return 2;
    }

    private long getTaskDueTime(TaskItem task) {
        if (task == null) {
            return Long.MAX_VALUE;
        }
        return parseDateOnlyMillis(task.due);
    }

    private long parseDateOnlyMillis(String value) {
        if (value == null || value.trim().isEmpty()) {
            return Long.MAX_VALUE;
        }
        try {
            SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT);
            formatter.setLenient(false);
            Date parsed = formatter.parse(value.trim());
            return parsed == null ? Long.MAX_VALUE : parsed.getTime();
        } catch (Exception ignored) {
            return Long.MAX_VALUE;
        }
    }

    private int getPriorityRank(String priority) {
        String normalized = priority == null ? "" : priority.trim().toLowerCase(Locale.ROOT);
        switch (normalized) {
            case "high":
                return 0;
            case "low":
                return 2;
            case "normal":
            default:
                return 1;
        }
    }

    private String getEmptyTaskFilterMessage() {
        switch (currentTaskFilter) {
            case "done":
                return getString(R.string.native_empty_tasks_done);
            case "today":
                return getString(R.string.native_empty_tasks_today);
            case "all":
                return getString(R.string.native_empty_tasks);
            case "open":
            default:
                return getString(R.string.native_empty_tasks_open);
        }
    }

    private String getTaskSectionLabel(TaskItem task) {
        if (task == null) {
            return getString(R.string.native_section_upcoming);
        }
        if (task.done || "done".equals(currentTaskFilter)) {
            return getString(R.string.native_section_done);
        }
        if ("today".equals(currentTaskFilter)) {
            return getString(R.string.native_section_today);
        }
        return getUrgencyBucket(task) <= 1
                ? getString(R.string.native_section_today)
                : getString(R.string.native_section_upcoming);
    }

    private String getTaskSectionKey(TaskItem task) {
        if (task == null) {
            return "upcoming";
        }
        if (task.done || "done".equals(currentTaskFilter)) {
            return "done";
        }
        if ("today".equals(currentTaskFilter)) {
            return "today";
        }
        return getUrgencyBucket(task) <= 1 ? "today" : "upcoming";
    }

    private void persistSession(String token, JSONObject user, JSONObject workspace) {
        SharedPreferences.Editor editor = preferences.edit();
        editor.putString(PREF_SESSION_TOKEN, token == null ? "" : token);
        if (user != null) {
            editor.putString(PREF_USER_JSON, user.toString());
        }
        if (workspace != null) {
            editor.putString(PREF_WORKSPACE_JSON, workspace.toString());
        }
        editor.apply();
    }

    private JSONObject readStoredJson(String key) {
        try {
            String raw = preferences.getString(key, "");
            return raw == null || raw.isEmpty() ? null : new JSONObject(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    private void clearSession() {
        preferences.edit()
                .remove(PREF_SESSION_TOKEN)
                .remove(PREF_USER_JSON)
                .remove(PREF_WORKSPACE_JSON)
                .remove(PREF_LAST_CONVERSATION_ID)
                .apply();
        conversations.clear();
        tasks.clear();
        selectedConversationId = "";
        currentUserId = "";
        NotificationBadgeHelper.setUnreadBadge(this, 0);
        clearEditingTask();
    }

    private boolean hasSession() {
        String token = preferences.getString(PREF_SESSION_TOKEN, "");
        return token != null && !token.isEmpty();
    }

    private void setAuthBusy(boolean busy) {
        sendCodeButton.setEnabled(!busy);
        verifyCodeButton.setEnabled(!busy);
        resendCodeButton.setEnabled(!busy);
        emailInput.setEnabled(!busy);
        codeInput.setEnabled(!busy);
    }

    private String inferNameFromEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "TodoMessenger User";
        }
        String local = email.substring(0, email.indexOf('@'));
        String[] pieces = local.replace('.', ' ').replace('_', ' ').replace('-', ' ').trim().split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (String piece : pieces) {
            if (piece.isEmpty()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append(' ');
            }
            builder.append(piece.substring(0, 1).toUpperCase(Locale.ROOT));
            if (piece.length() > 1) {
                builder.append(piece.substring(1));
            }
        }
        return builder.length() > 0 ? builder.toString() : "TodoMessenger User";
    }

    private String normalizePriorityInput(String value) {
        String normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if ("high".equals(normalized) || "low".equals(normalized)) {
            return normalized;
        }
        return "normal";
    }

    private String normalizeReminderInput(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.contains("T")) {
            return trimmed;
        }
        if (trimmed.contains(" ")) {
            return trimmed.replace(" ", "T");
        }
        return trimmed;
    }

    private String formatReminderInput(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "";
        }
        String formatted = value.trim().replace("T", " ");
        return formatted.length() > 16 ? formatted.substring(0, 16) : formatted;
    }

    private void clearTaskForm() {
        nativeTaskTitleInput.setText("");
        nativeTaskAssigneeInput.setText("");
        nativeTaskDueInput.setText("");
        nativeTaskReminderInput.setText("");
        nativeTaskPriorityInput.setText("normal");
    }

    private void clearEditingTask() {
        editingTaskId = "";
        editingTaskDone = false;
        nativeToggleTaskStatusButton.setVisibility(View.GONE);
        nativeToggleTaskStatusButton.setEnabled(true);
    }

    private int countOpenTasks() {
        int count = 0;
        for (TaskItem task : tasks) {
            if (!task.done) {
                count++;
            }
        }
        return count;
    }

    private boolean hasUnreadConversations() {
        for (ConversationItem conversation : conversations) {
            if (conversation.unreadCount > 0) {
                return true;
            }
        }
        return false;
    }

    private int getTotalUnreadCount(List<ConversationItem> items) {
        if (items == null || items.isEmpty()) {
            return 0;
        }
        int count = 0;
        for (ConversationItem conversation : items) {
            if (conversation != null && conversation.unreadCount > 0) {
                count += conversation.unreadCount;
            }
        }
        return count;
    }

    private int countOpenTasks(String conversationId) {
        int count = 0;
        for (TaskItem task : tasks) {
            if (!task.done && conversationId.equals(task.conversationId)) {
                count++;
            }
        }
        return count;
    }

    private void showKeyboard(View view) {
        view.post(() -> {
            InputMethodManager inputMethodManager = getSystemService(InputMethodManager.class);
            if (inputMethodManager != null) {
                inputMethodManager.showSoftInput(view, InputMethodManager.SHOW_IMPLICIT);
            }
        });
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private String escapeJs(String value) {
        return String.valueOf(value)
                .replace("\\", "\\\\")
                .replace("'", "\\'");
    }

    private static final class ApiResponse {
        final int status;
        final String body;

        ApiResponse(int status, String body) {
            this.status = status;
            this.body = body;
        }
    }

    private static final class ConversationItem {
        final String id;
        final String name;
        final String status;
        final String preview;
        final int unreadCount;
        final String latestActivityAt;

        ConversationItem(String id, String name, String status, String preview, int unreadCount, String latestActivityAt) {
            this.id = id;
            this.name = name;
            this.status = status;
            this.preview = preview;
            this.unreadCount = unreadCount;
            this.latestActivityAt = latestActivityAt;
        }
    }

    private static final class TaskItem {
        final String id;
        final String conversationId;
        final String title;
        final String description;
        final String assignee;
        final String due;
        final String reminderAt;
        final String priority;
        final boolean done;
        final String status;

        TaskItem(String id, String conversationId, String title, String description, String assignee, String due, String reminderAt, String priority, boolean done, String status) {
            this.id = id;
            this.conversationId = conversationId;
            this.title = title;
            this.description = description;
            this.assignee = assignee;
            this.due = due;
            this.reminderAt = reminderAt;
            this.priority = priority;
            this.done = done;
            this.status = status;
        }
    }

    private static final class MessageItem {
        final String id;
        final String senderId;
        final String sender;
        final String preview;
        final String time;
        final boolean readByMe;

        MessageItem(String id, String senderId, String sender, String preview, String time, boolean readByMe) {
            this.id = id;
            this.senderId = senderId;
            this.sender = sender;
            this.preview = preview;
            this.time = time;
            this.readByMe = readByMe;
        }
    }
}

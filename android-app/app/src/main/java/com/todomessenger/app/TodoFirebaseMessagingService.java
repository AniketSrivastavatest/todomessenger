package com.todomessenger.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class TodoFirebaseMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "task_reminders";
    private static final String BACKEND_URL = "https://todomessenger-backend.onrender.com";
    private static final String GROUP_GENERAL_CHATS = "tm_group_chats";
    private static final String GROUP_TASKS = "tm_group_tasks";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        String title = "TodoMessenger";
        String body = "You have a new reminder.";
        String requestedDestination = message != null ? message.getData().get("destination") : null;

        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) {
                title = message.getNotification().getTitle();
            }
            if (message.getNotification().getBody() != null) {
                body = message.getNotification().getBody();
            }
        }

        if (message.getData().containsKey("title")) {
            title = message.getData().get("title");
        }
        if (message.getData().containsKey("body")) {
            body = message.getData().get("body");
        }

        showNotification(title, body, message);
        if (shouldIncrementUnreadBadge(requestedDestination, title, body)) {
            NotificationBadgeHelper.incrementUnreadBadge(this);
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        registerFcmTokenWithBackend(token);
    }

    private void showNotification(String title, String body, RemoteMessage message) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        ensureChannel(manager);

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        String destination = "chats";
        String requestedDestination = message != null ? message.getData().get("destination") : null;
        String conversationId = message != null ? message.getData().get("conversationId") : null;
        String conversationName = message != null ? message.getData().get("conversationName") : null;
        if ("task".equalsIgnoreCase(requestedDestination)) {
            destination = "tasks";
        } else if ("tasks".equalsIgnoreCase(requestedDestination)) {
            destination = "tasks";
        } else if ("addTask".equalsIgnoreCase(requestedDestination)) {
            destination = "addTask";
        } else if ("settings".equalsIgnoreCase(requestedDestination)) {
            destination = "settings";
        } else if (messageLooksTaskRelated(title, body)) {
            destination = "tasks";
        }
        intent.putExtra("destination", destination);
        if (conversationId != null && !conversationId.isEmpty()) {
            intent.putExtra("conversationId", conversationId);
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                buildSummaryNotificationId(resolveGroupKey(destination, conversationId)),
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        String groupKey = resolveGroupKey(destination, conversationId);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setGroup(groupKey)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_SUMMARY)
                .setCategory("tasks".equals(destination) ? NotificationCompat.CATEGORY_REMINDER : NotificationCompat.CATEGORY_MESSAGE);

        manager.notify((int) System.currentTimeMillis(), builder.build());
        manager.notify(
                buildSummaryNotificationId(groupKey),
                buildSummaryNotification(groupKey, destination, conversationName, title, body, pendingIntent).build()
        );
    }

    private boolean shouldIncrementUnreadBadge(String requestedDestination, String title, String body) {
        if ("tasks".equalsIgnoreCase(requestedDestination)
                || "task".equalsIgnoreCase(requestedDestination)
                || "addTask".equalsIgnoreCase(requestedDestination)
                || "settings".equalsIgnoreCase(requestedDestination)) {
            return false;
        }
        return !messageLooksTaskRelated(title, body);
    }

    private boolean messageLooksTaskRelated(String title, String body) {
        String combined = (title + " " + body).toLowerCase();
        return combined.contains("task") || combined.contains("reminder") || combined.contains("due");
    }

    private String resolveGroupKey(String destination, String conversationId) {
        if ("tasks".equals(destination) || "task".equals(destination)) {
            return GROUP_TASKS;
        }
        if (conversationId != null && !conversationId.isEmpty()) {
            return "tm_conversation_" + conversationId;
        }
        return GROUP_GENERAL_CHATS;
    }

    private int buildSummaryNotificationId(String groupKey) {
        return 200000 + Math.abs(groupKey.hashCode() % 100000);
    }

    private NotificationCompat.Builder buildSummaryNotification(
            String groupKey,
            String destination,
            String conversationName,
            String title,
            String body,
            PendingIntent pendingIntent
    ) {
        String summaryTitle;
        String summaryBody;
        if ("tasks".equals(destination)) {
            summaryTitle = getString(R.string.notification_group_tasks_title);
            summaryBody = getString(R.string.notification_group_tasks_body);
        } else if (conversationName != null && !conversationName.isEmpty()) {
            summaryTitle = conversationName;
            summaryBody = body;
        } else {
            summaryTitle = getString(R.string.notification_group_chats_title);
            summaryBody = title;
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(summaryTitle)
                .setContentText(summaryBody)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .setGroup(groupKey)
                .setGroupSummary(true)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_SUMMARY)
                .setCategory("tasks".equals(destination) ? NotificationCompat.CATEGORY_REMINDER : NotificationCompat.CATEGORY_MESSAGE)
                .setPriority(NotificationCompat.PRIORITY_HIGH);
    }

    private void ensureChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                getString(R.string.task_reminders_channel_name),
                NotificationManager.IMPORTANCE_HIGH
        );
        manager.createNotificationChannel(channel);
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

                String payload = "{"
                        + "\"token\":\"" + escapeJson(token) + "\","
                        + "\"platform\":\"android\","
                        + "\"userId\":\"android-device\""
                        + "}";
                try (OutputStream outputStream = connection.getOutputStream()) {
                    outputStream.write(payload.getBytes(StandardCharsets.UTF_8));
                }
                connection.getResponseCode();
            } catch (Exception ignored) {
                // Token registration is retried when Firebase refreshes the token or the app opens.
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }).start();
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}

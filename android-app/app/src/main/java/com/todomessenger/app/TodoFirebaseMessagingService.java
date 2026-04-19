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

public class TodoFirebaseMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "task_reminders";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        String title = "TodoMessenger";
        String body = "You have a new reminder.";

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

        showNotification(title, body);
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
    }

    private void showNotification(String title, String body) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        ensureChannel(manager);

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        manager.notify((int) System.currentTimeMillis(), builder.build());
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
}

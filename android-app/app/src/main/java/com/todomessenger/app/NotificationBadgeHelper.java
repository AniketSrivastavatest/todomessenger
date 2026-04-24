package com.todomessenger.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

final class NotificationBadgeHelper {
    private static final String CHANNEL_ID = "workspace_badges";
    private static final int SUMMARY_NOTIFICATION_ID = 42001;

    private NotificationBadgeHelper() {
    }

    static void updateUnreadBadge(Context context, int unreadCount) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }
        ensureChannel(context, manager);
        if (unreadCount <= 0) {
            manager.cancel(SUMMARY_NOTIFICATION_ID);
            return;
        }

        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("destination", "chats");
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                SUMMARY_NOTIFICATION_ID,
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_notification)
                .setContentTitle(context.getString(R.string.badge_summary_title))
                .setContentText(context.getString(R.string.badge_summary_body, unreadCount))
                .setContentIntent(pendingIntent)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setShowWhen(false)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_STATUS)
                .setBadgeIconType(NotificationCompat.BADGE_ICON_SMALL)
                .setNumber(unreadCount);

        manager.notify(SUMMARY_NOTIFICATION_ID, builder.build());
    }

    static void incrementUnreadBadge(Context context) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }
        ensureChannel(context, manager);
        NotificationBadgeStateStore store = new NotificationBadgeStateStore(context);
        int nextCount = store.incrementUnreadCount();
        updateUnreadBadge(context, nextCount);
    }

    static void setUnreadBadge(Context context, int unreadCount) {
        NotificationBadgeStateStore store = new NotificationBadgeStateStore(context);
        store.setUnreadCount(Math.max(0, unreadCount));
        updateUnreadBadge(context, unreadCount);
    }

    private static void ensureChannel(Context context, NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.badge_channel_name),
                NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(context.getString(R.string.badge_channel_description));
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }
}

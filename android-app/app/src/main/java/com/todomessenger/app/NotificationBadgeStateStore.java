package com.todomessenger.app;

import android.content.Context;
import android.content.SharedPreferences;

final class NotificationBadgeStateStore {
    private static final String PREFS_NAME = "todomessenger_badges";
    private static final String PREF_UNREAD_COUNT = "unread_count";

    private final SharedPreferences preferences;

    NotificationBadgeStateStore(Context context) {
        preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    int incrementUnreadCount() {
        int next = getUnreadCount() + 1;
        setUnreadCount(next);
        return next;
    }

    int getUnreadCount() {
        return Math.max(0, preferences.getInt(PREF_UNREAD_COUNT, 0));
    }

    void setUnreadCount(int count) {
        preferences.edit().putInt(PREF_UNREAD_COUNT, Math.max(0, count)).apply();
    }
}

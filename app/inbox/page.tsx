"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { PageBackLink } from "@/components/page-back-link";

interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to fetch notifications");
        return;
      }

      setNotifications(data);
      setError("");
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId,
          read: true,
        }),
      });

      if (!response.ok) {
        console.error("Failed to mark notification as read");
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((notif) => markAsRead(notif.id))
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,#fef3c7,#f8fafc_40%)] p-8 dark:bg-[radial-gradient(circle_at_top,#1f2937,#0b1220_45%)]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Inbox
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-foreground">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <PageBackLink href="/dashboard">Back to Dashboard</PageBackLink>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                Mark All as Read
              </Button>
            )}
            <Button onClick={fetchNotifications} variant="outline" disabled={isLoading}>
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <Card className="border-border bg-card/90 shadow-lg shadow-black/5 dark:shadow-black/20">
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No notifications yet.</p>
              <p className="mt-2 text-sm">You'll receive notifications when your requests are accepted or declined.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`border-border bg-card/90 shadow-lg shadow-black/5 dark:shadow-black/20 ${
                  notification.read ? "opacity-75" : "border-foreground/20"
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {notification.read ? (
                          notification.message
                        ) : (
                          <span className="font-semibold">{notification.message}</span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {new Date(notification.createdAt).toLocaleString()}
                      </CardDescription>
                    </div>
                    {!notification.read && (
                      <span className="ml-4 h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                </CardHeader>
                {!notification.read && (
                  <CardContent>
                    <Button
                      onClick={() => markAsRead(notification.id)}
                      variant="outline"
                      size="sm"
                    >
                      Mark as Read
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


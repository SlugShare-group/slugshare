"use client";

import { useEffect, useRef } from "react";

type NotificationRecord = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
};

const NOTIFICATION_STORAGE_KEY = "slugshare_last_notification_id";

export function NotificationBridge() {
  const pollingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    // Ask for permission once on mount
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const loadAndNotify = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as NotificationRecord[];
        if (!Array.isArray(data) || data.length === 0) return;

        const lastSeenId =
          window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);

        // Newest first from API
        const unseen = lastSeenId
          ? data.filter((n) => n.id !== lastSeenId)
          : data;

        if (
          Notification.permission === "granted" &&
          unseen.length > 0
        ) {
          for (const n of unseen) {
            if (
              n.type === "request_accepted" ||
              n.type === "request_completed" ||
              n.type === "request_accepted_by_you" ||
              n.type === "request_completed_by_you"
            ) {
              new Notification("SlugShare", {
                body: n.message,
              });
            }
          }
        }

        // Mark the newest as seen
        const newest = data[0];
        if (newest) {
          window.localStorage.setItem(
            NOTIFICATION_STORAGE_KEY,
            newest.id,
          );
        }
      } catch {
        // ignore
      } finally {
        pollingRef.current = false;
      }
    };

    // initial load
    void loadAndNotify();
    const id = window.setInterval(loadAndNotify, 15000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}


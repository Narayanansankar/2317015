import { useEffect, useState } from "react";
import { Log } from "logging-middleware";

// keeping track of which notification ids the student already opened, so
// we can show a "New" badge on the ones they haven't seen yet
const STORAGE_KEY = "viewedNotificationIds";

function loadViewedIds(): Set<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function useViewedNotifications() {
  const [viewedIds, setViewedIds] = useState<Set<string>>(loadViewedIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(viewedIds)));
  }, [viewedIds]);

  function markAsViewed(id: string) {
    if (viewedIds.has(id)) return;
    setViewedIds((prev) => new Set(prev).add(id));
    Log("frontend", "info", "hook", `marked notification ${id} as viewed`);
  }

  function isViewed(id: string) {
    return viewedIds.has(id);
  }

  return { isViewed, markAsViewed };
}

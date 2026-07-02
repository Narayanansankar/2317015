import { Log } from "logging-middleware";
import { Notification } from "../types/notification";

// goes through vite's dev proxy (see vite.config.ts) instead of calling
// the external IP directly from the browser, so CORS is not a problem
const API_URL = "/api/notifications";

interface FetchParams {
  limit?: number;
  page?: number;
  notification_type?: string;
}

// calls the notifications API given in the assignment, with the query
// params it supports (limit, page, notification_type)
export async function fetchNotifications(params: FetchParams = {}): Promise<Notification[]> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.page) query.set("page", String(params.page));
  if (params.notification_type) query.set("notification_type", params.notification_type);

  const url = query.toString() ? `${API_URL}?${query.toString()}` : API_URL;
  const token = import.meta.env.VITE_LOG_ACCESS_TOKEN;

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`request failed with status ${res.status}`);
    }
    const data = await res.json();
    const notifications: Notification[] = data.notifications || [];
    Log("frontend", "info", "api", `fetched ${notifications.length} notifications`);
    return notifications;
  } catch (err) {
    Log("frontend", "error", "api", `failed to fetch notifications: ${(err as Error).message}`);
    throw err;
  }
}

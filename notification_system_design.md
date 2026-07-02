# Stage 1 - REST API Design

Notifications for a logged in student (placement update, event, result etc).
All routes start with `/api/notifications` and need `Authorization: Bearer <token>`.

Notification looks like this:
```json
{ "id": 501, "title": "New Placement Drive", "message": "TCS visiting on 10th July", "type": "info", "isRead": false, "link": "/placements/10", "createdAt": "2026-07-05T10:15:30.000Z" }
```

| Method | Route | What it does | Response `data` |
|---|---|---|---|
| GET | `/api/notifications?page=1&limit=20&status=all` | list notifications, paginated | `{ notifications: [...], pagination: { page, limit, total } }` |
| GET | `/api/notifications/:id` | get one | the notification object, or 404 |
| GET | `/api/notifications/unread-count` | badge count | `{ unreadCount: 5 }` |
| PATCH | `/api/notifications/:id/read` | mark one as read | `{ id: 501, isRead: true }` |
| PATCH | `/api/notifications/read-all` | mark all as read | `{ updatedCount: 5 }` |
| DELETE | `/api/notifications/:id` | delete one | `204 No Content` |

Every response is wrapped the same way: `{ "success": true, "data": {...}, "message": "" }`. On error, `success` is `false` and `message` explains what went wrong. Status codes: 401 (bad/missing token), 404 (not found), 500 (server error).

**Real time:** frontend opens a websocket after login (`wss://<host>/ws/notifications?token=...`). Server pushes `{ "event": "NEW_NOTIFICATION", "data": {...} }` whenever something new comes in. If socket drops, frontend just polls unread-count every 30s until it reconnects.

# Stage 2 - Storage

Going with **PostgreSQL**. Notifications have a fixed shape, queries are simple WHERE/COUNT stuff, and isRead updates need to be reliable - relational DB with transactions handles that fine. No need for NoSQL's flexible schema here.

```sql
CREATE TABLE notifications (
  id                BIGSERIAL PRIMARY KEY,
  studentID         BIGINT NOT NULL,
  title             VARCHAR(255) NOT NULL,
  message           TEXT NOT NULL,
  type              VARCHAR(20) NOT NULL,   -- info/success/warning/error, for UI
  notificationType  VARCHAR(20) NOT NULL,   -- Event/Result/Placement, for filtering
  link              VARCHAR(255),
  isRead            BOOLEAN NOT NULL DEFAULT false,
  createdAt         TIMESTAMP NOT NULL DEFAULT now()
);
```

**As data grows:** filtering/sorting a huge table without indexes gets slow, unread counts get expensive, table just keeps growing forever. Fix: index `studentID`, index `(studentID, isRead)`, index `createdAt`, always paginate, archive old read notifications after a few months.

Queries for each Stage 1 endpoint:
```sql
-- list (paginated)
SELECT id, title, message, type, notificationType, link, isRead, createdAt
FROM notifications WHERE studentID = 1042
ORDER BY createdAt DESC LIMIT 20 OFFSET 0;

-- get one
SELECT * FROM notifications WHERE id = 501 AND studentID = 1042;

-- unread count
SELECT COUNT(*) AS unreadCount FROM notifications WHERE studentID = 1042 AND isRead = false;

-- mark one as read
UPDATE notifications SET isRead = true WHERE id = 501 AND studentID = 1042;

-- mark all as read
UPDATE notifications SET isRead = true WHERE studentID = 1042 AND isRead = false;

-- delete
DELETE FROM notifications WHERE id = 501 AND studentID = 1042;

-- insert (used internally when something happens, e.g. new placement update)
INSERT INTO notifications (studentID, title, message, type, notificationType, link)
VALUES (1042, 'New Placement Drive', 'TCS is visiting campus on 10th July', 'info', 'Placement', '/placements/10');
```

# Stage 3 - Slow Query

```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC;
```

Logic is correct, just slow. With 5 million rows and no index, this is a full table scan plus a sort on top - roughly O(n). Fix: composite index on `(studentID, isRead, createdAt)`, select only needed columns instead of `*`, add a `LIMIT`.

Indexing *every* column is bad advice - each index slows down inserts/updates (has to maintain all of them), eats disk space, and a long text column like `message` isn't even a good index candidate. One good composite index beats ten single-column ones.

Placement notifications in last 7 days:
```sql
SELECT DISTINCT studentID FROM notifications
WHERE notificationType = 'Placement' AND createdAt >= NOW() - INTERVAL '7 days';
```

# Stage 4 - Fetching on Every Page Load

Problem: every page load hits the DB again for data that probably hasn't changed.

- **Rely on the websocket instead of refetching** - fetch once on login, then just update in-memory from `NEW_NOTIFICATION` events. Cheapest fix, no new infra.
- **Cache unread count / recent list in Redis** - keyed by studentID, updated only when something changes. Fast, but now two sources of truth to keep in sync.
- **Read replica** - separate DB for reads vs writes if load is still too high. Adds replication lag and cost, only worth it at bigger scale.

I'd start with the websocket fix, add Redis for the unread count next, and only bother with a replica if things really grow.

# Stage 5 - notify_all()

Original pseudocode loops through 50,000 students one at a time, doing `send_email` -> `save_to_db` -> `push_to_app` sequentially for each. Problems: painfully slow (one email call at a time), no error handling, no retries, and if it crashes midway there's no way to know who was already notified without risking duplicates.

If 200 emails fail, this design gives no clean way to retry just those 200 without resending to everyone else.

DB save and email should **not** be tied together - DB is fast and reliable, email is slow and external, and one shouldn't block the other.

Redesign: bulk insert to DB first, push to app immediately (fire and forget), then queue each email as a background job with its own retry (up to 3x) and a "failed jobs" table for anything that still fails after that.

```
function notify_all(student_ids, message):
    notifications = [{ studentID, title, message, type: "info", notificationType: "Placement" } for id in student_ids]
    bulk_insert_to_db(notifications)          # one DB call, not 50,000
    for id in student_ids: push_to_app(id, message)   # fire and forget
    for id in student_ids: queue_email_job(id, message)

function email_worker():
    while true:
        job = get_next_job_from_queue()
        try: send_email(job); mark_job_done(job)
        except: retry up to 3 times, else mark_job_failed(job)
```

# Stage 6 - Priority Inbox

Code: `priority_notifications.py`. Fetches from `http://4.224.186.213/evaluation-service/notifications`, scores each notification as `weight * 1e12 + timestamp` (Placement=3, Result=2, Event=1), then keeps a size-10 min-heap (Python's `heapq`) instead of re-sorting the whole list every time a new notification shows up - each new one only costs `O(log 10)` to check against the current smallest.

Output screenshot: `priority_notifications_output.png` (in this repo).

# Stage 1

## Notification System - REST API Design

I am designing a REST API for showing notifications to a logged in student.
A notification can be something like "You got shortlisted for TCS" or "New
event posted". The frontend needs these things from the API:

- see the list of notifications
- see how many are unread
- mark one notification as read
- mark all as read
- delete a notification
- get new notifications instantly without refreshing the page

## Rules for all endpoints

- All endpoints start with `/api/notifications`
- The user must be logged in, so every request needs this header:
  ```
  Authorization: Bearer <token>
  ```
- Every response has the same simple format:
  ```json
  {
    "success": true,
    "data": {},
    "message": ""
  }
  ```

## Notification object

This is how one notification looks:

```json
{
  "id": 501,
  "title": "New Placement Drive",
  "message": "TCS is visiting campus on 10th July",
  "type": "info",
  "isRead": false,
  "link": "/placements/10",
  "createdAt": "2026-07-05T10:15:30.000Z"
}
```

- `type` - tells frontend what color/icon to show (info, success, warning, error)
- `isRead` - true if student already opened it
- `link` - page to open when notification is clicked

## Endpoints

### 1. Get all notifications

```
GET /api/notifications?page=1&limit=20&status=all
```

`page` and `limit` are for pagination, so we don't load everything at once.
`status` can be all / read / unread.

Response:

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 501,
        "title": "New Placement Drive",
        "message": "TCS is visiting campus on 10th July",
        "type": "info",
        "isRead": false,
        "link": "/placements/10",
        "createdAt": "2026-07-05T10:15:30.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 57
    }
  }
}
```

### 2. Get one notification

```
GET /api/notifications/:id
```

Returns the notification, or 404 if not found.

### 3. Get unread count

```
GET /api/notifications/unread-count
```

```json
{
  "success": true,
  "data": { "unreadCount": 5 }
}
```

### 4. Mark one as read

```
PATCH /api/notifications/:id/read
```

```json
{
  "success": true,
  "data": { "id": 501, "isRead": true }
}
```

### 5. Mark all as read

```
PATCH /api/notifications/read-all
```

```json
{
  "success": true,
  "data": { "updatedCount": 5 }
}
```

### 6. Delete a notification

```
DELETE /api/notifications/:id
```

Returns 204 (empty) on success.

### Errors

| Status | Meaning                     |
|--------|-------------------------------|
| 401    | token missing or expired      |
| 404    | notification not found        |
| 500    | something broke on server     |

```json
{
  "success": false,
  "message": "Access token missing or invalid"
}
```

## Real-time notifications

Instead of frontend asking again and again, I am using a WebSocket. When
student logs in, frontend opens a connection like this:

```
wss://<host>/ws/notifications?token=<token>
```

Server checks the token. If wrong, it closes the connection.

When a new notification is created, server sends this on the socket:

```json
{
  "event": "NEW_NOTIFICATION",
  "data": {
    "id": 502,
    "title": "Result Published",
    "message": "Your semester result is out",
    "type": "info",
    "isRead": false,
    "link": "/results/502",
    "createdAt": "2026-07-05T10:20:00.000Z"
  }
}
```

Frontend just adds it on top of the list and increases the unread count.

If the socket disconnects, frontend calls `GET /api/notifications/unread-count`
every 30 seconds until it connects again, so nothing is missed.

# Stage 2

## Which database I am choosing

I am choosing a relational database, **PostgreSQL** (MySQL works fine too).
Reasons:

- A notification always has the same fields (title, message, type, isRead,
  createdAt), so it fits well into a normal table. I don't need a flexible
  schema like NoSQL gives.
- Most of the queries I need are simple, like "get unread notifications for
  this student" or "count unread for this student". SQL handles these well
  with basic WHERE and COUNT queries.
- isRead has to update correctly every time someone reads a notification. A
  relational DB with transactions makes sure this doesn't go wrong.
- Every notification belongs to one student only, so a simple foreign key
  (studentID) is enough. I don't need the kind of flexible/nested data that
  NoSQL is usually used for.

## DB Schema

```sql
CREATE TABLE notifications (
  id                BIGSERIAL PRIMARY KEY,
  studentID         BIGINT NOT NULL,
  title             VARCHAR(255) NOT NULL,
  message           TEXT NOT NULL,
  type              VARCHAR(20) NOT NULL,        -- info, success, warning, error (for UI icon/color)
  notificationType  VARCHAR(20) NOT NULL,        -- Event, Result, Placement (for filtering)
  link              VARCHAR(255),
  isRead            BOOLEAN NOT NULL DEFAULT false,
  createdAt         TIMESTAMP NOT NULL DEFAULT now()
);
```

`studentID` refers to the student who the notification belongs to (from the
login/users table, not shown here since it already exists).

## Problems as data grows

Once there are lakhs of notifications in this table, a few problems can
happen:

- Queries like `WHERE studentID = ? AND isRead = false` become slow because
  the database has to scan a lot of rows if there is no index.
- Counting unread notifications every time the page loads gets slow on a
  big table.
- The table keeps growing forever. Old notifications that are already read
  are rarely needed again but still take up space.
- Sorting by `createdAt` on a huge table without an index is slow too.

## How I would fix these

- Add an index on `studentID`, since almost every query filters by it.
- Add a combined index on `(studentID, isRead)` because that is exactly
  what the unread list query filters on.
- Add an index on `createdAt` so ordering by date is fast.
- Always use pagination (`LIMIT`/`OFFSET`), never load all notifications of
  a student at once.
- Delete or archive very old, already-read notifications once in a while
  (for example, older than 6 months), so the table doesn't keep growing
  forever.

## SQL queries for the Stage 1 APIs

**Get all notifications (paginated)**

```sql
SELECT id, title, message, type, notificationType, link, isRead, createdAt
FROM notifications
WHERE studentID = 1042
ORDER BY createdAt DESC
LIMIT 20 OFFSET 0;
```

**Get only unread notifications**

```sql
SELECT id, title, message, type, notificationType, link, isRead, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC
LIMIT 20 OFFSET 0;
```

**Get one notification**

```sql
SELECT * FROM notifications
WHERE id = 501 AND studentID = 1042;
```

**Get unread count**

```sql
SELECT COUNT(*) AS unreadCount
FROM notifications
WHERE studentID = 1042 AND isRead = false;
```

**Mark one notification as read**

```sql
UPDATE notifications
SET isRead = true
WHERE id = 501 AND studentID = 1042;
```

**Mark all as read**

```sql
UPDATE notifications
SET isRead = true
WHERE studentID = 1042 AND isRead = false;
```

**Delete a notification**

```sql
DELETE FROM notifications
WHERE id = 501 AND studentID = 1042;
```

**Insert a new notification (used internally, e.g. when a new placement update happens)**

```sql
INSERT INTO notifications (studentID, title, message, type, notificationType, link)
VALUES (1042, 'New Placement Drive', 'TCS is visiting campus on 10th July', 'info', 'Placement', '/placements/10');
```

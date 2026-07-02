# Stage 1

## Notification System - REST API Design

I am designing REST API for show notifications to logged in student. A
notification is something like "You got shortlisted for TCS" or "New event
posted". The frontend need these things from API:

- see list of notifications
- see how many are unread
- mark one notification as read
- mark all as read
- delete a notification
- get new notifications instantly, no need to refresh page

## Rules for all endpoints

- All endpoints start with `/api/notifications`
- User must be logged in, so every request need this header:
  ```
  Authorization: Bearer <token>
  ```
- Every response has same simple format:
  ```json
  {
    "success": true,
    "data": {},
    "message": ""
  }
  ```

## Notification object

This is how one notification look:

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

- `type` - tell frontend what color/icon to show (info, success, warning, error)
- `isRead` - true if student already opened it
- `link` - page to open when notification is clicked

## Endpoints

### 1. Get all notifications

```
GET /api/notifications?page=1&limit=20&status=all
```

`page` and `limit` is for pagination, so we don't load everything one time.
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

Return the notification, or 404 if not found.

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

Return 204 (empty) on success.

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

Instead of frontend asking again and again, I am using WebSocket. When
student login, frontend open a connection like this:

```
wss://<host>/ws/notifications?token=<token>
```

Server check the token. If wrong, it just close the connection.

When new notification is created, server send this on the socket:

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

Frontend just add it on top of list and increase the unread count.

If socket get disconnected, frontend will call `GET /api/notifications/unread-count`
every 30 second until it connect back, so nothing get missed.

# Stage 2

## Which database I am choosing

I am choosing relational database, **PostgreSQL** (MySQL also work fine).
Reasons:

- Notification always have same fields (title, message, type, isRead,
  createdAt), so it fit nicely in normal table. I don't need flexible
  schema like NoSQL give.
- Most of my queries are simple, like "get unread notifications for this
  student" or "count unread for this student". SQL is good for this kind
  of WHERE and COUNT queries.
- isRead need to update correctly every time someone read a notification.
  Relational DB with transaction make sure this don't go wrong.
- Every notification belong to only one student, so a simple foreign key
  (studentID) is enough. I don't need the kind of flexible/nested data that
  NoSQL usually used for.

## DB Schema

```sql
CREATE TABLE notifications (
  id                BIGSERIAL PRIMARY KEY,
  studentID         BIGINT NOT NULL,
  title             VARCHAR(255) NOT NULL,
  message           TEXT NOT NULL,
  type              VARCHAR(20) NOT NULL,        -- info, success, warning, error
  notificationType  VARCHAR(20) NOT NULL,        -- Event, Result, Placement
  link              VARCHAR(255),
  isRead            BOOLEAN NOT NULL DEFAULT false,
  createdAt         TIMESTAMP NOT NULL DEFAULT now()
);
```

`studentID` is refering to the student who this notification belong to
(from login/users table, not shown here because it already exist).

## Problems as data grows

Once there is lakhs of notifications in this table, few problem can happen:

- Query like `WHERE studentID = ? AND isRead = false` become slow because
  database have to scan lot of rows if there is no index.
- Counting unread notification every time page load get slow on big table.
- Table keep growing forever. Old notifications that already read are
  rarely needed again but still taking up space.
- Sorting by `createdAt` on huge table without index is slow too.

## How I would fix this

- Add index on `studentID`, since almost every query filter by it.
- Add combined index on `(studentID, isRead)` because that is exactly what
  the unread list query is filtering on.
- Add index on `createdAt` so ordering by date is fast.
- Always use pagination (`LIMIT`/`OFFSET`), never load all notification of
  one student at same time.
- Delete or archive very old, already-read notification once in a while
  (like older than 6 months), so table don't keep growing forever.

## SQL queries for Stage 1 APIs

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

**Insert a new notification, example when new placement update happen**

```sql
INSERT INTO notifications (studentID, title, message, type, notificationType, link)
VALUES (1042, 'New Placement Drive', 'TCS is visiting campus on 10th July', 'info', 'Placement', '/placements/10');
```

# Stage 3

## Is the given query accurate?

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

Yes it is accurate. It correctly read all the unread notification for
student 1042, order from oldest to newest. So the logic is right, problem
is only the speed.

## Why it is slow?

With 5,000,000 notification and no index on `studentID` or `isRead`,
database cannot jump directly to student 1042 rows. It have to check every
single row in table one by one to see if `studentID = 1042 AND isRead =
false`. That is full table scan over 5 million rows for just one request.

After that, it also have to sort all matching rows by `createdAt`, which
take extra time if there no index to help with ordering too.

Also `SELECT *` is fetching every column, including the long `message`
text, even though frontend maybe don't need all of it right now.

**Likely cost:** roughly O(n) where n = 5,000,000, so it is very slow.

## What I would change

- Add composite index on `(studentID, isRead, createdAt)`. This let
  database jump straight to this student unread rows, already close to
  sorted order, instead of scanning whole table.
- Select only the column that actually needed instead of `SELECT *`.
- Add `LIMIT` since student could have hundreds of unread notification and
  frontend don't need all of them in one screen.

```sql
SELECT id, title, message, type, notificationType, link, isRead, createdAt
FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC
LIMIT 20;
```

## Is "add index on every column" good advice?

No, not really. Reasons:

- Every index we add make `INSERT`/`UPDATE`/`DELETE` slower, because
  database have to update all those index too, not just the table.
- Index also take extra storage, one index per column add up fast on
  5 million row table.
- Column like `message` (long text) is not even useful to index for this
  kind of query, and not great candidate for normal index anyway.
- One well-chosen composite index (like `studentID, isRead, createdAt`
  together) is much more useful than separate index on every column,
  because it match exactly how the query is filtering and sorting data.

So instead of indexing everything, better to only index the columns that
are actually used in `WHERE` and `ORDER BY`, and combine them into one
index when they used together.

## Query to find students with placement notification in last 7 days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```

This get every student who received at least one `Placement` type
notification in last 7 days, without repeating same student more than
once.

# Stage 4

## The problem

Right now, every time student open the app, frontend call the API and API
hit the database again, even if the student just refreshed page 2 second
ago. With thousands of student doing this same time, database get too
many repeated query for basically same data, and it slow down for
everyone.

## What I would do

**1. Cache the unread count and recent notifications in Redis**

Instead of hitting DB every time, I will store each student unread count
and their latest notifications in Redis, keyed by `studentID`. On page
load, API check Redis first. If it is there, it return that instantly
without touching DB at all. Cache get updated only when something actually
change (new notification come in, or student mark something as read).

- Good: much faster, and DB barely get hit for reads anymore.
- Tradeoff: now there is two place holding data (DB and Redis), so I have
  to make sure cache is not left stale after something change. Extra
  Redis service also mean one more thing to maintain.

**2. Stop re-fetching everything on every page load**

Since app already have WebSocket connection (from Stage 1) for real time
update, frontend don't need to call API again and again. It can fetch
notification list one time when student login, and after that just update
the list in memory whenever `NEW_NOTIFICATION` event come on socket, or
when student mark something as read.

- Good: cut down lot of repeated API/DB call, since most of time nothing
  new even happened.
- Tradeoff: frontend need to keep its local list correctly in sync with
  what read/unread, so it is bit more logic on that side.

**3. Read replica for database**

If load is still too much even with caching, I would add read replica of
database. All `SELECT` query (reading notifications) go to replica, and
only write query (insert/update/delete) go to main database.

- Good: reads and writes don't fight for same DB resource anymore.
- Tradeoff: replica usually update a moment after main DB (called
  replication lag), so a very recently created notification might not
  show up instantly on read from replica. Also cost more since it is
  basically running second database server.

## Which one I would actually pick

I would start with option 2 (rely on WebSocket instead of refetching every
page load) since it is cheapest and fix most of the problem with no extra
infrastructure. Then add Redis caching (option 1) for unread count
specifically, since that is the value read most often. I would only add
read replica (option 3) if app grow lot more and caching alone is not
enough anymore.

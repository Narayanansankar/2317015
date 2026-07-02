# Logging Middleware

This is a small package with one main function called `Log()`. Whenever we
call it, it sends a log entry to the test server given in the assignment.

```ts
Log(stack, level, package, message)
```

Example:

```ts
Log("backend", "error", "handler", "received string, expected bool");
```

- `stack` - `"backend"` or `"frontend"`
- `level` - `"debug"`, `"info"`, `"warn"`, `"error"`, or `"fatal"`
- `package` - which part of the code the log is from, like `"controller"`,
  `"handler"`, `"db"`, `"route"` (backend) or `"component"`, `"hook"`,
  `"page"`, `"api"`, `"state"` (frontend)
- `message` - a simple message saying what happened

`Log()` sends this data to:

```
http://4.224.186.213/evaluation-service/logs
```

using the token in `.env`. If the request fails for some reason, it just
prints the error in the console instead of crashing the app.

## Files in this project

```
src/
  index.ts   -> exports Log() and requestLogger so other projects can use them
  log.ts     -> the actual Log() function
  logger.ts  -> middleware that auto logs every request
  server.ts  -> small demo server to test everything
  routes/
    sampleRoutes.ts -> example routes using Log()
```

## How to run

1. Install packages:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and paste your token:
   ```
   LOG_ACCESS_TOKEN=your_token_here
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
   Runs on `http://localhost:5000`

## Test routes

| Route              | What it does                     |
|---------------------|------------------------------------|
| GET /api/hello       | normal request, logs info          |
| GET /api/greet/:name | logs warn if name empty, else info |
| GET /api/error       | always fails, logs error           |

Every request also gets logged automatically because of `requestLogger`.

## Using this in Backend / Frontend

Add this in the other project's `package.json`:

```json
"dependencies": {
  "logging-middleware": "file:../Logging Middleware"
}
```

Then run `npm run build` here so `dist/` gets created, and in the other
project just do:

```ts
import { Log } from "logging-middleware";

Log("backend", "info", "controller", "created a new short url");
```

# Logging Middleware

Small package with one function, `Log()`, that sends a log to the test
server given in the assignment.

```ts
Log("backend", "error", "handler", "received string, expected bool");
```

- `stack` - backend or frontend
- `level` - debug, info, warn, error, fatal
- `package` - part of code it came from (controller, handler, db, route... or component, hook, page, api, state)
- `message` - what happened

Sends to `http://4.224.186.213/evaluation-service/logs` using the token in
`.env`. If it fails, just logs the error, doesn't crash the app.

## Run it

```bash
npm install
cp .env.example .env   # add your token here
npm run dev
```

Server runs on `http://localhost:5000`. Try `/api/hello`, `/api/greet/:name`,
`/api/error`.

## Using it in Backend / Frontend

```json
"dependencies": {
  "logging-middleware": "file:../Logging Middleware"
}
```

```ts
import { Log } from "logging-middleware";
Log("backend", "info", "controller", "created a new short url");
```

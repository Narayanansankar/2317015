import axios from "axios";

const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";

// token is set once at app startup with setLogToken(), instead of reading
// process.env directly here - this way this file works in both a node
// backend and a browser frontend (browser doesn't have process.env/dotenv)
let accessToken = "";

export function setLogToken(token: string) {
  accessToken = token;
}

export type LogStack = "backend" | "frontend";
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type LogPackage =
  | "cache"
  | "controller"
  | "cron_job"
  | "db"
  | "domain"
  | "handler"
  | "repository"
  | "route"
  | "service"
  | "api"
  | "component"
  | "hook"
  | "page"
  | "state"
  | "auth"
  | "config"
  | "middleware"
  | "utils";

export async function Log(
  stack: LogStack,
  level: LogLevel,
  packageName: LogPackage,
  message: string
): Promise<void> {
  try {
    await axios.post(
      LOG_API_URL,
      {
        stack: stack,
        level: level,
        package: packageName,
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.log("could not send log to server:", err);
  }
}

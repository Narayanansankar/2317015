import { Request, Response, NextFunction } from "express";
import { Log } from "./log";
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`;
    let level: "info" | "warn" | "error" = "info";
    if (res.statusCode >= 500) {
      level = "error";
    } else if (res.statusCode >= 400) {
      level = "warn";
    }
    console.log(`[${new Date().toISOString()}] ${message}`);
    Log("backend", level, "middleware", message);
  });
  next();
}
export default requestLogger;

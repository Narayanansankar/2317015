import { Router, Request, Response } from "express";
import { Log } from "../log";

const router = Router();

router.get("/hello", (req: Request, res: Response) => {
  Log("backend", "info", "route", "Handled /hello request successfully");
  res.status(200).json({ message: "Hello! This request got logged." });
});

router.get("/greet/:name", (req: Request, res: Response) => {
  const { name } = req.params;

  if (!name || name.trim().length === 0) {
    Log("backend", "warn", "handler", "Greet request received with an empty name param");
    res.status(400).json({ message: "name param cannot be empty" });
    return;
  }
  Log("backend", "info", "handler", `Greeting generated for name=${name}`);
  res.status(200).json({ message: `Hi ${name}, welcome!` });
});
router.get("/error", (req: Request, res: Response) => {
  Log("backend", "error", "handler", "Simulated failure triggered by /error route");
  res.status(500).json({ message: "Something went wrong on purpose." });
});
export default router;

import express, { Request, Response } from "express";
import dotenv from "dotenv";
import requestLogger from "./logger";
import sampleRoutes from "./routes/sampleRoutes";
import { setLogToken } from "./log";

dotenv.config();
setLogToken(process.env.LOG_ACCESS_TOKEN || "");

// this is just a demo server to show the logging middleware working
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(requestLogger); // logs every request automatically

app.use("/api", sampleRoutes);

// if no route matched, send a 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Logging middleware server running on http://localhost:${PORT}`);
});

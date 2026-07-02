import express, { Request, Response } from "express";
import requestLogger from "./logger";
import sampleRoutes from "./routes/sampleRoutes";
const app = express();
const PORT = 5000;
app.use(express.json());
app.use(requestLogger); 
app.use("/api", sampleRoutes);
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});
app.listen(PORT, () => {
  console.log(`Logging middleware server running on http://localhost:${PORT}`);
});

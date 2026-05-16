import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import animalRoutes from "./routes/animalRoutes.js";
import feedRoutes from "./routes/feedRoutes.js";
import feederRoutes from "./routes/feederRoutes.js";
import vaccinationRoutes from "./routes/vaccinationRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";

dotenv.config();

// connect to MongoDB when MONGO_URI is provided
import connectDB from "./config/db.js";
if (process.env.MONGO_URI) {
  connectDB();
} else {
  console.log("MONGO_URI not set — running in file-store mode");
}

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Handle JSON parse errors from malformed requests
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Malformed JSON body:", err.message);
    return res.status(400).json({ message: "Malformed JSON body" });
  }
  return next(err);
});

app.use("/api/auth", authRoutes);
app.use("/api/animals", animalRoutes);
app.use("/api/feeds", feedRoutes);
app.use("/api/feeders", feederRoutes);
app.use("/api/vaccinations", vaccinationRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/alerts", alertRoutes);

// Serve frontend build when present
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistRelative = path.join(__dirname, "..", "frontend", "dist");
const frontendDistLocal = path.resolve("frontend", "dist");
const frontendPublicRelative = path.join(__dirname, "public");
const serveFrom = fs.existsSync(frontendDistRelative)
  ? frontendDistRelative
  : fs.existsSync(frontendDistLocal)
  ? frontendDistLocal
  : fs.existsSync(frontendPublicRelative)
  ? frontendPublicRelative
  : null;

if (serveFrom) {
  app.use(express.static(serveFrom));
  app.get("*", (req, res) => {
    res.sendFile(path.join(serveFrom, "index.html"));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
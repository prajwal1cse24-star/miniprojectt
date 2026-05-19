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

// Capture raw request body for better JSON parse error diagnostics
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      try {
        req.rawBody = buf && buf.toString && buf.toString();
      } catch (e) {
        req.rawBody = undefined;
      }
    },
  })
);
app.use("/uploads", express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "uploads")));

// Handle JSON parse errors from malformed requests
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Malformed JSON body:", err.message);
    if (req && req.rawBody) {
      console.error("Raw body was:", req.rawBody);
    }
    return res.status(400).json({ message: "Malformed JSON body", raw: req.rawBody ? String(req.rawBody).slice(0, 200) : undefined });
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

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;
const MAX_PORT_RETRIES = 5;

function startServer(port, attemptsLeft) {
  const server = app.listen(port, () => console.log(`Server running on port ${port}`));

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is already in use.`);
      if (attemptsLeft > 0) {
        const nextPort = port + 1;
        console.log(`Trying port ${nextPort} (${attemptsLeft - 1} attempts left)...`);
        // small delay before retrying to avoid tight loop
        setTimeout(() => startServer(nextPort, attemptsLeft - 1), 250);
        return;
      }
      console.error(`No available ports found after ${MAX_PORT_RETRIES} retries. Exiting.`);
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });
}

startServer(DEFAULT_PORT, MAX_PORT_RETRIES);
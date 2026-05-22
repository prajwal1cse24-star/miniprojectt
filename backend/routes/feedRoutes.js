import express from "express";
import { addFeedLog, getFeedLogs } from "../controllers/feedController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, adminOnly, addFeedLog);
router.get("/", getFeedLogs);

export default router;
import express from "express";
import { addFeedLog, getFeedLogs } from "../controllers/feedController.js";

const router = express.Router();

router.post("/", addFeedLog);
router.get("/", getFeedLogs);

export default router;
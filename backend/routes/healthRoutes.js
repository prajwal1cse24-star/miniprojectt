import express from "express";
import { createHealthRecord, getHealthRecords } from "../controllers/healthController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, adminOnly, createHealthRecord);
router.get("/", getHealthRecords);

export default router;
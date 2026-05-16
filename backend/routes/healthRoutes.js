import express from "express";
import { createHealthRecord, getHealthRecords } from "../controllers/healthController.js";

const router = express.Router();

router.post("/", createHealthRecord);
router.get("/", getHealthRecords);

export default router;
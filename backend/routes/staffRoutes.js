import express from "express";
import { createStaff, getStaff } from "../controllers/staffController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, adminOnly, createStaff);
router.get("/", getStaff);

export default router;
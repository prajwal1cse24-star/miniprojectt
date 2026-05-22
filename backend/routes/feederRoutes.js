import express from "express";
import {
  createFeeder,
  getFeeders,
  updateFeeder,
} from "../controllers/feederController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, adminOnly, createFeeder);
router.get("/", getFeeders);
router.patch("/:id", authMiddleware, adminOnly, updateFeeder);

export default router;
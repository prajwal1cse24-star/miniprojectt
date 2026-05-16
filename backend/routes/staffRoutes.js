import express from "express";
import { createStaff, getStaff } from "../controllers/staffController.js";

const router = express.Router();

router.post("/", createStaff);
router.get("/", getStaff);

export default router;
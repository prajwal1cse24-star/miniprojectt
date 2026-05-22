import express from "express";
import { createVaccination, getVaccinations } from "../controllers/vaccinationController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, adminOnly, createVaccination);
router.get("/", getVaccinations);

export default router;
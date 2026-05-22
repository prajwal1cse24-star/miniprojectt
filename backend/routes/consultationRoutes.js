import express from "express";
import { createConsultation, listConsultations, addPrescription, getConsultation } from "../controllers/consultationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// allow farmers to request consultations without requiring auth token
router.post("/", createConsultation);
router.get("/", listConsultations);
router.get("/:id", getConsultation);
router.post("/:id/prescription", authMiddleware, addPrescription);

export default router;

import express from "express";
import { createVaccination, getVaccinations } from "../controllers/vaccinationController.js";

const router = express.Router();

router.post("/", createVaccination);
router.get("/", getVaccinations);

export default router;
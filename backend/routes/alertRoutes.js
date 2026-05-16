import express from "express";
import { getAlerts } from "../controllers/alertController.js";

const router = express.Router();

router.get("/", getAlerts);

export default router;
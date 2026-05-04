import express from "express";
import {
	createFeeder,
	getFeeders,
	updateFeeder,
} from "../controllers/feederController.js";

const router = express.Router();

router.post("/", createFeeder);
router.get("/", getFeeders);
router.patch("/:id", updateFeeder);

export default router;
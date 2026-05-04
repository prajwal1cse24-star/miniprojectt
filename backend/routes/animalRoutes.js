import express from "express";
import { createAnimal, getAnimals } from "../controllers/animalController.js";

const router = express.Router();

router.post("/", createAnimal);
router.get("/", getAnimals);

export default router;
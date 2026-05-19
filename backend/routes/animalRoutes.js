import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { createAnimal, getAnimals, updateAnimalPhoto } from "../controllers/animalController.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadsDir),
	filename: (req, file, cb) => {
		const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
		cb(null, `${req.params.animalId}-${Date.now()}${extension}`);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (file.mimetype && file.mimetype.startsWith("image/")) {
			cb(null, true);
			return;
		}

		cb(new Error("Only image files are allowed"));
	},
});

router.post("/", createAnimal);
router.post("/:animalId/photo", upload.single("image"), updateAnimalPhoto);
router.get("/", getAnimals);

export default router;
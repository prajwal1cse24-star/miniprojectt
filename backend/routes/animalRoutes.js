import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { createAnimal, getAnimals, updateAnimalPhoto } from "../controllers/animalController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

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

router.post("/", authMiddleware, adminOnly, createAnimal);
router.post("/:animalId/photo", authMiddleware, adminOnly, upload.single("image"), updateAnimalPhoto);
router.get("/", getAnimals);
// PATCH /:animalId - update animal fields (admin only)
router.patch("/:animalId", authMiddleware, adminOnly, async (req, res) => {
	try {
		const { updateAnimal } = await import("../controllers/animalController.js");
		return updateAnimal(req, res);
	} catch (err) {
		return res.status(500).json({ message: err.message });
	}
});

export default router;
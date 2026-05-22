import express from "express";
import { createUser, listUsers, promoteUser, removeUser } from "../controllers/userController.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, adminOnly, listUsers);
router.post("/", authMiddleware, adminOnly, createUser);
router.post("/:id/role", authMiddleware, adminOnly, promoteUser);
router.delete("/:id", authMiddleware, adminOnly, removeUser);

export default router;

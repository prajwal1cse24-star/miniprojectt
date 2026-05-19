import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { addUser, getUserByEmail } from "../data/store.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "dev-secret");
};

export const register = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await addUser({ name, email, password: hashedPassword });
    res.json({ user, token: generateToken(user._id) });
  } catch (err) {
    console.error("Register error:", err?.message || err);
    return res.status(400).json({ message: err?.message || "Registration failed" });
  }
};

export const login = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await getUserByEmail(email);

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({ user, token: generateToken(user._id) });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { addUser, getUserByEmail } from "../data/store.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "dev-secret");
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await addUser({ name, email, password: hashedPassword });
    res.json({ user, token: generateToken(user._id) });
  } catch (err) {
    console.error("Register error:", err?.message || err);
    return res.status(400).json({ message: err?.message || "Registration failed" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await getUserByEmail(email);

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({ user, token: generateToken(user._id) });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
};
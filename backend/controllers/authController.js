import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { addUser, getUserByEmail, getUserByFarmerId, getUserByName, updateUserById, updateUserRole, getUsers, getUserById } from "../data/store.js";

const sanitizeUser = (user) => {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "dev-secret");
};

export const register = async (req, res) => {
  try {
    const farmerId = String(req.body?.farmerId || "").trim().toLowerCase();
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");

    if (!farmerId || !name || !password) {
      return res.status(400).json({ message: "Name, Farmer ID, and password are required" });
    }

    const existing = (await getUserByFarmerId(farmerId)) || (await getUserByEmail(farmerId));
    if (existing) {
      return res.status(400).json({ message: "Farmer ID already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await addUser({ name, farmerId, password: hashed, role: "Farmer" });
    return res.status(201).json({ user: sanitizeUser(user), token: generateToken(user._id) });
  } catch (err) {
    return res.status(400).json({ message: err?.message || "Registration failed" });
  }
};

export const login = async (req, res) => {
  const farmerId = String(req.body?.farmerId || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!farmerId) {
    return res.status(400).json({ message: "Farmer ID is required" });
  }

  const user = (await getUserByFarmerId(farmerId)) || (await getUserByEmail(farmerId));

  if (!user) {
    return res.status(401).json({ message: "Invalid Farmer ID" });
  }

  if (user.password) {
    if (!password) {
      return res.status(401).json({ message: "Password is required for this account" });
    }
    const match = await bcrypt.compare(password, String(user.password));
    if (!match) return res.status(401).json({ message: "Invalid Farmer ID or password" });
  } else if (password) {
    return res.status(401).json({ message: "Password not set for this account" });
  }

  res.json({ user: sanitizeUser(user), token: generateToken(user._id) });
};

export const adminLogin = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    const farmerId = String(req.body?.farmerId || "").trim().toLowerCase();

    if ((!name && !farmerId) || !password) {
      return res.status(400).json({ message: "Admin name and password are required" });
    }

    let user = null;
    if (name) {
      user = await getUserByName(name);
    }
    if (!user && farmerId) {
      user = await getUserByFarmerId(farmerId);
    }
    if (!user || !user.password || String(user.role || "").toLowerCase() !== "admin") {
      return res.status(404).json({ message: "Admin user not found or password not set" });
    }

    const match = await bcrypt.compare(password, String(user.password));
    if (!match) return res.status(401).json({ message: "Invalid admin name or password" });

    return res.json({ user: sanitizeUser(user), token: generateToken(user._id) });
  } catch (err) {
    return res.status(400).json({ message: err?.message || "Admin login failed" });
  }
};

export const adminRegister = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");
    const adminPin = String(req.body?.adminPin || "");

    if (!name || !password || !adminPin) {
      return res.status(400).json({ message: "Admin name, password, and admin PIN are required" });
    }

    const farmerId = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || `admin-${Date.now().toString(36)}`;

    const ADMIN_PIN = process.env.ADMIN_PIN || "admin123";

    // If an Admin already exists in the system, require that the request is made
    // by an authenticated Admin user. Otherwise (bootstrap case) allow the first
    // Admin to be created using the ADMIN_PIN.
    const users = await getUsers();
    const hasAdmin = users.some((u) => String(u.role || "").toLowerCase() === "admin");

    if (hasAdmin) {
      // require Authorization header with a valid admin token
      const authHeader = req.headers.authorization || req.headers.Authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
      if (!token) return res.status(403).json({ message: "Admin exists; valid admin token required to create another admin" });

      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
        const actor = await getUserById(payload.id);
        if (!actor || String(actor.role || "").toLowerCase() !== "admin") {
          return res.status(403).json({ message: "Insufficient privileges to create admin" });
        }
      } catch (err) {
        console.error('[adminRegister] token verification failed:', err && err.message ? err.message : err);
        return res.status(401).json({ message: "Invalid or expired admin token" });
      }
    } else {
      // bootstrap case: require ADMIN_PIN
      if (adminPin !== ADMIN_PIN) {
        return res.status(401).json({ message: "Invalid admin PIN" });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await addUser({ name, farmerId, password: hashed, role: "Admin" });
    return res.status(201).json({ user: sanitizeUser(user), token: generateToken(user._id) });
  } catch (err) {
    return res.status(400).json({ message: err?.message || "Admin registration failed" });
  }
};
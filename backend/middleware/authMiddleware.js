import jwt from "jsonwebtoken";
import { getUserById } from "../data/store.js";

const SECRET = process.env.JWT_SECRET || "dev-secret";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  if (!token) {
    return res.status(401).json({ message: "No authentication token provided" });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    // debug: log minimal payload info for troubleshooting
    console.debug('[auth] token verified, payload id=', payload?.id);
    const user = await getUserById(payload.id);
    if (!user) {
      console.warn('[auth] token valid but user not found id=', payload?.id);
      return res.status(401).json({ message: "Invalid token user" });
    }
    req.user = user;
    return next();
  } catch (err) {
    // include error message in server logs to help debugging token issues
    console.error('[auth] token verification failed:', err && err.message ? err.message : err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const adminOnly = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (role === "admin") return next();
  return res.status(403).json({ message: "Admin access required" });
};

export default authMiddleware;
// (module exports `authMiddleware` as default above)
import jwt from "jsonwebtoken";
import { config } from "../config.js";
 
export function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}
 
export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
 
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const p = verifyToken(token);
    req.user = p;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
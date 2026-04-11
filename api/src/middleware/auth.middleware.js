const UserModel = require("../models/user.model");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Invalid token format." });
  }

  try {
    const user = await UserModel.findBySdbToken(token);if (!user) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    req.user = user;
    req.sdbToken = token;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ message: "Authentication failed." });
  }
}

module.exports = authMiddleware;
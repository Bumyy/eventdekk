const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// === OAuth Login Routes ===
router.get("/google", authController.googleLogin);
router.get("/discord", authController.discordLogin);

// === OAuth Callback Routes ===
router.get("/google/callback", authController.googleCallback);
router.get("/discord/callback", authController.discordCallback);

// === OAuth Linking Routes (requires authentication)===
router.get("/link/google", authController.googleLink);
router.get("/link/discord", authController.discordLink);

// === Username/Password Routes ===
router.post("/register", authController.register);
router.post("/login", authController.localLogin);

// === Account Management (requires authentication) ===
router.get(
  "/linked-accounts",
  authMiddleware,
  authController.getLinkedAccounts
);
router.post("/logout", authController.logout);

module.exports = router;

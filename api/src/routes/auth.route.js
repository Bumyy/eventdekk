const express = require("express");
const authController = require("../controllers/auth.controller");
const passport = require("passport"); // Needed for OAuth routes

const router = express.Router();

// === OAuth Routes ===

// Step 1: Redirect to Provider
router.get("/google", authController.googleLogin);
router.get("/discord", authController.discordLogin);

// Step 2: Provider Callback
router.get("/google/callback", authController.googleCallback);
router.get("/discord/callback", authController.discordCallback);

// === Username/Password Routes ===

// Register a new user
router.post("/register", authController.register);

// Login with existing credentials
router.post("/login", authController.localLogin); // Uses passport.authenticate('local', ...) internally

module.exports = router;

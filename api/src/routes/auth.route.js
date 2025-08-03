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

// === Helper Routes ===

// Simple success page (for OAuth redirects)
router.get("/success", authController.handleSuccess);

// Simple login page (replace with your frontend)
router.get("/login", authController.serveLoginPage); // Serves the basic HTML login form

// === Linking Routes (Conceptual - Requires Auth State) ===
// These would need middleware to ensure the user is already authenticated
// via *some* method before allowing them to link another.
/*
const ensureAuthenticated = (req, res, next) => {
  // This requires session management or a valid internal JWT check
  if (req.isAuthenticated()) { // If using sessions via passport.serialize/deserialize
    return next();
  }
  // Or check for a valid internal JWT if stateless
  // const token = req.headers.authorization?.split(' ')[1];
  // try {
  //   const decoded = jwt.verify(token, process.env.SESSION_SECRET);
  //   req.user = { id: decoded.userId }; // Attach user ID for linking
  //   return next();
  // } catch (err) {
  //   res.status(401).json({ message: 'Unauthorized: You must be logged in to link accounts.' });
  // }
  res.status(401).json({ message: 'Unauthorized: You must be logged in to link accounts.' });
};

// Initiate linking (similar to login, but maybe with different state/flag)
router.get('/link/google', ensureAuthenticated, passport.authenticate('google', { scope: ['profile', 'email'], state: 'linking' })); // Pass state?
router.get('/link/discord', ensureAuthenticated, passport.authenticate('discord', { scope: ['identify', 'email'], state: 'linking' }));

// Callback for linking (would need slightly different logic in controller/service)
// router.get('/link/google/callback', ensureAuthenticated, authController.googleLinkCallback);
// router.get('/link/discord/callback', ensureAuthenticated, authController.discordLinkCallback);
*/

module.exports = router;

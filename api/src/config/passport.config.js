const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const authService = require("../services/auth.service");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"], // Request basic profile and email
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // profile.id is the google 'sub'
        // profile.provider is 'google'
        // The issuer for google is typically 'https://accounts.google.com'
        const issuer = "https://accounts.google.com"; // Standard Google issuer
        const providerId = profile.id;
        const methodType = "google";

        // Extract profile data from Google
        const googleDisplayName =
          profile.displayName ||
          [profile.name?.givenName, profile.name?.familyName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          profile.name?.givenName ||
          (profile.emails && profile.emails[0]?.value
            ? profile.emails[0].value.split("@")[0]
            : null);

        const googleProfilePicture =
          (profile.photos && profile.photos.length > 0
            ? profile.photos[0].value
            : null) ||
          profile._json?.picture ||
          null;

        const profileData = {
          displayName: googleDisplayName,
          profilePicture: googleProfilePicture,
        };

        // Try find or create user based on this Google login
        // The service function handles linking or new account creation
        const { user, sdbToken, isNewUser } =
          await authService.findOrCreateUserByProvider(
            methodType,
            providerId,
            issuer
          );

        if (!user || !sdbToken) {
          return done(new Error("Could not find or create user."), null);
        }

        // Pass the sdbToken and profile data to the callback
        return done(null, { sdbToken, profileData, isNewUser });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.use(
  new DiscordStrategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ["identify", "email"], // 'identify' gets user ID, username, avatar, discriminator
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // profile.id is the discord user ID
        // profile.provider is 'discord'
        // Discord doesn't have a standard OIDC issuer URL easily available via passport
        // We can use a conventional one or leave it null/empty if not strictly needed for uniqueness
        // Let's use a conventional one for consistency.
        const issuer = "https://discord.com/api"; // Conventional issuer for Discord
        const providerId = profile.id;
        const methodType = "discord";

        // Extract profile data from Discord
        // Use global_name (display name) if available, fallback to username
        const displayName = profile.global_name || profile.username || null;

        // Construct avatar URL
        let profilePicture = null;
        if (profile.avatar) {
          // User has custom avatar
          profilePicture = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`;
        } else if (profile.discriminator) {
          // Default avatar based on discriminator (legacy discriminator system)
          const defaultAvatarIndex = parseInt(profile.discriminator) % 5;
          profilePicture = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        } else {
          // New username system without discriminator - use avatar index 0
          profilePicture = `https://cdn.discordapp.com/embed/avatars/0.png`;
        }

        const profileData = { displayName, profilePicture };

        const { user, sdbToken, isNewUser } =
          await authService.findOrCreateUserByProvider(
            methodType,
            providerId,
            issuer
          );

        if (!user || !sdbToken) {
          return done(new Error("Could not find or create user."), null);
        }

        // Pass the sdbToken and profile data to the callback
        return done(null, { sdbToken, profileData, isNewUser });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.use(
  new LocalStrategy(
    // Passport expects username and password fields by default
    async (username, password, done) => {
      try {
        const result = await authService.verifyPasswordUser(username, password);

        if (!result.user || !result.sdbToken) {
          // Authentication failed (user not found or password mismatch)
          return done(null, false, {
            message: result.message || "Incorrect username or password.",
          });
        }

        // Authentication successful
        return done(null, { sdbToken: result.sdbToken }); // Pass sdbToken
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;

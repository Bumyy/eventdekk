const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const DiscordStrategy = require("passport-discord").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const authService = require("../services/auth.service");
const UserModel = require("../models/user.model");
require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const issuer = "https://accounts.google.com";
        const providerId = profile.id;
        const methodType = "google";

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

        const state = req.query.state;
        if (state) {
          try {
            const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
            if (decodedState.link && decodedState.sdbToken) {
              const user = await UserModel.findBySdbToken(decodedState.sdbToken);
              if (!user) {
                return done(null, { error: "Invalid or expired session." });
              }

              await authService.linkProviderToUser(
                user.id,
                methodType,
                providerId,
                issuer
              );

              return done(null, {
                sdbToken: decodedState.sdbToken,
                profileData,
                isNewUser: false,
                isLinked: true,
              });
            }
          } catch (e) {
            console.error("Error parsing state for linking:", e);
          }
        }

        const { user, sdbToken, isNewUser } =
          await authService.findOrCreateUserByProvider(
            methodType,
            providerId,
            issuer
          );

        if (!user || !sdbToken) {
          return done(new Error("Could not find or create user."), null);
        }

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
      scope: ["identify", "email"],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const issuer = "https://discord.com/api";
        const providerId = profile.id;
        const methodType = "discord";

        const displayName = profile.global_name || profile.username || null;

        let profilePicture = null;
        if (profile.avatar) {
          profilePicture = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256`;
        } else if (profile.discriminator) {
          const defaultAvatarIndex = parseInt(profile.discriminator) % 5;
          profilePicture = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        } else {
          profilePicture = `https://cdn.discordapp.com/embed/avatars/0.png`;
        }

        const profileData = { displayName, profilePicture };

        const state = req.query.state;
        if (state) {
          try {
            const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
            if (decodedState.link && decodedState.sdbToken) {
              const user = await UserModel.findBySdbToken(decodedState.sdbToken);
              if (!user) {
                return done(null, { error: "Invalid or expired session." });
              }

              await authService.linkProviderToUser(
                user.id,
                methodType,
                providerId,
                issuer
              );

              return done(null, {
                sdbToken: decodedState.sdbToken,
                profileData,
                isNewUser: false,
                isLinked: true,
              });
            }
          } catch (e) {
            console.error("Error parsing state for linking:", e);
          }
        }

        const { user, sdbToken, isNewUser } =
          await authService.findOrCreateUserByProvider(
            methodType,
            providerId,
            issuer
          );

        if (!user || !sdbToken) {
          return done(new Error("Could not find or create user."), null);
        }

        return done(null, { sdbToken, profileData, isNewUser });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.use(
  new LocalStrategy(
    async (username, password, done) => {
      try {
        const result = await authService.verifyPasswordUser(username, password);

        if (!result.user || !result.sdbToken) {
          return done(null, false, {
            message: result.message || "Incorrect username or password.",
          });
        }

        return done(null, { sdbToken: result.sdbToken });
      } catch (err) {
        return done(err);
      }
    }
  )
);

module.exports = passport;

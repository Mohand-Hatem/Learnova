import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import User from "../models/User.model.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, {
            message: "Google account email not found",
          });
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: {
              en: profile.displayName || "Google User",
              ar: profile.displayName || "مستخدم جوجل",
            },
            email,
            password: crypto.randomBytes(8).toString("hex").slice(0, 15),
            avatar:
              profile.photos?.[0]?.value ||
              "https://cdn-icons-png.flaticon.com/512/149/149071.png",
            googleId: profile.id,
            role: "student",
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

export default passport;
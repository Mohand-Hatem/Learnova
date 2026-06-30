import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import User from "../models/User.model.js";
import Env from "../config/handelEnv.js";

export const isGoogleAuthEnabled = Boolean(Env.GOOGLE_ID && Env.GOOGLE_SECRET);

if (isGoogleAuthEnabled) {
 passport.use(
  new GoogleStrategy(
    {
      clientID: Env.GOOGLE_ID,
      clientSecret: Env.GOOGLE_SECRET,
      callbackURL: `${Env.BACKEND_URL}/auth/google/callback`,
      passReqToCallback: true,  // ← lets you read req.query.state
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, {
            message: "Google account email not found",
          });
        }

        // Step 1: read role from state (comes back from Google)
        const role = req.query.state === "company" ? "company" : "user";

        // Step 2: check if user already exists
        let user = await User.findOne({ email });

        if (!user) {
          // Step 3a: NEW user → create with role from register toggle
          user = await User.create({
            name: {
              en: profile.displayName || "Google User",
              ar: profile.displayName || "مستخدم جوجل",
            },
            email,
            password: crypto.randomBytes(8).toString("hex").slice(0, 15),
            avatar: profile.photos?.[0]?.value || "...",
            googleId: profile.id,
            role,  // ← "company" or "user"
          });
        }
        // Step 3b: EXISTING user → return as-is, don't change role

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);
} else {
  console.warn(
    "[auth] Google OAuth disabled — set GOOGLE_ID and GOOGLE_SECRET in .env to enable.",
  );
}

export default passport;
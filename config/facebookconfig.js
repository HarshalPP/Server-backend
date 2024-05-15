// Make a config for facebook login in the same way as the google login config.

// Path: Food-work/server/config/facebookconfig.js

const User = require("../Model/User");
const dotenv = require('dotenv');
const FacebookStrategy = require('passport-facebook').Strategy;
dotenv.config();


module.exports = function (passport) {
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: 'https://server-backend-gamma.vercel.app/facebook_OAuth/facebook/callback',
        profileFields: ['id', 'displayName', 'photos', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const newUser = {
                facebookId: profile.id,
                firstname: profile.displayName,
                email: profile.emails[0].value,
                img: profile.photos[0].value,
            };

            let user = await User.findOne({ facebookId: profile.id });

            if (!user) {
                user = await User.findOne({ email: profile.emails[0].value });
                if (!user) {
                    user = await User.create(newUser);
                } else {
                    // If a user with the same email exists but with a different facebookId,
                    // update the facebookId in the existing user document
                    user.facebookId = profile.id;
                    await user.save();
                }
            }

            done(null, user);
        } catch (error) {
            console.error(error);
            done(error, null);
        }
    }));

    // Serialize user
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user
    passport.deserializeUser((id, done) => {
        User.findById(id)
            .then(user => {
                done(null, user);
            })
            .catch(err => {
                console.error(err);
                done(err, null);
            });
    });
}
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../Model/User");
const dotenv = require('dotenv');
dotenv.config();

module.exports = function (passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: 'https://server-backend-gamma.vercel.app/Google_OAuth/google/callback',
    }, async (accessToken, refreshToken, profile, done) => {
        try {
    
            const newUser = {
                googleId: profile.id,
                firstname: profile.name.givenName,
                lastname: profile.name.familyName,
                email: profile.emails[0].value,
                img: profile.photos[0].value,
                
            };

            let user = await User.findOne({ googleId: profile.id });
            
            if (!user) {
                user = await User.findOne({ email: profile.emails[0].value });
                if (!user) {
                    user = await User.create(newUser);
                } else {
                    // If a user with the same email exists but with a different googleId,
                    // update the googleId in the existing user document
                    user.googleId = profile.id;
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
};

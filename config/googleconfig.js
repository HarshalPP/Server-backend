const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../Model/User");
const{generateToken}=require("../config/jwtToken")
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
                    user.googleId = profile.id;
                    await user.save();
                }
            }

            const token = generateToken(user._id);
            user.activeToken = token;
            await user.save();

            done(null, user);
        } catch (error) {
            console.error(error);
            done(error, null);
        }
    }));

    // Serialize user
    passport.serializeUser((user, done) => {
        // Include activeToken if available
        if (user.activeToken) {
            done(null, { id: user.id, activeToken: user.activeToken });
        } else {
            done(null, { id: user.id });
        }
    });

    // Deserialize user
    passport.deserializeUser((serializedUser, done) => {
        User.findById(serializedUser.id)
            .then(user => {
                done(null, user);
            })
            .catch(err => {
                console.error(err);
                done(err, null);
            });
    });
};

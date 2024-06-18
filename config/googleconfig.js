const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../Model/User");
const { generateToken } = require("../config/jwtToken");
const sendEmail = require("../Utils/SendEmail");
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
                    console.log("create user");
                    user = await User.create(newUser);
                } else {
                    console.log("Login with Google");
                    user.googleId = profile.id;
                    await user.save();
                }
            }

            const token = generateToken({ id: user._id });

            user.activeToken = token;
            console.log(token);
            await user.save();
             // Send email after a delay
            setTimeout(async () => {
                try {
                    await sendEmail({
                        to: user.email,
                        subject: 'Google Login Successful',
                        text: `
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <style>
                                    body {
                                        font-family: Arial, sans-serif;
                                        background-color: #f4f4f4;
                                        margin: 0;
                                        padding: 0;
                                        color: #333;
                                    }
                                    .container {
                                        width: 100%;
                                        max-width: 600px;
                                        margin: 0 auto;
                                        background-color: #ffffff;
                                        border-radius: 8px;
                                        overflow: hidden;
                                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                                    }
                                    .header {
                                        background-color: #F38181;
                                        color: #ffffff;
                                        padding: 20px;
                                        text-align: center;
                                    }
                                    .header h1 {
                                        margin: 0;
                                        font-size: 24px;
                                    }
                                    .content {
                                        padding: 20px;
                                    }
                                    .content p {
                                        font-size: 16px;
                                        line-height: 1.6;
                                    }
                                    .content a {
                                        display: inline-block;
                                        background-color: #4CAF50;
                                        color: #ffffff;
                                        padding: 10px 20px;
                                        text-decoration: none;
                                        border-radius: 4px;
                                        margin-top: 20px;
                                    }
                                    .footer {
                                        background-color: #f4f4f4;
                                        color: #777;
                                        text-align: center;
                                        padding: 10px;
                                        font-size: 12px;
                                    }
                                    .head {
                                        text-align: center;
                                    }
                                    .img {
                                        max-width: 150px;
                                    }
                                    .imgs {
                                        display: flex;
                                        justify-content: center;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <div class="imgs">
                                            <img class="img" src="https://authimages.s3.eu-west-2.amazonaws.com/logo.png" alt="authentichef">
                                        </div>
                                    </div>
                                    <div class="head">
                                        <h1>Welcome To Authentichef</h1>
                                    </div>
                                    <div class="content">
                                        <p>Hi ${user.firstname},</p>
                                        <p>You have successfully logged in using Google Login.</p>
                                    </div>
                                    <div class="footer">
                                        <p>If you did not initiate this request, please ignore this email.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `,
                    });
                } catch (emailError) {
                    console.error('Error sending email:', emailError);
                }
            }, 5000); // Delay email by 5000 milliseconds (5 seconds)

            done(null, user);
        } catch (error) {
            console.error(error);
            done(error, null);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

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

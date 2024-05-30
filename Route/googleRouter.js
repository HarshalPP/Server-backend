const express = require('express');
const router = express.Router();
const passport = require('passport');
const { generateToken } = require("../config/jwtToken");
const User = require("../Model/User");

// Google OAuth

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// router.get('/google/callback', passport.authenticate('google', { failureRedirect: 'http://www.authentichef.com/' }), (req, res) => {
//     // Assuming req.user has the authenticated user information including the token
//     const token = req.user ? req.user.activeToken : null;
//     // Redirect to explore dishes page
//     res.redirect(`http://www.authentichef.com/explore-dishes?token=${token}`);
// });

router.get('/google/callback', passport.authenticate('google', { failureRedirect: 'http://www.authentichef.com/' }), (req, res) => {
    // Assuming req.user has the authenticated user information including the token
    const token = req.user ? req.user.activeToken : null;
    if (token) {
        // Redirect with token in query parameter
        res.redirect(`http://www.authentichef.com/explore-dishes?token=${token}`);
        // Send JSON response with the token
        res.json({
            success: true,
            message: 'Authentication successful',
            token: token
        });
    } else {
        // Redirect to failure URL with error message
        res.redirect('http://www.authentichef.com/?error=Authentication+failed');
        // Send JSON response indicating failure
        res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
});

router.get('/logout_google', (req, res) => {
    req.logout(err => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.redirect('http://www.authentichef.com/');
    });
});

module.exports = router;

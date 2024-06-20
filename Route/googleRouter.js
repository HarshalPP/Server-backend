const express = require('express');
const router = express.Router();
const passport = require('passport');
const { generateToken } = require("../config/jwtToken");
const User = require("../Model/User");

// Google OAuth

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get('/google/callback', passport.authenticate('google', { failureRedirect: 'http://www.authentichef.com/' }), (req, res) => {
    const token = req.user ? req.user.activeToken : null;
    if (token) {
        res.cookie('sessionToken', token, {
            httpOnly: true,
            // secure: true, // Not setting the secure flag because we're using HTTP
            maxAge: 3600000 // 1 hour
        });
        res.redirect('http://www.authentichef.com/explore-dishes');
    } else {
        res.redirect('http://www.authentichef.com/?error=Authentication+failed');
    }
});

// New endpoint to get the token
router.get('/google/get-token', (req, res) => {
    const token = req.cookies.sessionToken;
    if (token) {
        res.json({
            success: true,
            message: 'Token retrieved successfully',
            token: token
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'User not authenticated'
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

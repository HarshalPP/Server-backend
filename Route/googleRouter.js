const express = require('express');
const router = express.Router();
const passport = require('passport');


// Google OAuth

// Google OAuth callback route
router.get('/google/callback', passport.authenticate('google', { failureRedirect: 'http://www.authentichef.com/' }), (req, res, next) => {
    // Call the next middleware to add token to response
    next();
}, (req, res) => {
    res.redirect('http://www.authentichef.com/explore-dishes');
});

// Middleware to add token to response
router.use('/google/callback', (req, res) => {
    // req.user contains the user object and the token from the strategy
    const { token } = req.user;

    // Send the token as part of the response
    res.json({
        success: true,
        message: 'Google OAuth successful',
        token: token
    });
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

const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require("../Model/User");

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: 'http://www.authentichef.com/' }), (req, res, next) => {
  // After successful authentication, call the middleware to get the active token
  next();
}, (req, res) => {
  res.redirect('http://www.authentichef.com/explore-dishes');
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

// New route to get the active token
router.get('/get_active_token', (req, res) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  // Get the active token from the user object
  const activeToken = req.user.activeToken;

  // Return the active token in the response
  res.json({ activeToken });
});

module.exports = router;

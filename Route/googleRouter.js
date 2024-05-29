const express = require('express');
const router = express.Router();
const passport = require('passport');


// Google OAuth

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] } , (req, res) => {
  if (req.user) {
    res.status(200).json({ message: 'Logged in successfully', user: req.user });
  }
})
);

router.get('/google/callback', passport.authenticate('google', { failureRedirect: 'http://www.authentichef.com/' }), (req, res) => {
  const token = req.user ? req.user.activeToken : null;
  if (token) {
    // If user is authenticated and token is available, send token in API response
    res.json({ success: true, message: 'Authentication successful', token });
    // Redirect to explore dishes page and log the token
    console.log("Token:", token);
    res.redirect('http://www.authentichef.com/explore-dishes');
  } else {
    // If token is not available, redirect to explore dishes page
    res.redirect('http://www.authentichef.com/explore-dishes');
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

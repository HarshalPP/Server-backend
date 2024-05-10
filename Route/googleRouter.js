const express = require('express');
const router = express.Router();
const passport = require('passport');


// Google OAuth

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: 'http://www.authentichef.com/' }), (req, res) => {
  res.redirect('http://www.authentichef.com/explore-dishes');
}
)

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
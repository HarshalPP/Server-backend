const express = require('express');
const router = express.Router();
const passport = require('passport');


router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: 'http://www.authentichef.com/' }), (req, res) => {
  res.redirect('http://www.authentichef.com/explore-dishes');
});


router.get('/logout_facebook', (req, res) => {

  req.logout(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.redirect('http://www.authentichef.com/');
  });
}
)

module.exports = router;

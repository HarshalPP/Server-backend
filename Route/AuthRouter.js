const express = require('express');
const router = express.Router();
const multer = require('multer');
const passport = require('passport');
const {
  register,
  login,
  chefLogin,
  adminLogin,
  logout,
  chefLogout,
  forgotPassword,
  resetPassword,
  getallUser,
  getaUser,
  getUserById,
  deleteaUser,
  updatedUser,
  updatePassword,
  uploadImage,
  verifyUser
} = require("../Controller/auth");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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


// facebook OAuth

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', passport.authenticate('facebook', { failureRedirect: 'http://www.authentichef.com/' }), (req, res) => {
  res.redirect('http://www.authentichef.com/explore-dishes');
}
)

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




router.route("/login").post(login);

router.route("/chefLogin").post(chefLogin);

router.route("/adminLogin").post(adminLogin);

router.route("/logout").get(isAuthenticatedUser, logout);

router.route("/chefLogout").get(isAuthenticatedUser, chefLogout);

router.route("/verifyUserToken/:token").get(verifyUser)

// Create User
router.route("/register").post(register);

// Update User Password
router.post("/updatePassword", isAuthenticatedUser, updatePassword);

// Update User
router.put("/edit-user", isAuthenticatedUser, updatedUser);

// Get all Users
router.get("/all-users", isAuthenticatedUser, authorizeRoles("admin"), getallUser);

// Get a User
router.route("/getaUser").get(isAuthenticatedUser, getaUser);

// Get user by ID 
router.route("/getUserById").post(isAuthenticatedUser, getUserById);

// Delete a user
router.delete("/deleteaUser/:id",isAuthenticatedUser, authorizeRoles("admin"), deleteaUser);

router.route("/forgotpassword").post(forgotPassword);
router.route("/resetpassword/:resetToken").put(resetPassword);

router.route("/uploadImage").post(isAuthenticatedUser, authorizeRoles("admin"), upload.single('file'),uploadImage)

module.exports = router;
const mongoose = require("mongoose");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema(
  {

    googleId:{
    type:String,
    required:false
    },

    facebookId:{
      type:String,
      required:false
    },
    // User's first name
    firstname: {
      type: String,
    },
    // User's last name
    lastname: {
      type: String,
    },
    // User's email address (unique)
    email: {
      type: String,
      unique: true,
    },
    // User's mobile number
    mobile: {
      type: String,
    },
    // User's password (hashed)
    password: {
      type: String,
      minlength: 8,
      select: false, // Password won't be included in query results by default
    },
    // User's role (default: 'user')
    role: {
      type: String,
      default: "user",
    },
    // Token for email verification or account activation
    activeToken: {
      type: String,
    },
    img:{
      type:String,
      required:false
    },
    // User's address
    address: String,
    // Orders associated with the user
    orders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }],
    // Date when the password was last changed
    passwordChangedAt: {
      type: Date,
      select: false, // Password change date won't be included in query results by default
    },
    // Token for resetting the password
    passwordResetToken:{
      type: String,

    },
    // Expiry date/time for the password reset token
    passwordResetExpires: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds 'createdAt' and 'updatedAt' timestamps automatically
  }
);

// Middleware to hash the password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with stored hashed password
UserSchema.methods.matchPasswords = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Method to generate and set reset password token
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  
  // Set reset token and expiry time
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to generate and sign JWT token for user authentication
UserSchema.methods.getSignedToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const User = mongoose.model("User", UserSchema);
module.exports = User;

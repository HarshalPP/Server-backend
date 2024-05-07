const User = require("../Model/User");
const sendEmail = require("../Utils/SendEmail");
const validateMongoDbId = require("../Utils/validateMongodbId");
const { generateToken , verifyToken} = require("../config/jwtToken");
const sendToken = require("../Utils/jwtToken");
const jwt = require("jsonwebtoken");
const uploadOnS3 = require("../Utils/uploadImage");
const Chef = require("../Model/Chef");
const crypto = require("crypto");

exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Invalid request" });
    }

    let fileName = req.file.originalname;

    let url = await uploadOnS3(req.file.buffer, fileName);
    console.log("URL:::=>", url);
    return res.status(200).json({ status: true, url: url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



exports.register = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Check if user with the provided email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(203).json({ error: "User with this email already exists." });
    }

    // Generate reset password token and set expiry
    const resetToken = generateResetPasswordToken();
    const passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    const userData = {
      email,
      provider_ID: req.body.provider_ID,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      provider: req.body.provider,
      role: req.body.role,
      passwordResetToken: resetToken,
      passwordResetExpires: passwordResetExpires
    };

    if (password) {
      userData.password = password;
    }

    // Create the new user
    const newUser = await User.create(userData);
    // Send response with token
    sendToken(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

// Function to generate reset password token
const generateResetPasswordToken = () => {
  return crypto.randomBytes(20).toString("hex");
};


exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email) {
    res.status(400).json("Please provide Email");
  }

  try {
    const findUser = await User.findOne({ email }).select("+password");
    console.log("Find User");

    // If user exists and is authenticated via a third-party provider
    if (findUser && !findUser.password) {
      const token = generateToken({ id: findUser._id });

      await User.findByIdAndUpdate(
        { _id: findUser._id?.toString() },
        { activeToken: token },
        { new: true }
      );

      const user = {
        success: true,
        user: {
          _id: findUser._id,
          firstname: findUser.firstname,
          lastname: findUser.lastname,
          email: findUser.email,
          passwordChangedAt: findUser.passwordChangedAt,
        //   provider: findUser.provider,
        },
        token: token,
      };

      return res.status(200).json(user);
    }

    // If user exists and has a password, continue with password-based authentication
    if (findUser && (await findUser.matchPasswords(password))) {
      const token = generateToken({ id: findUser._id });

      await User.findByIdAndUpdate(
        { _id: findUser._id?.toString() },
        { activeToken: token },
        { new: true }
      );

      const user = {
        success: true,
        user: {
          _id: findUser._id,
          firstname: findUser.firstname,
          lastname: findUser.lastname,
          email: findUser.email,
        //   provider: findUser.provider,
        },
        token: token,
      };

      return res.status(200).json(user);
    } else {
      res.status(401).json("Invalid Credentials");
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

exports.adminLogin = async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    const findAdmin = await User.findOne({ email }).select("+password");
    
    if (!findAdmin) {
      throw new Error("Admin not found");
    }

    if (findAdmin.role !== "admin") {
      throw new Error("Not Authorized");
    }

    if (await findAdmin.matchPasswords(password)) {
      const token = generateToken({ id: findAdmin._id });
      await User.findByIdAndUpdate(
        { _id: findAdmin._id?.toString() },
        { activeToken: token },
        { new: true }
      );
      const user = {
        success: true,
        user: {
          _id: findAdmin._id,
          firstname: findAdmin.firstname,
          lastname: findAdmin.lastname,
          email: findAdmin.email,
        },
        token: token,
      };

      return res.status(200).json(user);
    } else {
      throw new Error("Invalid Credentials");
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};

exports.chefLogin = async (req, res, next) => {
  const { email, password } = req.body;
  
  try {
    const findAdmin = await Chef.findOne({ email }).select("+password");
    
    if (!findAdmin) {
      throw new Error("Chef not found");
    }

    if (await findAdmin.matchPasswords(password)) {
      
      const token = generateToken({ id: findAdmin._id });
      await Chef.findByIdAndUpdate(
        { _id: findAdmin._id?.toString() },
        { activeToken: token },
        { new: true }
      );
      const user = {
        success: true,
        user: {
          _id: findAdmin._id,
          name: findAdmin.name,
          email: findAdmin.email,
          mobile: findAdmin.mobile,
          specialty: findAdmin.specialty,
          bio: findAdmin.bio,
          experience: findAdmin.experience
        },
        token: token,
      };

      return res.status(200).json(user);
    } else {
      throw new Error("Invalid Credentials");
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
};



exports.chefLogout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    let token;

    // Check if the Authorization header is present
    if (authHeader) {
      token = authHeader;
    } else {
      return res.status(401).json({ message: "Please provide a token" });
    }

    // Verify the token
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    // Find the chef by ID
    const chef = await Chef.findById(decodedData.id);

    // Check if the chef exists and the active token matches the provided token
    if (!chef || chef.activeToken !== token) {
      return res.status(401).json({ message: "Invalid token or session" });
    }

    // Remove the active token from the chef
    chef.activeToken = undefined;
    await chef.save();

    // Send response
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    // Handle JWT errors
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    } else if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired, please login again" });
    } else {
      // Handle other errors
      console.error("Error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
};

exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      token = authHeader;
    }
    
    if (!token) {
      return res
        .status(401)
        .json({ message: "Please login to access this resource" });
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    const userData = await User.findOne({_id:decodedData?.id});

    if (userData.activeToken && userData.activeToken === token) {
      const user = await User.findOneAndUpdate(
        { _id: decodedData.id, activeToken: token },
        { $unset: { activeToken: "" } },
        { new: true }
      );
      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid session or token, please login again" });
      }
      return res.status(200).json({
        message: `${userData._id} is Logout Successfully`,
      });
    } else {
      return res
        .status(401)
        .json({ message: "Token expired, please login again" });
    }
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired, please login again" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    } else {
      console.error("Other error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }
};

exports.forgotPassword = async (req, res, next) => {

  console.log("Forget Pass")
  const { email } = req.body;

  try {
    const user = await User.findOne({ email:email });

    // Console the User Email

    console.log("Email is " , user.email) 
    if (!user) {
      return res.status(401).json(`${email} this email is not registered`);
    }
    const resetToken = user.getResetPasswordToken();

    console.log("Reset Token", resetToken);
    
  

    await user.save();

    const resetUrl = `http://13.43.174.21:4000/auth/reset-password/${resetToken}`;

    const message = `
    <!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
        }
        .header {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px 5px 0 0;
        }
        .content {
            padding: 20px;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
        }
        .footer {
            background-color: #f5f5f5;
            padding: 10px;
            border-top: 1px solid #e0e0e0;
            border-radius: 0 0 5px 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Hello ${user.firstname},</h2>
        </div>
        <div class="content">
            <p>We have received a request to reset your password for your account on <strong>Event Panel</strong>. If you did not request this change, you can ignore this email and your password will not be changed.</p>
            
            <p>To reset your password, please click on the following link and follow the instructions:</p>
            
            <p><a class="button" href="${resetUrl}">Reset Password</a></p>
            
            <p>This link will expire in <strong>15 minutes</strong> for security reasons. If you need to reset your password after this time, please make another request.</p>
        </div>
        <div class="footer">
            <h3>Thank you,</h3>
            <h3>Event Team </h3>
        </div>
    </div>
</body>
</html>
    `;
    try {
      await sendEmail({
        from: process.env.CLIENT_EMAIL,
        to: user.email,
        subject: "Account Password Reset Link",
        text: message,
      });

      res.status(200).json({
        success: true,
        data: "Password Reset Email Sent Successfully",
      });
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save();

      return res
        .status(500)
        .json({ success: false, data: "Email could not be sent" });
    }
  } catch (error) {
    next(error);
  }
};


exports.resetPassword = async (req, res, next) => {
  try {
    const { resetToken } = req.params;
    const { password } = req.body;

    // Find user by reset token and ensure it's not expired

    const user = await User.findOne({
      passwordResetToken: resetToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    console.log("User", user);

    // If user not found or token expired, return error
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update user's password and reset token fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    // Save user's updated information
    await user.save();

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    // Pass error to the error handling middleware
    return next(error);
  }
};
exports.verifyUser = async (req, res) => {
  const {token } = req.params;

  try {
    const decodedData = verifyToken(token);

    if (!decodedData) {
      return res.status(401).json({ message: "Unauthorized Access" });
    }

    const { id } = decodedData;

    const LoggedUser = await User.findOne({ _id: id, activeToken: token }).select("-password -activeToken");

    if (!LoggedUser) {
      return res.status(401).json({ message: "Unauthorized Access" });
    }

    return res.status(200).json({ data: LoggedUser, message: "Verification Successful" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
};

exports.updatedUser = async (req, res) => {
  const { _id } = req.user._id;
  validateMongoDbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body?.email,
        mobile: req?.body?.mobile,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
};

exports.getallUser = async (req, res) => {
  try {
    const { page = 1, limit = 10} = req.query;
    const searchQuery = req.query.search;
    
    const currentPage = parseInt(page, 10);
    const itemsPerPage = parseInt(limit, 10);

    const userQuery = User.find();

    if (searchQuery) {
      userQuery.or([
        { firstname: { $regex: new RegExp(searchQuery, "i") } },
        { lastname: { $regex: new RegExp(searchQuery, "i") } },
        { email: { $regex: new RegExp(searchQuery, "i") } },
        { mobile: { $regex: new RegExp(searchQuery, "i") } },
      ]);
    }

    // Count total items
    const totalItems = await User.countDocuments(userQuery);

    // Calculate total pages
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const skip = (currentPage - 1) * itemsPerPage;
    const users = await userQuery.sort({ firstname: 1 }).skip(skip).limit(itemsPerPage).exec();

    res.json({
      totalItems,
      totalPages,
      currentPage,
      users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



exports.getaUser = async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const getaUser = await User.findById(_id)
    res.json({
      getaUser
    });
  } catch (error) {
    throw new Error(error);
  }
};

exports.getUserById = async (req, res) => {
  const { _id } = req.body;
  validateMongoDbId(_id);

  try {
    const user = await User.findById(_id);
    res.status(200).json({
      user,
    });
  } catch (error) {
    throw new Error(error);
  }
};

exports.deleteaUser = async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { _id } = req.user._id;
    const user = await User.findById(_id).select("+password");
    // Verify the current password
    const isPasswordMatch = await user.matchPasswords(oldPassword);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Password change failed" });
  }
};
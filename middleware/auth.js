const jwt = require("jsonwebtoken");
const User = require("../Model/User");
const ErrorResponse = require("../Utils/errorRes");

exports.isAuthenticatedUser = async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return next(new ErrorResponse("Please Login to access this resource", 401));
  }

  // Extract the token from the Authorization header
  const token = authorizationHeader;

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById({_id:decodedData.id});

    if (!req.user) {
      return next(new ErrorResponse("User not found", 404));
    }

    if (req.user.activeToken && req.user.activeToken === token) {
      next();
    } else {
      return res.status(401).json({ message: 'Token Expired, Please login again' });
    }
    
  } catch (error) {
    console.log("Error:",error);
    return next(new ErrorResponse("Token is invalid", 401));
  }
};


exports.isAuthenticatedUserForAddtocard = async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;

 // If user is not provided, store the cart data in local storage
  if (!authorizationHeader) {
    return next();
  }

  // Extract the token from the Authorization header
  const token = authorizationHeader;

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById({_id:decodedData.id});

    if (!req.user) {
      return next(new ErrorResponse("User not found", 404));
    }

    if (req.user.activeToken && req.user.activeToken === token) {
      next();
    } else {
      return res.status(401).json({ message: 'Token Expired, Please login again' });
    }
    
  } catch (error) {
    console.log("Error:",error);
    return next(new ErrorResponse("Token is invalid", 401));
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role: ${req.user.role} is not allowed to access this resouce `,
          403
        )
      );
    }

    next();
  };
};

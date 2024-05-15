const MenuItem = require('../Model/MenuItem');
const validateMongoDbId = require("../Utils/validateMongodbId");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const multer = require('multer');
const dotenv = require('dotenv')
dotenv.config()


// Configure the AWS region
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.REGION,
});

// Create an S3 service object
const s3 = new AWS.S3();

// Define the file filter function for multer
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
    return cb(new Error('Only image files (jpg, jpeg, png, gif, svg) are allowed!'));
  }
  cb(null, true);
};

const multerConfig = {
  fileFilter,
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}

// Configure multer with file filter function for multiple files
const upload = multer(multerConfig).fields([
  { name: 'ProfileImage', maxCount: 5 }
]);

// Export the upload middleware
exports.upload = upload;

// Create a new menu item
exports.createMenuItem = async (req, res) => {
  try {

    const { name, description, price, weight, portion_Size, Ingredients, Heating_Instruction, List_of_Allergens, Cuisines_id, Dishtype_id, Dietary_id, spice_level_id, chef_id, popular_dish } = req.body;

    // Access the uploaded files from req.files
    const profileImages = req.files['ProfileImage'];

    if (!profileImages || profileImages.length === 0) {
      return res.status(400).json({ error: "Please upload at least one image" });
    }

    // Array to store image URLs
    const imageUrls = [];

    // Iterate through uploaded images
    for (let i = 0; i < profileImages.length; i++) {
      const image = profileImages[i];

      // Upload image to S3
      const bucketName = process.env.BUCKET;
      const uploadParams = {
        Bucket: bucketName,
        Key: `profile-images/${name}-${Date.now()}-${i}`,
        Body: image.buffer,
        ContentType: image.mimetype
      };

      const s3UploadResponse = await s3.upload(uploadParams).promise();
      imageUrls.push(s3UploadResponse.Location);
    }

    // Create a new menu item with the image URLs
    const menuItem = new MenuItem({
      name,
      description,
      price,
      weight,
      portion_Size,
      Ingredients,
      Heating_Instruction,
      List_of_Allergens,
      Cuisines_id,
      Dishtype_id,
      Dietary_id,
      spice_level_id,
      chef_id,
      popular_dish: popular_dish || 'No',
      ProfileImage: imageUrls
    });

    // Save the menu item to the database
    const newMenuItem = await menuItem.save();

    // Send response with the created menu item
    res.status(201).json(newMenuItem);
  } catch (error) {
  }
};



// Get all menu items 
exports.getAllMenuItems = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const currentPage = parseInt(page, 10);
    const itemsPerPage = parseInt(limit, 10);

    let menuItemQuery = MenuItem.find().populate("chef_id").populate("Cuisines_id").populate("Dishtype_id").populate("Dietary_id").populate("spice_level_id");

    if (search) {
      menuItemQuery = menuItemQuery.or([
        { name: { $regex: new RegExp(search, 'i') } },
        { category: { $regex: new RegExp(search, 'i') } },
        { description: { $regex: new RegExp(search, 'i') } },
      ]);
    }

    const totalItems = await MenuItem.countDocuments(menuItemQuery);
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const skip = (currentPage - 1) * itemsPerPage;
    const menuItems = await menuItemQuery.skip(skip).limit(itemsPerPage);

    res.json({
      totalItems,
      totalPages,
      currentPage,
      menuItems
    });
  } catch (error) {
    next(error);
  }
};

// Get 



// Get a single menu item by ID
exports.getMenuItemById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const menuItem = await MenuItem.findById(id).populate("chef_id").populate("Cuisines_id").populate("Dishtype_id").populate("Dietary_id").populate("spice_level_id");
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(menuItem);
  } catch (error) {
    next(error);
  }
};

// Update a menu item by ID
exports.updateMenuItemById = async (req, res, next) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
      const menuItem = await MenuItem.findById(id);
      if (!menuItem) {
          return res.status(404).json({ error: 'Menu item not found' });
      }

      // Update menu item details
      const updatedMenuItem = await MenuItem.findByIdAndUpdate(id, req.body, { new: true });

      if (req.files['ProfileImage']) {
          // Delete old images from S3 bucket
          await deleteImagesFromS3(menuItem.ProfileImage);

          let profileImages = req.files['ProfileImage'];
          if (!Array.isArray(profileImages)) {
              profileImages = [profileImages];
          }

          if (!profileImages || profileImages.length === 0) {
              return res.status(400).json({ error: 'Please upload an image' });
          }

          const imageUrls = [];
          for (let i = 0; i < profileImages.length; i++) {
              const image = profileImages[i];
              const bucketName = process.env.BUCKET;
              const uploadParams = {
                  Bucket: bucketName,
                  Key: `profile-images/${req.body.name || menuItem.name}-${Date.now()}-${i}`,
                  Body: image.buffer,
                  ContentType: image.mimetype
              };

              const data = await s3.upload(uploadParams).promise();
              imageUrls.push(data.Location);
          }

          // Convert array of image URLs into a single string
          const profileImageString = imageUrls.join(', ');

          // Update menu item with new images
          updatedMenuItem.ProfileImage = profileImageString;
          await updatedMenuItem.save();
      }

      res.status(200).json({ message: 'Menu item updated successfully', updatedMenuItem });
  } catch (error) {
      next(error);
  }
};

// Helper function to delete images from S3 bucket
const deleteImagesFromS3 = async (imageUrls) => {
  try {

    const promises = imageUrls.map(async (imageUrl) => {
      const key = imageUrl.split('/').pop();
      const params = {
        Bucket: process.env.BUCKET,
        Key: key
      };
      await s3.deleteObject(params).promise();
    });
    await Promise.all(promises);
  } catch (error) {
    console.error("Error deleting images from S3:", error);
    throw error;
  }
};

// Delete a menu item by ID
exports.deleteMenuItemById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const menuItem = await MenuItem.findByIdAndDelete(id);
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
};


exports.getMenuItemByParams = async (req, res, next) => {
  const { Cuisines_id, Dishtype_id, Dietary_id, spice_level_id } = req.query;

  try {
    // Construct query object based on provided parameters
    const query = {};
    if (Cuisines_id) query.Cuisines_id = Cuisines_id;
    if (Dishtype_id) query.Dishtype_id = Dishtype_id;
    if (Dietary_id) query.Dietary_id = Dietary_id;
    if (spice_level_id) query.spice_level_id = spice_level_id;

    // Find documents matching the query
    const menuItem = await MenuItem.find(query)
      .populate('Cuisines_id')
      .populate('Dishtype_id')
      .populate('Dietary_id')
      .populate('spice_level_id')
      .populate('chef_id')
      .exec();

    // Count the number of documents matching the query
    const count = menuItem.length;
    res.status(200).json({ count, menuItem });
  } catch (error) {
    next(error);
  }
};


// I want to retrieve the chef's menu items

exports.getMenuItemsByChefId = async (req, res, next) => {
  const { chef_id } = req.params;
  

  try {
    const menuItems = await MenuItem.find({ chef_id }).populate('Cuisines_id Dishtype_id Dietary_id spice_level_id chef_id').exec();

    if (!menuItems || menuItems.length === 0) {
      return res.status(404).json({ error: 'Menu items not found' });
    }

    res.status(200).json(menuItems);
  } catch (error) {
    next(error);
  }
};


// Get data of Popoular dish

exports.getPopularDish = async (req, res) => {

  try {
    const popularDish = await MenuItem.find({  popular_dish: 'Yes' })
    .populate("chef_id").populate("Cuisines_id").populate("Dishtype_id").populate("Dietary_id").populate("spice_level_id");

    if (!popularDish || popularDish.length === 0) {
      return res.status(404).json({ error: 'Popular dish not found' });
    }

    res.status(200).json(popularDish);
  } catch (error) {
  }
}








// Import required modules
const Chef = require("../Model/Chef");
const MenuItem = require("../Model/MenuItem");
const multer = require('multer');
const AWS = require("aws-sdk");
const dotenv = require('dotenv');
const fs = require("fs");
const path = require("path");
const validateMongoDbId = require("../Utils/validateMongodbId");

// Load environment variables
dotenv.config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.REGION
});

// Create S3 instance
const s3 = new AWS.S3();

// Define multer configuration
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'));
  }
  cb(null, true);
};
// Define multer configuration
const multerConfig = {
  fileFilter,
  storage: multer.memoryStorage() // Store files in memory for later upload to S3
};

// Create a new chef with Uploaded images on S3
const upload = multer(multerConfig).array('images', 5);
exports.upload = upload;
exports.createChef = async (req, res, next) => {
  try {
    const { name, email, mobile, password, specialty, bio, experience } = req.body;

    // Access uploaded files directly from req.files
    const images = req.files;

    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const imageUrls = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const bucketName = process.env.BUCKET;
      const uploadParams = {
        Bucket: bucketName,
        Key: `chef-images/${name}-${Date.now()}`,
        Body: image.buffer,
        ContentType: image.mimetype
      };

      const data = await s3.upload(uploadParams).promise();
      imageUrls.push(data.Location);
    }

    const chef = new Chef({
      name,
      email,
      mobile,
      password,
      specialty,
      bio,
      experience,
      images: imageUrls
    });

    await chef.save();
    res.json(chef);
  } catch (error) {
    next(error);
  }
};



// Get all chefs
exports.getAllChefs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const currentPage = parseInt(page, 10);
    const itemsPerPage = parseInt(limit, 10);

    let chefQuery = Chef.find();

    if (search) {
      chefQuery = chefQuery.or([
        { name: { $regex: new RegExp(search, "i") } },
        { specialty: { $regex: new RegExp(search, "i") } },
      ]);
    }

    const totalItems = await Chef.countDocuments(chefQuery);
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const skip = (currentPage - 1) * itemsPerPage;
    const chefs = await chefQuery.skip(skip).limit(itemsPerPage);

    res.json({
      totalItems,
      totalPages,
      currentPage,
      chefs,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single chef by ID
exports.getChefById = async (req, res, next) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const chef = await Chef.findById(id);
    if (!chef) {
      return res.status(404).json({ error: "Chef not found" });
    }
    res.json(chef);
  } catch (error) {
    next(error);
  }
};

// Update a chef by ID
exports.updateChefById = async (req, res, next) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
      const chef = await Chef.findById(id);
      if (!chef) {
          return res.status(404).json({ error: "Chef not found" });
      }

      // Update chef details
      const updatedChef = await Chef.findByIdAndUpdate(id, req.body, { new: true });

      if(req.files){
      // Delete old images from S3 bucket
      await deleteImagesFromS3(chef.images);

      // Upload new images to S3 bucket
      const images = req.files;
      if (!images || images.length === 0) {
          return res.status(400).json({ error: 'No images uploaded' });
      }

      const imageUrls = [];
      for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const bucketName = process.env.BUCKET;
          const uploadParams = {
              Bucket: bucketName,
              Key: `chef-images/${chef.name}-${Date.now()}-${i}`,
              Body: image.buffer,
              ContentType: image.mimetype
          };

          const data = await s3.upload(uploadParams).promise();
          imageUrls.push(data.Location);
      }

      // Update chef with new images
      updatedChef.images = imageUrls;
      await updatedChef.save();
    }

      res.status(200).json({ message: 'Chef updated successfully', updatedChef });
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


exports.deleteChefById = async (req, res, next) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const chef = await Chef.findByIdAndDelete(id);
    if (!chef) {
      return res.status(404).json({ error: "Chef not found" });
    }

    // Delete images associated with the chef from S3 bucket
    await deleteImagesFromS3buket(chef.images);

    res.json({ message: "Chef deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Helper function to delete images from S3 bucket
const deleteImagesFromS3buket = async (imageUrls) => {
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


// Get chefs by specific by id 

exports.getChefByParams = async (req, res, next) => {
  const { id } = req.params;
  validateMongoDbId(id);
  try {
    // Find chef by ID
    const chef = await Chef.findById(id);
    if (!chef) {
      return res.status(404).json({ error: "Chef not found" });
    }

    // Find menu items by chef ID
    const menuItems = await MenuItem.find({ chef_id: id }).populate('Cuisines_id Dishtype_id Dietary_id spice_level_id chef_id').exec();
    if (!menuItems || menuItems.length === 0) {
      return res.status(404).json({ error: "Menu items not found" });
    }

    res.json({ chef, menuItems });
  } catch (error) {
    next(error);
  }
};




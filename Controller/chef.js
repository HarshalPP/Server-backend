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
// Define multer configuration
const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'));
  }
  cb(null, true);
};

// Multer configuration for multiple images and single banner image
const multerConfig = {
  fileFilter,
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
};

// Create a new chef with Uploaded images on S3
const upload = multer(multerConfig).fields([
  { name: 'images', maxCount: 5 },
  { name: 'bannerImage', maxCount: 1 }
]);

exports.upload = upload;

exports.createChef = async (req, res, next) => {
  try {
    const { name,  mobile,  specialty, bio, experience ,  Instagram_Link , Facebook_Link} = req.body;

    // Access uploaded files directly from req.files
    const images = req.files['images'];
    const bannerImage = req.files['bannerImage'];

    if (!images || images.length === 0 || !bannerImage) {
      return res.status(400).json({ error: 'Both images and banner image are required' });
    }

    const imageUrls = [];
    let bannerImageUrl = '';

    // Upload multiple images
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

    // Upload banner image
    const bannerImageFile = bannerImage[0];
    const bucketName = process.env.BUCKET;
    const bannerUploadParams = {
      Bucket: bucketName,
      Key: `chef-banner/${name}-${Date.now()}`,
      Body: bannerImageFile.buffer,
      ContentType: bannerImageFile.mimetype
    };

    const bannerData = await s3.upload(bannerUploadParams).promise();
    bannerImageUrl = bannerData.Location;

    const chef = new Chef({
      name,
      mobile,
      specialty,
      bio,
      experience,
      Instagram_Link,
      Facebook_Link,
      images: imageUrls,
      bannerImage: bannerImageUrl
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

    if (req.files) {
      // Delete old images from S3 bucket
      await deleteImagesFromS3(chef.images);

      // Upload new images to S3 bucket
      const images = req.files['images'];
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

    // If there's a banner image, update it
    if (req.files && req.files['bannerImage']) { // Check if bannerImage exists in req.files
      // Delete old banner image from S3 bucket
      await deleteImagesFromS3([chef.bannerImage]);

      // Upload new banner image to S3 bucket
      const bannerImage = req.files['bannerImage'][0]; // Access the first file in the array
      const bucketName = process.env.BUCKET;
      const uploadParams = {
        Bucket: bucketName,
        Key: `chef-banner/${chef.name}-${Date.now()}`,
        Body: bannerImage.buffer,
        ContentType: bannerImage.mimetype
      };

      const data = await s3.upload(uploadParams).promise();
      updatedChef.bannerImage = data.Location;
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
    // Flatten the imageUrls array if necessary
    const flattenedImageUrls = imageUrls.flat();
    
    const promises = flattenedImageUrls.map(async (imageUrl) => {
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




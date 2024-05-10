const DishType = require("../Model/DishType");
const validateMongoDbId = require("../Utils/validateMongodbId");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
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

// Configure multer with file filter function
const upload = multer({ fileFilter }).single('ProfileImage');

// Export the upload middleware
exports.upload = upload;

exports.createDishType = async (req, res, next) => {
    try {
        const { title } = req.body;

        // Call multer middleware to handle file upload
        upload(req, res, async (error) => {
            // Access the uploaded file from req.file
            const ProfileImage = req.file;
            if (!ProfileImage) {
                return res.status(400).json({ error: "Please upload an image" });
            }

            // Ensure that ProfileImage.buffer is accessible
            if (!ProfileImage.buffer || ProfileImage.buffer.length === 0) {
                return res.status(400).json({ error: 'Uploaded file buffer is empty or undefined' });
            }

            // Upload image to S3
            const bucketName = process.env.BUCKET;
            const uploadParams = {
                Bucket: bucketName,
                Key: `profile-images/${title}-${Date.now()}`,
                Body: ProfileImage.buffer,
                ContentType: ProfileImage.mimetype
            };
            const s3UploadResponse = await s3.upload(uploadParams).promise();
            console.log(s3UploadResponse.Location);
            const imageUrl = s3UploadResponse.Location;

            // Create a new dietary with the image URL
            const DishTypes = new DishType({
                title: title,
                ProfileImage: imageUrl
            });
            // Save the dietary to the database
            const Dish = await DishTypes.save();
            // Send response with the created dietary
            res.status(201).json(Dish);
        });
    } catch (error) {
        next(error);
    }
};

    


// Get all dish types with pagination and search filter

exports.getAllDishTypes = async (req, res, next) => {
 try {
     const { page = 1, limit = 50, search } = req.query;

     const currentPage = parseInt(page, 10);
     const itemsPerPage = parseInt(limit, 10);

     let dishTypeQuery = DishType.find();

     if (search) {
         dishTypeQuery = dishTypeQuery.where('title').regex(new RegExp(search, 'i'));
     }

     const totalItems = await DishType.countDocuments(dishTypeQuery);
     const totalPages = Math.ceil(totalItems / itemsPerPage);

     const skip = (currentPage - 1) * itemsPerPage;
     const dishTypes = await dishTypeQuery.skip(skip).limit(itemsPerPage);

     res.json({
         totalItems,
         totalPages,
         currentPage,
         dishTypes,
     });
 }
 catch (error) {
     next(error);
 }
}

// Get a single dish type by ID

exports.getDishTypeById = async (req, res, next) => {
    const { id } = req.params;
    validateMongoDbId(id);
    
    try {
        const dishType = await DishType.findById(id);
        if (!dishType) {
            return res.status(404).json({ error: "Dish type not found" });
        }
        res.json(dishType);
    } catch (error) {
        next(error);
    }
}

// Update a dish type by ID

// exports.updateDishTypeById = async (req, res, next) => {
//     const { id } = req.params;
//     validateMongoDbId(id); // Assuming validateMongoDbId is a function to validate MongoDB ObjectId
    
//     try {
//         const dishType = await DishType.findByIdAndUpdate(id, req.body, { new: true });
//         if (!dishType) {
//             return res.status(404).json({ error: "Dish type not found" });
//         }
//         res.status(200).json({ message: "Dish type updated successfully", dishType });
//     } catch (error) {
//         next(error);
//     }
// }


// Update a Dietary by ID
exports.updateDishTypeById = async (req, res, next) => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {
        const dishtype = await DishType.findById(id);
        if (!dishtype) {
            return res.status(404).json({ error: "dishtype not found" });
        }

        // Update dietary details
        const updatedFields = req.body;
        const updateddishtype = await DishType.findByIdAndUpdate(id, updatedFields, { new: true });

        // Check if req.file exists and has expected properties (for image upload)
        if (req.file) {
            // Delete old images from S3 bucket
            await deleteImagesFromS3(dishtype.ProfileImage);

            // Upload new images to S3 bucket
            let profileImages = req.file; // Change const to let for reassignment

            // Ensure profileImages is always an array
            if (!Array.isArray(profileImages)) {
                profileImages = [profileImages];
            }

            const imageUrls = [];
            for (let i = 0; i < profileImages.length; i++) {
                const image = profileImages[i];
                const bucketName = process.env.BUCKET;
                const uploadParams = {
                    Bucket: bucketName,
                    Key: `profile-images/${req.body.title || dishtype.title}-${Date.now()}-${i}`,
                    Body: image.buffer,
                    ContentType: image.mimetype
                };

                const data = await s3.upload(uploadParams).promise();
                imageUrls.push(data.Location);
            }

            // Convert array of image URLs into a single string
            const profileImageString = imageUrls.join(', ');

            // Update dietary with new images
            updateddishtype.ProfileImage = profileImageString;
            await updateddishtype.save();
        }

        res.status(200).json({ message: 'DishType updated successfully', updateddishtype });
    } catch (error) {
        next(error);
    }
};


const deleteImagesFromS3 = async (imageUrls) => {
    try {
      if (!Array.isArray(imageUrls)) {
        // If imageUrls is not an array, convert it to an array with a single element
        imageUrls = [imageUrls];
      }
  
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


// Delete a dish type by ID

exports.deleteDishTypeById = async (req, res, next) => {
    const { id } = req.params;
    validateMongoDbId(id);
    
    try {
        const dishType = await DishType.findByIdAndDelete(id);
        if (!dishType) {
            return res.status(404).json({ error: "Dish type not found" });
        }
        res.status(200).json({ message: "Dish type deleted successfully" });
    } catch (error) {
        next(error);
    }
}
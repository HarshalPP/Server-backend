const Dietary = require("../Model/dietary");
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

exports.createDietary = async (req, res, next) => {
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
            const dietary = new Dietary({
                title: title,
                ProfileImage: imageUrl
            });

            // Save the dietary to the database
            const newDietary = await dietary.save();


            // Send response with the created dietary
            res.status(201).json(newDietary);
        });
    } catch (error) {
        next(error);
    }
};

    

exports.getAllDietaries = async (req, res, next) => {
    try {
        // Extract pagination and search filter parameters from request query
        const { page = 1, limit = 50, search } = req.query;
        const currentPage = parseInt(page, 10);
        const itemsPerPage = parseInt(limit, 10);

        // Construct initial query
        let dietaryQuery = Dietary.find();

        // Apply search filter if search query parameter is provided
        if (search) {
            dietaryQuery = dietaryQuery.where('title').regex(new RegExp(search, 'i'));
        }

        // Count total number of documents matching the query
        const totalItems = await Dietary.countDocuments(dietaryQuery);

        // Calculate total number of pages
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        // Calculate how many documents to skip based on pagination
        const skip = (currentPage - 1) * itemsPerPage;

        // Retrieve dietaries based on query, pagination, and search filter
        const dietaries = await dietaryQuery.skip(skip).limit(itemsPerPage).exec();

        // Send response with pagination and dietaries
        res.json({
            totalItems,
            totalPages,
            currentPage,
            dietaries
        });
    } catch (error) {
        // Pass any errors to the error handling middleware
        next(error);
    }
}


// Get a single dietary by ID

exports.getDietaryById = async (req, res, next) => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {
        const dietary = await Dietary.findById(id);
        if (!dietary) {
            return res.status(404).json({ error: "Dietary not found" });
        }
        res.json(dietary);
    } catch (error) {
        next(error);
    }
}

// Update a Dietary by ID
exports.updateDietaryById = async (req, res, next) => {

    console.log(req.body)
    const { id } = req.params;
    validateMongoDbId(id);
  
    try {
        const dietary = await Dietary.findById(id);
        if (!dietary) {
            return res.status(404).json({ error: "Dietary not found" });
        }
  
        // Update dietary details
        const updatedDietary = await Dietary.findByIdAndUpdate(id, req.body, { new: true });
  
        // Delete old images from S3 bucket
        if(req.file){
        await deleteImagesFromS3(dietary.ProfileImage);
  
        // Upload new images to S3 bucket
        let profileImages = req.file; // Change const to let for reassignment
        // Ensure profileImages is always an array
        if (!Array.isArray(profileImages)) {
            profileImages = [profileImages];
        }

        if (!profileImages || profileImages.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }
  
        const imageUrls = [];
        for (let i = 0; i < profileImages.length; i++) {
            const image = profileImages[i];
            const bucketName = process.env.BUCKET;
            const uploadParams = {
                Bucket: bucketName,
                Key: `profile-images/${req.body.title || dietary.title}-${Date.now()}-${i}`,
                Body: image.buffer,
                ContentType: image.mimetype
            };
  
            const data = await s3.upload(uploadParams).promise();
            imageUrls.push(data.Location);
        }
  
       // Convert array of image URLs into a single string
       const profileImageString = imageUrls.join(', ');
  
       // Update dietary with new images
       updatedDietary.ProfileImage = profileImageString;
       await updatedDietary.save();
    }
  
        res.status(200).json({ message: 'Dietary updated successfully', updatedDietary });
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


// Delete a dietary by ID

exports.deleteDietaryById = async (req, res, next) => {
    try{
        const { id } = req.params;
        validateMongoDbId(id);
        const dietary = await Dietary.findByIdAndDelete(id);
        if (!dietary) {
            return res.status(404).json({ error: "Dietary not found" });
        }
        res.json({ message: "Dietary deleted successfully" });
    }
    catch(error){
        next(error)
    }
}

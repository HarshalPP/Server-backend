const express = require('express')
const SpiceLevel = require('../Model/spiceLevel')
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const multer = require('multer');
const validateMongoDbId = require("../Utils/validateMongodbId");
const dotenv = require('dotenv')
dotenv.config()
// Create a new spice level with Uplaod ProfileImage on aws -sdk

// Configure the AWS region
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.REGION,
    
});

// Create an S3 service object
const s3 = new AWS.S3();

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

exports.CreateSpicelevel = async (req, res, next) => {
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
            const SpiceLevels = new SpiceLevel({
                title: title,
                ProfileImage: imageUrl
            });
            // Save the dietary to the database
            const Spice = await SpiceLevels.save();
            // Send response with the created dietary
            res.status(201).json(Spice);
        });
    } catch (error) {
        next(error);
    }
};


// Get all spice levels with pagination and search filter

module.exports.getSpiceLevels = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search } = req.query;

        const currentPage = parseInt(page, 10);
        const itemsPerPage = parseInt(limit, 10);

        let spiceQuery = SpiceLevel.find();

        if (search) {
            spiceQuery = spiceQuery.where('title').regex(new RegExp(search, 'i'));
        }

        const totalItems = await SpiceLevel.countDocuments(spiceQuery);
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        const skip = (currentPage - 1) * itemsPerPage;
        const spiceLevels = await spiceQuery.skip(skip).limit(itemsPerPage);

        res.json({
            totalItems,
            totalPages,
            currentPage,
            spiceLevels,
        });
    } catch (error) {
        next(error);
    }
}

// Get a single spice level by ID

module.exports.getSpiceLevelById = async (req, res, next) => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {
        const spice = await SpiceLevel.findById(id);
        if (!spice) {
            return res.status(404).json({ error: "Spice level not found" });
        }
       res.status(200).json({message: "Spice level found", spice})
    } catch (error) {
        next(error);
    }
}


// Update a spice level by ID
exports.updateSpiceLevelById = async (req, res, next) => {
    const { id } = req.params;
    validateMongoDbId(id);
    try {
        const spice = await SpiceLevel.findById(id);
        if (!spice) {
            return res.status(404).json({ error: "Spice level not found" });
        }
         // Update dietary details
         const updatedFields = req.body;
        const updatedSpice = await SpiceLevel.findByIdAndUpdate(id, updatedFields, { new: true });

        if (req.file) {
            // Delete old images from S3 bucket
            await deleteImagesFromS3(spice.ProfileImage);
            // Upload new images to S3 bucket
            let profileImages = req.file;
            if (!Array.isArray(profileImages)) {
                profileImages = [profileImages];
            }
            if (!profileImages || profileImages.length === 0) {
                return res.status(400).json({ error: "Please upload an image" });
            }

            const imageUrls = [];
            for (let i = 0; i < profileImages.length; i++) {
                const image = profileImages[i];
                const bucketName = process.env.BUCKET;
                const uploadParams = {
                    Bucket: bucketName,
                    Key: `profile-images/${req.body.title || spice.title}-${Date.now()}`,
                    Body: image.buffer,
                    ContentType: image.mimetype
                };
                const data = await s3.upload(uploadParams).promise();
                imageUrls.push(data.Location);
            }
            const profileImageString = imageUrls.join(",");
            updatedSpice.ProfileImage = profileImageString;
            await updatedSpice.save();
        }
        res.status(200).json({ message: "Spice level updated successfully", updatedSpice });
    } 
    catch (error) {
        next(error);
    }
};


// Delete Bucket from s3

const deleteImagesFromS3=async(imageUrls)=>{
    const imageUrlsArray=imageUrls.split(',');
    try{
        const promises=imageUrlsArray.map(async(imageUrl)=>{
      const key=imageUrl.split('/').pop();
      const params={
          Bucket:process.env.BUCKET,
          Key:key
      };
        await s3.deleteObject(params).promise();

        })
        await Promise.all(promises);

    }catch(error){
        console.error("Error deleting images from S3:", error);
        throw error;

    }

}

// Delete a spice level by ID

module.exports.deleteSpiceLevelById = async (req, res, next) => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {
        const spice = await SpiceLevel.findByIdAndDelete(id);
        if (!spice) {
            return res.status(404).json({ error: "Spice level not found" });
        }
        res.status(200).json({ message: "Spice level deleted successfully", spice });
    } catch (error) {
        next(error);
    }
}

const express = require("express");
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  deleteCategoryById,
  updateCategoryById,
  upload
} = require("../Controller/category");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

// Create a new category

router.post("/Createcuisines", upload, createCategory);
// Get all categories
router.route("/getAllCuisines").get(getAllCategories);

// Get a single category by ID
router.route("/getCuisinesById/:id").get(getCategoryById);

// Update a category by ID

router.put("/updateCuisines/:id" , upload , updateCategoryById)
// Delete a category by ID
router.route("/deleteCuisines/:id").delete(deleteCategoryById);

module.exports = router;

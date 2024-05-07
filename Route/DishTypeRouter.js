const express = require("express");
const router = express.Router();

// Importing the controller functions
const {
  createDishType,
  getAllDishTypes,
  getDishTypeById,
  updateDishTypeById,
  deleteDishTypeById,
  upload
} = require("../Controller/DishTypeController")

// Create a new dish type

// router.route("/dishTypes").post(createDishType); // POST /dishTypes
router.post("/dishTypes", upload, createDishType); // POST /dishTypes

// Get all dish types
router.route("/dishTypes").get(getAllDishTypes); // GET /dishTypes

// Get a single dish type by ID

router.route("/dishTypes/:id").get(getDishTypeById); // GET /dishTypes/:id

// Update a dish type by ID

router.put("/dishTypes/:id", upload, updateDishTypeById); // PUT /dishTypes/:id

// Delete a dish type by ID

router.route("/dishTypes/:id").delete(deleteDishTypeById); // DELETE /dishTypes/:id

module.exports = router;
const express = require("express");
const router = express.Router();
const{CreateSpicelevel,upload,getSpiceLevels,getSpiceLevelById,deleteSpiceLevelById,updateSpiceLevelById} = require("../Controller/SpiceLevelController")

// Create a new spice level

router.post("/spiceLevels",upload,CreateSpicelevel);

// Get all spice levels
router.route("/spiceLevels").get(getSpiceLevels);

// Get a single spice level by ID
router.route("/spiceLevels/:id").get(getSpiceLevelById);

// Delete a spice level by ID
router.route("/spiceLevels/:id").delete(deleteSpiceLevelById);

// update a spice level by ID
router.put("/spiceLevels/:id",upload,updateSpiceLevelById)

module.exports = router;
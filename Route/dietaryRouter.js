const express = require("express");
const router = express.Router();
const{createDietary,getAllDietaries,getDietaryById,updateDietaryById,deleteDietaryById,upload} =require( "../Controller/dietary")

// Create a new dietary
router.post("/dietaries",upload,createDietary);

// Get all dietaries

router.route("/dietaries").get(getAllDietaries);

// Get a single dietary by ID

router.route("/dietaries/:id").get(getDietaryById);

// Update a dietary by ID

router.put("/dietaries/:id",upload,updateDietaryById)

// Delete a dietary by ID

router.route("/dietaries/:id").delete(deleteDietaryById);

module.exports = router;
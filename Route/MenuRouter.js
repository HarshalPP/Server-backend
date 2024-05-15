const express = require("express");
const router = express.Router();
const {
    createMenuItem,
    getAllMenuItems,
    getMenuItemById,
    updateMenuItemById,
    deleteMenuItemById,
    getMenuItemByParams,
    getMenuItemsByChefId,
    getPopularDish,
    upload
} = require("../Controller/menu");
const { isAuthenticatedUser, authorizeRoles } = require("../middleware/auth");

// Create a new menu item
router.post("/menuItems",  upload, createMenuItem);

// Get popular dishes
router.get("/menuItems/popular", getPopularDish);

// Get all menu item
router.route("/menuItems").get(getAllMenuItems);

// Get a single menu item by ID
router.route("/menuItems/:id").get(getMenuItemById);

// Update a menu item by ID
// router.route("/menuItems/:id").put(updateMenuItemById);

router.put("/menuItems/:id" , upload , updateMenuItemById)

// Delete a menu item by ID
router.route("/menuItems/:id").delete(deleteMenuItemById);

// Sorted menue
router.get("/menuItem/sort", getMenuItemByParams)

// Get menu items by chef ID
router.get("/menuItems/chef/:chef_id", getMenuItemsByChefId);



module.exports = router;

const Cart = require("../Model/cart");
const MenuItem = require("../Model/MenuItem");
const User = require("../Model/User");

// exports.addToCart = async (req, res, next) => {
//     try {
//         const { menuItem, quantity, customization} = req.body;
        
//         // Access user ID from req.user
//         const userId = req.user ? req.user._id : null;

//         if (!userId) {
//             // If user is not provided, store the cart data in local storage
//             const cartData = {
//                 menuItem,
//                 quantity,
//                 customization,
//             };
//             // Store cart data in local storage
//    

//             // Retrieve the menu item corresponding to cartData.menuItem
//             const menuItems = await MenuItem.findOne({ _id: cartData.menuItem }).select("name price");

//             // Make a empty cart object to store the cart data in array of local storage
//             return res.status(200).json({ message: "Menu item added to cart", menuItem: menuItems, cartData});
//         }

//         // Find the user's existing cart or create a new one
//         let userCart = await Cart.findOne({ user: userId, status: "pending" });
//         if (!userCart) {
//             userCart = new Cart({
//                 user: userId,
//                 items: []
//             });
//         }

//         // Add the Item to the cart
//         userCart.items.push({ menuItem, quantity, customization });
//         await userCart.save();

//         // Populate the menuItem field with name and price
//         const userCard = await Cart.findById(userCart._id).populate({
//             path: "items.menuItem",
//             select: "name price"
//         });

//         res.status(201).json({ message: "Item added to cart", userCard });

//     } catch (error) {
//         next(error);
//     }
// }
exports.addToCart = async (req, res, next) => {
  try {
    const { menuItem, quantity, customization } = req.body;
    
    const userId = req.user ? req.user._id : null;

    if (!userId) {
      const cartData = {
        menuItem,
        quantity,
        customization,
      };
  
      const menuItems = await MenuItem.findOne({ _id: cartData.menuItem }).select("name price");

      return res.status(200).json({ message: "Menu item added to cart", menuItem: menuItems, cartData });
    }

    let userCart = await Cart.findOne({ user: userId });
    if (!userCart) {
      userCart = new Cart({
        user: userId,
        items: []
      });
    }
    

const existingItemIndex = userCart.items.findIndex(item => {
  const itemMenuItemString = item.menuItem.toString(); // Convert ObjectId to string
  return itemMenuItemString === menuItem[0]; // Compare with the first element of the menuItem array
});


    // If existing item found, update its quantity
    if (existingItemIndex !== -1) {
      // Update quantity of existing item
      userCart.items[existingItemIndex].quantity += quantity;
    } else {
      userCart.items.push({ menuItem, quantity, customization });
    }

    await userCart.save();

    // Populate the menuItem field with name and price
    const updatedCart = await Cart.findById(userCart._id).populate({
      path: "items.menuItem",
      select: "name price"
    });

    res.status(201).json({ message: "Item added to cart", updatedCart });
  } catch (error) {
    next(error);
  }
}







exports.getCartItems = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId)
    const userCart = await Cart.findOne({ user: userId}).populate({
        path: "items.menuItem",
        select: "name price"
    })
    console.log("userCart is", userCart)
    if (!userCart) {
        return res.status(404).json({ message: "Cart is empty" });
    }

    const TotalPricePerQuntity = userCart.items.map(item => item.menuItem.price * item.quantity).reduce((a, b) => a + b, 0);

    // want to count number of items in the cart
    const userCartCount =userCart.items.length;

    if (!userCart) {
      return res.status(404).json({ message: "Cart is empty" });
    }
    // Check if deliveryDate is null
    // if (userCart.deliveryDate === null) {
    //   return res.status(200).json({ cart: userCart, TotalPrice: TotalPricePerQuntity, userCartCount: userCartCount });
    // } 
    // else{
    //   res.status(200).json({message: "Cart is empty" })
    // }

    res.status(200).json({message:'Cart',userCart,userCartCount,TotalPricePerQuntity})
  } catch (error) {
    // If an error occurs, respond with an error message
    res.status(500).json({ error: "Failed to retrieve cart items", message: error.message });
  }
};



// Function to update an item in the user's cart
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity, customization } = req.body;
    const userId = req.user._id;
    const cartId = req.params.cardid;
    const menuItem = req.params.menuid;

    // Find the user's cart by ID
    let userCart = await Cart.findOne({ user: userId, _id: cartId });

    if (!userCart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find the index of the item in the cart
    const itemIndex = userCart.items.findIndex(item => String(item.menuItem) === menuItem);

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Update the item details
    userCart.items[itemIndex].quantity = quantity;
    userCart.items[itemIndex].customization = customization;

    // Save the updated cart to the database
    userCart = await userCart.save();

    // Respond with a success message
    res.status(200).json({ message: "Item updated successfully", cart: userCart });
  } catch (error) {
    // If an error occurs, respond with an error message
    res.status(500).json({ error: "Failed to update item in cart", message: error.message });
  }
};



exports.deleteCartItem = async (req, res) => {
  try {
    const itemId = req.params.id; // Assuming the parameter name is "itemId"

    // Extract user ID from the request (assuming it's stored in req.user)
    const userId = req.user._id;

    // Find the user's cart
    const userCart = await Cart.findOne({ user: userId});

    // If userCart is null, the cart is empty
    if (!userCart) {
      return res.status(404).json({ message: "Cart is empty" });
    }

    // Find the index of the item in the cart
    const itemIndex = userCart.items.findIndex(item => String(item.menuItem) === itemId);

    // If the item is not found in the cart, return 404
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Remove the item from the cart
    userCart.items.splice(itemIndex, 1);

    // Save the updated cart to the database
    await userCart.save();

    // Respond with a success message
    return res.status(200).json({ message: "Item deleted successfully", cart: userCart });
  } catch (error) {
    // If an error occurs, respond with an error message
    return res.status(500).json({ error: "Failed to delete item from cart", message: error.message });
  }
};



// Delete all items from the user's cart

exports.deleteAllCartItems = async (req, res) => {
  try {
      // Extract user ID from the request (assuming it's stored in req.user)
      const userId = req.user._id;

      // Find and delete the user's cart
      const deletedCart = await Cart.findOneAndDelete({ user: userId });

      if (!deletedCart) {
          return res.status(404).json({ message: "Cart not found" });
      }

      // Respond with a success message
      return res.status(200).json({ message: "Cart deleted successfully", deletedCart });
  } catch (error) {
      // If an error occurs, respond with an error message
      return res.status(500).json({ error: "Failed to delete cart", message: error.message });
  }
}


exports.placeOrder = async (req, res) => {
  try {
    // Assuming user ID is extracted from the request, you may implement your own authentication logic
    const userId = req.user._id;
    const { deliveryDate } = req.body;

    // Find the user's cart
    const userCart = await Cart.findOne({ user: userId, status: "pending" }).populate({
      path: "items.menuItem",
      select: "price"
    });

    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Check if there is already an order associated with the user's cart
    const existingOrder = await Cart.findOne({ user: userId, status: "pending", items: { $eq: userCart.items } });
    if (existingOrder) {
      // Create a new order instead of updating the existing one
      const totalAmount = await calculateTotalAmount(userCart.items);
      const newOrder = new Cart({
        items: userCart.items,
        user: userId,
        totalAmount,
        status: "pending",
        deliveryDate: deliveryDate || null
      });
      await newOrder.save();

      // Delete the old cart
      if (userCart) {
        await Order.deleteOne({ _id: userCart._id });
      }

      return res.status(201).json({ message: "Order created successfully", order: newOrder });
    }

    // Calculate the total amount
    const totalAmount = await calculateTotalAmount(userCart.items);

    // Create a new order from the items in the cart
    const newOrder = new Order({
      items: userCart.items,
      user: userId,
      totalAmount,
      status: "pending",
      deliveryDate: deliveryDate || null
    });

    // Save the new order to the database
    await newOrder.save();

    // Delete the old cart
    if (userCart) {
      await Order.deleteOne({ _id: userCart._id });
    }

    // Respond with a success message
    res.status(201).json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    // If an error occurs, respond with an error message
    res.status(500).json({ error: "Failed to create order", message: error.message });
  }
};










// Function to calculate the total amount based on items in the cart
const calculateTotalAmount = async (items, userId) => {
  console.log("Items are", items, "User ID is", userId);
  try {
    // Calculate the total amount based on items in the cart
    const orderItems = await Order.findOne({ user: userId, status: "pending" }).populate({
      path: "items.menuItem",
      select: "price"
    });
    console.log("Order Items are", orderItems);
    const totalAmount = items.reduce((total, item) => {
      // Access the price property of menuItem
      const itemPrice = item.menuItem.price;
      const itemQuantity = item.quantity;
      return total + (itemPrice * itemQuantity);
    }, 0);

    return totalAmount;
  } catch (error) {
    throw new Error("Failed to calculate total amount");
  }
};




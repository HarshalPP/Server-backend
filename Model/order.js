const mongoose = require("mongoose");

const deliveryInfoSchema = new mongoose.Schema({
  phone: {
      type: String,
  },
  houseNo: {
      type: String,
      required: true // Assuming a house number is required for delivery
  },
  buildingName: String, // Assuming a building name might not always be required
  streetName: {
      type: String,
      required: true // Assuming a street name is required for delivery
  },
  City: {
      type: String,
      required: true // Assuming a town or city name is required for delivery
  },
  country: {
      type: String,
      required: true // Assuming a country name is required for delivery
  },
FirstName:{
  type:String,
  required:true

},
LastName:{
  type:String,
  required:true
}
});


const orderSchema = new mongoose.Schema({
    items: [
        {
            menuItem: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "MenuItem",
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
            },
            customization: String,
        },
    ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "preparing", "ready", "delivered" , "cancelled"],
        default: "pending",
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    deliveryInfo: [deliveryInfoSchema], // Array of delivery addresses
    deliveryDate:{
      type:Date,
    },
    totalAmount: {
        type: Number,
    },
    payment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
    },
    TransactionId:{
      type:String
    }
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
